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
        dismissed: false,
        aura: null,           // Equipped aura CSS class; persists until rerolled
        rollsRemaining: 0,   // Start with 0, get 1 on death, then +1 each later round
    };
}

function createGameState(roomId, settings = {}) {
    const now = Date.now();
    return {
        roomId,
        phase: "LOBBY",
        round: 0,
        lastActivityAt: now,
        meta: {
            phaseSeq: 0,
            nightResolvedSeq: null,
            startPending: false,
            pendingIllusionistChoice: false,
            illusionistId: null,
        },
        players: [],
        settings: {
            password: settings.password || null,
            hasEngineer: settings.hasEngineer || false,
            hasDoctor: settings.hasDoctor || false,
            hasGuardian: settings.hasGuardian || false,
            hasLawyer: settings.hasLawyer || false,
            hasTraitor: settings.hasTraitor || false,
            hasIllusionist: settings.hasIllusionist || false,
            gnosiaCount: settings.gnosiaCount || null, // null = auto (floor(n/3))
            lobbyMusicEnabled: settings.lobbyMusicEnabled !== false,
            endGameMusicEnabled: settings.endGameMusicEnabled !== false,
        },
        musicPlayback: {
            trackKey: settings.lobbyMusicEnabled === false ? null : "lobby",
            startedAt: settings.lobbyMusicEnabled === false ? null : now,
            loop: settings.lobbyMusicEnabled !== false,
            transitionDurationMs: 0,
            revision: 1,
            updatedAt: now,
        },
        nightActions: {
            gnosiaVotes: {},
            gnosiaTarget: null,
            engineerTarget: null,
            doctorTarget: null,
            guardianTarget: null,
        },
        votes: {},
        skipVotes: {},
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
    console.log(`[RESET] Resetting night flags for round ${gameState.round}`);
    for (const player of gameState.players) {
        player.protected = false;
        player.scanned = false;
        player.voteTarget = null;
        // Give everyone 1 roll at the start of each round (round 2+)
        if (gameState.round > 1) {
            player.rollsRemaining = 1;
        } else {
            player.rollsRemaining = 0;
        }
    }
    gameState.nightActions = {
        gnosiaVotes: {},
        gnosiaTarget: null,
        engineerTarget: null,
        doctorTarget: null,
        guardianTarget: null,
    };
    gameState.votes = {};
    gameState.skipVotes = {};
    gameState.nominations = {};
    gameState.morningReport = {
        killed: null, savedBy: null, coldSleep: null,
        killedUsername: null, coldSleepUsername: null,
    };
}

module.exports = { createGameState, createPlayer, resetNightFlags };
