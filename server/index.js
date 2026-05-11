/**
 * index.js — Project Nebula Server
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const stateMachine = require("./game/stateMachine");
const nightResolver = require("./game/nightResolver");
const { 
    startIllusionistPregame, 
    resolveIllusionistInfection, 
    clearPendingIllusionistTimer 
} = require("./game/illusionistManager");

// Handlers
const registerLobbyHandlers = require("./sockets/lobbyHandlers");
const registerGameHandlers = require("./sockets/gameHandlers");
const registerChatHandlers = require("./sockets/chatHandlers");
const registerAuraHandlers = require("./sockets/auraHandlers");

const app = express();
const httpServer = http.createServer(app);

// ── CORS & Socket.io Configuration ───────────────────────────────────
function normalizeOrigin(origin) {
    return String(origin || "").trim().replace(/\/$/, "");
}

function parseOriginList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(normalizeOrigin).filter(Boolean);
    return String(raw).split(/[,\s]+/).map(normalizeOrigin).filter(Boolean);
}

const STATIC_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nebula-eight-self.vercel.app",
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
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
        callback(null, true);
    } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
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
    transports: ["polling", "websocket"],
    pingTimeout: 60000, 
    pingInterval: 25000,
});

stateMachine.init(io);
nightResolver.init(io);

app.use(cors(corsOptions));
app.use(express.json());

// ── REST ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok", ts: Date.now(), uptimeSec: Math.floor(process.uptime()) });
});

// ── Socket.io ─────────────────────────────────────────────────────────
io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    const reply = (cb, payload) => {
        if (typeof cb === "function") cb(payload);
    };

    const bindAckHandler = (event, handler) => {
        socket.on(event, (payload = {}, cb) => {
            const ack = typeof cb === "function" ? cb : null;
            try {
                handler(payload || {}, ack);
            } catch (err) {
                const roomId = payload?.roomId || "n/a";
                console.error(`[Socket][${event}] room=${roomId} socket=${socket.id}`, err);
                reply(ack, { success: false, error: "Internal server error." });
            }
        });
    };

    const deps = {
        bindAckHandler,
        reply,
        clearPendingIllusionistTimer,
        startIllusionistPregame: (gs) => startIllusionistPregame(io, gs),
        resolveIllusionistInfection: (gs, targetId) => resolveIllusionistInfection(io, gs, targetId),
    };

    // Register modularized handlers
    registerLobbyHandlers(io, socket, deps);
    registerGameHandlers(io, socket, deps);
    registerChatHandlers(io, socket, deps);
    registerAuraHandlers(io, socket, deps);

    socket.on("disconnect", () => {
        try {
            const { markPlayerDisconnected, scheduleDisconnectRemoval, getRoom, sanitizeStateForLobby } = require("./rooms/roomManager");
            const info = markPlayerDisconnected(socket.id);
            if (!info.roomId) return;

            const gs = getRoom(info.roomId);
            if (gs) {
                io.to(`${info.roomId}:lobby`).emit("lobby:updated", { state: sanitizeStateForLobby(gs) });
            }

            scheduleDisconnectRemoval(io, socket.id, info.roomId);

            require("./game/stateMachine").broadcastToRoom(info.roomId, "player:disconnected", {
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
