/**
 * roomManager.js — Room lifecycle management.
 */

const { v4: uuidv4 } = require("uuid");
const { createGameState, createPlayer } = require("../game/gameState");
const { isValidProfileId, getProfileById } = require("../data/profiles");
const stateMachine = require("../game/stateMachine");
const nightResolver = require("../game/nightResolver");

const rooms = new Map();
const MAX_PLAYERS = 12;
/** @type {Map<string, NodeJS.Timeout>} oldSocketId -> removal timer */
const disconnectGraceTimers = new Map();
const DISCONNECT_GRACE_MS = 45 * 1000;

function createRoom(socketId, username, profileId, settings = {}, sessionToken = null) {
    if (!isValidProfileId(profileId)) return { success: false, error: "Invalid profile." };
    const err = validateUsername(username);
    if (err) return { success: false, error: err };

    const roomId = generateRoomId();
    const gameState = createGameState(roomId, settings);
    const host = createPlayer(socketId, username, profileId, true, sessionToken);
    host.profileName = getProfileById(profileId)?.name || null;
    gameState.players.push(host);
    rooms.set(roomId, gameState);

    return { success: true, roomId, state: sanitizeStateForLobby(gameState) };
}

function joinRoom(socketId, roomId, username, profileId, password = null, sessionToken = null) {
    const gs = rooms.get(roomId);
    if (!gs) return { success: false, error: "Room not found." };
    if (gs.phase !== "LOBBY") return { success: false, error: "Game already started." };
    if (gs.players.length >= MAX_PLAYERS) return { success: false, error: "Room is full." };
    if (gs.settings.password && password !== gs.settings.password)
        return { success: false, error: "Wrong password." };
    if (gs.players.find(p => p.id === socketId))
        return { success: false, error: "Already in room." };
    if (gs.players.find(p => p.profileId === profileId))
        return { success: false, error: "Profile already taken." };
    if (!isValidProfileId(profileId)) return { success: false, error: "Invalid profile." };

    const err = validateUsername(username);
    if (err) return { success: false, error: err };
    if (gs.players.find(p => p.username.toLowerCase() === username.toLowerCase()))
        return { success: false, error: "Username taken." };

    const player = createPlayer(socketId, username, profileId, false, sessionToken);
    player.profileName = getProfileById(profileId)?.name || null;
    gs.players.push(player);
    return { success: true, state: sanitizeStateForLobby(gs) };
}

/**
 * Rewires game state when a player reconnects with a new socket id.
 */
function migrateSocketId(gs, oldId, newId) {
    if (oldId === newId) return;
    const p = gs.players.find((x) => x.id === oldId);
    if (!p) return;
    p.id = newId;
    p.disconnected = false;

    if (gs.votes[oldId] !== undefined) {
        gs.votes[newId] = gs.votes[oldId];
        delete gs.votes[oldId];
    }
    for (const k of Object.keys(gs.votes)) {
        if (gs.votes[k] === oldId) gs.votes[k] = newId;
    }

    if (gs.skipVotes[oldId] !== undefined) {
        gs.skipVotes[newId] = gs.skipVotes[oldId];
        delete gs.skipVotes[oldId];
    }

    if (gs.nominations[oldId] !== undefined) {
        gs.nominations[newId] = gs.nominations[oldId];
        delete gs.nominations[oldId];
    }
    for (const k of Object.keys(gs.nominations)) {
        if (gs.nominations[k] === oldId) gs.nominations[k] = newId;
    }

    const gv = gs.nightActions.gnosiaVotes;
    if (gv[oldId] !== undefined) {
        gv[newId] = gv[oldId];
        delete gv[oldId];
    }
    for (const k of Object.keys(gv)) {
        if (gv[k] === oldId) gv[k] = newId;
    }

    const na = gs.nightActions;
    for (const key of ["gnosiaTarget", "engineerTarget", "doctorTarget", "guardianTarget"]) {
        if (na[key] === oldId) na[key] = newId;
    }

    const mr = gs.morningReport;
    if (mr.killed === oldId) mr.killed = newId;
    if (mr.coldSleep === oldId) mr.coldSleep = newId;

    for (const player of gs.players) {
        if (player.voteTarget === oldId) {
            player.voteTarget = newId;
        }
    }
}

function cancelDisconnectGrace(oldSocketId) {
    const t = disconnectGraceTimers.get(oldSocketId);
    if (t) {
        clearTimeout(t);
        disconnectGraceTimers.delete(oldSocketId);
    }
}

/**
 * Mark player disconnected; they may resume within DISCONNECT_GRACE_MS.
 * @returns {{ roomId: string|null, username: string|null, profileName: string|null }}
 */
function markPlayerDisconnected(socketId) {
    const roomId = findRoomBySocket(socketId);
    if (!roomId) return { roomId: null, username: null, profileName: null };

    const gs = rooms.get(roomId);
    const p = gs?.players.find((x) => x.id === socketId);
    if (!p) return { roomId: null, username: null, profileName: null };

    p.disconnected = true;
    return { roomId, username: p.username, profileName: p.profileName || null };
}

function scheduleDisconnectRemoval(io, oldSocketId, roomId) {
    cancelDisconnectGrace(oldSocketId);
    const timer = setTimeout(() => {
        disconnectGraceTimers.delete(oldSocketId);
        try {
            finalizePermanentDisconnect(io, oldSocketId, roomId);
        } catch (err) {
            console.error(`[Room] Failed to finalize disconnect for ${oldSocketId} in ${roomId}`, err);
        }
    }, DISCONNECT_GRACE_MS);
    disconnectGraceTimers.set(oldSocketId, timer);
}

/**
 * Remove player if they never resumed (socket id still matches).
 */
function finalizePermanentDisconnect(io, oldSocketId, roomId) {
    const gs = rooms.get(roomId);
    if (!gs) return;

    const p = gs.players.find((x) => x.id === oldSocketId);
    if (!p || !p.disconnected) return;

    const leftId = p.id;
    const username = p.username;
    io.to(roomId).emit("player:lostConnection", { playerId: leftId, username });
    const result = removePlayer(oldSocketId);
    if (!result.roomId || result.destroyed) {
        if (result.roomId) {
            stateMachine.cleanupRoom(result.roomId);
            nightResolver.cleanupRoom(result.roomId);
        }
        return;
    }

    io.to(`${result.roomId}:lobby`).emit("lobby:updated", { state: result.state });
    if (result.newHostId) {
        io.to(`${result.roomId}:lobby`).emit("lobby:hostChanged", { newHostId: result.newHostId });
    }
    if (gs.phase !== "LOBBY" && gs.phase !== "END") {
        stateMachine.broadcastPhase(gs);
    }
}

/**
 * Resume seat after refresh / new socket.
 */
function resumeSession(newSocketId, { roomId, username, profileId, sessionToken, password }) {
    const gs = getRoom(roomId);
    if (!gs) return { success: false, error: "Room not found." };
    if (gs.settings.password && password !== gs.settings.password) {
        return { success: false, error: "Wrong password." };
    }
    if (!sessionToken) return { success: false, error: "Invalid session." };

    const player = gs.players.find((p) =>
        p.sessionToken === sessionToken &&
        p.username === username.trim() &&
        p.profileId === profileId
    );
    if (!player) return { success: false, error: "Session not found." };

    const oldId = player.id;
    cancelDisconnectGrace(oldId);

    if (oldId !== newSocketId) {
        migrateSocketId(gs, oldId, newSocketId);
    } else {
        player.disconnected = false;
    }

    return {
        success: true,
        gameState: gs,
        player,
        oldSocketId: oldId,
    };
}

function removePlayer(socketId) {
    const roomId = findRoomBySocket(socketId);
    if (!roomId) return { roomId: null, destroyed: false, newHostId: null, state: null };

    const gs = rooms.get(roomId);
    const idx = gs.players.findIndex(p => p.id === socketId);
    if (idx === -1) return { roomId, destroyed: false, newHostId: null, state: null };

    delete gs.votes[socketId];
    delete gs.skipVotes[socketId];
    delete gs.nominations[socketId];

    for (const voterId of Object.keys(gs.votes)) {
        if (gs.votes[voterId] === socketId) delete gs.votes[voterId];
    }
    for (const nominatorId of Object.keys(gs.nominations)) {
        if (gs.nominations[nominatorId] === socketId) delete gs.nominations[nominatorId];
    }

    const gnosiaVotes = gs.nightActions.gnosiaVotes;
    delete gnosiaVotes[socketId];
    for (const voterId of Object.keys(gnosiaVotes)) {
        if (gnosiaVotes[voterId] === socketId) delete gnosiaVotes[voterId];
    }

    for (const key of ["gnosiaTarget", "engineerTarget", "doctorTarget", "guardianTarget"]) {
        if (gs.nightActions[key] === socketId) gs.nightActions[key] = null;
    }

    if (gs.morningReport.killed === socketId) gs.morningReport.killed = null;
    if (gs.morningReport.coldSleep === socketId) gs.morningReport.coldSleep = null;

    for (const player of gs.players) {
        if (player.id !== socketId && player.voteTarget === socketId) {
            player.voteTarget = null;
        }
    }

    const leaving = gs.players[idx];
    gs.players.splice(idx, 1);

    if (gs.players.length === 0) {
        rooms.delete(roomId);
        return { roomId, destroyed: true, newHostId: null, state: null };
    }

    let newHostId = null;
    if (leaving.isHost) {
        gs.players[0].isHost = true;
        newHostId = gs.players[0].id;
    }

    return { roomId, destroyed: false, newHostId, state: sanitizeStateForLobby(gs) };
}

function updateSettings(socketId, roomId, settings) {
    const gs = rooms.get(roomId);
    if (!gs) return { success: false, error: "Room not found." };
    if (gs.phase !== "LOBBY") return { success: false, error: "Game already started." };

    const host = gs.players.find(p => p.id === socketId);
    if (!host || !host.isHost) return { success: false, error: "Only host can change settings." };

    const allowed = [
        "password",
        "hasEngineer",
        "hasDoctor",
        "hasGuardian",
        "hasLawyer",
        "hasTraitor",
        "gnosiaCount",
        "lobbyMusicEnabled",
        "endGameMusicEnabled",
    ];
    for (const key of allowed) {
        if (settings[key] !== undefined) gs.settings[key] = settings[key];
    }

    return { success: true, state: sanitizeStateForLobby(gs) };
}

function getRoom(roomId) { return rooms.get(roomId) || null; }
function findRoomBySocket(socketId) {
    for (const [roomId, gs] of rooms.entries()) {
        if (gs.players.find(p => p.id === socketId)) return roomId;
    }
    return null;
}

function generateRoomId() {
    return "NEB-" + uuidv4().replace(/-/g, "").slice(0, 4).toUpperCase();
}

function validateUsername(u) {
    if (!u || typeof u !== "string") return "Username required.";
    const t = u.trim();
    if (t.length < 2) return "Username too short (min 2).";
    if (t.length > 20) return "Username too long (max 20).";
    if (!/^[a-zA-Z0-9_ ]+$/.test(t)) return "Letters, numbers, spaces, underscores only.";
    return null;
}

function sanitizeStateForLobby(gs) {
    return {
        roomId: gs.roomId,
        phase: gs.phase,
        round: gs.round,
        settings: {
            hasPassword: !!gs.settings.password,
            hasEngineer: gs.settings.hasEngineer,
            hasDoctor: gs.settings.hasDoctor,
            hasGuardian: gs.settings.hasGuardian,
            hasLawyer: gs.settings.hasLawyer,
            hasTraitor: gs.settings.hasTraitor,
            gnosiaCount: gs.settings.gnosiaCount,
            lobbyMusicEnabled: gs.settings.lobbyMusicEnabled !== false,
            endGameMusicEnabled: gs.settings.endGameMusicEnabled !== false,
        },
        music: {
            playback: {
                trackKey: gs.musicPlayback?.trackKey || null,
                startedAt: gs.musicPlayback?.startedAt || null,
                loop: !!gs.musicPlayback?.loop,
                transitionDurationMs: gs.musicPlayback?.transitionDurationMs || 0,
                revision: gs.musicPlayback?.revision || 0,
                updatedAt: gs.musicPlayback?.updatedAt || null,
            },
        },
        players: gs.players.map(p => ({
            id: p.id, username: p.username, profileId: p.profileId, profileName: p.profileName || null,
            isHost: p.isHost, alive: p.alive, inColdSleep: p.inColdSleep,
            disconnected: !!p.disconnected,
        })),
        winner: gs.winner,
        timers: gs.timers,
    };
}

function resetRoom(socketId, roomId) {
    const gs = rooms.get(roomId);
    if (!gs) return { success: false, error: "Room not found." };
    const host = gs.players.find(p => p.id === socketId);
    if (!host || !host.isHost) return { success: false, error: "Only host can reset game." };

    stateMachine.resetToLobby(gs);
    return { success: true };
}

module.exports = {
    createRoom, joinRoom, removePlayer, updateSettings,
    getRoom, findRoomBySocket, sanitizeStateForLobby, resetRoom,
    markPlayerDisconnected, scheduleDisconnectRemoval,
    resumeSession, cancelDisconnectGrace, migrateSocketId,
};
