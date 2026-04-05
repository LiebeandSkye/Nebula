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
    markPlayerDisconnected, scheduleDisconnectRemoval, resumeSession, resetRoom
} = require("./rooms/roomManager");
const { assignRoles, getGnosiaIds, buildRolePayload } = require("./game/roles");
const stateMachine = require("./game/stateMachine");
const nightResolver = require("./game/nightResolver");

const app = express();
const httpServer = http.createServer(app);

// Always-safe origin allowlist: never blocks prod even if env var is missing.
const ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nebula-eight-self.vercel.app",   // production — hardcoded safety net
    process.env.CLIENT_URL,                   // also honour whatever Render has set
].filter(Boolean);

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            // Allow server-to-server / Postman (no origin header)
            if (!origin) return callback(null, true);
            if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        methods: ["GET", "POST"],
        credentials: true,
    },
    // Force websocket-first — avoids the polling CORS issue entirely on Render
    transports: ["websocket", "polling"],
    pingTimeout: 20000,
    pingInterval: 25000,
});

stateMachine.init(io);
nightResolver.init(io);

app.use(cors());
app.use(express.json());

// ── REST ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Message builder ───────────────────────────────────────────────────
function buildMessage(sender, text, channel) {
    return {
        id: crypto.randomUUID(),
        channel,
        text,
        senderId: sender.id,
        senderName: sender.username,
        profileId: sender.profileId,
        isAlive: sender.alive,
        timestamp: Date.now(),
    };
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
        reply(cb, { success: true, roomId: result.roomId, state: result.state });
    });

    bindAckHandler("room:join", ({ roomId, username, profileId, password, sessionToken }, cb) => {
        const result = joinRoom(socket.id, roomId, username, profileId, password, sessionToken || null);
        if (!result.success) return reply(cb, { success: false, error: result.error });
        socket.join(roomId);
        socket.join(`${roomId}:lobby`);
        reply(cb, { success: true, state: result.state });
        io.to(`${roomId}:lobby`).emit("lobby:updated", { state: result.state });
    });

    bindAckHandler("room:updateSettings", ({ roomId, settings }, cb) => {
        const result = updateSettings(socket.id, roomId, settings);
        if (!result.success) return reply(cb, { success: false, error: result.error });
        reply(cb, { success: true, state: result.state });
        io.to(`${roomId}:lobby`).emit("lobby:updated", { state: result.state });
    });

    bindAckHandler("room:getState", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        reply(cb, { success: true, state: sanitizeStateForLobby(gs) });
    });

    bindAckHandler("room:leave", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });

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

        socket.join(rid);
        socket.join(`${rid}:lobby`);
        if (player.role === "gnosia") {
            socket.join(`${rid}:gnosia`);
        }

        io.to(`${rid}:lobby`).emit("lobby:updated", { state: sanitizeStateForLobby(gs) });

        io.to(rid).emit("player:reconnected", {
            previousId: oldId,
            newId: socket.id,
            username: player.username,
        });

        const inGame = gs.phase !== "LOBBY" && gs.phase !== "END";
        const rolePayload = player.role ? buildRolePayload(player, gs) : null;
        const phasePayload = inGame ? stateMachine.buildPhasePayload(gs) : null;

        reply(cb, {
            success: true,
            lobbyState: sanitizeStateForLobby(gs),
            phase: gs.phase,
            inGame,
            phasePayload,
            rolePayload,
            myId: socket.id,
        });
    });

    // ── GAME START & RESTART ──────────────────────────────────────────
    bindAckHandler("room:playAgain", ({ roomId }, cb) => {
        const result = resetRoom(socket.id, roomId);
        if (!result.success) return reply(cb, { success: false, error: result.error });
        const gs = getRoom(roomId);
        if (gs) io.to(roomId).emit("room:backToLobby", sanitizeStateForLobby(gs));
        reply(cb, { success: true });
    });

    bindAckHandler("game:start", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        if (gs.phase !== "LOBBY") return reply(cb, { success: false, error: "Game already started." });
        if (stateMachine.isGameStartScheduled(roomId)) {
            return reply(cb, { success: false, error: "Game is already starting." });
        }

        const host = gs.players.find(p => p.id === socket.id);
        if (!host || !host.isHost) return reply(cb, { success: false, error: "Only host can start." });
        if (gs.players.length < 2) return reply(cb, { success: false, error: "Need at least 2 players." });

        try { assignRoles(gs); }
        catch (err) { return reply(cb, { success: false, error: err.message }); }

        const gnosiaChannel = `${roomId}:gnosia`;
        for (const gid of getGnosiaIds(gs)) {
            const s = io.sockets.sockets.get(gid);
            if (s) s.join(gnosiaChannel);
        }

        for (const player of gs.players) {
            io.to(player.id).emit("game:roleAssigned", buildRolePayload(player, gs));
        }

        reply(cb, { success: true });
        const gnosiaCount = gs.players.filter(p => p.role === "gnosia").length;
        io.to(roomId).emit("game:starting", { playerCount: gs.players.length, gnosiaCount });

        stateMachine.scheduleGameStart(gs, 5000);
    });

    // ── CHAT ──────────────────────────────────────────────────────────
    bindAckHandler("chat:message", ({ roomId, channel, text }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });

        const sender = gs.players.find(p => p.id === socket.id);
        if (!sender) return reply(cb, { success: false, error: "You have been disconnected from the room." });

        const trimmed = (text || "").trim();
        if (!trimmed) return reply(cb, { success: false, error: "Empty message." });
        if (trimmed.length > 300) return reply(cb, { success: false, error: "Max 300 characters." });

        const { phase } = gs;

        if (channel === "public") {
            // Dead players can chat at any time, but only dead players can see their messages
            if (!sender.alive) {
                const msg = buildMessage(sender, trimmed, "public");
                const deadPlayers = gs.players.filter(p => !p.alive).map(p => p.id);
                deadPlayers.forEach(deadId => {
                    io.to(deadId).emit("chat:message", msg);
                });
                return reply(cb, { success: true });
            }
            
            // Alive players follow normal phase restrictions
            if (phase === "NIGHT") return reply(cb, { success: false, error: "Public chat closed at night." });
            if (phase === "VOTING") return reply(cb, { success: false, error: "Public chat closed during voting." });
            
            const msg = buildMessage(sender, trimmed, "public");
            // Alive player message - send to everyone (alive AND dead can spectate)
            io.to(roomId).emit("chat:message", msg);
            return reply(cb, { success: true });
        }

        if (channel === "gnosia") {
            if (sender.role !== "gnosia") return reply(cb, { success: false, error: "Channel not available." });
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
        if (gs.phase !== "NIGHT") return reply(cb, { success: false, error: "Not night phase." });

        const actor = gs.players.find(p => p.id === socket.id && p.alive);
        if (!actor) return reply(cb, { success: false, error: "Cannot act." });

        const { nightActions, players } = gs;

        switch (actionType) {
            case "gnosia_vote": {
                if (actor.role !== "gnosia") return reply(cb, { success: false, error: "Not authorized." });
                if (nightActions.gnosiaVotes[socket.id]) return reply(cb, { success: false, error: "Action already submitted." });
                if (targetId !== "skip") {
                    const target = players.find(p => p.id === targetId && p.alive && p.id !== socket.id);
                    if (!target) return reply(cb, { success: false, error: "Invalid target." });
                    if (target.role === "gnosia") return reply(cb, { success: false, error: "Cannot vote for an ally." });
                }
                nightActions.gnosiaVotes[socket.id] = targetId;
                const gCount = players.filter(p => p.alive && p.role === "gnosia").length;
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
                const isGnosia = target.role === "gnosia";
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
                    role: target.role,
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
        console.log(`[ROLL] Attempting roll for socket ${socket.id} in room ${roomId}`);
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        const player = gs.players.find(p => p.id === socket.id);
        if (!player) return reply(cb, { success: false, error: "Player not found." });
        console.log(`[ROLL] Player ${player.username}: alive=${player.alive}, rollsRemaining=${player.rollsRemaining}`);
        if (player.alive && !player.inColdSleep) return reply(cb, { success: false, error: "Only the departed may roll." });
        if (player.rollsRemaining <= 0) return reply(cb, { success: false, error: "No rolls remaining this round." });

        const auras = [
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
            "aura-sparkle-red"
        ];
        console.log(`[ROLL] Available auras: ${auras.length} total`);
        console.log(`[ROLL] Aura list: ${auras.join(', ')}`);
        const picked = auras[Math.floor(Math.random() * auras.length)];
        console.log(`[ROLL] Random index: ${Math.floor(Math.random() * auras.length)}, picked: ${picked}`);
        player.aura = picked;
        player.rollsRemaining = (player.rollsRemaining || 2) - 1;
        console.log(`[ROLL] Success: ${player.username} got ${picked}, rolls remaining: ${player.rollsRemaining}`);

        io.to(roomId).emit("player:auraUpdated", { playerId: socket.id, aura: picked, rollsRemaining: player.rollsRemaining });
        reply(cb, { success: true, aura: picked, rollsRemaining: player.rollsRemaining });
    });

    bindAckHandler("player:selectAura", ({ roomId, aura }, cb) => {
        console.log(`[SELECT] Host ${socket.id} selecting aura ${aura} in room ${roomId}`);
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
        const player = gs.players.find(p => p.id === socket.id);
        if (!player) return reply(cb, { success: false, error: "Player not found." });
        
        // Manual selection only for the host after death
        if (!player.isHost) return reply(cb, { success: false, error: "Only the host can manually select an aura." });
        if (player.alive && !player.inColdSleep) return reply(cb, { success: false, error: "Only the departed may change their aura." });

        player.aura = aura;
        console.log(`[SELECT] Success: Host ${player.username} selected ${aura}`);

        io.to(roomId).emit("player:auraUpdated", { playerId: socket.id, aura, rollsRemaining: player.rollsRemaining });
        reply(cb, { success: true, aura });
    });


    // ── HOST DEBUG ────────────────────────────────────────────────────
    bindAckHandler("phase:forceAdvance", ({ roomId }, cb) => {
        const gs = getRoom(roomId);
        if (!gs) return reply(cb, { success: false, error: "Room not found." });
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
