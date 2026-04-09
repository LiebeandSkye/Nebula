/**
 * index.js — Project Nebula Server (Final)
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const {
    createRoom, joinRoom, removePlayer, updateSettings, getRoom, sanitizeStateForLobby,
    markPlayerDisconnected, scheduleDisconnectRemoval, resumeSession, resetRoom,
    updateRoomActivity
} = require("./rooms/roomManager");
const {
    assignRoles,
    getGnosiaIds,
    buildRolePayload,
    isGnosiaRole,
    countGnosiaPlayers,
    appearsGnosiaToEngineer,
    getDoctorRevealRole,
} = require("./game/roles");
const stateMachine = require("./game/stateMachine");
const nightResolver = require("./game/nightResolver");

const app = express();
const httpServer = http.createServer(app);
const AURA_ROLL_OPTIONS = [
    "aura-rage-mode",
    "aura-golden-saiyan",
    "aura-glacier",
    "aura-sunset",
    "aura-glitch",
    "aura-sparkle-white",
    "aura-sparkle-yellow",
    "aura-sparkle-pink",
    "aura-judgement",
    "aura-red-saiyan",
    "aura-halo",
    "aura-void",
    "aura-sparkle-rainbow",
    "aura-sparkle-red",
];
const ILLUSIONIST_SELECTION_WINDOW_MS = 20000;
const pendingIllusionistTimers = new Map();

// ── CORS & Socket.io Configuration ───────────────────────────────────
function normalizeOrigin(origin) {
    return String(origin || "").trim().replace(/\/$/, "");
}

function parseOriginList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(normalizeOrigin).filter(Boolean);
    }
    return String(raw)
        .split(/[,\s]+/)
        .map(normalizeOrigin)
        .filter(Boolean);
}

const STATIC_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nebula-eight-self.vercel.app",   // production — hardcoded safety net
];

const ENV_ALLOWED_ORIGINS = [
    ...parseOriginList(process.env.CLIENT_URL),
    ...parseOriginList(process.env.CORS_ORIGINS),
    ...parseOriginList(process.env.ALLOWED_ORIGINS),
];

const ALLOWED_ORIGINS = Array.from(
    new Set([...STATIC_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS].map(normalizeOrigin).filter(Boolean))
);

const checkOrigin = (origin, callback) => {
    // Allow server-to-server / Postman (no origin header)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = normalizeOrigin(origin);
    const isAllowed = ALLOWED_ORIGINS.includes(normalizedOrigin);

    if (isAllowed) {
        callback(null, true);
    } else {
        console.warn(`[CORS] Blocked origin: ${origin}. Allowed origins: ${ALLOWED_ORIGINS.join(", ") || "(none configured)"}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
};

const corsOptions = {
    origin: checkOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

const io = new Server(httpServer, {
    cors: corsOptions,
    // Polling-first is more resilient during Render cold starts/handshakes.
    transports: ["polling", "websocket"],
    // Increased timeouts to be more "forgiving" for mobile/unstable connections.
    pingTimeout: 60000, 
    pingInterval: 25000,
});

stateMachine.init(io);
nightResolver.init(io);

app.use(cors(corsOptions));
app.use(express.json());
console.log(`[CORS] Allowed origins: ${ALLOWED_ORIGINS.join(", ") || "(none configured)"}`);

// ── REST ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
        status: "ok",
        ts: Date.now(),
        uptimeSec: Math.floor(process.uptime()),
    });
});

// ── Message builder ───────────────────────────────────────────────────
function buildMessage(sender, text, channel, targetPersona = null) {
    return {
        id: crypto.randomUUID(),
        channel,
        text,
        senderId: targetPersona ? targetPersona.id : sender.id,
        senderName: targetPersona ? targetPersona.username : sender.username,
        profileId: targetPersona ? targetPersona.profileId : sender.profileId,
        isAlive: targetPersona ? targetPersona.alive : sender.alive,
        timestamp: Date.now(),
    };
}

function clearPendingIllusionistTimer(roomId) {
    const handle = pendingIllusionistTimers.get(roomId);
    if (!handle) return;
    clearTimeout(handle);
    pendingIllusionistTimers.delete(roomId);
}

function buildIllusionistCandidates(gameState, illusionistId) {
    return gameState.players
        .filter((player) => player.id !== illusionistId && !isGnosiaRole(player.role))
        .map((player) => ({
            id: player.id,
            username: player.username,
            profileId: player.profileId,
            profileName: player.profileName || null,
        }));
}

function finalizeLobbyGameStart(gameState) {
    clearPendingIllusionistTimer(gameState.roomId);
    const meta = gameState.meta || (gameState.meta = {});
    meta.startPending = false;
    meta.pendingIllusionistChoice = false;
    meta.illusionistId = gameState.players.find((player) => player.role === "illusionist")?.id || null;

    const gnosiaChannel = `${gameState.roomId}:gnosia`;
    for (const gid of getGnosiaIds(gameState)) {
        const playerSocket = io.sockets.sockets.get(gid);
        if (playerSocket) playerSocket.join(gnosiaChannel);
    }

    io.to(gameState.roomId).emit("pregame:illusionistResolved");

    for (const player of gameState.players) {
        io.to(player.id).emit("game:roleAssigned", buildRolePayload(player, gameState));
    }

    io.to(gameState.roomId).emit("game:starting", {
        playerCount: gameState.players.length,
        gnosiaCount: countGnosiaPlayers(gameState),
    });

    stateMachine.stopRoomMusic(gameState, stateMachine.MUSIC_TRANSITION_MS);
    stateMachine.scheduleGameStart(gameState, 5000);
}

function resolveIllusionistInfection(gameState, requestedTargetId = null) {
    if (!gameState) return { success: false, error: "Room not found." };

    const meta = gameState.meta || (gameState.meta = {});
    if (!meta.pendingIllusionistChoice) {
        return { success: false, error: "Illusionist choice is no longer pending." };
    }

    const illusionistId = meta.illusionistId;
    const candidates = buildIllusionistCandidates(gameState, illusionistId);
    if (candidates.length === 0) {
        finalizeLobbyGameStart(gameState);
        return { success: true, infectedId: null, infectedUsername: null };
    }

    let target =
        requestedTargetId && requestedTargetId !== "random"
            ? gameState.players.find(
                (player) =>
                    player.id === requestedTargetId &&
                    player.id !== illusionistId &&
                    !isGnosiaRole(player.role)
            )
            : null;

    if (!target) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        target = gameState.players.find((player) => player.id === picked.id) || null;
    }

    if (!target) {
        finalizeLobbyGameStart(gameState);
        return { success: true, infectedId: null, infectedUsername: null };
    }

    target.role = "gnosia";
    console.log(`[Roles] ${gameState.roomId}: Illusionist infected ${target.username}`);

    finalizeLobbyGameStart(gameState);
    return { success: true, infectedId: target.id, infectedUsername: target.username };
}

function startIllusionistPregame(gameState) {
    const illusionist = gameState.players.find((player) => player.role === "illusionist");
    if (!illusionist) {
        finalizeLobbyGameStart(gameState);
        return;
    }

    const meta = gameState.meta || (gameState.meta = {});
    meta.pendingIllusionistChoice = true;
    meta.illusionistId = illusionist.id;

    const candidates = buildIllusionistCandidates(gameState, illusionist.id);
    if (candidates.length === 0) {
        finalizeLobbyGameStart(gameState);
        return;
    }

    io.to(gameState.roomId).emit("pregame:illusionistManifesting", {
        roomId: gameState.roomId,
        durationMs: ILLUSIONIST_SELECTION_WINDOW_MS,
    });

    io.to(illusionist.id).emit("pregame:illusionistPrompt", {
        roomId: gameState.roomId,
        durationMs: ILLUSIONIST_SELECTION_WINDOW_MS,
        candidates,
    });

    clearPendingIllusionistTimer(gameState.roomId);
    const handle = setTimeout(() => {
        pendingIllusionistTimers.delete(gameState.roomId);
        if (gameState.phase !== "LOBBY") return;
        resolveIllusionistInfection(gameState, null);
    }, ILLUSIONIST_SELECTION_WINDOW_MS);
    pendingIllusionistTimers.set(gameState.roomId, handle);
}

// ── Socket.io ─────────────────────────────────────────────────────────
io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    function reply(cb, payload) {
        if (typeof cb === "function") cb(payload);
    }

    function bindAckHandler(event, handler) {
        socket.on(event, (payload = {}, cb) => {
            const ack = typeof cb === "function" ? cb : null;
            try {
                handler(payload || {}, ack);
            } catch (err) {
                const roomId = payload && typeof payload.roomId === "string" ? payload.roomId : "n/a";
                console.error(`[Socket][${event}] room=${roomId} socket=${socket.id}`, err);
                reply(ack, { success: false, error: "Internal server error." });
            }
        });
    }

    // ── LOBBY ─────────────────────────────────────────────────────────
    bindAckHandler("room:create", ({ username, profileId, settings, sessionToken }, cb) => {
        const result = createRoom(socket.id, username, profileId, settings, sessionToken || null);
        if (!result.success) return reply(cb, { success: false, error: result.error });
        socket.join(result.roomId);
        socket.join(`${result.roomId}:lobby`);
        const gs = getRoom(result.roomId);
        reply(cb, { success: true, roomId: result.roomId, state: result.state });
        if (gs) stateMachine.broadcastMusicState(gs);
    });

    bindAckHandler("room:join", ({ roomId, username, profileId, password, sessionToken }, cb) => {
        const result = joinRoom(socket.id, roomId, username, profileId, password, sessionToken || null);
        if (!result.success) return reply(cb, { success: false, error: result.error });
        socket.join(roomId);
        socket.join(`${roomId}:lobby`);
        reply(cb, { success: true, state: result.state });
        io.to(`${roomId}:lobby`).emit("lobby:updated", { state: result.state });
        const gs = getRoom(roomId);
        if (gs) stateMachine.broadcastMusicState(gs);
    });

    bindAckHandler("room:updateSettings", ({ roomId, settings }, cb) => {
        const result = updateSettings(socket.id, roomId, settings);
        if (!result.success) return reply(cb, { success: false, error: result.error });
        updateRoomActivity(roomId);
        const gs = getRoom(roomId);
        if (gs) {
            if (gs.phase === "LOBBY") {
                if (gs.settings.lobbyMusicEnabled === false) {
                    stateMachine.stopRoomMusic(gs, stateMachine.MUSIC_TRANSITION_MS);
                } else {
                    stateMachine.syncLobbyMusic(gs);
                }
            } else if (gs.phase === "END") {
                if (gs.settings.endGameMusicEnabled === false) {
                    stateMachine.stopRoomMusic(gs, stateMachine.MUSIC_TRANSITION_MS);
                } else if (!gs.musicPlayback?.trackKey && gs.winner) {
                    stateMachine.playEndGameMusic(gs, gs.winner, stateMachine.MUSIC_TRANSITION_MS);
                }
            } else {
                stateMachine.broadcastMusicState(gs);
            }
        }
        const nextState = gs ? sanitizeStateForLobby(gs) : result.state;
        reply(cb, { success: true, state: nextState });
        io.to(`${roomId}:lobby`).emit("lobby:updated", { state: nextState });
    });

    bindAckHandler("music:play", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        const host = gs.players.find(p => p.id === socket.id);
        if (!host || !host.isHost) return reply(cb, { success: false, error: "Only host can control music." });

        if (gs.phase === "LOBBY") {
            if (gs.settings.lobbyMusicEnabled === false) {
                return reply(cb, { success: false, error: "Enable lobby music first." });
            }
            stateMachine.syncLobbyMusic(gs, { forceRestart: true });
            return reply(cb, { success: true });
        }

        if (gs.phase === "END") {
            if (gs.settings.endGameMusicEnabled === false) {
                return reply(cb, { success: false, error: "Enable end game music first." });
            }
            if (!gs.winner) {
                return reply(cb, { success: false, error: "No winner yet." });
            }
            stateMachine.playEndGameMusic(gs, gs.winner, stateMachine.MUSIC_TRANSITION_MS);
            return reply(cb, { success: true });
        }

        reply(cb, { success: false, error: "Music can only be started from lobby or end game." });
    });

    bindAckHandler("room:getState", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        reply(cb, { success: true, state: sanitizeStateForLobby(gs) });
    });

    bindAckHandler("room:leave", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);

        const player = gs.players.find(p => p.id === socket.id);
        if (!player) return reply(cb, { success: false, error: "Player not found in room." });

        // Only allow leaving during LOBBY phase
        if (gs.phase !== "LOBBY") {
            return reply(cb, { success: false, error: "Cannot leave after game has started." });
        }

        const result = removePlayer(socket.id);
        reply(cb, { success: true });

        if (result.roomId) {
            io.to(`${result.roomId}:lobby`).emit("lobby:updated", { state: result.state });
            if (result.newHostId) {
                io.to(`${result.roomId}:lobby`).emit("lobby:hostChanged", { newHostId: result.newHostId });
            }
        }

        if (result.destroyed) {
            clearPendingIllusionistTimer(roomId);
            nightResolver.cleanupRoom(roomId);
            stateMachine.cleanupRoom(roomId);
            console.log(`[Room] Room ${roomId} destroyed (no players left)`);
        }
    });

    // Resume after refresh / reconnect (same device sessionToken)
    bindAckHandler("session:resume", ({ roomId, username, profileId, sessionToken, password }, cb) => {
        const rid = typeof roomId === "string" ? roomId.trim().toUpperCase() : roomId;
        const result = resumeSession(socket.id, {
            roomId: rid,
            username,
            profileId,
            sessionToken,
            password: password ?? null,
        });
        if (!result.success) return reply(cb, result);

        const gs = result.gameState;
        const player = result.player;
        const oldId = result.oldSocketId;

        updateRoomActivity(rid);
        socket.join(rid);
        socket.join(`${rid}:lobby`);
        if (isGnosiaRole(player.role)) {
            socket.join(`${rid}:gnosia`);
        }

        io.to(`${rid}:lobby`).emit("lobby:updated", { state: sanitizeStateForLobby(gs) });
        io.to(socket.id).emit("music:state", stateMachine.buildMusicPayload(gs));

        io.to(rid).emit("player:reconnected", {
            previousId: oldId,
            newId: socket.id,
            username: player.username,
        });

        const inGame = gs.phase !== "LOBBY" && gs.phase !== "END";
        const rolePayload = player.role ? buildRolePayload(player, gs) : null;
        const phasePayload = inGame ? stateMachine.buildPhasePayload(gs) : null;
        const pregameState = gs.meta?.pendingIllusionistChoice
            ? {
                mode: gs.meta?.illusionistId === socket.id ? "prompt" : "manifesting",
                roomId: rid,
                durationMs: ILLUSIONIST_SELECTION_WINDOW_MS,
                candidates: gs.meta?.illusionistId === socket.id
                    ? buildIllusionistCandidates(gs, socket.id)
                    : [],
            }
            : null;

        reply(cb, {
            success: true,
            lobbyState: sanitizeStateForLobby(gs),
            phase: gs.phase,
            inGame,
            phasePayload,
            rolePayload,
            pregameState,
            myId: socket.id,
        });
    });

    // ── GAME START & RESTART ──────────────────────────────────────────
    bindAckHandler("room:playAgain", ({ roomId }, cb) => {
        const result = resetRoom(socket.id, roomId);
        if (!result.success) return reply(cb, { success: false, error: result.error });
        updateRoomActivity(roomId);
        clearPendingIllusionistTimer(roomId);
        
        try {
            const gnosiaChannel = `${roomId}:gnosia`;
            const roomSockets = io.sockets.adapter.rooms.get(roomId);
            if (roomSockets) {
                for (const sid of roomSockets) {
                    const s = io.sockets.sockets.get(sid);
                    if (s) s.leave(gnosiaChannel);
                }
            }
        } catch (e) {
            console.error("Error clearing gnosia channel on playAgain", e);
        }

        const gs = getRoom(roomId);
        if (gs) io.to(roomId).emit("room:backToLobby", sanitizeStateForLobby(gs));
        reply(cb, { success: true });
    });

    bindAckHandler("game:start", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        if (gs.phase !== "LOBBY") return reply(cb, { success: false, error: "Game already started." });
        if (stateMachine.isGameStartScheduled(roomId) || gs.meta?.startPending) {
            return reply(cb, { success: false, error: "Game is already starting." });
        }

        const host = gs.players.find(p => p.id === socket.id);
        if (!host || !host.isHost) return reply(cb, { success: false, error: "Only host can start." });
        if (gs.players.length < 2) return reply(cb, { success: false, error: "Need at least 2 players." });

        try { assignRoles(gs); }
        catch (err) { return reply(cb, { success: false, error: err.message }); }

        const meta = gs.meta || (gs.meta = {});
        meta.startPending = true;
        reply(cb, { success: true });

        if (gs.players.some((player) => player.role === "illusionist")) {
            startIllusionistPregame(gs);
            return;
        }

        finalizeLobbyGameStart(gs);
    });

    bindAckHandler("pregame:illusionistInfect", ({ roomId, targetId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);

        const actor = gs.players.find((player) => player.id === socket.id);
        if (!actor || actor.role !== "illusionist") {
            return reply(cb, { success: false, error: "Not authorized." });
        }

        if (!gs.meta?.pendingIllusionistChoice || gs.meta?.illusionistId !== socket.id) {
            return reply(cb, { success: false, error: "The manifestation is already resolved." });
        }

        const result = resolveIllusionistInfection(gs, targetId || null);
        reply(cb, result);
    });

    // ── CHAT ──────────────────────────────────────────────────────────
    bindAckHandler("chat:message", ({ roomId, channel, text, targetId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);

        const sender = gs.players.find(p => p.id === socket.id);
        if (!sender) return reply(cb, { success: false, error: "You have been disconnected from the room." });

        const trimmed = (text || "").trim();
        if (!trimmed) return reply(cb, { success: false, error: "Empty message." });
        if (trimmed.length > 300) return reply(cb, { success: false, error: "Max 300 characters." });

        const { phase } = gs;

        let targetPersona = null;
        if (targetId && sender.role === "illusionist" && channel === "public") {
            targetPersona = gs.players.find(p => p.id === targetId);
        }

        if (channel === "public") {
            // Dead players can chat at any time, but only dead players can see their messages
            if (!sender.alive) {
                const msg = buildMessage(sender, trimmed, "public", targetPersona);
                const deadPlayers = gs.players.filter(p => !p.alive).map(p => p.id);
                deadPlayers.forEach(deadId => {
                    io.to(deadId).emit("chat:message", msg);
                });
                return reply(cb, { success: true });
            }
            
            // Alive players follow normal phase restrictions
            if (phase === "NIGHT") return reply(cb, { success: false, error: "Public chat closed at night." });
            if (phase === "VOTING") return reply(cb, { success: false, error: "Public chat closed during voting." });
            
            const msg = buildMessage(sender, trimmed, "public", targetPersona);
            // Alive player message - send to everyone (alive AND dead can spectate)
            io.to(roomId).emit("chat:message", msg);
            return reply(cb, { success: true });
        }

        if (channel === "gnosia") {
            if (!isGnosiaRole(sender.role)) return reply(cb, { success: false, error: "Channel not available." });
            if (phase !== "DAY_DISCUSSION" && phase !== "NIGHT")
                return reply(cb, { success: false, error: "Gnosia channel not active." });
            const msg = buildMessage(sender, trimmed, "gnosia");
            io.to(`${roomId}:gnosia`).emit("chat:message", msg);
            return reply(cb, { success: true });
        }

        reply(cb, { success: false, error: "Invalid channel." });
    });

    // ── SKIP & VOTING ─────────────────────────────────────────────────
    bindAckHandler("phase:skip", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        const player = gs.players.find(p => p.id === socket.id && p.alive);
        if (!player) return reply(cb, { success: false, error: "Not allowed." });

        if (gs.phase !== "DAY_DISCUSSION" && gs.phase !== "AFTERNOON") {
            return reply(cb, { success: false, error: "Cannot skip right now." });
        }

        // Dedup: ignore if this player already voted to skip
        if (gs.skipVotes[socket.id]) return reply(cb, { success: true });

        gs.skipVotes[socket.id] = true;
        const skipCount = Object.keys(gs.skipVotes).length;
        const aliveCount = gs.players.filter(p => p.alive).length;

        // Broadcast rich voter objects so every client can render avatars
        // without needing a players-array lookup that can fail on reconnect.
        const voterPayload = Object.keys(gs.skipVotes).map(id => {
            const p = gs.players.find(x => x.id === id);
            return p ? { id: p.id, username: p.username, profileId: p.profileId } : null;
        }).filter(Boolean);
        io.to(roomId).emit("phase:skip:updated", voterPayload);

        // All alive players have voted to skip — advance phase exactly once.
        if (skipCount >= aliveCount) {
            gs.skipVotes = {};  // clear before advance so re-entrant calls are no-ops
            stateMachine.forceAdvance(gs, null);
        }
        reply(cb, { success: true });
    });

    bindAckHandler("vote:submit", ({ roomId, targetId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        if (gs.phase !== "VOTING") return reply(cb, { success: false, error: "Not voting phase." });

        const voter = gs.players.find(p => p.id === socket.id && p.alive);
        if (!voter) return reply(cb, { success: false, error: "Cannot vote." });
        const target = gs.players.find(p => p.id === targetId && p.alive);
        if (!target) return reply(cb, { success: false, error: "Invalid target." });
        if (targetId === socket.id) return reply(cb, { success: false, error: "Cannot vote yourself." });

        // Check if voter has already voted (vote locking)
        if (gs.votes[socket.id]) {
            return reply(cb, { success: false, error: "Vote already locked. You cannot change your vote." });
        }

        gs.votes[socket.id] = targetId;
        voter.voteTarget = targetId;
        reply(cb, { success: true });

        const votesCast = Object.keys(gs.votes).length;
        const totalAlive = gs.players.filter(p => p.alive).length;
        io.to(roomId).emit("vote:progress", { votesCast, totalAlive });

        // Check if all alive players have voted — if yes, end voting early
        if (votesCast === totalAlive) {
            stateMachine.endVotingEarly(gs);
        }
    });

    bindAckHandler("vote:dismiss", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        if (gs.phase !== "VOTING") return reply(cb, { success: false, error: "Not voting phase." });

        const lawyer = gs.players.find(p => p.id === socket.id && p.alive);
        if (!lawyer) return reply(cb, { success: false, error: "Not allowed." });
        if (lawyer.role !== "lawyer") return reply(cb, { success: false, error: "Not authorized." });
        if (lawyer.dismissed) return reply(cb, { success: false, error: "Dismiss already used." });

        lawyer.dismissed = true;
        gs.votes = {};
        gs.skipVotes = {};
        reply(cb, { success: true });

        io.to(roomId).emit("vote:dismissed", {
            byUsername: lawyer.username,
            message: "Vote Cancelled",
        });
        stateMachine.dismissVoting(gs);
    });

    // ── NIGHT ACTIONS ─────────────────────────────────────────────────
    bindAckHandler("night:action", ({ roomId, actionType, targetId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        if (gs.phase !== "NIGHT") return reply(cb, { success: false, error: "Not night phase." });

        const actor = gs.players.find(p => p.id === socket.id && p.alive);
        if (!actor) return reply(cb, { success: false, error: "Cannot act." });

        const { nightActions, players } = gs;

        switch (actionType) {
            case "gnosia_vote": {
                if (!isGnosiaRole(actor.role)) return reply(cb, { success: false, error: "Not authorized." });
                if (nightActions.gnosiaVotes[socket.id]) return reply(cb, { success: false, error: "Action already submitted." });
                if (targetId !== "skip") {
                    const target = players.find(p => p.id === targetId && p.alive && p.id !== socket.id);
                    if (!target) return reply(cb, { success: false, error: "Invalid target." });
                    if (isGnosiaRole(target.role)) return reply(cb, { success: false, error: "Cannot vote for an ally." });
                }
                nightActions.gnosiaVotes[socket.id] = targetId;
                const gCount = players.filter((player) => player.alive && isGnosiaRole(player.role)).length;
                const vIn = Object.keys(nightActions.gnosiaVotes).length;
                io.to(`${roomId}:gnosia`).emit("night:gnosiaVoteProgress", { votesIn: vIn, totalGnosia: gCount });
                reply(cb, { success: true });
                break;
            }
            case "engineer": {
                if (actor.role !== "engineer") return reply(cb, { success: false, error: "Not authorized." });
                if (nightActions.engineerTarget) return reply(cb, { success: false, error: "Action already submitted." });
                const target = players.find(p => p.id === targetId && p.alive && p.id !== socket.id);
                if (!target) return reply(cb, { success: false, error: "Invalid target." });
                nightActions.engineerTarget = targetId;
                reply(cb, { success: true });

                // Immediately deliver private scan result (no need to wait for night end)
                const isGnosia = appearsGnosiaToEngineer(target);
                io.to(actor.id).emit("night:scanResult", {
                    targetId,
                    isGnosia,
                    targetUsername: target.username,
                });

                // If target is Gnosia, immediately alert them they were scanned
                if (isGnosia) {
                    io.to(targetId).emit("night:scannedAlert", {
                        message: "You have been scanned by the Engineer.",
                    });
                }
                break;
            }
            case "doctor": {
                if (actor.role !== "doctor") return reply(cb, { success: false, error: "Not authorized." });
                if (nightActions.doctorTarget) return reply(cb, { success: false, error: "Action already submitted." });
                const target = players.find(p => p.id === targetId && p.inColdSleep);
                if (!target) return reply(cb, { success: false, error: "Target not in Cold Sleep." });
                nightActions.doctorTarget = targetId;
                reply(cb, { success: true });

                // Immediately deliver private inspection result
                io.to(actor.id).emit("night:inspectResult", {
                    targetId,
                    role: getDoctorRevealRole(target),
                    targetUsername: target.username,
                    error: null,
                });
                break;
            }
            case "guardian": {
                if (actor.role !== "guardian") return reply(cb, { success: false, error: "Not authorized." });
                if (nightActions.guardianTarget) return reply(cb, { success: false, error: "Action already submitted." });
                if (targetId === socket.id) return reply(cb, { success: false, error: "Cannot self-protect." });
                const target = players.find(p => p.id === targetId && p.alive);
                if (!target) return reply(cb, { success: false, error: "Invalid target." });
                nightActions.guardianTarget = targetId;
                reply(cb, { success: true });
                break;
            }
            default:
                return reply(cb, { success: false, error: "Unknown action." });
        }

        if (nightResolver.allNightActionsSubmitted(gs)) {
            nightResolver.scheduleNightResolution(gs, 500);
        }
    });

    bindAckHandler("player:rollAura", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        const player = gs.players.find(p => p.id === socket.id);
        if (!player) return reply(cb, { success: false, error: "Player not found." });
        if ((player.rollsRemaining || 0) <= 0) return reply(cb, { success: false, error: "No rolls remaining." });

        const picked = AURA_ROLL_OPTIONS[Math.floor(Math.random() * AURA_ROLL_OPTIONS.length)];
        player.aura = picked;
        player.rollsRemaining -= 1;

        io.to(roomId).emit("player:auraUpdated", { playerId: socket.id, aura: picked, rollsRemaining: player.rollsRemaining });
        reply(cb, { success: true, aura: picked, rollsRemaining: player.rollsRemaining });
    });

    bindAckHandler("player:emote", ({ roomId, emote }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        const player = gs.players.find(p => p.id === socket.id);
        if (!player) return reply(cb, { success: false, error: "Player not found." });
        // Sanitize: only allow safe path-like src and short label
        const src   = String(emote?.src   || "").replace(/[^a-z0-9_.\-/]/gi, "").slice(0, 80);
        const label = String(emote?.label || "").replace(/[^a-z0-9 ]/gi, "").slice(0, 16).toUpperCase();
        const id    = String(emote?.id    || "").replace(/[^a-z0-9_]/gi, "").slice(0, 30);
        if (!src) return reply(cb, { success: false, error: "Invalid emote." });
        io.to(roomId).emit("player:emote", { playerId: socket.id, emote: { src, label, id } });
        reply(cb, { success: true });
    });

    bindAckHandler("player:selectAura", ({ roomId, aura }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        const player = gs.players.find(p => p.id === socket.id);
        if (!player) return reply(cb, { success: false, error: "Player not found." });
        
        if (!player.isHost) return reply(cb, { success: false, error: "Only the host can manually select an aura." });
        if (!AURA_ROLL_OPTIONS.includes(aura)) return reply(cb, { success: false, error: "Invalid aura." });

        player.aura = aura;
        io.to(roomId).emit("player:auraUpdated", { playerId: socket.id, aura, rollsRemaining: player.rollsRemaining });
        reply(cb, { success: true, aura });
    });

    // ── HOST DEBUG ────────────────────────────────────────────────────
    bindAckHandler("phase:forceAdvance", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        updateRoomActivity(roomId);
        reply(cb, stateMachine.forceAdvance(gs, socket.id));
    });

    // ── DISCONNECT ────────────────────────────────────────────────────
    socket.on("disconnect", () => {
        try {
            const info = markPlayerDisconnected(socket.id);
            if (!info.roomId) return;

            const gs = getRoom(info.roomId);
            if (gs) {
                io.to(`${info.roomId}:lobby`).emit("lobby:updated", { state: sanitizeStateForLobby(gs) });
            }

            scheduleDisconnectRemoval(io, socket.id, info.roomId);

            stateMachine.broadcastToRoom(info.roomId, "player:disconnected", {
                socketId: socket.id,
                username: info.username,
                recovering: true,
            });
        } catch (err) {
            console.error(`[Socket][disconnect] socket=${socket.id}`, err);
        }
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`\n🚀 Project Nebula — http://localhost:${PORT}`);
});

module.exports = { io };
