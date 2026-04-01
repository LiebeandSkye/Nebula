/**
 * gameState.js — Authoritative game state factory.
 */

function createPlayer(socketId, username, profileId, isHost = false, sessionToken = null) {
    return {
        id: socketId,
        username,
        profileId,
        sessionToken: sessionToken || null,
        disconnected: false,
        isHost,
        role: null,
        alive: true,
        inColdSleep: false,
        voteTarget: null,
        protected: false,
        scanned: false,
    };
}

function createGameState(roomId, settings = {}) {
    return {
        roomId,
        phase: "LOBBY",
        round: 0,
        players: [],
        settings: {
            password: settings.password || null,
            hasEngineer: settings.hasEngineer || false,
            hasDoctor: settings.hasDoctor || false,
            hasGuardian: settings.hasGuardian || false,
            gnosiaCount: settings.gnosiaCount || null, // null = auto (floor(n/3))
        },
        nightActions: {
            gnosiaVotes: {},
            gnosiaTarget: null,
            engineerTarget: null,
            doctorTarget: null,
            guardianTarget: null,
        },
        votes: {},
        nominations: {},
        timers: {
            phase: null,
            endsAt: null,
            durationMs: null,
        },
        morningReport: {
            killed: null,
            savedBy: null,
            coldSleep: null,
            killedUsername: null,
            coldSleepUsername: null,
        },
        winner: null,
    };
}

function resetNightFlags(gameState) {
    for (const player of gameState.players) {
        player.protected = false;
        player.scanned = false;
        player.voteTarget = null;
    }
    gameState.nightActions = {
        gnosiaVotes: {},
        gnosiaTarget: null,
        engineerTarget: null,
        doctorTarget: null,
        guardianTarget: null,
    };
    gameState.votes = {};
    gameState.nominations = {};
    gameState.morningReport = {
        killed: null, savedBy: null, coldSleep: null,
        killedUsername: null, coldSleepUsername: null,
    };
}

module.exports = { createGameState, createPlayer, resetNightFlags };