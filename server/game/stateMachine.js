/**
 * stateMachine.js
 * Finite State Machine for Project Nebula.
 *
 * Valid transitions:
 *   LOBBY → DAY_DISCUSSION → VOTING → AFTERNOON → NIGHT → MORNING → (loop or END)
 *
 * This module:
 *   - Owns all phase timers (setTimeout handles)
 *   - Broadcasts phase changes to clients via io
 *   - Checks win conditions after every elimination
 *   - Never touches socket auth — that lives in index.js
 *
 * io is injected at init time to avoid circular imports.
 */

const { resetNightFlags } = require("./gameState");
const MUSIC_TRANSITION_MS = 1500;

// ── Phase durations (ms) ────────────────────────────────────────────
const PHASE_DURATIONS = {
    DAY_DISCUSSION_R1: 3 * 60 * 1000,  // Round 1: 3 minutes
    DAY_DISCUSSION: 3 * 60 * 1000,  // Round 2+: 3 minutes
    VOTING: 90 * 1000,       // 90 seconds for nominations + vote
    VOTE_REVEAL: 5 * 1000,   // 5 seconds overlay showing votes
    AFTERNOON: 60 * 1000,       // 60-second cooldown chat
    NIGHT: 60 * 1000,       // Night actions window
    MORNING: 15 * 1000,       // Results reveal before next day
};

// Active timer handles: roomId → TimeoutHandle
const activeTimers = new Map();
const pendingGameStarts = new Map();

// io instance — injected via init()
let _io = null;

/**
 * Must be called once from index.js after io is created.
 * @param {object} io — Socket.io server instance
 */
function init(io) {
    _io = io;
}

function ensureMeta(gameState) {
    if (!gameState.meta || typeof gameState.meta !== "object") {
        gameState.meta = { phaseSeq: 0, nightResolvedSeq: null };
    }
    if (typeof gameState.meta.phaseSeq !== "number") {
        gameState.meta.phaseSeq = 0;
    }
    if (!Object.prototype.hasOwnProperty.call(gameState.meta, "nightResolvedSeq")) {
        gameState.meta.nightResolvedSeq = null;
    }
    return gameState.meta;
}

function clearPendingGameStart(roomId) {
    if (!pendingGameStarts.has(roomId)) return;
    clearTimeout(pendingGameStarts.get(roomId));
    pendingGameStarts.delete(roomId);
}

function isGameStartScheduled(roomId) {
    return pendingGameStarts.has(roomId);
}

function isCurrentPhase(gameState, expectedPhase, expectedSeq) {
    const meta = ensureMeta(gameState);
    return gameState.phase === expectedPhase && meta.phaseSeq === expectedSeq;
}

// ─────────────────────────────────────────────
// GAME START
// ─────────────────────────────────────────────

/**
 * Starts the game from LOBBY.
 * Called after roles are assigned and Gnosia channels are joined.
 * Transitions to DAY_DISCUSSION immediately.
 *
 * @param {object} gameState
 */
function startGame(gameState) {
    if (gameState.phase !== "LOBBY") {
        console.warn(`[FSM] Ignored startGame for room ${gameState.roomId} from phase ${gameState.phase}`);
        return false;
    }

    gameState.round = 1;
    transitionTo(gameState, "DAY_DISCUSSION");
    return true;
}

function scheduleGameStart(gameState, delayMs = 0) {
    clearPendingGameStart(gameState.roomId);

    const meta = ensureMeta(gameState);
    const expectedSeq = meta.phaseSeq;
    const handle = setTimeout(() => {
        pendingGameStarts.delete(gameState.roomId);
        if (!isCurrentPhase(gameState, "LOBBY", expectedSeq)) return;
        try {
            startGame(gameState);
        } catch (err) {
            console.error(`[FSM] Failed to start game in room ${gameState.roomId}`, err);
        }
    }, delayMs);

    pendingGameStarts.set(gameState.roomId, handle);
    return true;
}

// ─────────────────────────────────────────────
// PHASE TRANSITION CORE
// ─────────────────────────────────────────────

/**
 * Transitions gameState to a new phase.
 * Sets timer metadata, broadcasts to clients, schedules auto-advance.
 *
 * @param {object} gameState
 * @param {string} nextPhase
 */
function transitionTo(gameState, nextPhase) {
    clearRoomTimer(gameState.roomId);
    clearPendingGameStart(gameState.roomId);

    const meta = ensureMeta(gameState);
    meta.phaseSeq += 1;
    gameState.phase = nextPhase;
    gameState.skipVotes = {}; // Clear skip votes for the new phase

    const durationMs = getPhaseDuration(nextPhase, gameState.round);
    const endsAt = Date.now() + durationMs;

    // Update timer metadata (broadcast to clients for countdown UI)
    gameState.timers = {
        phase: nextPhase,
        endsAt,
        durationMs,
    };

    console.log(
        `[FSM] Room ${gameState.roomId} → ${nextPhase} (${durationMs / 1000}s) round ${gameState.round}`
    );

    // Broadcast phase change to all room members
    broadcastPhase(gameState);

    // Schedule automatic phase advance
    const phaseSeq = meta.phaseSeq;
    const handle = setTimeout(() => {
        if (!isCurrentPhase(gameState, nextPhase, phaseSeq)) return;
        onPhaseExpired(gameState);
    }, durationMs);

    activeTimers.set(gameState.roomId, handle);
}

// ─────────────────────────────────────────────
// PHASE EXPIRY HANDLERS
// ─────────────────────────────────────────────

/**
 * Called when a phase timer expires naturally.
 * Drives the FSM forward.
 */
function onPhaseExpired(gameState) {
    const { phase } = gameState;

    switch (phase) {
        case "DAY_DISCUSSION":
            transitionTo(gameState, "VOTING");
            break;

        case "VOTING":
            // Resolve vote — eliminate player with most votes (ties: no elimination)
            resolveVote(gameState);
            // Check win before continuing
            if (checkWin(gameState)) return;
            transitionTo(gameState, "VOTE_REVEAL");
            break;

        case "VOTE_REVEAL":
            transitionTo(gameState, "AFTERNOON");
            break;

        case "AFTERNOON":
            transitionTo(gameState, "NIGHT");
            break;

        case "NIGHT":
            // Night actions are resolved by nightResolver.js (Part 3).
            // stateMachine only drives the timer here — nightResolver calls
            // advanceToMorning() when all actions are submitted or time expires.
            require("./nightResolver").resolveNight(gameState);
            break;

        case "MORNING":
            // Start next round
            gameState.round += 1;
            resetNightFlags(gameState);
            transitionTo(gameState, "DAY_DISCUSSION");
            break;

        default:
            console.warn(`[FSM] Unhandled phase expiry: ${phase}`);
    }
}

// ─────────────────────────────────────────────
// EARLY PHASE ADVANCES
// ─────────────────────────────────────────────

/**
 * Manually ends voting phase when all players have voted.
 * Called from vote:submit when vote count reaches total alive players.
 * @param {object} gameState
 */
function endVotingEarly(gameState) {
    if (gameState.phase !== "VOTING") return;

    clearRoomTimer(gameState.roomId);
    resolveVote(gameState);
    if (checkWin(gameState)) return;
    transitionTo(gameState, "VOTE_REVEAL");
}

/**
 * Called when the Lawyer dismisses the vote. Skips resolution entirely
 * and advances directly to AFTERNOON — no elimination occurs.
 * @param {object} gameState
 */
function dismissVoting(gameState) {
    if (gameState.phase !== "VOTING") return;

    clearRoomTimer(gameState.roomId);
    transitionTo(gameState, "AFTERNOON");
}
// ─────────────────────────────────────────────
// VOTING RESOLUTION
// ─────────────────────────────────────────────

/**
 * Tallies votes and eliminates the player with a strict majority.
 * Ties result in no elimination (announced to room).
 * @param {object} gameState
 */
function resolveVote(gameState) {
    const { votes, players } = gameState;

    // Count votes per target
    const tally = {};
    for (const targetId of Object.values(votes)) {
        tally[targetId] = (tally[targetId] || 0) + 1;
    }

    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        // No votes cast
        gameState.morningReport.coldSleep = null;
        broadcastToRoom(gameState.roomId, "vote:result", {
            eliminated: null,
            reason: "No votes were cast.",
            votes: gameState.votes,
        });
        return;
    }

    const [topId, topVotes] = entries[0];
    const isTie = entries.length > 1 && entries[1][1] === topVotes;

    if (isTie) {
        gameState.morningReport.coldSleep = null;
        broadcastToRoom(gameState.roomId, "vote:result", {
            eliminated: null,
            reason: "Tie — no one enters Cold Sleep.",
            votes: gameState.votes,
        });
        return;
    }

    // Eliminate the target
    const target = players.find((p) => p.id === topId);
    if (target) {
        target.alive = false;
        target.inColdSleep = true;
        target.rollsRemaining = 1;
        console.log(`[DEATH] ${target.username} voted out, given 1 roll`);
        gameState.morningReport.coldSleep = topId;
        console.log(`[FSM] ${target.username} voted into Cold Sleep (${topVotes} votes)`);
    }

    broadcastToRoom(gameState.roomId, "vote:result", {
        eliminated: topId,
        eliminatedUsername: target?.username,
        voteCount: topVotes,
        reason: null,
        votes: gameState.votes,
    });
}

// ─────────────────────────────────────────────
// MORNING TRANSITION (called by nightResolver)
// ─────────────────────────────────────────────

/**
 * Called by nightResolver.js after all night actions resolve.
 * Applies the kill result (already set on gameState by nightResolver),
 * then transitions to MORNING.
 *
 * @param {object} gameState
 */
function advanceToMorning(gameState) {
    clearRoomTimer(gameState.roomId);

    // Win check after night kill
    if (checkWin(gameState)) return;

    transitionTo(gameState, "MORNING");
}

// ─────────────────────────────────────────────
// WIN CONDITION
// ─────────────────────────────────────────────

/**
 * Checks if either faction has won.
 * Humans win  → all Gnosia eliminated
 * Gnosia win  → Gnosia count >= Human count (among alive players)
 *
 * If a winner is found: sets gameState.winner, broadcasts, clears timers.
 *
 * @param {object} gameState
 * @returns {boolean} true if game is over
 */
function checkWin(gameState) {
    const meta = ensureMeta(gameState);
    const alivePlayers = gameState.players.filter((p) => p.alive);
    const aliveGnosia = alivePlayers.filter((p) => p.role === "gnosia");
    const aliveHumans = alivePlayers.filter((p) => p.role !== "gnosia");

    let winner = null;

    if (aliveGnosia.length === 0) {
        winner = "humans";
    } else if (aliveGnosia.length >= aliveHumans.length) {
        winner = "gnosia";
    }

    if (!winner) return false;

    gameState.phase = "END";
    meta.phaseSeq += 1;
    gameState.winner = winner;
    clearRoomTimer(gameState.roomId);
    gameState.timers = {
        phase: "END",
        endsAt: null,
        durationMs: null,
    };

    console.log(`[FSM] Game over in room ${gameState.roomId} — ${winner} win!`);

    // Reveal all roles on game end
    const roleReveal = gameState.players.map((p) => ({
        id: p.id,
        username: p.username,
        profileId: p.profileId,
        role: p.role,
        alive: p.alive,
        inColdSleep: p.inColdSleep,
    }));

    broadcastToRoom(gameState.roomId, "game:over", {
        winner,
        players: roleReveal,
    });
    playEndGameMusic(gameState, winner);

    return true;
}

// ─────────────────────────────────────────────
// MANUAL PHASE SKIP (host debug / admin)
// ─────────────────────────────────────────────

/**
 * Allows host to force-advance the phase (useful during testing).
 * @param {object} gameState
 * @param {string} socketId — must be host
 * @returns {{ success: boolean, error?: string }}
 */
function forceAdvance(gameState, socketId) {
    const host = gameState.players.find((p) => p.id === socketId && p.isHost);
    if (socketId && !host) return { success: false, error: "Only the host can force-advance." };

    onPhaseExpired(gameState);
    return { success: true };
}

function resetToLobby(gameState) {
    const playback = ensureMusicState(gameState);
    const hadActiveTrack = !!playback.trackKey;
    clearRoomTimer(gameState.roomId);
    clearPendingGameStart(gameState.roomId);
    const meta = ensureMeta(gameState);
    meta.phaseSeq += 1;
    meta.nightResolvedSeq = null;
    gameState.phase = "LOBBY";
    gameState.round = 0;
    gameState.winner = null;
    gameState.timers = {
        phase: null,
        endsAt: null,
        durationMs: null,
    };
    gameState.players.forEach(p => {
        p.role = null;
        p.alive = true;
        p.inColdSleep = false;
        p.voteTarget = null;
        p.protected = false;
        p.scanned = false;
        p.dismissed = false;
        p.aura = null;
        p.rollsRemaining = 0;
    });
    resetNightFlags(gameState);
    if (gameState.settings.lobbyMusicEnabled === false) {
        stopRoomMusic(gameState, hadActiveTrack ? MUSIC_TRANSITION_MS : 0);
    } else {
        syncLobbyMusic(gameState, {
            forceRestart: true,
            delayMs: hadActiveTrack ? MUSIC_TRANSITION_MS : 0,
            transitionDurationMs: hadActiveTrack ? MUSIC_TRANSITION_MS : 0,
        });
    }
    
    broadcastToRoom(gameState.roomId, "phase:changed", buildPhasePayload(gameState));
    console.log(`[FSM] Room ${gameState.roomId} reset to LOBBY`);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getPhaseDuration(phase, round) {
    if (phase === "DAY_DISCUSSION") {
        return round === 1
            ? PHASE_DURATIONS.DAY_DISCUSSION_R1
            : PHASE_DURATIONS.DAY_DISCUSSION;
    }
    return PHASE_DURATIONS[phase] || 60 * 1000;
}

function clearRoomTimer(roomId) {
    if (activeTimers.has(roomId)) {
        clearTimeout(activeTimers.get(roomId));
        activeTimers.delete(roomId);
    }
}

function ensureMusicState(gameState) {
    if (!gameState.settings) gameState.settings = {};
    if (typeof gameState.settings.lobbyMusicEnabled !== "boolean") {
        gameState.settings.lobbyMusicEnabled = true;
    }
    if (typeof gameState.settings.endGameMusicEnabled !== "boolean") {
        gameState.settings.endGameMusicEnabled = true;
    }
    if (!gameState.musicPlayback || typeof gameState.musicPlayback !== "object") {
        gameState.musicPlayback = {
            trackKey: null,
            startedAt: null,
            loop: false,
            transitionDurationMs: 0,
            revision: 0,
            updatedAt: Date.now(),
        };
    }
    if (typeof gameState.musicPlayback.revision !== "number") {
        gameState.musicPlayback.revision = 0;
    }
    return gameState.musicPlayback;
}

function buildMusicPayload(gameState) {
    const playback = ensureMusicState(gameState);
    return {
        settings: {
            lobbyMusicEnabled: gameState.settings.lobbyMusicEnabled !== false,
            endGameMusicEnabled: gameState.settings.endGameMusicEnabled !== false,
        },
        playback: {
            trackKey: playback.trackKey || null,
            startedAt: playback.startedAt || null,
            loop: !!playback.loop,
            transitionDurationMs: playback.transitionDurationMs || 0,
            revision: playback.revision || 0,
            updatedAt: playback.updatedAt || null,
        },
        serverNow: Date.now(),
    };
}

function broadcastMusicState(gameState) {
    broadcastToRoom(gameState.roomId, "music:state", buildMusicPayload(gameState));
}

function setMusicPlayback(gameState, {
    trackKey = null,
    startedAt = null,
    loop = false,
    transitionDurationMs = 0,
} = {}) {
    const playback = ensureMusicState(gameState);
    playback.trackKey = trackKey;
    playback.startedAt = startedAt;
    playback.loop = !!loop;
    playback.transitionDurationMs = transitionDurationMs;
    playback.revision += 1;
    playback.updatedAt = Date.now();
    broadcastMusicState(gameState);
}

function stopRoomMusic(gameState, transitionDurationMs = MUSIC_TRANSITION_MS) {
    setMusicPlayback(gameState, {
        trackKey: null,
        startedAt: null,
        loop: false,
        transitionDurationMs,
    });
}

function syncLobbyMusic(gameState, {
    forceRestart = false,
    delayMs = 0,
    transitionDurationMs = 0,
} = {}) {
    const playback = ensureMusicState(gameState);
    if (gameState.settings.lobbyMusicEnabled === false) {
        stopRoomMusic(gameState, transitionDurationMs || MUSIC_TRANSITION_MS);
        return;
    }

    if (!forceRestart && playback.trackKey === "lobby" && gameState.phase === "LOBBY" && delayMs === 0) {
        return;
    }

    setMusicPlayback(gameState, {
        trackKey: "lobby",
        startedAt: Date.now() + delayMs,
        loop: true,
        transitionDurationMs,
    });
}

function playEndGameMusic(gameState, winner, transitionDurationMs = MUSIC_TRANSITION_MS) {
    if (gameState.settings.endGameMusicEnabled === false) {
        stopRoomMusic(gameState, transitionDurationMs);
        return;
    }

    setMusicPlayback(gameState, {
        trackKey: winner === "humans" ? "humanWin" : "gnosiaWin",
        startedAt: Date.now() + transitionDurationMs,
        loop: true,
        transitionDurationMs,
    });
}

/**
 * Broadcasts to all sockets in a room (both public and Gnosia channels).
 */
function broadcastToRoom(roomId, event, data) {
    if (!_io) return;
    _io.to(roomId).emit(event, data);
}

/**
 * Broadcasts the full phase-change payload.
 * Clients use this to update their UI and start countdown timers.
 */
function buildPhasePayload(gameState) {
    const gnosiaCount = gameState.players.filter((p) => p.role === "gnosia").length;

    // Emit rich voter objects (same shape as phase:skip:updated) so clients
    // can render skip avatars directly without a fragile players-array lookup.
    const skipVoters = Object.keys(gameState.skipVotes || {}).map(id => {
        const p = gameState.players.find(x => x.id === id);
        return p ? { id: p.id, username: p.username, profileId: p.profileId } : null;
    }).filter(Boolean);

    return {
        phase: gameState.phase,
        round: gameState.round,
        timers: gameState.timers,
        gnosiaCount,
        skipVotes: skipVoters,
        morningReport: gameState.morningReport || null,
        players: gameState.players.map((p) => ({
            id: p.id,
            username: p.username,
            profileId: p.profileId,
            profileName: p.profileName || null,
            alive: p.alive,
            inColdSleep: p.inColdSleep,
            isHost: p.isHost,
            disconnected: !!p.disconnected,
            aura: p.aura,
            rollsRemaining: p.rollsRemaining,
        })),
    };
}

function broadcastPhase(gameState) {
    broadcastToRoom(gameState.roomId, "phase:changed", buildPhasePayload(gameState));
}

/**
 * Cleans up all timers for a room (called on room destroy).
 * @param {string} roomId
 */
function cleanupRoom(roomId) {
    clearRoomTimer(roomId);
    clearPendingGameStart(roomId);
}

module.exports = {
    init,
    startGame,
    scheduleGameStart,
    isGameStartScheduled,
    transitionTo,
    endVotingEarly,
    dismissVoting,
    advanceToMorning,
    checkWin,
    forceAdvance,
    resetToLobby,
    cleanupRoom,
    broadcastToRoom,
    broadcastPhase,
    buildPhasePayload,
    PHASE_DURATIONS,
    MUSIC_TRANSITION_MS,
    buildMusicPayload,
    broadcastMusicState,
    syncLobbyMusic,
    stopRoomMusic,
    playEndGameMusic,
};
