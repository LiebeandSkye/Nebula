import { useState, useEffect, useRef } from "react";
import { animate } from "animejs";
import { getStoredTheme, applyTheme } from "../lib/themeStore.js";
import { useSocketEvent } from "../hooks/useSocket";
import PlayerCard from "../components/PlayerCard.jsx";
import EmoteWheel, { getRandomEmotes } from "../components/EmoteWheel.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import PhaseOverlay from "../components/PhaseOverlay.jsx";
import NightPanel from "../components/NightPanel.jsx";
import StartReveal from "../components/StartReveal.jsx";
import { clearPlaySession } from "../lib/sessionPersistence.js";
import { AVATAR_COLORS } from "../lib/profiles.js";
import { BsStars } from "react-icons/bs";
import { CiSettings } from "react-icons/ci";

// Modularized imports
import { PHASE_COLORS, ROLE_COLORS, ROLE_INFO, isGnosiaRole } from "../lib/gameConfig.jsx";
import { AURA_ROLL_OPTIONS, AURA_PREVIEW } from "../lib/auras.js";
import PhaseTimer from "../components/PhaseTimer.jsx";
import SettingsActionButton from "../components/SettingsActionButton.jsx";
import GameOverScreen from "../components/GameOverScreen.jsx";
import ReconnectingOverlay from "../components/ReconnectingOverlay.jsx";
import SkipBar from "../components/SkipBar.jsx";
import VoteProgressBar from "../components/VoteProgressBar.jsx";
import { useGameSocket } from "../hooks/useGameSocket.js";

export default function Game({
    session,
    socket,
    onLeaveRoom,
    musicVolume,
    setMusicVolume,
    musicMuted,
    setMusicMuted,
    reconnecting = false,
    reconnectMessage = "RECONNECTING...",
}) {
    const { roomId, myId, myRole, allies: initialAllies = [], gnosiaCount } = session;

    const [players, setPlayers] = useState(session.lastPhasePayload?.players || []);
    const [allies, setAllies] = useState(initialAllies);
    const [phase, setPhase] = useState(session.lastPhasePayload?.phase || session.phase || "DAY_DISCUSSION");
    const [round, setRound] = useState(session.lastPhasePayload?.round || 1);
    const [timers, setTimers] = useState(session.lastPhasePayload?.timers || {});
    const [morningReport, setMorningReport] = useState(null);
    const [showOverlay, setShowOverlay] = useState(true);
    const [gameOver, setGameOver] = useState(null);

    const [selectedTarget, setSelectedTarget] = useState(null);
    const [nightSubmitted, setNightSubmitted] = useState(false);
    const [actionError, setActionError] = useState("");
    const [actionMsg, setActionMsg] = useState("");
    const [voteProgress, setVoteProgress] = useState({ votesCast: 0, totalAlive: 0 });
    const [gnosiaVP, setGnosiaVP] = useState({ votesIn: 0, totalGnosia: 0 });
    const [scanResult, setScanResult] = useState(null);
    const [inspectResult, setInspectResult] = useState(null);
    const [guardianResult, setGuardianResult] = useState(null);
    const [scannedAlert, setScannedAlert] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [hasLawyerDismissed, setHasLawyerDismissed] = useState(false);
    const [voteDismissed, setVoteDismissed] = useState(null);
    const [resultModal, setResultModal] = useState(null);
    const [showStartReveal, setShowStartReveal] = useState(false);
    const [hasShownStartReveal, setHasShownStartReveal] = useState(false);
    const [showRoleInfo, setShowRoleInfo] = useState(false);
    const [voteReveal, setVoteReveal] = useState(null);
    const [voteBreakdown, setVoteBreakdown] = useState(null);
    const [skipVotes, setSkipVotes] = useState(session.lastPhasePayload?.skipVotes || []);
    const [lostConnectionNotice, setLostConnectionNotice] = useState("");
    const [unread, setUnread] = useState({ public: 0, gnosia: 0 });

    const [isRolling, setRolling] = useState(false);
    const [rollingAura, setRollingAura] = useState("aura-rage-mode");
    const [showAuraPicker, setShowAuraPicker] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [auraVisibility, setAuraVisibility] = useState("all");
    const [emoteVisibility, setEmoteVisibility] = useState("all");
    const [currentTheme, setCurrentTheme] = useState(getStoredTheme);

    // Emote state
    const [playerEmotes, setPlayerEmotes] = useState({});  // { [playerId]: { src, label, id } }
    const [emoteWheel, setEmoteWheel] = useState(null); // { cx, cy, emotes[] }
    const emoteTimeoutsRef = useRef({});

    const [isMobile, setIsMobile] = useState(false);
    const [desktopChat, setDesktopChat] = useState(false);
    const [mobileChatOpen, setMobileChatOpen] = useState(false);

    // Lifted Chat State
    const [pubMsgs, setPubMsgs] = useState([]);
    const [gnMsgs, setGnMsgs] = useState([]);
    const [unreadPub, setUnreadPub] = useState(0);
    const [unreadGn, setUnreadGn] = useState(0);
    const [activeChatTab, setActiveChatTab] = useState("public");

    // Sync total unread for TopBar badge (legacy/desktop)
    useEffect(() => {
        setUnread({ public: unreadPub, gnosia: unreadGn });
    }, [unreadPub, unreadGn]);

    function showResultModal(payload) {
        setResultModal(payload);
        const ms = typeof payload?.durationMs === "number" ? payload.durationMs : 6000;
        setTimeout(() => setResultModal(null), ms);
    }

    // ── SOCKET INITIALIZATION ─────────────────────────────────────────
    useGameSocket({
        roomId, myId, myRole, socket,
        players, setPlayers,
        setAllies,
        setPhase,
        setRound,
        setTimers,
        setMorningReport,
        setShowOverlay,
        setGameOver,
        setSelectedTarget,
        setNightSubmitted,
        setActionError,
        setActionMsg,
        setVoteProgress,
        setGnosiaVP,
        setScanResult,
        setInspectResult,
        setGuardianResult,
        setScannedAlert,
        setHasVoted,
        setHasLawyerDismissed,
        setVoteDismissed,
        showResultModal,
        setVoteReveal,
        setVoteBreakdown,
        setSkipVotes,
        setLostConnectionNotice,
        setPubMsgs,
        setGnMsgs,
        setUnreadPub,
        setUnreadGn,
        desktopChat,
        mobileChatOpen,
        activeChatTab,
        setPlayerEmotes,
        emoteTimeoutsRef,
    });

    const handleClearUnread = (tab) => {
        if (tab === "public") setUnreadPub(0);
        else if (tab === "gnosia") setUnreadGn(0);
    };

    const me = players.find(p => p.id === myId);
    const isNight = phase === "NIGHT";
    const isVoting = phase === "VOTING";
    const phaseColor = PHASE_COLORS[phase] || "#00f5ff";
    const roleColor = ROLE_COLORS[myRole] || "#c8b8ff";
    const totalUnread = unread.public + unread.gnosia;

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const m = window.matchMedia("(max-width: 768px)");
        const apply = () => setIsMobile(m.matches);
        apply();
        m.addEventListener?.("change", apply) || m.addListener?.(apply);
        return () => m.removeEventListener?.("change", apply) || m.removeListener?.(apply);
    }, []);

    useEffect(() => {
        if (!isMobile) return;
        if (!["DAY_DISCUSSION", "LOBBY", "AFTERNOON"].includes(phase)) setMobileChatOpen(false);
    }, [phase, isMobile]);

    useEffect(() => {
        if (hasShownStartReveal) return;
        if (phase === "DAY_DISCUSSION" && round === 1 && players.length > 0) {
            setShowStartReveal(true); setHasShownStartReveal(true); setShowOverlay(false);
        }
    }, [phase, round, players.length, hasShownStartReveal]);

    function handleHoldComplete(cx, cy) {
        setEmoteWheel({ cx, cy, emotes: getRandomEmotes(), borderRadius: "50%" });
    }

    function handleEmoteSelect(emote) {
        setEmoteWheel(null);
        socket.emit("player:emote", { roomId, emote });
    }

    function submitVote() {
        if (!selectedTarget) return;
        socket.emit("vote:submit", { roomId, targetId: selectedTarget }, res => {
            if (!res.success) { setActionError(res.error); setTimeout(() => setActionError(""), 3000); }
            else { setActionMsg("Vote locked."); setSelectedTarget(null); setHasVoted(true); setTimeout(() => setActionMsg(""), 2000); }
        });
    }

    function submitNightAction(skipArg) {
        if (nightSubmitted) return;
        const target = skipArg === "skip" ? "skip" : selectedTarget;
        if (!target) return;
        const map = { gnosia: "gnosia_vote", illusionist: "gnosia_vote", engineer: "engineer", doctor: "doctor", guardian: "guardian" };
        const actionType = map[myRole];
        if (!actionType) return;
        socket.emit("night:action", { roomId, actionType, targetId: target }, res => {
            if (!res.success) { setActionError(res.error); setTimeout(() => setActionError(""), 3000); }
            else setNightSubmitted(true);
        });
    }

    function requestSkipPhase() {
        socket.emit("phase:skip", { roomId }, res => {
            if (!res?.success) { setActionError(res?.error || "Failed."); setTimeout(() => setActionError(""), 3000); return; }
            setActionMsg("Skip requested."); setTimeout(() => setActionMsg(""), 2000);
        });
    }

    function dismissVote() {
        socket.emit("vote:dismiss", { roomId }, res => {
            if (!res?.success) { setActionError(res?.error || "Failed."); setTimeout(() => setActionError(""), 3000); return; }
            setHasLawyerDismissed(true);
        });
    }

    function leaveRoom() {
        if (!window.confirm("Leave the room?")) return;
        socket.emit("room:leave", { roomId }, res => { if (res.success) { clearPlaySession(); onLeaveRoom?.(); } else alert(res.error || "Failed to leave."); });
    }

    function playAgain() { if (me?.isHost) socket.emit("room:playAgain", { roomId }, res => { if (!res.success) alert(res.error || "Failed."); }); }

    function handleRoll() {
        if (isRolling) return;
        if ((me?.rollsRemaining ?? 0) <= 0) return;
        setRolling(true);
        let interval = setInterval(() => setRollingAura(AURA_ROLL_OPTIONS[Math.floor(Math.random() * AURA_ROLL_OPTIONS.length)]), 80);
        const safety = setTimeout(() => { clearInterval(interval); setRolling(false); }, 8000);
        socket.emit("player:rollAura", { roomId }, res => {
            clearTimeout(safety);
            setTimeout(() => {
                clearInterval(interval);
                if (res?.success) {
                    setRollingAura(res.aura);
                    animate(`#player-card-${myId}`, { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0], duration: 800, ease: "outElastic(1, .5)" });
                    setTimeout(() => setRolling(false), 2000);
                } else { setRolling(false); if (res?.error) alert(res.error); }
            }, 1000);
        });
    }

    function handleSelectAura(auraIdx) {
        const aura = AURA_ROLL_OPTIONS[auraIdx]; if (!aura) return;
        socket.emit("player:selectAura", { roomId, aura }, res => {
            if (res?.success) {
                setShowAuraPicker(false);
                animate(`#player-card-${myId}`, { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0], duration: 800, ease: "outElastic(1, .5)" });
            } else if (res?.error) alert(res.error);
        });
    }

    function openSettingsModal() {
        setShowSettingsModal(true);
    }

    function triggerRollAura() {
        setShowSettingsModal(false);
        handleRoll();
    }

    function triggerChooseAura() {
        setShowSettingsModal(false);
        setShowAuraPicker(true);
    }

    if (gameOver) return <GameOverScreen result={gameOver} onPlayAgain={playAgain} amHost={me?.isHost} musicVolume={musicVolume} setMusicVolume={setMusicVolume} musicMuted={musicMuted} setMusicMuted={setMusicMuted} myId={myId} playerEmotes={playerEmotes} onEmote={emote => socket.emit("player:emote", { roomId, emote })} />;

    const canTarget = p => {
        if (!me?.alive || p.id === myId) return false;
        if (isVoting) return p.alive;
        if (isNight) return (myRole === "doctor" ? p.inColdSleep : (myRole === "human" ? false : p.alive));
        return false;
    };

    const aliveCount = players.filter(p => p.alive).length;
    const skipPhases = ["DAY_DISCUSSION", "AFTERNOON"];
    const showSkipBar = skipPhases.includes(phase) && me?.alive;
    const canRollAura = (me?.rollsRemaining ?? 0) > 0 && !isRolling;
    const canChooseAura = !!me?.isHost;

    const sharedOverlays = (
        <>
            <ReconnectingOverlay visible={reconnecting} message={reconnectMessage} />
            {lostConnectionNotice && (
                <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 999999, padding: "10px 20px", background: "#1a0008ee", border: "1px solid #ff2a2a55", color: "#ff8888", fontSize: 9 }}>{lostConnectionNotice}</div>
            )}
            {voteDismissed && (
                <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)" }}>
                    <div style={{ border: "2px solid #ff883366", background: "#0d0020f2", padding: "28px 36px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#8a7aa0", marginBottom: 12 }}>LAWYER</div>
                        <div style={{ fontSize: 20, color: "#ff8833", marginBottom: 10 }}>Vote Dismissed</div>
                        <div style={{ fontSize: 9, color: "#c8b8ff" }}>Vote has been dismissed.<br />No one is eliminated.</div>
                    </div>
                </div>
            )}
            {showStartReveal && players.length > 0 && (
                <StartReveal players={players} gnosiaCount={session.lastPhasePayload?.gnosiaCount || gnosiaCount || 1} myId={myId} myRole={myRole} onDismiss={() => { setShowStartReveal(false); setShowOverlay(true); }} />
            )}
            {voteReveal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center", background: "#07000ff0" }}>
                    <div style={{ width: "min(680px,92vw)", border: "1px solid #2a1a4a", background: "#0d0020cc", padding: "28px 26px" }}>
                        <div style={{ fontSize: 9, color: "#8a7aa0", marginBottom: 12 }}>VOTING RESULT</div>
                        {voteReveal.eliminatedId ? <div style={{ fontSize: 16, color: "#ffd700" }}>{voteReveal.eliminatedUsername} has been voted to Cold Sleep</div> : <div style={{ fontSize: 12, color: "#8a7aa0" }}>{voteReveal.reason}</div>}
                    </div>
                </div>
            )}
            {showOverlay && !showStartReveal && phase !== "END" && <PhaseOverlay phase={phase} morningReport={morningReport} round={round} onDismiss={() => setShowOverlay(false)} />}
            {showRoleInfo && myRole && (() => {
                const info = ROLE_INFO[myRole] || ROLE_INFO.human;
                return (
                    <div onClick={() => setShowRoleInfo(false)} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div onClick={e => e.stopPropagation()} style={{ border: `2px solid ${roleColor}66`, padding: 32, maxWidth: 400, width: "100%", background: "#0d0020ee", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                            <div style={{ width: 72, height: 72, border: `2px solid ${roleColor}`, background: roleColor + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{info.icon}</div>
                            <div style={{ fontSize: 16, color: roleColor }}>{myRole.toUpperCase()}</div>
                            <p style={{ fontSize: 9, color: "#8a7aa0", textAlign: "center", lineHeight: 2 }}>{info.desc}</p>
                            <button onClick={() => setShowRoleInfo(false)} className="btn btn-secondary" style={{ fontSize: 8 }}>CLOSE</button>
                        </div>
                    </div>
                );
            })()}
            {scannedAlert && (
                <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 40, padding: "12px 24px", border: "1px solid #ff2a2a66", background: "#1a000899" }}>
                    <p style={{ fontSize: 9, color: "#ff2a2a" }}>⚠ You have been scanned by the Engineer.</p>
                </div>
            )}
            {resultModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }} onClick={() => setResultModal(null)}>
                    <div style={{ width: "min(720px,94vw)", border: "2px solid " + (resultModal.variant === "danger" ? "#ff2a2a66" : resultModal.variant === "success" ? "#b0ffb866" : "#00f5ff66"), background: "#0d0020f2", padding: "26px 22px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#8a7aa0", marginBottom: 14 }}>NIGHT RESULT</div>
                        <div style={{ fontSize: 18, marginBottom: 12, color: resultModal.variant === "danger" ? "#ff2a2a" : resultModal.variant === "success" ? "#b0ffb8" : "#00f5ff" }}>{resultModal.title}</div>
                        <div style={{ fontSize: 12, color: "#e0d4ff", lineHeight: 2 }}>{resultModal.message}</div>
                        <div style={{ fontSize: 8, color: "#4a3060", marginTop: 16 }}>TAP TO DISMISS</div>
                    </div>
                </div>
            )}
            {showSettingsModal && (
                <div
                    className="modal--settings-overlay"
                    onClick={() => setShowSettingsModal(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 999990,
                        background: "rgba(8, 3, 0, 0.82)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                    }}>
                    <div
                        className="modal--settings cp-settings-bg"
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: "min(560px, 94vw)",
                            background: "linear-gradient(180deg, rgba(26,10,0,0.96), rgba(12,5,0,0.96))",
                            border: "1px solid rgba(255, 140, 26, 0.7)",
                            boxShadow: "0 0 0 1px rgba(255, 140, 26, 0.18), 0 0 28px rgba(255, 140, 26, 0.22)",
                            padding: 24,
                            maxHeight: "85vh",
                            overflowY: "auto",
                        }}>
                        <div className="cp-settings-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ff9b3d" }}>
                                <CiSettings size={22} />
                                <span style={{ fontSize: 11, letterSpacing: "0.18em" }}>SETTING</span>
                            </div>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="btn-topbar"
                                style={{ borderColor: "#ff8c1a44", color: "#ff9b3d" }}>
                                CLOSE
                            </button>
                        </div>
                        <div className="cp-settings-divider" style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255, 140, 26, 0.9), transparent)", marginBottom: 18 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Theme selector */}
                            <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 8, color: "#8a7aa0", letterSpacing: "0.12em", marginBottom: 8 }}>VISUAL THEME</div>
                                <select
                                    className="cp-theme-select"
                                    value={currentTheme}
                                    onChange={e => {
                                        const t = e.target.value;
                                        setCurrentTheme(t);
                                        applyTheme(t);
                                    }}
                                    style={{
                                        fontFamily: "Press Start 2P, monospace",
                                        fontSize: 9, padding: "10px 14px",
                                        background: "#0a0016",
                                        border: "1px solid #2a1a4a",
                                        color: "#e0d4ff",
                                        cursor: "pointer",
                                        outline: "none",
                                        width: "100%",
                                    }}>
                                    <option value="standard">▫ STANDARD</option>
                                    <option value="cyberpunk">◈ CYBERPUNK — EDGERUNNERS</option>
                                </select>
                            </div>
                            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #2a1a4a, transparent)", margin: "2px 0" }} />
                            <SettingsActionButton
                                label={`ROLL AURA (${me?.rollsRemaining ?? 0})`}
                                status={canRollAura ? "READY" : "LOCKED"}
                                active={canRollAura}
                                disabled={!canRollAura}
                                onClick={triggerRollAura}>
                                <BsStars style={{ color: "#ffd700", fontSize: 14 }} />
                            </SettingsActionButton>
                            {me?.isHost && (
                                <SettingsActionButton
                                    label="CHOOSE AURA"
                                    status={canChooseAura ? "READY" : "LOCKED"}
                                    active={canChooseAura}
                                    disabled={!canChooseAura}
                                    onClick={triggerChooseAura}>
                                    <BsStars style={{ color: "#00f5ff", fontSize: 14 }} />
                                </SettingsActionButton>
                            )}
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                                <div style={{ flex: "1 1 220px" }}>
                                    <SettingsActionButton
                                        label="HIDE ALL AURA"
                                        status={auraVisibility === "none" ? "ACTIVE" : "OFF"}
                                        active={auraVisibility === "none"}
                                        onClick={() => setAuraVisibility("none")}
                                    />
                                </div>
                                <div style={{ flex: "1 1 220px" }}>
                                    <SettingsActionButton
                                        label="HIDE OTHERS AURA"
                                        status={auraVisibility === "self" ? "ACTIVE" : "OFF"}
                                        active={auraVisibility === "self"}
                                        onClick={() => setAuraVisibility("self")}
                                    />
                                </div>
                            </div>
                            <SettingsActionButton
                                label="SHOW ALL AURA"
                                status={auraVisibility === "all" ? "ACTIVE" : "OFF"}
                                active={auraVisibility === "all"}
                                onClick={() => setAuraVisibility("all")}
                            />
                            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #2a1a4a, transparent)", margin: "6px 0" }} />
                            <div style={{ fontSize: 8, color: "#8a7aa0", letterSpacing: "0.12em", marginBottom: 6 }}>EMOTES</div>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                <div style={{ flex: "1 1 220px" }}>
                                    <SettingsActionButton
                                        label="HIDE ALL EMOTES"
                                        status={emoteVisibility === "none" ? "ACTIVE" : "OFF"}
                                        active={emoteVisibility === "none"}
                                        onClick={() => setEmoteVisibility("none")}
                                    />
                                </div>
                                <div style={{ flex: "1 1 220px" }}>
                                    <SettingsActionButton
                                        label="HIDE OTHERS EMOTES"
                                        status={emoteVisibility === "self" ? "ACTIVE" : "OFF"}
                                        active={emoteVisibility === "self"}
                                        onClick={() => setEmoteVisibility("self")}
                                    />
                                </div>
                            </div>
                            <SettingsActionButton
                                label="SHOW ALL EMOTES"
                                status={emoteVisibility === "all" ? "ACTIVE" : "OFF"}
                                active={emoteVisibility === "all"}
                                onClick={() => setEmoteVisibility("all")}
                            />
                            <div style={{ fontSize: 8, color: "#b97b4e", lineHeight: 1.8, marginTop: 6 }}>
                                These settings affect only your screen.
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isRolling && (
                <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "min(320px, 90vw)", border: "2px solid #ffd70066", background: "#0d0020", padding: 24, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#8a7aa0", marginBottom: 20 }}>ROLLING AURA...</div>
                        <div style={{ width: 120, height: 120, margin: "20px auto", borderRadius: "50%", background: "#07000f", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${AURA_PREVIEW[rollingAura]?.border || "#f5f5f588"}` }}>
                            <img src={`/profiles/${me.profileId}.jpg`} alt="Me" style={{ width: "90%", height: "90%", borderRadius: "50%", objectFit: "cover", opacity: 0.8 }} />
                        </div>
                        <div style={{ fontSize: 8, color: AURA_PREVIEW[rollingAura]?.color || "#f5f5f5" }}>{AURA_PREVIEW[rollingAura]?.label || "RAGE MODE"}</div>
                    </div>
                </div>
            )}
            {showAuraPicker && (
                <div className="aura-picker-overlay" onClick={() => setShowAuraPicker(false)}>
                    <div className="aura-picker-content" onClick={e => e.stopPropagation()}>
                        <div className="aura-picker-title">SELECT YOUR EMANATION</div>
                        <div className="aura-picker-grid">
                            {AURA_ROLL_OPTIONS.map((opt, idx) => (
                                <button key={opt} className="aura-picker-option" onClick={() => handleSelectAura(idx)} style={{ color: AURA_PREVIEW[opt].color, textShadow: `0 0 10px ${AURA_PREVIEW[opt].color}66` }}>{AURA_PREVIEW[opt].label}</button>
                            ))}
                        </div>
                        <button className="aura-picker-close" onClick={() => setShowAuraPicker(false)}>CANCEL</button>
                    </div>
                </div>
            )}

            {/* Emote Wheel */}
            {emoteWheel && (
                <EmoteWheel
                    cx={emoteWheel.cx}
                    cy={emoteWheel.cy}
                    emotes={emoteWheel.emotes} borderRadius={emoteWheel.borderRadius}
                    onSelect={handleEmoteSelect}
                    onClose={() => setEmoteWheel(null)}
                />
            )}
        </>
    );

    const topBar = (
        <div className="cp-game-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #1a0a2a", background: "#08001299", flexShrink: 0, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="cp-phase-chip" style={{ fontSize: isMobile ? 8 : 10, border: `1px solid ${phaseColor}55`, color: "#8a7aa0", padding: "6px 14px", background: phaseColor + "0a" }}>{phase.replace(/_/g, " ")}</div>
                <div className="cp-round-chip" style={{ fontSize: 9, color: "#4a3060" }}>RND {round}</div>
            </div>
            {timers.endsAt && <PhaseTimer endsAt={timers.endsAt} color={phaseColor} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {me && !me.alive && (
                    <div className="btn-topbar cp-topbar-chip cp-topbar-chip--dead" style={{ background: "#5a0000", border: "1px solid #7a0000", cursor: "default" }}>
                        DEAD
                    </div>
                )}
                <button onClick={() => setShowRoleInfo(true)} className="btn-topbar cp-topbar-chip cp-role-chip" style={{ border: `1px solid ${roleColor}55`, color: roleColor }}>
                    {myRole?.toUpperCase()} ?
                </button>
                <button
                    onClick={openSettingsModal}
                    className="btn-topbar cp-topbar-chip cp-settings-chip"
                    style={{
                        border: "1px solid #ff8c1a88",
                        color: "#ff9b3d",
                        background: "rgba(255, 140, 26, 0.08)",
                        boxShadow: "0 0 18px rgba(255, 140, 26, 0.12)",
                    }}>
                    <CiSettings size={18} /> SETTING
                </button>
                {!isMobile && (
                    <button onClick={() => setDesktopChat(o => !o)} className="btn-topbar cp-topbar-chip cp-chat-toggle-chip" style={{ color: "#8a7aa0" }}>
                        {desktopChat ? "HIDE CHAT" : "SHOW CHAT"}
                    </button>
                )}
            </div>
        </div>
    );

    const leftColumnContent = (
        <>
            {isNight ? (
                me?.alive ? (
                    <NightPanel myRole={myRole} players={players} myId={myId} gnosiaAllies={allies} selectedTarget={selectedTarget} onSelect={setSelectedTarget} submitted={nightSubmitted} actionMsg={actionMsg} actionError={actionError} onConfirm={submitNightAction} gnosiaVoteProgress={gnosiaVP} scanResult={scanResult} inspectResult={inspectResult} guardianResult={guardianResult} />
                ) : (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
                        <div style={{ fontSize: 36, opacity: 0.15 }}>☽</div>
                        <span style={{ fontSize: 9, color: "#2a1a3a" }}>SPECTATING — AWAIT DAWN</span>
                    </div>
                )
            ) : (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                    {isVoting && <VoteProgressBar votesCast={voteProgress.votesCast} totalAlive={voteProgress.totalAlive} />}
                    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 9, color: "#4a3060" }}>CREW MANIFEST</span>
                            <span style={{ fontSize: 9, color: "#4a3060" }}>{aliveCount} alive / {players.length}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10 }}>
                            {players.map(p => <PlayerCard key={p.id} player={p} isMe={p.id === myId} isSelected={selectedTarget === p.id} canSelect={me?.alive && canTarget(p)} onSelect={id => setSelectedTarget(selectedTarget === id ? null : id)} phase={phase} myRole={myRole} gnosiaAllies={allies.map(a => a.id)} voteBreakdown={voteBreakdown} allPlayers={players} auraVisibility={auraVisibility} emoteVisibility={emoteVisibility} activeEmote={playerEmotes[p.id]} onHoldComplete={p.id === myId ? handleHoldComplete : undefined} />)}
                        </div>
                    </div>
                    {isVoting && me?.alive && (
                        <div className="cp-vote-tray" style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "14px 16px", background: "#07000f" }}>
                            {actionError && <div style={{ fontSize: 8, color: "#ff2a2a", marginBottom: 8 }}>⚠ {actionError}</div>}
                            {actionMsg && <div style={{ fontSize: 8, color: "#ffaa33", marginBottom: 8 }}>{actionMsg}</div>}
                            <button className="btn btn-gold cp-vote-button" style={{ width: "100%", fontSize: 10 }} onClick={submitVote} disabled={!selectedTarget || hasVoted}>{hasVoted ? "✓ VOTE LOCKED" : selectedTarget ? `⚖ VOTE: ${players.find(p => p.id === selectedTarget)?.username}` : "SELECT TO VOTE"}</button>
                            {myRole === "lawyer" && <button className="cp-lawyer-button" style={{ width: "100%", marginTop: 10, padding: "10px", fontSize: 9, background: hasLawyerDismissed ? "#1a0a2a" : "#7a3a00", color: hasLawyerDismissed ? "#3a2a4a" : "#ffbb55", border: "1px solid #ff8833", fontFamily: "Press Start 2P" }} onClick={dismissVote} disabled={hasLawyerDismissed}>{hasLawyerDismissed ? "DISMISS USED" : "⚖ DISMISS VOTE"}</button>}
                        </div>
                    )}
                    {showSkipBar && (
                        <div className="cp-skip-tray" style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "12px 16px", background: "#07000f" }}>
                            <SkipBar skipVotes={skipVotes} myId={myId} onSkip={requestSkipPhase} actionError={actionError} actionMsg={actionMsg} />
                        </div>
                    )}
                    {!me?.alive && <div style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "12px 16px", textAlign: "center" }}><span style={{ fontSize: 9, color: "#2a1a3a" }}>SPECTATING</span></div>}
                </div>
            )}
        </>
    );

    return (
        <div className="crt star-bg" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {sharedOverlays}
            {topBar}
            {isMobile ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {!(isNight && (isGnosiaRole(myRole) || myRole === "doctor")) && (
                        <div style={{ flexShrink: 0, borderBottom: "1px solid #1a0a2a", background: "#07000f", overflowY: "auto", maxHeight: 210 }}>
                            <div style={{ padding: "10px 12px" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {players.map(p => <div key={p.id} style={{ width: 76 }}><PlayerCard player={p} isMe={p.id === myId} isSelected={selectedTarget === p.id} canSelect={me?.alive && canTarget(p)} onSelect={id => setSelectedTarget(selectedTarget === id ? null : id)} phase={phase} myRole={myRole} gnosiaAllies={allies.map(a => a.id)} voteBreakdown={voteBreakdown} allPlayers={players} compact={true} auraVisibility={auraVisibility} emoteVisibility={emoteVisibility} activeEmote={playerEmotes[p.id]} onHoldComplete={p.id === myId ? handleHoldComplete : undefined} /></div>)}
                                </div>
                            </div>
                        </div>
                    )}
                    {isNight && me?.alive ? (
                        <div style={{ flex: 1, overflow: "hidden" }}><NightPanel myRole={myRole} players={players} myId={myId} gnosiaAllies={allies} selectedTarget={selectedTarget} onSelect={setSelectedTarget} submitted={nightSubmitted} actionMsg={actionMsg} actionError={actionError} onConfirm={submitNightAction} gnosiaVoteProgress={gnosiaVP} scanResult={scanResult} inspectResult={inspectResult} guardianResult={guardianResult} /></div>
                    ) : (
                        <div style={{ flexShrink: 0 }}>
                            {isVoting && me?.alive ? (
                                <div className="cp-vote-tray cp-vote-tray--mobile" style={{
                                    padding: "16px", background: "#0d0020",
                                    display: "flex", flexDirection: "column", gap: 12,
                                    borderBottom: "1px solid #1a0a2a",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
                                }}>
                                    {/* Main Vote Button */}
                                    <button
                                        className="btn btn-gold"
                                        style={{ width: "100%", fontSize: 10, height: 48, boxShadow: "0 0 15px #ffd70022" }}
                                        onClick={submitVote}
                                        disabled={!selectedTarget || hasVoted}
                                    >
                                        {hasVoted ? "✓ VOTE LOCKED" : selectedTarget ? `⚖ VOTE: ${players.find(p => p.id === selectedTarget)?.username || "TARGET"}` : "SELECT TO VOTE"}
                                    </button>

                                    {/* Lawyer Dismiss Button - More prominently styled */}
                                    {myRole === "lawyer" && (
                                        <button
                                            className="btn cp-lawyer-button"
                                            style={{
                                                width: "100%",
                                                height: 44,
                                                fontSize: 8,
                                                letterSpacing: "0.05em",
                                                background: hasLawyerDismissed ? "#1a0a2a66" : "#7a3a0022",
                                                color: hasLawyerDismissed ? "#3a2a4a" : "#ffbb55",
                                                border: `1px solid ${hasLawyerDismissed ? "#2a1a4a" : "#ff8833"}`,
                                                fontFamily: "Press Start 2P"
                                            }}
                                            onClick={dismissVote}
                                            disabled={hasLawyerDismissed}
                                        >
                                            {hasLawyerDismissed ? "DISMISS USED" : "⚖ LAWYER: DISMISS VOTE"}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                showSkipBar && (
                                    <div className="cp-skip-tray cp-skip-tray--mobile" style={{ padding: "12px 16px", background: "#0d0020", borderBottom: "1px solid #1a0a2a" }}>
                                        <SkipBar skipVotes={skipVotes} myId={myId} onSkip={requestSkipPhase} />
                                    </div>
                                )
                            )}
                        </div>
                    )}
                    <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                        {/* Visual divider for the chat panel to prevent perceived overlap */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #2a1a4a, transparent)", zIndex: 10 }} />
                        <ChatPanel
                            roomId={roomId} myRole={myRole} isAlive={me?.alive ?? true} phase={phase} socket={socket} players={players} myId={myId}
                            isPanelOpen={true}
                            pubMsgs={pubMsgs} gnMsgs={gnMsgs}
                            unreadPub={unreadPub} unreadGn={unreadGn}
                            onViewTab={handleClearUnread}
                            onExpand={() => setMobileChatOpen(true)}
                            tab={activeChatTab}
                            onTabChange={setActiveChatTab}
                        />
                    </div>

                    {/* Mobile Chat Modal Overlay */}
                    {mobileChatOpen && (
                        <div className="cp-mobile-chat-modal" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#07000ffc", display: "flex", flexDirection: "column", animation: "fadeInUp 0.3s ease-out" }}>
                            <div className="cp-mobile-chat-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1a0a2a", background: "#0d0020" }}>
                                <span style={{ fontSize: 10, color: "#00f5ff", fontFamily: "Press Start 2P" }}>CREW CHAT</span>
                                <button
                                    onClick={() => setMobileChatOpen(false)}
                                    className="btn-topbar"
                                    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #ff2a2a44", color: "#ff2a2a" }}
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                                <ChatPanel
                                    roomId={roomId} myRole={myRole} isAlive={me?.alive ?? true} phase={phase} socket={socket} players={players} myId={myId}
                                    isPanelOpen={true}
                                    pubMsgs={pubMsgs} gnMsgs={gnMsgs}
                                    unreadPub={unreadPub} unreadGn={unreadGn}
                                    onViewTab={handleClearUnread}
                                    tab={activeChatTab}
                                    onTabChange={setActiveChatTab}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, width: desktopChat ? "50%" : "100%" }}>{leftColumnContent}</div>
                    {desktopChat && (
                        <div style={{ flex: 1 }}>
                            <ChatPanel
                                roomId={roomId} myRole={myRole} isAlive={me?.alive ?? true} phase={phase} socket={socket} players={players} myId={myId}
                                isPanelOpen={true}
                                pubMsgs={pubMsgs} gnMsgs={gnMsgs}
                                unreadPub={unreadPub} unreadGn={unreadGn}
                                onViewTab={handleClearUnread}
                                tab={activeChatTab}
                                onTabChange={setActiveChatTab}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
