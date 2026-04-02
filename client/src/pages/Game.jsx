/**
 * Game.jsx — Merge-conflict resolved. Mobile + Desktop unified.
 * Keeps: mobile layout (improve1), desktop layout (main), all features from both.
 */
import { useState, useEffect } from "react";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import PlayerCard from "../components/PlayerCard.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import PhaseOverlay from "../components/PhaseOverlay.jsx";
import NightPanel from "../components/NightPanel.jsx";
import StartReveal from "../components/StartReveal.jsx";
import { clearPlaySession } from "../lib/sessionPersistence.js";
import { AVATAR_COLORS } from "../lib/profiles.js";

const PHASE_COLORS = {
    DAY_DISCUSSION: "#00f5ff", VOTING: "#ffd700", AFTERNOON: "#ffb347",
    NIGHT: "#9b30ff", MORNING: "#ff9ef5", END: "#ff2a2a",
};
const ROLE_COLORS = {
    gnosia: "#9b30ff", engineer: "#00f5ff", doctor: "#b0ffb8",
    guardian: "#ffd700", human: "#c8b8ff", lawyer: "#ff8833", traitor: "#ff4040",
};
const ROLE_INFO = {
    gnosia:   { icon: "👁", desc: "Deceive the crew. Each night, coordinate with your allies to eliminate one human. You win when Gnosia outnumber humans." },
    human:    { icon: "◈", desc: "Identify and vote out all Gnosia before they take over the ship." },
    engineer: { icon: "⚡", desc: "Each night, scan one player to learn if they are Gnosia. If they are, they receive a warning — not your identity." },
    doctor:   { icon: "☤", desc: "Each night, inspect one player in Cold Sleep to reveal their true role." },
    guardian: { icon: "🛡", desc: "Each night, protect one other player. If the Gnosia target them, the kill is blocked." },
    lawyer:   { icon: "⚖", desc: "Once per game, you may dismiss the vote during any voting round — cancelling it entirely so no one is eliminated." },
    traitor:  { icon: "◈", desc: "You have no special ability, but you appear human to all scans and inspections. You win with the Gnosia." },
};

// ── Big phase timer ──────────────────────────────────────────────────
function PhaseTimer({ endsAt, color }) {
    const [rem, setRem] = useState(0);
    useEffect(() => {
        if (!endsAt) return;
        const tick = () => setRem(Math.max(0, endsAt - Date.now()));
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [endsAt]);

    const secs = Math.ceil(rem / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const urgent = secs <= 30 && secs > 0;

    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 7, color: "#8a7aa0", letterSpacing: "0.2em", marginBottom: 4 }}>
                TIME REMAINING
            </div>
            <div style={{
                fontSize: 32, color: urgent ? "#ff2a2a" : color,
                textShadow: urgent ? "0 0 16px #ff2a2a" : "0 0 16px " + color + "aa",
                animation: urgent ? "urgentPulse 0.6s infinite" : "none",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.05em",
            }}>
                {String(mins).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </div>
        </div>
    );
}

// ── Game Over screen ─────────────────────────────────────────────────
function GameOverScreen({ result, onPlayAgain, amHost }) {
    const hw = result.winner === "humans";
    const wc = hw ? "#00f5ff" : "#9b30ff";
    return (
        <div className="crt star-bg" style={{
            position: "fixed", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 28, padding: 32,
            zIndex: 60, overflowY: "auto", animation: "fadeIn 0.4s ease",
        }}>
            <div style={{ fontSize: 80, filter: `drop-shadow(0 0 30px ${wc})` }}>
                {hw ? "◈" : "👁"}
            </div>
            <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 28, color: wc, textShadow: `0 0 20px ${wc}`, marginBottom: 12 }}>
                    {hw ? "HUMANS WIN" : "GNOSIA WIN"}
                </h1>
                <p style={{ fontSize: 10, color: "#4a3060" }}>
                    {hw ? "All Gnosia eliminated. The crew survives." : "The Gnosia have taken control."}
                </p>
            </div>
            <div style={{
                border: `1px solid ${wc}33`, padding: 24, maxWidth: 480, width: "100%",
                background: "#0d002088",
            }}>
                <div style={{ fontSize: 9, color: "#4a3060", marginBottom: 16 }}>FINAL MANIFEST</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.players.map(p => {
                        const rc = ROLE_COLORS[p.role] || "#c8b8ff";
                        const ac = AVATAR_COLORS[p.profileId] || "#c8b8ff";
                        return (
                            <div key={p.id} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                paddingBottom: 10, borderBottom: "1px solid #1a0a2a",
                            }}>
                                <div style={{
                                    width: 40, height: 40, flexShrink: 0,
                                    border: `2px solid ${ac}55`, background: ac + "15", overflow: "hidden",
                                }}>
                                    <img src={`/profiles/${p.profileId}.jpg`} alt={p.username}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                                    <div style={{
                                        display: "none", width: "100%", height: "100%", alignItems: "center",
                                        justifyContent: "center", color: ac, fontSize: 16, fontWeight: "bold",
                                    }}>
                                        {p.username[0].toUpperCase()}
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 10, color: "#e0d4ff",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>
                                        {p.username}
                                    </div>
                                    <div style={{ fontSize: 8, color: p.alive ? "#4a3060" : "#2a1a3a", marginTop: 3 }}>
                                        {p.alive ? "SURVIVED" : "ELIMINATED"}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 8, border: `1px solid ${rc}44`, color: rc,
                                    padding: "4px 10px", flexShrink: 0,
                                }}>
                                    {p.role.toUpperCase()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            <button className="btn btn-lg" onClick={onPlayAgain} style={{ opacity: amHost ? 1 : 0.6 }}>
                {amHost ? "PLAY AGAIN" : "WAITING FOR HOST"}
            </button>
        </div>
    );
}

// ── Reconnecting screen ──────────────────────────────────────────────
function ReconnectingScreen() {
    return (
        <div className="crt star-bg" style={{
            height: "100vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", overflow: "hidden",
        }}>
            <div style={{
                position: "fixed", inset: 0, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)",
            }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 32, zIndex: 10 }}>
                <div style={{ fontSize: 72, animation: "pulse 1.5s ease-in-out infinite", filter: "drop-shadow(0 0 30px #00f5ff)" }}>◈</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <h1 style={{ fontSize: 28, letterSpacing: "0.15em", color: "#00f5ff", textShadow: "0 0 20px #00f5ff88", margin: 0 }}>
                        RECONNECTING...
                    </h1>
                    <p style={{ fontSize: 10, color: "#4a3060", textAlign: "center", lineHeight: 1.8, margin: 0 }}>
                        Attempting to restore connection<br />to the game server.
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: "#00f5ff", boxShadow: "0 0 12px #00f5ff",
                            animation: "bounce 1.2s ease-in-out infinite",
                            animationDelay: `${i * 0.2}s`,
                        }} />
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.1)} }
                @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.6} 50%{transform:translateY(-12px);opacity:1} }
            `}</style>
        </div>
    );
}

// ── Skip voters bar ──────────────────────────────────────────────────
function SkipBar({ skipVotes, myId, onSkip, actionError, actionMsg }) {
    const iVoted = skipVotes.some(v => v.id === myId);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {actionError && <div style={{ fontSize: 8, color: "#ff2a2a", width: "100%" }}>⚠ {actionError}</div>}
            {actionMsg  && <div style={{ fontSize: 8, color: "#00f5ff", width: "100%" }}>{actionMsg}</div>}
            <button className="btn btn-secondary" style={{ fontSize: 8, padding: "8px 12px", flexShrink: 0 }}
                onClick={() => { if (!iVoted) onSkip(); }} disabled={iVoted}>
                {iVoted ? "✓ SKIP REQUESTED" : "⏭ SKIP PHASE"}
            </button>
            <div style={{ display: "flex", alignItems: "center" }}>
                {skipVotes.map((voter, i) => (
                    <img key={voter.id}
                        src={`/profiles/${voter.profileId}.jpg`}
                        alt={voter.username} title={`${voter.username} wants to skip`}
                        style={{
                            width: 26, height: 26, borderRadius: "50%",
                            border: "2px solid #07000f", objectFit: "cover",
                            boxShadow: "0 0 8px #00f5ff44",
                            marginLeft: i > 0 ? -8 : 0,
                            zIndex: skipVotes.length - i, position: "relative",
                            animation: "fadeInUp 0.3s ease forwards",
                        }}
                        onError={e => { e.target.style.display = "none"; }}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Vote progress bar ─────────────────────────────────────────────────
function VoteProgressBar({ votesCast, totalAlive }) {
    const pct = totalAlive > 0 ? (votesCast / totalAlive) * 100 : 0;
    return (
        <div style={{ padding: "10px 16px", flexShrink: 0, borderBottom: "1px solid #1a0a2a", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 8, color: "#4a3060", flexShrink: 0 }}>VOTES</span>
            <div style={{ flex: 1, height: 4, background: "#1a0015", borderRadius: 2 }}>
                <div style={{
                    height: "100%", background: "#ffd700", boxShadow: "0 0 8px #ffd700",
                    borderRadius: 2, transition: "width 0.5s", width: `${pct}%`,
                }} />
            </div>
            <span style={{ fontSize: 9, color: "#ffd700", flexShrink: 0 }}>{votesCast}/{totalAlive}</span>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN GAME
// ─────────────────────────────────────────────
export default function Game({ session, socket, onLeaveRoom }) {
    const { roomId, myId, myRole, allies: initialAllies = [], gnosiaCount } = session;
    const { reconnecting } = useSocket();

    const [players,       setPlayers]       = useState(session.lastPhasePayload?.players || []);
    const [allies,        setAllies]        = useState(initialAllies);
    const [phase,         setPhase]         = useState(session.lastPhasePayload?.phase || session.phase || "DAY_DISCUSSION");
    const [round,         setRound]         = useState(session.lastPhasePayload?.round || 1);
    const [timers,        setTimers]        = useState(session.lastPhasePayload?.timers || {});
    const [morningReport, setMorningReport] = useState(null);
    const [showOverlay,   setShowOverlay]   = useState(true);
    const [gameOver,      setGameOver]      = useState(null);

    const [selectedTarget,       setSelectedTarget]       = useState(null);
    const [nightSubmitted,       setNightSubmitted]       = useState(false);
    const [actionError,          setActionError]          = useState("");
    const [actionMsg,            setActionMsg]            = useState("");
    const [voteProgress,         setVoteProgress]         = useState({ votesCast: 0, totalAlive: 0 });
    const [gnosiaVP,             setGnosiaVP]             = useState({ votesIn: 0, totalGnosia: 0 });
    const [scanResult,           setScanResult]           = useState(null);
    const [inspectResult,        setInspectResult]        = useState(null);
    const [guardianResult,       setGuardianResult]       = useState(null);
    const [scannedAlert,         setScannedAlert]         = useState(false);
    const [hasVoted,             setHasVoted]             = useState(false);
    const [hasLawyerDismissed,   setHasLawyerDismissed]   = useState(false);
    const [voteDismissed,        setVoteDismissed]        = useState(null);
    const [resultModal,          setResultModal]          = useState(null);
    const [showStartReveal,      setShowStartReveal]      = useState(false);
    const [hasShownStartReveal,  setHasShownStartReveal]  = useState(false);
    const [showRoleInfo,         setShowRoleInfo]         = useState(false);
    const [voteReveal,           setVoteReveal]           = useState(null);
    const [voteBreakdown,        setVoteBreakdown]        = useState(null);
    const [skipVotes,            setSkipVotes]            = useState(session.lastPhasePayload?.skipVotes || []);
    const [lostConnectionNotice, setLostConnectionNotice] = useState("");
    const [unread,               setUnread]               = useState({ public: 0, gnosia: 0 });

    // Layout state
    const [isMobile,       setIsMobile]       = useState(false);
    const [desktopChat,    setDesktopChat]    = useState(true);  // desktop sidebar toggle
    const [mobileChatOpen, setMobileChatOpen] = useState(false); // mobile modal toggle

    const me         = players.find(p => p.id === myId);
    const isNight    = phase === "NIGHT";
    const isVoting   = phase === "VOTING";
    const phaseColor = PHASE_COLORS[phase] || "#00f5ff";
    const roleColor  = ROLE_COLORS[myRole] || "#c8b8ff";
    const totalUnread = unread.public + unread.gnosia;

    // ── Mobile detection ──────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const m = window.matchMedia("(max-width: 768px)");
        const apply = () => setIsMobile(m.matches);
        apply();
        m.addEventListener?.("change", apply) || m.addListener?.(apply);
        return () => m.removeEventListener?.("change", apply) || m.removeListener?.(apply);
    }, []);

    // Auto-close mobile chat when entering non-discussion phases
    useEffect(() => {
        if (!isMobile) return;
        if (!["DAY_DISCUSSION", "LOBBY", "AFTERNOON"].includes(phase)) {
            setMobileChatOpen(false);
        }
    }, [phase, isMobile]);

    // Trigger start reveal on round 1 day discussion
    useEffect(() => {
        if (hasShownStartReveal) return;
        if (phase === "DAY_DISCUSSION" && round === 1 && players.length > 0) {
            setShowStartReveal(true);
            setHasShownStartReveal(true);
            setShowOverlay(false);
        }
    }, [phase, round, players.length, hasShownStartReveal]);

    // ── Result modal helper ───────────────────────────────────────────
    function showResultModal(payload) {
        setResultModal(payload);
        const ms = typeof payload?.durationMs === "number" ? payload.durationMs : 6000;
        setTimeout(() => setResultModal(null), ms);
    }

    // ── Socket listeners ──────────────────────────────────────────────
    useSocketEvent("game:roleAssigned", rolePayload => {
        if (rolePayload.role === "gnosia" && rolePayload.gnosiaAllies) {
            setAllies(rolePayload.gnosiaAllies);
        }
    });

    useSocketEvent("phase:changed", ({ phase: p, round: r, timers: t, players: pl, skipVotes: sv, morningReport: mr }) => {
        setPhase(p); setRound(r); setTimers(t); setPlayers(pl);
        setSelectedTarget(null); setNightSubmitted(false);
        setActionError(""); setActionMsg(""); setHasVoted(false);
        setShowOverlay(true); setScanResult(null); setInspectResult(null); setGuardianResult(null);
        if (p !== "VOTE_REVEAL" && p !== "AFTERNOON") setVoteBreakdown(null);
        setSkipVotes(Array.isArray(sv) ? sv : []);
        setMorningReport(mr || null);
        if (p === "DAY_DISCUSSION" && r === 1 && !hasShownStartReveal) {
            setShowStartReveal(true);
            setHasShownStartReveal(true);
            setShowOverlay(false);
        }
    });

    useSocketEvent("phase:skip:updated", voters => setSkipVotes(Array.isArray(voters) ? voters : []));
    useSocketEvent("vote:progress",      ({ votesCast, totalAlive }) => setVoteProgress({ votesCast, totalAlive }));
    useSocketEvent("vote:dismissed",     ({ byUsername, message }) => {
        setVoteDismissed({ byUsername, message });
        setTimeout(() => setVoteDismissed(null), 3500);
    });

    useSocketEvent("vote:result", result => {
        setVoteBreakdown(result.votes || {});
        setVoteReveal({
            eliminatedId:       result.eliminated || null,
            eliminatedUsername: result.eliminatedUsername || null,
            reason:             result.reason || null,
        });
        setTimeout(() => {
            setMorningReport(prev => ({ ...(prev || {}), coldSleep: result.eliminated, coldSleepUsername: result.eliminatedUsername }));
            if (result.eliminated) {
                setPlayers(prev => prev.map(p => p.id === result.eliminated ? { ...p, alive: false, inColdSleep: true } : p));
            }
            setVoteReveal(null);
        }, 4200);
    });

    useSocketEvent("night:scanResult", r => {
        setScanResult(r);
        showResultModal({
            variant: r?.isGnosia ? "danger" : "info",
            title:   "ENGINEER SCAN RESULT",
            message: `${r?.targetUsername || "Target"} is ${r?.isGnosia ? "GNOSIA" : "HUMAN"}.`,
            durationMs: 6000,
        });
    });

    useSocketEvent("night:inspectResult", r => {
        setInspectResult(r);
        if (r?.error) return;
        showResultModal({
            variant: r?.role === "gnosia" ? "danger" : "success",
            title:   "DOCTOR INSPECTION RESULT",
            message: `${r?.targetUsername || "Target"} was ${r?.role === "gnosia" ? "GNOSIA" : "HUMAN"}.`,
            durationMs: 6000,
        });
    });

    useSocketEvent("night:guardianResult", r => {
        setGuardianResult(r);
        showResultModal({
            variant: r?.worked ? "success" : "info",
            title:   "PROTECTION OUTCOME",
            message: r?.worked
                ? `You protected ${r?.targetUsername || "Target"} from the Gnosia!`
                : `Your ward ${r?.targetUsername || "Target"} was not targeted tonight.`,
            durationMs: 6000,
        });
    });

    useSocketEvent("night:scannedAlert", payload => {
        setScannedAlert(true);
        setTimeout(() => setScannedAlert(false), 8000);
        showResultModal({
            variant:    "danger",
            title:      "GNOSIA ALERT",
            message:    payload?.message || "You have been scanned by the Engineer.",
            durationMs: 6000,
        });
    });

    useSocketEvent("ui:toast", t => showResultModal({
        variant:    t?.variant || "info",
        title:      t?.title   || "NOTICE",
        message:    t?.message || "",
        durationMs: typeof t?.durationMs === "number" ? t.durationMs : 6000,
    }));

    useSocketEvent("night:gnosiaVoteProgress", ({ votesIn, totalGnosia }) => {
        setGnosiaVP({ votesIn, totalGnosia });
        setActionMsg(`${votesIn}/${totalGnosia} Gnosia voted`);
    });

    useSocketEvent("game:over", r => { setGameOver(r); setPhase("END"); });

    useSocketEvent("player:disconnected", ({ socketId }) => {
        setPlayers(prev => prev.map(p => p.id === socketId ? { ...p, disconnected: true } : p));
    });

    useSocketEvent("player:reconnected", ({ previousId, newId }) => {
        setPlayers(prev => prev.map(p => p.id === previousId ? { ...p, id: newId, disconnected: false } : p));
    });

    useSocketEvent("player:lostConnection", ({ username, playerId }) => {
        setLostConnectionNotice(`${username} lost connection.`);
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        setTimeout(() => setLostConnectionNotice(""), 7000);
    });

    // ── Actions ───────────────────────────────────────────────────────
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
        const map = { gnosia: "gnosia_vote", engineer: "engineer", doctor: "doctor", guardian: "guardian" };
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
        socket.emit("room:leave", { roomId }, res => {
            if (res.success) { clearPlaySession(); onLeaveRoom?.(); }
            else alert(res.error || "Failed to leave.");
        });
    }

    function playAgain() {
        if (!me?.isHost) return;
        socket.emit("room:playAgain", { roomId }, res => { if (!res.success) alert(res.error || "Failed."); });
    }

    // ── Guards ────────────────────────────────────────────────────────
    if (reconnecting) return <ReconnectingScreen />;
    if (gameOver)     return <GameOverScreen result={gameOver} onPlayAgain={playAgain} amHost={me?.isHost} />;

    const canTarget = p => {
        if (!me?.alive || p.id === myId) return false;
        if (isVoting) return p.alive;
        if (isNight) {
            if (myRole === "doctor") return p.inColdSleep;
            if (myRole === "human")  return false;
            return p.alive;
        }
        return false;
    };

    const aliveCount  = players.filter(p => p.alive).length;
    const skipPhases  = ["DAY_DISCUSSION", "AFTERNOON"];
    const showSkipBar = skipPhases.includes(phase) && me?.alive;

    // ── Shared overlays (used in both layouts) ────────────────────────
    const sharedOverlays = (
        <>
            {/* Lost connection notice */}
            {lostConnectionNotice && (
                <div style={{
                    position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
                    zIndex: 999999, padding: "10px 20px", background: "#1a0008ee",
                    border: "1px solid #ff2a2a55", color: "#ff8888", fontSize: 9,
                    maxWidth: "90vw", textAlign: "center", boxShadow: "0 0 20px #000",
                    pointerEvents: "none", animation: "fadeInUp 0.2s ease",
                }}>
                    {lostConnectionNotice}
                </div>
            )}

            {/* Vote Cancelled popup */}
            {voteDismissed && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 60,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.75)", animation: "fadeIn 0.2s ease",
                    pointerEvents: "none",
                }}>
                    <div style={{
                        border: "2px solid #ff883366", background: "#0d0020f2",
                        padding: "28px 36px", textAlign: "center",
                        boxShadow: "0 0 60px #000",
                        animation: "fadeInUp 0.2s ease",
                    }}>
                        <div style={{ fontSize: 9, color: "#8a7aa0", letterSpacing: "0.15em", marginBottom: 12 }}>
                            LAWYER
                        </div>
                        <div style={{ fontSize: 20, color: "#ff8833", marginBottom: 10 }}>
                            <span className="text-red-400">Vote Dismissed</span>
                        </div>
                        <div style={{ fontSize: 9, color: "#c8b8ff" }}>
                            Vote has been dismissed.<br />No one is eliminated.
                        </div>
                    </div>
                </div>
            )}

            {/* Crew reveal (round 1 start) */}
            {showStartReveal && players.length > 0 && (
                <StartReveal
                    players={players}
                    gnosiaCount={
                        typeof session.lastPhasePayload?.gnosiaCount === "number"
                            ? session.lastPhasePayload.gnosiaCount
                            : typeof gnosiaCount === "number"
                                ? gnosiaCount
                                : Math.max(1, Math.floor(players.length / 3))
                    }
                    myId={myId}
                    myRole={myRole}
                    onDismiss={() => { setShowStartReveal(false); setShowOverlay(true); }}
                />
            )}

            {/* Vote reveal animation */}
            {voteReveal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 55,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(180deg,#07000ff0,#07000fcc)",
                    overflow: "hidden",
                }}>
                    <div style={{
                        position: "absolute", inset: 0, opacity: 0.8,
                        backgroundImage:
                            "radial-gradient(1px 1px at 10% 20%,#fff2 0%,transparent 100%)," +
                            "radial-gradient(1px 1px at 60% 40%,#fff2 0%,transparent 100%)," +
                            "radial-gradient(2px 2px at 30% 80%,#00f5ff10 0%,transparent 100%)," +
                            "radial-gradient(2px 2px at 80% 15%,#9b30ff10 0%,transparent 100%)",
                    }} />
                    <div style={{
                        width: "min(680px,92vw)", border: "1px solid #2a1a4a",
                        background: "#0d0020cc", padding: "28px 26px",
                        animation: "voteSlide 4.2s ease forwards",
                        boxShadow: "0 0 60px #000",
                    }}>
                        <div style={{ fontSize: 9, color: "#8a7aa0", letterSpacing: "0.18em", marginBottom: 12 }}>
                            VOTING RESULT
                        </div>
                        {voteReveal.eliminatedId ? (
                            <>
                                <div style={{ fontSize: 16, color: "#ffd700", textShadow: "0 0 14px #ffd70088", marginBottom: 10 }}>
                                    {voteReveal.eliminatedUsername || "Unknown"} has been voted to Cold Sleep
                                </div>
                                <div style={{ fontSize: 9, color: "#8a7aa0" }}>Drifting into deep space...</div>
                            </>
                        ) : (
                            <div style={{ fontSize: 12, color: "#8a7aa0" }}>
                                {voteReveal.reason || "No one entered Cold Sleep."}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Phase overlay */}
            {showOverlay && !showStartReveal && phase !== "END" && (
                <PhaseOverlay phase={phase} morningReport={morningReport}
                    round={round} onDismiss={() => setShowOverlay(false)} />
            )}

            {/* Role info modal */}
            {showRoleInfo && myRole && (() => {
                const info = ROLE_INFO[myRole] || ROLE_INFO.human;
                const color = roleColor;
                return (
                    <div onClick={() => setShowRoleInfo(false)} style={{
                        position: "fixed", inset: 0, zIndex: 55,
                        background: "rgba(0,0,0,0.75)", display: "flex",
                        alignItems: "center", justifyContent: "center", padding: 24,
                        animation: "fadeIn 0.2s ease",
                    }}>
                        <div onClick={e => e.stopPropagation()} style={{
                            border: `2px solid ${color}66`, padding: 32, maxWidth: 400, width: "100%",
                            background: "#0d0020ee", boxShadow: `0 0 40px ${color}22`,
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
                        }}>
                            <div style={{
                                width: 72, height: 72, border: `2px solid ${color}`,
                                boxShadow: `0 0 20px ${color}66`, background: color + "12",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 36,
                            }}>
                                {info.icon}
                            </div>
                            <div style={{ fontSize: 16, color, textShadow: `0 0 12px ${color}aa`, letterSpacing: "0.08em" }}>
                                {myRole.toUpperCase()}
                            </div>
                            <p style={{ fontSize: 9, color: "#8a7aa0", textAlign: "center", lineHeight: 2 }}>
                                {info.desc}
                            </p>
                            <button onClick={() => setShowRoleInfo(false)} style={{
                                marginTop: 4, fontSize: 8, color: "#4a3060", border: "1px solid #2a1a4a",
                                background: "transparent", padding: "8px 20px",
                                cursor: "pointer", fontFamily: "Press Start 2P",
                            }}>
                                CLOSE
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Scanned alert banner */}
            {scannedAlert && (
                <div style={{
                    position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
                    zIndex: 40, padding: "12px 24px",
                    border: "1px solid #ff2a2a66", background: "#1a000899",
                    animation: "fadeInUp 0.3s ease",
                }}>
                    <p style={{ fontSize: 9, color: "#ff2a2a", textShadow: "0 0 10px #ff2a2a" }}>
                        ⚠  You have been scanned by the Engineer.
                    </p>
                </div>
            )}

            {/* Night / scan / doctor / guardian result modal */}
            {resultModal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 999999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 18, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
                    animation: "fadeIn 0.15s ease",
                }} onClick={() => setResultModal(null)}>
                    <div style={{
                        width: "min(720px,94vw)",
                        border: "2px solid " + (
                            resultModal.variant === "danger"  ? "#ff2a2a66" :
                            resultModal.variant === "success" ? "#b0ffb866" :
                            resultModal.variant === "gold"    ? "#ffd70066" : "#00f5ff66"
                        ),
                        background: "#0d0020f2",
                        boxShadow: "0 0 70px #000, 0 0 26px rgba(0,245,255,0.08)",
                        padding: "26px 22px", textAlign: "center",
                        animation: "fadeInUp 0.18s ease",
                    }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "#8a7aa0", marginBottom: 14 }}>
                            NIGHT RESULT
                        </div>
                        <div style={{
                            fontSize: 18, marginBottom: 12,
                            color: resultModal.variant === "danger"  ? "#ff2a2a" :
                                   resultModal.variant === "success" ? "#b0ffb8" :
                                   resultModal.variant === "gold"    ? "#ffd700" : "#00f5ff",
                        }}>
                            {resultModal.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#e0d4ff", lineHeight: 2 }}>
                            {resultModal.message}
                        </div>
                        <div style={{ fontSize: 8, color: "#4a3060", marginTop: 16 }}>TAP TO DISMISS</div>
                    </div>
                </div>
            )}
        </>
    );

    // ── TOP BAR (shared) ─────────────────────────────────────────────
    const topBar = (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderBottom: "1px solid #1a0a2a",
            background: "#08001299", flexShrink: 0, flexWrap: "wrap", gap: 10,
        }}>
            {/* Phase + round */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{
                    fontSize: isMobile ? 8 : 10, border: `1px solid ${phaseColor}55`,
                    color: phaseColor, padding: isMobile ? "5px 10px" : "6px 14px",
                    background: phaseColor + "0a",
                }}>
                    {phase.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 9, color: "#4a3060" }}>RND {round}</div>
            </div>

            {/* Timer */}
            {timers.endsAt && <PhaseTimer endsAt={timers.endsAt} color={phaseColor} />}

            {/* Right controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {!isMobile && (
                    <div style={{ fontSize: 9, color: "#2a1a3a" }}>{roomId}</div>
                )}
                {me && !me.alive && (
                    <div style={{
                        fontSize: isMobile ? 8 : 9, border: "1px solid #7a000055",
                        color: "#ffffff", padding: isMobile ? "5px 10px" : "6px 14px",
                        background: "#5a0000",
                    }}>
                        DEAD
                    </div>
                )}
                <div
                    onClick={() => setShowRoleInfo(true)}
                    style={{
                        fontSize: isMobile ? 8 : 9, border: `1px solid ${roleColor}55`,
                        color: roleColor, padding: isMobile ? "5px 10px" : "6px 14px",
                        background: roleColor + "0a", cursor: "pointer",
                    }}>
                    {myRole?.toUpperCase()} ?
                </div>

                {/* Desktop: chat toggle */}
                {!isMobile && (
                    <button onClick={() => setDesktopChat(o => !o)} style={{
                        fontSize: 8, color: "#8a7aa0", border: "1px solid #2a1a4a",
                        background: "transparent", padding: "6px 12px",
                        cursor: "pointer", fontFamily: "Press Start 2P",
                    }}>
                        {desktopChat ? "HIDE CHAT" : "SHOW CHAT"}
                    </button>
                )}

                {/* Mobile: chat bubble button */}
                {isMobile && (
                    <button onClick={() => setMobileChatOpen(o => !o)} style={{
                        position: "relative",
                        width: 38, height: 38,
                        border: `1px solid ${totalUnread > 0 ? "#00f5ff88" : "#2a1a4a"}`,
                        background: totalUnread > 0 ? "#00f5ff11" : "transparent",
                        color: "#00f5ff", fontSize: 18,
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        💬
                        {totalUnread > 0 && (
                            <div style={{
                                position: "absolute", top: -6, right: -6,
                                background: "#ff2a2a", color: "#fff",
                                fontSize: 8, fontFamily: "Press Start 2P",
                                width: 18, height: 18, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 0 8px #ff2a2a",
                                animation: "fadeInUp 0.2s ease",
                            }}>
                                {totalUnread > 9 ? "9+" : totalUnread}
                            </div>
                        )}
                    </button>
                )}

                {phase === "LOBBY" && (
                    <button onClick={leaveRoom} style={{
                        fontSize: 8, color: "#ff2a2a", border: "1px solid #ff2a2a44",
                        background: "transparent", padding: "6px 12px",
                        cursor: "pointer", fontFamily: "Press Start 2P",
                    }}>
                        LEAVE
                    </button>
                )}
            </div>
        </div>
    );

    // ── Night panel / player grid (left column content) ──────────────
    const leftColumnContent = (
        <>
            {isNight ? (
                me?.alive ? (
                    <NightPanel
                        myRole={myRole} players={players} myId={myId}
                        gnosiaAllies={allies}
                        selectedTarget={selectedTarget} onSelect={setSelectedTarget}
                        submitted={nightSubmitted} actionMsg={actionMsg}
                        actionError={actionError} onConfirm={submitNightAction}
                        gnosiaVoteProgress={gnosiaVP}
                        scanResult={scanResult} inspectResult={inspectResult}
                        guardianResult={guardianResult}
                    />
                ) : (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
                        <div style={{ fontSize: 36, opacity: 0.15 }}>☽</div>
                        <span style={{ fontSize: 9, color: "#2a1a3a" }}>SPECTATING — AWAIT DAWN</span>
                    </div>
                )
            ) : (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                    {isVoting && <VoteProgressBar votesCast={voteProgress.votesCast} totalAlive={voteProgress.totalAlive} />}

                    {/* Player grid */}
                    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 9, color: "#4a3060", letterSpacing: "0.1em" }}>CREW MANIFEST</span>
                            <span style={{ fontSize: 9, color: "#4a3060" }}>{aliveCount} alive / {players.length}</span>
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))",
                            gap: 10,
                        }}>
                            {players.map(p => (
                                <PlayerCard key={p.id} player={p}
                                    isMe={p.id === myId}
                                    isSelected={selectedTarget === p.id}
                                    canSelect={me?.alive && canTarget(p)}
                                    onSelect={id => setSelectedTarget(selectedTarget === id ? null : id)}
                                    phase={phase} myRole={myRole}
                                    gnosiaAllies={allies.map(a => a.id)}
                                    voteBreakdown={voteBreakdown}
                                    allPlayers={players}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Voting action bar */}
                    {isVoting && me?.alive && (
                        <div style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "14px 16px", background: "#07000f" }}>
                            {actionError && <div style={{ fontSize: 8, color: "#ff2a2a", marginBottom: 8 }}>⚠ {actionError}</div>}
                            {actionMsg  && <div style={{ fontSize: 8, color: "#00f5ff", marginBottom: 8 }}>{actionMsg}</div>}
                            <button className="btn btn-gold" style={{ width: "100%", fontSize: 10 }}
                                onClick={submitVote} disabled={!selectedTarget || hasVoted}>
                                {hasVoted
                                    ? "✓ VOTE LOCKED"
                                    : selectedTarget
                                        ? `⚖  VOTE: ${players.find(p => p.id === selectedTarget)?.username || "..."}`
                                        : "SELECT WHO TO VOTE OUT"}
                            </button>
                            {myRole === "lawyer" && (
                                <button style={{
                                    width: "100%", marginTop: 10, padding: "10px", fontSize: 9,
                                    background: hasLawyerDismissed ? "#1a0a2a" : "#7a3a00",
                                    color: hasLawyerDismissed ? "#3a2a4a" : "#ffbb55",
                                    border: `1px solid ${hasLawyerDismissed ? "#2a1a3a" : "#ff8833"}`,
                                    cursor: hasLawyerDismissed ? "not-allowed" : "pointer",
                                    fontFamily: "Press Start 2P",
                                }} onClick={dismissVote} disabled={hasLawyerDismissed}>
                                    {hasLawyerDismissed ? "DISMISS USED" : "⚖ DISMISS VOTE (1×)"}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Skip phase bar */}
                    {showSkipBar && (
                        <div style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "12px 16px", background: "#07000f" }}>
                            <SkipBar skipVotes={skipVotes} myId={myId}
                                onSkip={requestSkipPhase}
                                actionError={actionError} actionMsg={actionMsg} />
                        </div>
                    )}

                    {/* Spectator bar */}
                    {!me?.alive && (
                        <div style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "12px 16px", textAlign: "center" }}>
                            <span style={{ fontSize: 9, color: "#2a1a3a" }}>YOU ARE IN COLD SLEEP — SPECTATING</span>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    // ─────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────
    return (
        <div className="crt star-bg" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {sharedOverlays}
            {topBar}

            {/* ── MOBILE LAYOUT ──────────────────────────────────── */}
            {isMobile ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

                    {/* Compact player row */}
                    <div style={{ flexShrink: 0, borderBottom: "1px solid #1a0a2a", background: "#07000f", overflowY: "auto", maxHeight: 210 }}>
                        <div style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <span style={{ fontSize: 8, color: "#4a3060" }}>CREW</span>
                                <span style={{ fontSize: 8, color: "#4a3060" }}>{aliveCount}/{players.length}</span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {players.map(p => (
                                    <div key={p.id} style={{ width: 76, flexShrink: 0 }}>
                                        <PlayerCard player={p}
                                            isMe={p.id === myId}
                                            isSelected={selectedTarget === p.id}
                                            canSelect={me?.alive && canTarget(p)}
                                            onSelect={id => setSelectedTarget(selectedTarget === id ? null : id)}
                                            phase={phase} myRole={myRole}
                                            gnosiaAllies={allies.map(a => a.id)}
                                            voteBreakdown={voteBreakdown}
                                            allPlayers={players}
                                            compact={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Mobile action bar */}
                    {isNight && me?.alive ? (
                        <div style={{ flex: 1, overflow: "hidden" }}>
                            <NightPanel
                                myRole={myRole} players={players} myId={myId}
                                gnosiaAllies={allies}
                                selectedTarget={selectedTarget} onSelect={setSelectedTarget}
                                submitted={nightSubmitted} actionMsg={actionMsg}
                                actionError={actionError} onConfirm={submitNightAction}
                                gnosiaVoteProgress={gnosiaVP}
                                scanResult={scanResult} inspectResult={inspectResult}
                                guardianResult={guardianResult}
                            />
                        </div>
                    ) : (
                        <div style={{ flexShrink: 0 }}>
                            {isVoting && <VoteProgressBar votesCast={voteProgress.votesCast} totalAlive={voteProgress.totalAlive} />}
                            <div style={{ padding: "12px 16px", background: "#0d0020", borderTop: "1px solid #1a0a2a", display: "flex", flexDirection: "column", gap: 10 }}>
                                {isVoting && me?.alive && (
                                    <>
                                        {actionError && <div style={{ fontSize: 8, color: "#ff2a2a" }}>⚠ {actionError}</div>}
                                        {actionMsg  && <div style={{ fontSize: 8, color: "#00f5ff" }}>{actionMsg}</div>}
                                        <button className="btn btn-gold" style={{ width: "100%", fontSize: 9, padding: "10px" }}
                                            onClick={submitVote} disabled={!selectedTarget || hasVoted}>
                                            {hasVoted ? "✓ VOTE LOCKED"
                                                : selectedTarget ? `⚖ VOTE: ${players.find(p => p.id === selectedTarget)?.username || "..."}`
                                                : "SELECT WHO TO VOTE OUT"}
                                        </button>
                                        {myRole === "lawyer" && (
                                            <button style={{
                                                width: "100%", padding: "10px", fontSize: 8,
                                                background: hasLawyerDismissed ? "#1a0a2a" : "#7a3a00",
                                                color: hasLawyerDismissed ? "#3a2a4a" : "#ffbb55",
                                                border: `1px solid ${hasLawyerDismissed ? "#2a1a3a" : "#ff8833"}`,
                                                cursor: hasLawyerDismissed ? "not-allowed" : "pointer",
                                                fontFamily: "Press Start 2P",
                                            }} onClick={dismissVote} disabled={hasLawyerDismissed}>
                                                {hasLawyerDismissed ? "DISMISS USED" : "⚖ DISMISS VOTE (1×)"}
                                            </button>
                                        )}
                                    </>
                                )}
                                {showSkipBar && (
                                    <SkipBar skipVotes={skipVotes} myId={myId}
                                        onSkip={requestSkipPhase}
                                        actionError={isVoting ? "" : actionError}
                                        actionMsg={isVoting ? "" : actionMsg} />
                                )}
                                {!me?.alive && (
                                    <div style={{ textAlign: "center" }}>
                                        <span style={{ fontSize: 8, color: "#2a1a3a" }}>YOU ARE IN COLD SLEEP — SPECTATING</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chat fills remaining space on mobile */}
                    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                        <ChatPanel
                            roomId={roomId} myRole={myRole}
                            isAlive={me?.alive ?? true}
                            phase={phase} socket={socket}
                            isPanelOpen={true}
                            onUnreadChange={setUnread}
                        />
                    </div>

                    {/* Mobile chat modal (slide-up overlay) */}
                    {mobileChatOpen && (
                        <div style={{
                            position: "fixed", inset: 0, zIndex: 200,
                            background: "#07000ff5",
                            display: "flex", flexDirection: "column",
                            animation: "fadeInUp 0.2s ease",
                        }}>
                            {/* Modal header */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "14px 16px", borderBottom: "1px solid #1a0a2a",
                                background: "#0d0020", flexShrink: 0,
                            }}>
                                <span style={{ fontSize: 10, color: "#00f5ff" }}>CREW CHAT</span>
                                <button onClick={() => setMobileChatOpen(false)} style={{
                                    background: "transparent", border: "1px solid #2a1a4a",
                                    color: "#8a7aa0", cursor: "pointer",
                                    fontFamily: "Press Start 2P", fontSize: 10,
                                    width: 36, height: 36,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    ✕
                                </button>
                            </div>
                            {/* Full chat panel inside modal */}
                            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                <ChatPanel
                                    roomId={roomId} myRole={myRole}
                                    isAlive={me?.alive ?? true}
                                    phase={phase} socket={socket}
                                    isPanelOpen={mobileChatOpen}
                                    onUnreadChange={counts => {
                                        setUnread(counts);
                                        // Clear unread when modal is open
                                        if (mobileChatOpen) setUnread({ public: 0, gnosia: 0 });
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

            ) : (
                /* ── DESKTOP LAYOUT ────────────────────────────────── */
                <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
                    {/* Left column */}
                    <div style={{
                        display: "flex", flexDirection: "column", overflow: "hidden",
                        borderRight: desktopChat ? "1px solid #1a0a2a" : "none",
                        width: desktopChat ? "50%" : "100%",
                        transition: "width 0.2s",
                    }}>
                        {leftColumnContent}
                    </div>

                    {/* Right column: chat */}
                    {desktopChat && (
                        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minWidth: 0 }}>
                            <ChatPanel
                                roomId={roomId} myRole={myRole}
                                isAlive={me?.alive ?? true}
                                phase={phase} socket={socket}
                                isPanelOpen={true}
                                onUnreadChange={setUnread}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}