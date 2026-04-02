/**
 * Lobby.jsx — Create/Join room + waiting room. Fully redesigned.
 */
import { useState, useEffect } from "react";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { clearPlaySession, getOrCreateSessionToken, savePlaySession } from "../lib/sessionPersistence.js";
import { PROFILES, AVATAR_COLORS } from "../lib/profiles.js";

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

export default function Lobby({ onReady, resumeFrom }) {
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
    const [expandedRole, setExpandedRole] = useState(null);
    const [settings, setSettings] = useState({
        password: "", hasEngineer: false, hasDoctor: false,
        hasGuardian: false, hasLawyer: false, hasTraitor: false, gnosiaCount: "",
    });

    useSocketEvent("lobby:updated", ({ state }) => setLobbyState(state));
    useSocketEvent("lobby:hostChanged", ({ newHostId }) => {
        setLobbyState(prev => prev ? {
            ...prev,
            players: prev.players.map(p => ({ ...p, isHost: p.id === newHostId }))
        } : prev);
    });
    useSocketEvent("game:starting", () => setLoading(true));

    useEffect(() => {
        if (!resumeFrom?.lobbyState || !resumeFrom.roomId || !resumeFrom.myId) return;
        setRoomId(resumeFrom.roomId);
        setMyId(resumeFrom.myId);
        setLobbyState(resumeFrom.lobbyState);
        setScreen("waiting");
    }, [resumeFrom]);

    const takenProfiles = lobbyState?.players.map(p => p.profileId) || [];
    const amHost = lobbyState?.players.find(p => p.id === myId && p.isHost);
    const canStart = amHost && (lobbyState?.players.length || 0) >= 2 && !loading;

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
            },
        });
        setLoading(false);
        if (!res.success) return setError(res.error);
        const me = res.state.players.find(p => p.username === username.trim());
        setMyId(me?.id); setRoomId(res.roomId); setLobbyState(res.state);
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

    // ── WAITING ROOM ──────────────────────────────────────────────────
    if (screen === "waiting") {
        const playerCount = lobbyState?.players.length || 0;
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
                                    display: "flex", alignItems: "center", gap: 14,
                                    padding: "10px 12px",
                                    background: p.id === myId ? "#00f5ff08" : "transparent",
                                    border: `1px solid ${p.id === myId ? "#00f5ff22" : "transparent"}`,
                                }}>
                                    <Avatar profileId={p.profileId} username={p.username} size={44} />
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
                                                <button onClick={() => setExpandedRole(r => r === role ? null : role)} style={{
                                                    fontSize: 8, color: "#4a3060", border: "1px solid #2a1a4a",
                                                    background: "transparent", padding: "2px 7px",
                                                    cursor: "pointer", fontFamily: "Press Start 2P",
                                                }}>?</button>
                                                <span style={{ color: lobbyState?.settings[key] ? "#00f5ff" : "#2a1a3a" }}>
                                                    {lobbyState?.settings[key] ? "ON" : "OFF"}
                                                </span>
                                            </div>
                                        </div>
                                        {expandedRole === role && (
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
                                        setScreen("setup");
                                    });
                                }
                            }}>
                            LEAVE ROOM
                        </button>
                    </div>
                </div>
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
