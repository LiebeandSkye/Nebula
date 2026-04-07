/**
 * Lobby.jsx — Create/Join room + waiting room. Fully redesigned.
 */
import { useState, useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { clearPlaySession, getOrCreateSessionToken, savePlaySession } from "../lib/sessionPersistence.js";
import { PROFILES, AVATAR_COLORS } from "../lib/profiles.js";
import EmoteWheel, { getRandomEmotes } from "../components/EmoteWheel.jsx";

function Avatar({ profileId, username, size = 56, color }) {
    const c = color || AVATAR_COLORS[profileId] || "#c8b8ff";
    return (
        <div style={{
            width: size, height: size, flexShrink: 0,
            border: `2px solid ${c}66`,
            background: c + "15",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            position: "relative",
        }}>
            <img
                src={`/profiles/${profileId}.jpg`}
                alt={username || profileId}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
            />
            <div style={{
                display: "none", position: "absolute", inset: 0,
                alignItems: "center", justifyContent: "center",
                color: c, fontSize: size * 0.38, fontWeight: "bold",
            }}>
                {(username || profileId)[0].toUpperCase()}
            </div>
        </div>
    );
}

const ROLE_DESCRIPTIONS = {
    engineer: "Each night, scan one player to learn if they are Gnosia. If they are, they receive a warning — not your identity.",
    doctor:   "Each night, inspect one player in Cold Sleep to reveal their true role.",
    guardian: "Each night, protect one other player. If the Gnosia target them, the kill is blocked.",
    lawyer:   "Once per game, you may dismiss the vote during any voting round — cancelling it entirely so no one is eliminated.",
    traitor:  "You have no special ability, but you appear human to all scans and inspections. You win with the Gnosia.",
};

function SettingToggle({ label, desc, checked, onChange, onInfo }) {
    return (
        <label style={{
            display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
            padding: "14px 0", borderBottom: "1px solid #1a0a2a"
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#e0d4ff", marginBottom: 4 }}>{label}</div>
                {desc && <div style={{ fontSize: 8, color: "#4a3060" }}>{desc}</div>}
            </div>
            {onInfo && (
                <button onClick={e => { e.preventDefault(); onInfo(); }} style={{
                    fontSize: 8, color: "#4a3060", border: "1px solid #2a1a4a",
                    background: "transparent", padding: "4px 8px",
                    cursor: "pointer", fontFamily: "Press Start 2P", flexShrink: 0,
                }}>?</button>
            )}
            <input type="checkbox" className="toggle" checked={checked}
                onChange={e => onChange(e.target.checked)} />
        </label>
    );
}

export default function Lobby({
    onReady,
    resumeFrom,
    onLeaveRoom,
    musicVolume,
    setMusicVolume,
    musicMuted,
    setMusicMuted,
}) {
    const { emit, connected } = useSocket();
    const [screen, setScreen] = useState("setup"); // setup | waiting
    const [mode, setMode] = useState("create");
    const [username, setUsername] = useState("");
    const [profileId, setProfileId] = useState(null);
    const [joinCode, setJoinCode] = useState("");
    const [joinPass, setJoinPass] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [myId, setMyId] = useState(null);
    const [lobbyState, setLobbyState] = useState(null);
    const [musicState, setMusicState] = useState(null);
    const [expandedRole, setExpandedRole] = useState(null);
    const [musicPanelPosition, setMusicPanelPosition] = useState({ x: null, y: null });
    const [volumePanelPosition, setVolumePanelPosition] = useState({ x: null, y: null });
    const [settings, setSettings] = useState({
        password: "", hasEngineer: false, hasDoctor: false,
        hasGuardian: false, hasLawyer: false, hasTraitor: false, gnosiaCount: "",
        lobbyMusicEnabled: true, endGameMusicEnabled: true,
    });
    const dragStateRef = useRef(null);
    const volumeDragStateRef = useRef(null);

    // Emote state for lobby
    const [lobbyEmotes,    setLobbyEmotes]    = useState({});
    const [lobbyEmoteWheel, setLobbyEmoteWheel] = useState(null);
    const lobbyHoldRafRef   = useRef(null);
    const lobbyHoldStartRef = useRef(null);
    const lobbyAvatarRef    = useRef(null);
    const lobbyEmoteTimers  = useRef({});

    function syncSettingsFromState(state) {
        if (!state?.settings) return;
        setSettings(prev => ({
            ...prev,
            hasEngineer: !!state.settings.hasEngineer,
            hasDoctor: !!state.settings.hasDoctor,
            hasGuardian: !!state.settings.hasGuardian,
            hasLawyer: !!state.settings.hasLawyer,
            hasTraitor: !!state.settings.hasTraitor,
            gnosiaCount: state.settings.gnosiaCount ?? "",
            lobbyMusicEnabled: state.settings.lobbyMusicEnabled !== false,
            endGameMusicEnabled: state.settings.endGameMusicEnabled !== false,
        }));
        if (state.music) {
            setMusicState({
                settings: {
                    lobbyMusicEnabled: state.settings.lobbyMusicEnabled !== false,
                    endGameMusicEnabled: state.settings.endGameMusicEnabled !== false,
                },
                playback: state.music.playback,
            });
        }
    }

    useSocketEvent("lobby:updated", ({ state }) => {
        setLobbyState(state);
        syncSettingsFromState(state);
    });
    useSocketEvent("lobby:hostChanged", ({ newHostId }) => {
        setLobbyState(prev => prev ? {
            ...prev,
            players: prev.players.map(p => ({ ...p, isHost: p.id === newHostId }))
        } : prev);
    });
    useSocketEvent("game:starting", () => setLoading(true));
    useSocketEvent("music:state", (payload) => setMusicState(payload));
    useSocketEvent("player:emote", ({ playerId, emote }) => {
        setLobbyEmotes(prev => ({ ...prev, [playerId]: emote }));
        clearTimeout(lobbyEmoteTimers.current[playerId]);
        lobbyEmoteTimers.current[playerId] = setTimeout(() => {
            setLobbyEmotes(prev => { const n = { ...prev }; delete n[playerId]; return n; });
        }, 5000);
    });

    useEffect(() => {
        if (!resumeFrom?.lobbyState || !resumeFrom.roomId || !resumeFrom.myId) return;
        setRoomId(resumeFrom.roomId);
        setMyId(resumeFrom.myId);
        setLobbyState(resumeFrom.lobbyState);
        syncSettingsFromState(resumeFrom.lobbyState);
        setScreen("waiting");
    }, [resumeFrom]);

    const takenProfiles = lobbyState?.players.map(p => p.profileId) || [];
    const amHost = lobbyState?.players.find(p => p.id === myId && p.isHost);
    const canStart = amHost && (lobbyState?.players.length || 0) >= 2 && !loading;

    function lobbyStartHold(e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        lobbyHoldStartRef.current = Date.now();
        const tick = () => {
            if (!lobbyHoldStartRef.current) return;
            const pct = Math.min(100, ((Date.now() - lobbyHoldStartRef.current) / 2000) * 100);
            if (pct < 100) {
                lobbyHoldRafRef.current = requestAnimationFrame(tick);
            } else {
                lobbyHoldStartRef.current = null;
                const rect = lobbyAvatarRef.current?.getBoundingClientRect();
                if (rect && roomId) setLobbyEmoteWheel({ cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, emotes: getRandomEmotes() });
            }
        };
        lobbyHoldRafRef.current = requestAnimationFrame(tick);
    }

    function lobbyCancelHold() {
        cancelAnimationFrame(lobbyHoldRafRef.current);
        lobbyHoldStartRef.current = null;
    }

    async function handleCreate() {
        if (!username.trim()) return setError("Enter a callsign.");
        if (!profileId) return setError("Select a profile.");
        setError(""); setLoading(true);
        const sessionToken = getOrCreateSessionToken();
        const res = await emit("room:create", {
            username: username.trim(), profileId,
            sessionToken,
            settings: {
                password: settings.password || null,
                hasEngineer: settings.hasEngineer,
                hasDoctor: settings.hasDoctor,
                hasGuardian: settings.hasGuardian,
                hasLawyer: settings.hasLawyer,
                hasTraitor: settings.hasTraitor,
                gnosiaCount: settings.gnosiaCount ? parseInt(settings.gnosiaCount) : null,
                lobbyMusicEnabled: settings.lobbyMusicEnabled,
                endGameMusicEnabled: settings.endGameMusicEnabled,
            },
        });
        setLoading(false);
        if (!res.success) return setError(res.error);
        const me = res.state.players.find(p => p.username === username.trim());
        setMyId(me?.id); setRoomId(res.roomId); setLobbyState(res.state);
        syncSettingsFromState(res.state);
        savePlaySession({
            sessionToken,
            roomId: res.roomId,
            username: username.trim(),
            profileId,
            password: settings.password || null,
        });
        onReady?.(res.roomId, me?.id, profileId, username.trim(), sessionToken);
        setScreen("waiting");
    }

    async function handleJoin() {
        if (!username.trim()) return setError("Enter a callsign.");
        if (!profileId) return setError("Select a profile.");
        if (!joinCode.trim()) return setError("Enter a room code.");
        setError(""); setLoading(true);
        const sessionToken = getOrCreateSessionToken();
        const res = await emit("room:join", {
            roomId: joinCode.trim().toUpperCase(),
            username: username.trim(), profileId,
            password: joinPass || null,
            sessionToken,
        });
        setLoading(false);
        if (!res.success) return setError(res.error);
        const me = res.state.players.find(p => p.username === username.trim());
        const rid = joinCode.trim().toUpperCase();
        setMyId(me?.id); setRoomId(rid); setLobbyState(res.state);
        syncSettingsFromState(res.state);
        savePlaySession({
            sessionToken,
            roomId: rid,
            username: username.trim(),
            profileId,
            password: joinPass || null,
        });
        onReady?.(rid, me?.id, profileId, username.trim(), sessionToken);
        setScreen("waiting");
    }

    async function pushSettings(next) {
        if (!roomId) return;
        await emit("room:updateSettings", {
            roomId,
            settings: {
                password: next.password || null,
                hasEngineer: next.hasEngineer,
                hasDoctor: next.hasDoctor,
                hasGuardian: next.hasGuardian,
                hasLawyer: next.hasLawyer,
                hasTraitor: next.hasTraitor,
                gnosiaCount: next.gnosiaCount ? parseInt(next.gnosiaCount) : null,
                lobbyMusicEnabled: next.lobbyMusicEnabled,
                endGameMusicEnabled: next.endGameMusicEnabled,
            },
        });
    }

    function changeSetting(key, value) {
        const next = { ...settings, [key]: value };
        setSettings(next);
        if (screen === "waiting") pushSettings(next);
    }

    async function startGame() {
        if (!canStart) return;
        setLoading(true);
        const res = await emit("game:start", { roomId });
        if (!res.success) { setError(res.error); setLoading(false); }
    }

    async function playSharedMusic() {
        if (!roomId) return;
        const res = await emit("music:play", { roomId });
        if (!res?.success) setError(res?.error || "Failed to start music.");
    }

    function startMusicPanelDrag(event) {
        if (event.target.closest("button, input, label")) return;
        const panelRect = event.currentTarget.parentElement.getBoundingClientRect();
        dragStateRef.current = {
            offsetX: event.clientX - panelRect.left,
            offsetY: event.clientY - panelRect.top,
        };
        event.preventDefault();
    }

    function startVolumePanelDrag(event) {
        if (event.target.closest("button, input")) return;
        const panelRect = event.currentTarget.getBoundingClientRect();
        volumeDragStateRef.current = {
            offsetX: event.clientX - panelRect.left,
            offsetY: event.clientY - panelRect.top,
        };
        event.preventDefault();
    }

    useEffect(() => {
        function handlePointerMove(event) {
            if (dragStateRef.current) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const panelWidth = 360;
                const panelHeight = 260;
                const nextX = Math.min(Math.max(12, event.clientX - dragStateRef.current.offsetX), Math.max(12, width - panelWidth - 12));
                const nextY = Math.min(Math.max(12, event.clientY - dragStateRef.current.offsetY), Math.max(12, height - panelHeight - 12));
                setMusicPanelPosition({ x: nextX, y: nextY });
            }
            if (volumeDragStateRef.current) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const panelWidth = 260;
                const panelHeight = 120;
                const nextX = Math.min(Math.max(12, event.clientX - volumeDragStateRef.current.offsetX), Math.max(12, width - panelWidth - 12));
                const nextY = Math.min(Math.max(12, event.clientY - volumeDragStateRef.current.offsetY), Math.max(12, height - panelHeight - 12));
                setVolumePanelPosition({ x: nextX, y: nextY });
            }
        }

        function stopDrag() {
            dragStateRef.current = null;
            volumeDragStateRef.current = null;
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", stopDrag);
        window.addEventListener("pointercancel", stopDrag);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", stopDrag);
            window.removeEventListener("pointercancel", stopDrag);
        };
    }, []);

    // ── WAITING ROOM ──────────────────────────────────────────────────
    if (screen === "waiting") {
        const playerCount = lobbyState?.players.length || 0;
        const nowPlayingLabel = musicState?.playback?.trackKey === "lobby"
            ? "LOBBY MUSIC"
            : musicState?.playback?.trackKey === "humanWin"
                ? "HUMAN WIN"
                : musicState?.playback?.trackKey === "gnosiaWin"
                    ? "GNOSIA WIN"
                    : "OFF";
        return (
            <div className="crt star-bg" style={{
                minHeight: "100vh", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", padding: 32, gap: 24,
            }}>
                {/* Header */}
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#4a3060", letterSpacing: "0.2em", marginBottom: 12 }}>
                        PROJECT NEBULA
                    </div>
                    <div className="glow-cyan" style={{ fontSize: 28, letterSpacing: "0.1em" }}>
                        {roomId}
                    </div>
                    <div style={{ fontSize: 9, color: "#4a3060", marginTop: 8 }}>
                        Share this code with your crew
                    </div>
                </div>

                <div style={{
                    width: "100%", maxWidth: 820, display: "flex", gap: 20,
                    flexWrap: "wrap"
                }}>

                    {/* Player list */}
                    <div className="panel-glow" style={{ flex: "1 1 340px", minWidth: 280 }}>
                        <div style={{
                            padding: "16px 20px", borderBottom: "1px solid #1a0a2a",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                            <span style={{ fontSize: 9, color: "#4a3060", letterSpacing: "0.15em" }}>CREW MANIFEST</span>
                            <span style={{ fontSize: 10, color: "#e0d4ff" }}>
                                {playerCount}<span style={{ color: "#4a3060" }}>/12</span>
                            </span>
                        </div>
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            {lobbyState?.players.map(p => (
                                <div key={p.id} className="anim-fadeInUp" style={{
                                    position: "relative",
                                    display: "flex", alignItems: "center", gap: 14,
                                    padding: "10px 12px",
                                    background: p.id === myId ? "#00f5ff08" : "transparent",
                                    border: `1px solid ${p.id === myId ? "#00f5ff22" : "transparent"}`,
                                }}>
                                    {lobbyEmotes[p.id] && (
                                        <div style={{ position: "absolute", top: -58, left: 8, zIndex: 30, pointerEvents: "none", animation: "emotePopIn 0.25s ease both" }}>
                                            <div style={{ background: "rgba(13,0,32,0.92)", border: "1px solid #2a1a4a", borderRadius: 8, padding: 4, boxShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>
                                                <img src={lobbyEmotes[p.id].src} alt={lobbyEmotes[p.id].label} style={{ width: 56, height: "auto", objectFit: "contain", borderRadius: 6, display: "block" }} />
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        ref={p.id === myId ? lobbyAvatarRef : undefined}
                                        onPointerDown={p.id === myId ? lobbyStartHold : undefined}
                                        onPointerUp={p.id === myId ? lobbyCancelHold : undefined}
                                        onPointerLeave={p.id === myId ? lobbyCancelHold : undefined}
                                        onPointerCancel={p.id === myId ? lobbyCancelHold : undefined}
                                        style={{ cursor: p.id === myId ? "grab" : "default", touchAction: p.id === myId ? "none" : undefined }}
                                    >
                                        <Avatar profileId={p.profileId} username={p.username} size={44} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 10, color: "#e0d4ff",
                                            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"
                                        }}>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {p.username}
                                            </span>
                                            {p.id === myId &&
                                                <span className="badge" style={{ color: "#00f5ff" }}>YOU</span>}
                                            {p.isHost &&
                                                <span className="badge" style={{ color: "#ffd700" }}>HOST</span>}
                                        </div>
                                        <div style={{ fontSize: 8, color: "#4a3060", marginTop: 4 }}>
                                            {p.profileName || ""}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {playerCount < 2 && (
                                <div style={{
                                    padding: 16, textAlign: "center",
                                    fontSize: 9, color: "#2a1a3a"
                                }}>
                                    Waiting for more crew...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Host settings + start */}
                    <div style={{
                        flex: "1 1 320px", minWidth: 260, display: "flex",
                        flexDirection: "column", gap: 16
                    }}>
                        {amHost ? (
                            <div className="panel-glow" style={{ padding: 20 }}>
                                <div style={{
                                    fontSize: 9, color: "#4a3060", letterSpacing: "0.15em",
                                    marginBottom: 16
                                }}>
                                    MISSION SETTINGS
                                </div>
                                {/* Gnosia count */}
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 8 }}>
                                        GNOSIA COUNT
                                    </div>
                                    <div style={{ fontSize: 8, color: "#4a3060", marginBottom: 8 }}>
                                        Auto = floor(players / 3). Override below.
                                    </div>
                                    <input
                                        className="input input-sm"
                                        type="number" min="1" max="10"
                                        placeholder={`Auto (${Math.max(1, Math.floor(playerCount / 3))})`}
                                        value={settings.gnosiaCount}
                                        onChange={e => changeSetting("gnosiaCount", e.target.value)}
                                    />
                                </div>
                                <SettingToggle label="ENGINEER ROLE"
                                    desc="Scans players at night for Gnosia"
                                    checked={settings.hasEngineer}
                                    onChange={v => changeSetting("hasEngineer", v)}
                                    onInfo={() => setExpandedRole(r => r === "engineer" ? null : "engineer")} />
                                {expandedRole === "engineer" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.engineer}
                                    </div>
                                )}
                                <SettingToggle label="DOCTOR ROLE"
                                    desc="Inspects Cold Sleep players"
                                    checked={settings.hasDoctor}
                                    onChange={v => changeSetting("hasDoctor", v)}
                                    onInfo={() => setExpandedRole(r => r === "doctor" ? null : "doctor")} />
                                {expandedRole === "doctor" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.doctor}
                                    </div>
                                )}
                                <SettingToggle label="GUARDIAN ANGEL"
                                    desc="Protects one player per night"
                                    checked={settings.hasGuardian}
                                    onChange={v => changeSetting("hasGuardian", v)}
                                    onInfo={() => setExpandedRole(r => r === "guardian" ? null : "guardian")} />
                                {expandedRole === "guardian" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.guardian}
                                    </div>
                                )}
                                <SettingToggle label="LAWYER ROLE"
                                    desc="Can dismiss one vote per game"
                                    checked={settings.hasLawyer}
                                    onChange={v => changeSetting("hasLawyer", v)}
                                    onInfo={() => setExpandedRole(r => r === "lawyer" ? null : "lawyer")} />
                                {expandedRole === "lawyer" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.lawyer}
                                    </div>
                                )}
                                <SettingToggle label="TRAITOR ROLE"
                                    desc="Appears human to all checks, wins with Gnosia"
                                    checked={settings.hasTraitor}
                                    onChange={v => changeSetting("hasTraitor", v)}
                                    onInfo={() => setExpandedRole(r => r === "traitor" ? null : "traitor")} />
                                {expandedRole === "traitor" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.traitor}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="panel" style={{ padding: 20 }}>
                                <div style={{ fontSize: 9, color: "#4a3060", marginBottom: 16 }}>
                                    ACTIVE SETTINGS
                                </div>
                                {[
                                    { key: "hasEngineer", label: "ENGINEER", role: "engineer" },
                                    { key: "hasDoctor", label: "DOCTOR", role: "doctor" },
                                    { key: "hasGuardian", label: "GUARDIAN ANGEL", role: "guardian" },
                                    { key: "hasLawyer", label: "LAWYER", role: "lawyer" },
                                    { key: "hasTraitor", label: "TRAITOR", role: "traitor" },
                                    { key: "lobbyMusicEnabled", label: "LOBBY MUSIC", role: null },
                                    { key: "endGameMusicEnabled", label: "END GAME MUSIC", role: null },
                                ].map(({ key, label, role }) => (
                                    <div key={key}>
                                        <div style={{
                                            display: "flex", justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "10px 0", borderBottom: "1px solid #1a0a2a",
                                            fontSize: 9
                                        }}>
                                            <span style={{ color: "#4a3060" }}>{label}</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                {role && (
                                                    <button onClick={() => setExpandedRole(r => r === role ? null : role)} style={{
                                                        fontSize: 8, color: "#4a3060", border: "1px solid #2a1a4a",
                                                        background: "transparent", padding: "2px 7px",
                                                        cursor: "pointer", fontFamily: "Press Start 2P",
                                                    }}>?</button>
                                                )}
                                                <span style={{ color: lobbyState?.settings[key] ? "#00f5ff" : "#2a1a3a" }}>
                                                    {lobbyState?.settings[key] ? "ON" : "OFF"}
                                                </span>
                                            </div>
                                        </div>
                                        {role && expandedRole === role && (
                                            <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                                {ROLE_DESCRIPTIONS[role]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div style={{
                                fontSize: 9, color: "#ff2a2a", padding: "10px 14px",
                                border: "1px solid #ff2a2a33", background: "#1a000833"
                            }}>
                                ⚠ {error}
                            </div>
                        )}

                        {amHost ? (
                            <button className="btn btn-lg" style={{ width: "100%" }}
                                onClick={startGame} disabled={!canStart}>
                                {loading ? "INITIATING..." :
                                    playerCount < 2 ? "WAITING FOR CREW..." :
                                        "▶  LAUNCH MISSION"}
                            </button>
                        ) : (
                            <div className="panel" style={{ padding: 20, textAlign: "center" }}>
                                <div style={{ fontSize: 9, color: "#4a3060" }}
                                    className="anim-fadeIn">
                                    AWAITING HOST...
                                </div>
                            </div>
                        )}

                        <button className="btn" style={{ 
                            width: "100%", 
                            color: "#ff2a2a",
                            borderColor: "#ff2a2a44",
                            background: "transparent"
                        }}
                            onClick={() => {
                                if (window.confirm("Leave the room?")) {
                                    emit("room:leave", { roomId }).then((res) => {
                                        if (!res?.success) {
                                            setError(res?.error || "Failed to leave room.");
                                            return;
                                        }
                                        clearPlaySession();
                                        setRoomId(null);
                                        setMyId(null);
                                        setLobbyState(null);
                                        setMusicState(null);
                                        setScreen("setup");
                                        onLeaveRoom?.();
                                    });
                                }
                            }}>
                            LEAVE ROOM
                        </button>
                    </div>
                </div>
                {amHost && (
                    <div style={{
                        position: "fixed",
                        right: musicPanelPosition.x === null ? 24 : "auto",
                        bottom: musicPanelPosition.y === null ? 24 : "auto",
                        left: musicPanelPosition.x === null ? "auto" : musicPanelPosition.x,
                        top: musicPanelPosition.y === null ? "auto" : musicPanelPosition.y,
                        width: "min(360px, calc(100vw - 32px))",
                        border: "1px solid #00f5ff44",
                        background: "linear-gradient(180deg, rgba(7,0,15,0.96), rgba(19,0,37,0.96))",
                        boxShadow: "0 0 0 1px rgba(0,245,255,0.08), 0 0 28px rgba(0,245,255,0.12)",
                        padding: 18,
                        zIndex: 10,
                    }}>
                        <div
                            onPointerDown={startMusicPanelDrag}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 10,
                                cursor: "grab",
                                userSelect: "none",
                                touchAction: "none",
                            }}>
                            <div>
                                <div style={{ fontSize: 8, color: "#4a3060", letterSpacing: "0.18em", marginBottom: 6 }}>
                                    SHARED MUSIC CONTROL
                                </div>
                                <div style={{ fontSize: 11, color: "#00f5ff", textShadow: "0 0 12px rgba(0,245,255,0.35)" }}>
                                    {nowPlayingLabel}
                                </div>
                            </div>
                            <div style={{
                                padding: "6px 10px",
                                border: "1px solid #00f5ff33",
                                background: "rgba(0,245,255,0.06)",
                                color: "#8ef7ff",
                                fontSize: 7,
                                letterSpacing: "0.12em",
                            }}>
                                DRAG
                            </div>
                        </div>
                        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.75), transparent)", marginBottom: 12 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <label style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 14,
                                padding: "10px 12px",
                                border: "1px solid #1f2d4d",
                                background: "rgba(0,0,0,0.25)",
                            }}>
                                <div>
                                    <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 4 }}>LOBBY MUSIC</div>
                                    <div style={{ fontSize: 7, color: "#5d5f86", lineHeight: 1.8 }}>Synced room track while everyone waits in lobby.</div>
                                </div>
                                <input type="checkbox" className="toggle" checked={settings.lobbyMusicEnabled}
                                    onChange={e => changeSetting("lobbyMusicEnabled", e.target.checked)} />
                            </label>
                            <label style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 14,
                                padding: "10px 12px",
                                border: "1px solid #1f2d4d",
                                background: "rgba(0,0,0,0.25)",
                            }}>
                                <div>
                                    <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 4 }}>END GAME MUSIC</div>
                                    <div style={{ fontSize: 7, color: "#5d5f86", lineHeight: 1.8 }}>Play Human or Gnosia victory music after the match.</div>
                                </div>
                                <input type="checkbox" className="toggle" checked={settings.endGameMusicEnabled}
                                    onChange={e => changeSetting("endGameMusicEnabled", e.target.checked)} />
                            </label>
                            <button
                                className="btn"
                                style={{
                                    width: "100%",
                                    background: settings.lobbyMusicEnabled ? "rgba(0,245,255,0.1)" : "rgba(42,26,74,0.4)",
                                    borderColor: settings.lobbyMusicEnabled ? "#00f5ff55" : "#2a1a4a",
                                    color: settings.lobbyMusicEnabled ? "#00f5ff" : "#4a3060",
                                }}
                                onClick={playSharedMusic}
                                disabled={!settings.lobbyMusicEnabled}>
                                PLAY MUSIC
                            </button>
                            <div style={{
                                padding: "12px",
                                border: "1px solid #1f2d4d",
                                background: "rgba(0,0,0,0.25)",
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 4 }}>YOUR VOLUME</div>
                                        <div style={{ fontSize: 7, color: "#5d5f86" }}>Applies only to your device.</div>
                                    </div>
                                    <button
                                        className="btn-topbar"
                                        onClick={() => setMusicMuted(!musicMuted)}
                                        style={{ borderColor: "#00f5ff44", color: musicMuted ? "#8a7aa0" : "#00f5ff" }}>
                                        {musicMuted ? "UNMUTE" : "MUTE"}
                                    </button>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(musicVolume * 100)}
                                    onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                                    style={{ width: "100%", accentColor: "#00f5ff" }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {!amHost && (
                    <div
                        onPointerDown={startVolumePanelDrag}
                        style={{
                            position: "fixed",
                            right: volumePanelPosition.x === null ? 24 : "auto",
                            bottom: volumePanelPosition.y === null ? 24 : "auto",
                            left: volumePanelPosition.x === null ? "auto" : volumePanelPosition.x,
                            top: volumePanelPosition.y === null ? "auto" : volumePanelPosition.y,
                            width: "min(260px, calc(100vw - 32px))",
                            border: "1px solid #00f5ff33",
                            background: "linear-gradient(180deg, rgba(7,0,15,0.94), rgba(13,0,32,0.94))",
                            boxShadow: "0 0 18px rgba(0,245,255,0.1)",
                            padding: 14,
                            zIndex: 10,
                        }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 10,
                                cursor: "grab",
                                userSelect: "none",
                                touchAction: "none",
                            }}>
                            <div style={{ fontSize: 8, color: "#4a3060", letterSpacing: "0.16em" }}>
                                YOUR MUSIC VOLUME
                            </div>
                            <div style={{
                                padding: "4px 8px",
                                border: "1px solid #00f5ff33",
                                background: "rgba(0,245,255,0.06)",
                                color: "#8ef7ff",
                                fontSize: 6,
                                letterSpacing: "0.1em",
                            }}>
                                DRAG
                            </div>
                        </div>
                        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.75), transparent)", marginBottom: 12 }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 9, color: "#00f5ff" }}>{musicMuted ? "MUTED" : `${Math.round(musicVolume * 100)}%`}</span>
                            <button
                                className="btn-topbar"
                                onClick={() => setMusicMuted(!musicMuted)}
                                style={{ borderColor: "#00f5ff44", color: musicMuted ? "#8a7aa0" : "#00f5ff" }}>
                                {musicMuted ? "UNMUTE" : "MUTE"}
                            </button>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(musicVolume * 100)}
                            onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                            style={{ width: "100%", accentColor: "#00f5ff" }}
                        />
                    </div>
                )}
            {lobbyEmoteWheel && (
                <EmoteWheel
                    cx={lobbyEmoteWheel.cx}
                    cy={lobbyEmoteWheel.cy}
                    emotes={lobbyEmoteWheel.emotes}
                    onSelect={emote => { setLobbyEmoteWheel(null); emit("player:emote", { roomId, emote }); }}
                    onClose={() => setLobbyEmoteWheel(null)}
                />
            )}
            </div>
        );
    }

    // ── SETUP SCREEN ──────────────────────────────────────────────────
    return (
        <div className="crt star-bg" style={{
            minHeight: "100vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: 32,
        }}>
            {/* Title */}
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#4a3060", letterSpacing: "0.25em", marginBottom: 14 }}>
                    DEEP SPACE SOCIAL DEDUCTION
                </div>
                <h1 className="glow-cyan" style={{ fontSize: 32, letterSpacing: "0.08em" }}>
                    PROJECT<br />NEBULA
                </h1>
                <div style={{
                    marginTop: 14, display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 10
                }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: connected ? "#00f5ff" : "#ff2a2a",
                        boxShadow: connected ? "0 0 8px #00f5ff" : "0 0 8px #ff2a2a",
                    }} />
                    <span style={{ fontSize: 8, color: "#4a3060" }}>
                        {connected ? "SERVER ONLINE" : "CONNECTING..."}
                    </span>
                </div>
            </div>

            <div style={{ width: "100%", maxWidth: 900 }}>
                {/* Mode tabs */}
                <div style={{ display: "flex", marginBottom: 20 }}>
                    {["create", "join"].map(m => (
                        <button key={m} onClick={() => { setMode(m); setError(""); }}
                            style={{
                                flex: 1, padding: "14px 0", fontSize: 10,
                                border: "1px solid",
                                borderColor: mode === m ? "#00f5ff" : "#2a1a4a",
                                background: mode === m ? "#00f5ff15" : "transparent",
                                color: mode === m ? "#00f5ff" : "#4a3060",
                                cursor: "pointer",
                                fontFamily: "Press Start 2P",
                                transition: "all 0.15s",
                            }}>
                            {m === "create" ? "⊕  CREATE ROOM" : "→  JOIN ROOM"}
                        </button>
                    ))}
                </div>

                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

                    {/* Left: form */}
                    <div className="panel-glow" style={{
                        flex: "1 1 340px", padding: 28,
                        display: "flex", flexDirection: "column", gap: 20
                    }}>
                        {/* Callsign */}
                        <div>
                            <label style={{
                                display: "block", fontSize: 9, color: "#4a3060",
                                letterSpacing: "0.15em", marginBottom: 10
                            }}>
                                CALLSIGN
                            </label>
                            <input className="input" placeholder="enter username..."
                                value={username} onChange={e => setUsername(e.target.value)} maxLength={20} />
                        </div>

                        {mode === "join" && (
                            <>
                                <div>
                                    <label style={{
                                        display: "block", fontSize: 9, color: "#4a3060",
                                        letterSpacing: "0.15em", marginBottom: 10
                                    }}>
                                        ROOM CODE
                                    </label>
                                    <input className="input" style={{ textTransform: "uppercase" }}
                                        placeholder="NEB-XXXX"
                                        value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                        maxLength={8} />
                                </div>
                                <div>
                                    <label style={{
                                        display: "block", fontSize: 9, color: "#4a3060",
                                        letterSpacing: "0.15em", marginBottom: 10
                                    }}>
                                        PASSWORD (IF REQUIRED)
                                    </label>
                                    <input className="input" type="password" placeholder="leave blank if none"
                                        value={joinPass} onChange={e => setJoinPass(e.target.value)} />
                                </div>
                            </>
                        )}

                        {mode === "create" && (
                            <div>
                                <label style={{
                                    display: "block", fontSize: 9, color: "#4a3060",
                                    letterSpacing: "0.15em", marginBottom: 10
                                }}>
                                    ROOM PASSWORD (OPTIONAL)
                                </label>
                                <input className="input" type="password" placeholder="leave blank for public"
                                    value={settings.password}
                                    onChange={e => setSettings(s => ({ ...s, password: e.target.value }))} />
                            </div>
                        )}

                        {error && (
                            <div style={{
                                fontSize: 9, color: "#ff2a2a", padding: "10px 14px",
                                border: "1px solid #ff2a2a33", background: "#1a000822"
                            }}>
                                ⚠ {error}
                            </div>
                        )}

                        <button className="btn btn-lg" style={{ width: "100%", marginTop: 4 }}
                            onClick={mode === "create" ? handleCreate : handleJoin}
                            disabled={loading || !connected}>
                            {loading ? "TRANSMITTING..." :
                                mode === "create" ? "LAUNCH ROOM" : "BOARD VESSEL"}
                        </button>
                    </div>

                    {/* Right: profile picker */}
                    <div style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ fontSize: 9, color: "#4a3060", letterSpacing: "0.15em" }}>
                            SELECT PROFILE
                        </div>
                        <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                                gap: 10, maxHeight: 460, overflowY: "auto", paddingRight: 4,
                            }}>
                                {PROFILES.map(p => {
                                    const color = AVATAR_COLORS[p.id] || "#c8b8ff";
                                    const selected = profileId === p.id;
                                    const taken = takenProfiles.includes(p.id) && !selected;
                                    return (
                                        <button key={p.id}
                                            onClick={() => !taken && setProfileId(p.id)}
                                            disabled={taken}
                                            style={{
                                                display: "flex", flexDirection: "column", alignItems: "center",
                                                gap: 10, padding: 14,
                                                border: `2px solid ${selected ? color : taken ? "#1a0a2a" : "#2a1a4a"}`,
                                                background: selected ? color + "12" : "transparent",
                                                boxShadow: selected ? `0 0 20px ${color}44` : "none",
                                                cursor: taken ? "not-allowed" : "pointer",
                                                opacity: taken ? 0.3 : 1,
                                                transition: "all 0.15s",
                                                fontFamily: "Press Start 2P",
                                            }}>
                                            <Avatar profileId={p.id} username={p.name} size={64} color={color} />
                                            <span style={{
                                                fontSize: 8, color: selected ? color : "#8a7aa0",
                                                textAlign: "center", lineHeight: 1.5
                                            }}>
                                                {p.name}
                                            </span>
                                            {taken && (
                                                <span style={{ fontSize: 7, color: "#2a1a3a" }}>TAKEN</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
