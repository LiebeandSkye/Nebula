/**
 * App.jsx — Screen router. Role reveal screen. Final.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket, useSocketEvent } from "./hooks/useSocket";
import Lobby from "./pages/Lobby.jsx";
import Game from "./pages/Game.jsx";
import { clearPlaySession, loadPlaySession } from "./lib/sessionPersistence.js";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const ROLE_COLORS = {
    gnosia: "#9b30ff", engineer: "#00f5ff", doctor: "#b0ffb8",
    guardian: "#ffd700", human: "#c8b8ff",
};
const ROLE_ICONS = { gnosia: "👁", engineer: "⚡", doctor: "☤", guardian: "🛡", human: "◈" };

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
                        {roleData.gnosiaAllies.map(a => (
                            <div key={a.id} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "8px 10px", marginBottom: 6,
                                border: "1px solid #9b30ff33", background: "#13002533",
                            }}>
                                <div style={{
                                    width: 36, height: 36, flexShrink: 0,
                                    overflow: "hidden", border: "1px solid #9b30ff44",
                                }}>
                                    <img src={`${SERVER}/profiles/${a.profileId}.jpg`} alt={a.username}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={e => { e.target.style.display = "none"; }} />
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
    const { socket, connected, reconnecting } = useSocket();
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
    const screenRef = useRef(screen);
    screenRef.current = screen;

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

            setSession(s => ({
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

    useEffect(() => {
        function onConnect() {
            tryResumeSession();
        }
        socket.on("connect", onConnect);
        if (socket.connected) tryResumeSession();
        return () => socket.off("connect", onConnect);
    }, [socket, tryResumeSession]);

    useSocketEvent("game:roleAssigned", payload => {
        setRoleData(payload);
        setSession(s => ({ ...s, myRole: payload.role, allies: payload.gnosiaAllies || [] }));
        setScreen("roleReveal");
    });

    useSocketEvent("game:starting", ({ gnosiaCount }) => {
        setSession(s => ({ ...s, gnosiaCount: typeof gnosiaCount === "number" ? gnosiaCount : s.gnosiaCount }));
    });

    useSocketEvent("phase:changed", payload => {
        setSession(s => ({
            ...s,
            phase: payload.phase,
            lastPhasePayload: payload,
            gnosiaCount: typeof payload.gnosiaCount === "number" ? payload.gnosiaCount : s.gnosiaCount,
        }));
        if (screenRef.current !== "game") setScreen("game");
    });

    function handleLobbyReady(roomId, myId, myProfileId) {
        setSession(s => ({
            ...s,
            roomId,
            myId,
            myProfileId,
            sessionToken: loadPlaySession()?.sessionToken || s.sessionToken,
        }));
    }

    const stored = typeof window !== "undefined" ? loadPlaySession() : null;
    const showReconnectBanner =
        !connected && !!stored?.roomId ||
        (connected && resumeBusy && !!stored?.roomId) ||
        (reconnecting && !!stored?.roomId);

    const bannerText = !connected
        ? "RECONNECTING..."
        : (resumeBusy ? "RESTORING SESSION..." : "RECONNECTING...");

    if (screen === "lobby") {
        return (
            <>
                <ReconnectBanner visible={showReconnectBanner} text={bannerText} />
                <Lobby onReady={handleLobbyReady} resumeFrom={lobbyResume} />
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
                onLeaveRoom={() => {
                    setScreen("lobby");
                    setSession(s => ({ ...s, roomId: null, myId: null, myRole: null }));
                }}
            />
        </>
    );
}
