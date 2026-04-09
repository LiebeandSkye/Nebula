/**
 * App.jsx - Screen router and reconnect/wake coordinator.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket, useSocketEvent } from "./hooks/useSocket";
import { useRoomMusic } from "./hooks/useRoomMusic";
import Lobby from "./pages/Lobby.jsx";
import Game from "./pages/Game.jsx";
import { clearPlaySession, loadPlaySession } from "./lib/sessionPersistence.js";

const ROLE_COLORS = {
    gnosia: "#9b30ff", engineer: "#00f5ff", doctor: "#b0ffb8",
    guardian: "#ffd700", human: "#c8b8ff", lawyer: "#ff8833", traitor: "#ff4040",
};
const ROLE_ICONS = { gnosia: "👁", engineer: "⚡", doctor: "☤", guardian: "🛡", human: "◈", lawyer: "⚖", traitor: "◈" };

const SERVER_BASE_URL = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
const HEALTH_URL = SERVER_BASE_URL ? `${SERVER_BASE_URL}/api/health` : "/api/health";
const WAKE_ATTEMPT_DELAYS_MS = [0, 500, 1000, 2000, 3000, 5000];
const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 4000, 7000, 10000];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wakeProbe() {
    try {
        // no-cors avoids noisy browser CORS failures while still waking Render.
        await fetch(HEALTH_URL, {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
        });
        return true;
    } catch {
        return false;
    }
}

function RoleReveal({ roleData }) {
    const color = ROLE_COLORS[roleData.role] || "#c8b8ff";
    const icon = ROLE_ICONS[roleData.role] || "◈";
    return (
        <div className="crt star-bg" style={{
            position: "fixed", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 24, padding: 32, zIndex: 50,
            animation: "fadeIn 0.4s ease",
        }}>
            <p style={{ fontSize: 9, color: "#4a3060", letterSpacing: "0.2em" }}>
                YOUR DESIGNATION
            </p>
            <div style={{
                border: `2px solid ${color}66`, padding: 40,
                maxWidth: 440, width: "100%",
                background: roleData.role === "gnosia" ? "#13002588" : "#0d002088",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
                boxShadow: `0 0 40px ${color}22`,
            }}>
                <div style={{
                    width: 96, height: 96,
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 24px ${color}66`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 48, color,
                    background: color + "12",
                }}>
                    {icon}
                </div>
                <h2 style={{
                    fontSize: 22, color,
                    textShadow: `0 0 16px ${color}aa`,
                    letterSpacing: "0.08em",
                }}>
                    {roleData.role.toUpperCase()}
                </h2>
                <p style={{ fontSize: 9, color: "#8a7aa0", textAlign: "center", lineHeight: 2 }}>
                    {roleData.description}
                </p>
                {roleData.role === "gnosia" && roleData.gnosiaAllies?.length > 0 && (
                    <div style={{ width: "100%", borderTop: "1px solid #2a1a4a", paddingTop: 16 }}>
                        <p style={{
                            fontSize: 8, color: "#9b30ff", marginBottom: 10,
                            letterSpacing: "0.15em"
                        }}>
                            YOUR ALLIES
                        </p>
                        {roleData.gnosiaAllies.map((a) => (
                            <div key={a.id} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "8px 10px", marginBottom: 6,
                                border: "1px solid #9b30ff33", background: "#13002533",
                            }}>
                                <div style={{
                                    width: 36, height: 36, flexShrink: 0,
                                    overflow: "hidden", border: "1px solid #9b30ff44",
                                }}>
                                    <img src={`/profiles/${a.profileId}.jpg`} alt={a.username}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={(e) => { e.target.style.display = "none"; }} />
                                </div>
                                <span style={{ fontSize: 10, color: "#c8b8ff" }}>{a.username}</span>
                                <span style={{ fontSize: 8, color: "#4a3060", marginLeft: "auto" }}>
                                    {a.profileName || ""}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <p style={{ fontSize: 8, color: "#2a1a3a", animation: "flicker 1s infinite" }}>
                MISSION BEGINS SHORTLY...
            </p>
        </div>
    );
}

function ReconnectBanner({ visible, text }) {
    if (!visible) return null;
    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000000,
            marginTop: 12,
            padding: "12px 22px",
            background: "#0d0020f2",
            border: "1px solid #00f5ff44",
            color: "#00f5ff",
            fontSize: 9,
            fontFamily: "Press Start 2P, monospace",
            boxShadow: "0 0 24px #000",
            animation: "fadeInUp 0.2s ease",
            pointerEvents: "none",
        }}>
            {text}
        </div>
    );
}

export default function App() {
    const { socket, connected, reconnecting, connectSocket } = useSocket();
    const [screen, setScreen] = useState("lobby");
    const [roleData, setRoleData] = useState(null);
    const [session, setSession] = useState({
        roomId: null, myId: null, myRole: null, myProfileId: null, allies: [], phase: null,
        gnosiaCount: null,
        lastPhasePayload: null,
        sessionToken: null,
    });
    const [lobbyResume, setLobbyResume] = useState(null);
    const [resumeBusy, setResumeBusy] = useState(false);
    const [wakeStage, setWakeStage] = useState("idle"); // idle | waking | connecting

    const screenRef = useRef(screen);
    const connectCycleRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptRef = useRef(0);

    const {
        musicVolume,
        setMusicVolume,
        musicMuted,
        setMusicMuted,
    } = useRoomMusic(session.roomId);

    useEffect(() => {
        screenRef.current = screen;
    }, [screen]);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const runWakeThenConnect = useCallback(async () => {
        if (socket.connected) {
            setWakeStage("idle");
            return;
        }
        if (connectCycleRef.current) {
            return;
        }

        connectCycleRef.current = (async () => {
            setWakeStage("waking");
            let woke = false;
            for (const delayMs of WAKE_ATTEMPT_DELAYS_MS) {
                if (delayMs > 0) {
                    await sleep(delayMs);
                }
                woke = await wakeProbe();
                if (woke) {
                    break;
                }
            }

            // Even if wake probe cannot confirm, still try socket connect.
            setWakeStage("connecting");
            connectSocket();
        })().finally(() => {
            connectCycleRef.current = null;
        });
    }, [socket.connected, connectSocket]);

    const scheduleReconnect = useCallback(() => {
        clearReconnectTimer();
        const idx = Math.min(reconnectAttemptRef.current, RECONNECT_BACKOFF_MS.length - 1);
        const delayMs = RECONNECT_BACKOFF_MS[idx];
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
            runWakeThenConnect();
        }, delayMs);
    }, [clearReconnectTimer, runWakeThenConnect]);

    useEffect(() => {
        const kickoff = setTimeout(() => {
            runWakeThenConnect();
        }, 0);
        return () => {
            clearTimeout(kickoff);
            clearReconnectTimer();
        };
    }, [runWakeThenConnect, clearReconnectTimer]);

    useEffect(() => {
        function onConnect() {
            reconnectAttemptRef.current = 0;
            clearReconnectTimer();
            setWakeStage("idle");
        }
        function onDisconnect() {
            scheduleReconnect();
        }
        function onConnectError() {
            scheduleReconnect();
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
        };
    }, [socket, scheduleReconnect, clearReconnectTimer]);

    const tryResumeSession = useCallback(() => {
        const stored = loadPlaySession();
        if (!stored?.roomId || !stored.sessionToken || !stored.username || !stored.profileId) {
            setResumeBusy(false);
            return;
        }
        setResumeBusy(true);
        socket.emit("session:resume", {
            roomId: stored.roomId,
            username: stored.username,
            profileId: stored.profileId,
            sessionToken: stored.sessionToken,
            password: stored.password,
        }, (res) => {
            setResumeBusy(false);
            if (!res?.success) {
                clearPlaySession();
                setLobbyResume(null);
                setRoleData(null);
                setSession({
                    roomId: null,
                    myId: null,
                    myRole: null,
                    myProfileId: null,
                    allies: [],
                    phase: null,
                    gnosiaCount: null,
                    lastPhasePayload: null,
                    sessionToken: null,
                });
                setScreen("lobby");
                return;
            }

            setSession((s) => ({
                ...s,
                roomId: stored.roomId,
                myId: res.myId,
                myProfileId: stored.profileId,
                sessionToken: stored.sessionToken,
                ...(res.rolePayload ? { myRole: res.rolePayload.role, allies: res.rolePayload.gnosiaAllies || [] } : {}),
                ...(res.phasePayload ? {
                    lastPhasePayload: res.phasePayload,
                    phase: res.phasePayload.phase,
                    gnosiaCount: typeof res.phasePayload.gnosiaCount === "number"
                        ? res.phasePayload.gnosiaCount
                        : s.gnosiaCount,
                } : {}),
            }));

            setLobbyResume(null);
            if (res.rolePayload && res.phase === "LOBBY") {
                setRoleData(res.rolePayload);
                setScreen("roleReveal");
                return;
            }
            if (res.inGame && res.phasePayload) {
                setScreen("game");
                return;
            }
            setLobbyResume({
                lobbyState: res.lobbyState,
                roomId: stored.roomId,
                myId: res.myId,
            });
            setScreen("lobby");
        });
    }, [socket]);

    // Render keep-awake heartbeat (best effort).
    useEffect(() => {
        const ping = () => {
            wakeProbe().catch(() => {});
        };

        ping();
        // Heartbeat every 2 minutes to be safe (Render has a 15 min idle timeout)
        const interval = setInterval(ping, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function onConnect() {
            tryResumeSession();
        }
        socket.on("connect", onConnect);
        if (socket.connected) {
            setTimeout(() => {
                tryResumeSession();
            }, 0);
        }
        return () => socket.off("connect", onConnect);
    }, [socket, tryResumeSession]);

    useSocketEvent("game:roleAssigned", (payload) => {
        setRoleData(payload);
        setSession((s) => ({ ...s, myRole: payload.role, allies: payload.gnosiaAllies || [] }));
        setScreen("roleReveal");
    });

    useSocketEvent("game:starting", ({ gnosiaCount }) => {
        setSession((s) => ({ ...s, gnosiaCount: typeof gnosiaCount === "number" ? gnosiaCount : s.gnosiaCount }));
    });

    useSocketEvent("phase:changed", (payload) => {
        setSession((s) => ({
            ...s,
            phase: payload.phase,
            lastPhasePayload: payload,
            gnosiaCount: typeof payload.gnosiaCount === "number" ? payload.gnosiaCount : s.gnosiaCount,
        }));
        if (screenRef.current !== "game") setScreen("game");
    });

    useSocketEvent("room:backToLobby", (lobbyState) => {
        setLobbyResume({ lobbyState, roomId: session.roomId, myId: session.myId });
        setSession((s) => ({ ...s, phase: "LOBBY", myRole: null }));
        setRoleData(null);
        setScreen("lobby");
    });

    function handleLobbyReady(roomId, myId, myProfileId) {
        setSession((s) => ({
            ...s,
            roomId,
            myId,
            myProfileId,
            sessionToken: loadPlaySession()?.sessionToken || s.sessionToken,
        }));
    }

    const stored = typeof window !== "undefined" ? loadPlaySession() : null;
    const hasStoredSession = !!stored?.roomId;

    const showReconnectBanner = hasStoredSession && (
        wakeStage !== "idle" ||
        !connected ||
        reconnecting ||
        resumeBusy
    );

    const bannerText = wakeStage === "waking"
        ? "WAKING SERVER..."
        : wakeStage === "connecting" || !connected
            ? "CONNECTING..."
            : resumeBusy
                ? "RESTORING SESSION..."
                : "RECONNECTING...";

    if (screen === "lobby") {
        return (
            <>
                <ReconnectBanner visible={showReconnectBanner} text={bannerText} />
                <Lobby
                    onReady={handleLobbyReady}
                    resumeFrom={lobbyResume}
                    musicVolume={musicVolume}
                    setMusicVolume={setMusicVolume}
                    musicMuted={musicMuted}
                    setMusicMuted={setMusicMuted}
                    onLeaveRoom={() => {
                        setSession((s) => ({
                            ...s,
                            roomId: null,
                            myId: null,
                            myRole: null,
                            phase: "LOBBY",
                        }));
                    }}
                />
            </>
        );
    }
    if (screen === "roleReveal" && roleData) {
        return (
            <>
                <ReconnectBanner visible={showReconnectBanner} text={bannerText} />
                <RoleReveal roleData={roleData} />
            </>
        );
    }
    return (
        <>
            <ReconnectBanner visible={showReconnectBanner} text={bannerText} />
            <Game
                session={session}
                socket={socket}
                reconnecting={reconnecting || wakeStage !== "idle" || !connected}
                reconnectMessage={bannerText}
                musicVolume={musicVolume}
                setMusicVolume={setMusicVolume}
                musicMuted={musicMuted}
                setMusicMuted={setMusicMuted}
                onLeaveRoom={() => {
                    setScreen("lobby");
                    setSession((s) => ({ ...s, roomId: null, myId: null, myRole: null }));
                }}
            />
        </>
    );
}
