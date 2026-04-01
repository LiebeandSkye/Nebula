/**
 * Game.jsx — Fully redesigned. Responsive. Visible timer. NightPanel integrated.
 */
import { useState, useEffect } from "react";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import PlayerCard from "../components/PlayerCard.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import PhaseOverlay from "../components/PhaseOverlay.jsx";
import NightPanel from "../components/NightPanel.jsx";
import StartReveal from "../components/StartReveal.jsx";
import { clearPlaySession } from "../lib/sessionPersistence.js";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const AVATAR_COLORS = {
    setsu: "#a8d8ff",
    sq: "#ff26db",
    raqio: "#ff9ef5",
    comet: "#ffe066",
    stella: "#00f5ff",
    kornaros: "#ffb347",
    yuriko: "#ffaec0",
    jonas: "#c8b8ff",
    nyx: "#ff6b6b",
    parallax: "#66e0ff",
    voss: "#ffd700",
    echo: "#d0ffe8",
    chisa: "#ff4d3d",
    maomao: "#4eff33",
    phrolova: "#930c00",
    miyu: "#ff26db",
    alya: "#ffffff",
};
const PHASE_COLORS = {
    DAY_DISCUSSION: "#00f5ff", VOTING: "#ffd700", AFTERNOON: "#ffb347",
    NIGHT: "#9b30ff", MORNING: "#ff9ef5", END: "#ff2a2a",
};
const ROLE_COLORS = {
    gnosia: "#9b30ff", engineer: "#00f5ff", doctor: "#b0ffb8",
    guardian: "#ffd700", human: "#c8b8ff",
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
                    {hw ? "All Gnosia eliminated. The crew survives."
                        : "The Gnosia have taken control."}
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
                                    <img src={`${SERVER}/profiles/${p.profileId}.jpg`} alt={p.username}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                                    <div style={{
                                        display: "none", width: "100%", height: "100%", alignItems: "center",
                                        justifyContent: "center", color: ac, fontSize: 16, fontWeight: "bold"
                                    }}>
                                        {p.username[0].toUpperCase()}
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 10, color: "#e0d4ff",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                    }}>
                                        {p.username}
                                    </div>
                                    <div style={{ fontSize: 8, color: p.alive ? "#4a3060" : "#2a1a3a", marginTop: 3 }}>
                                        {p.alive ? "SURVIVED" : "ELIMINATED"}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 8, border: `1px solid ${rc}44`, color: rc,
                                    padding: "4px 10px", flexShrink: 0
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

// ─────────────────────────────────────────────
// MAIN GAME
// ─────────────────────────────────────────────
export default function Game({ session, socket, onLeaveRoom }) {
    const { roomId, myId, myRole, allies = [], gnosiaCount } = session;
    const { reconnecting } = useSocket();

    const [players, setPlayers] = useState(session.lastPhasePayload?.players || []);
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
    const [chatOpen, setChatOpen] = useState(true); // desktop only
    const [mobileChatOpen, setMobileChatOpen] = useState(false);
    const [unread, setUnread] = useState({ public: 0, gnosia: 0 });
    const [isMobile, setIsMobile] = useState(false);

    const [resultModal, setResultModal] = useState(null); // { title, message, variant, durationMs }

    const [showStartReveal, setShowStartReveal] = useState(false);
    const [hasShownStartReveal, setHasShownStartReveal] = useState(false);
    const [voteReveal, setVoteReveal] = useState(null); // { eliminatedUsername, eliminatedId, reason }
    const [voteBreakdown, setVoteBreakdown] = useState(null); // { voterId -> targetId }
    // skipVotes is an array of { id, username, profileId } — rich objects, never bare socket IDs
    const [skipVotes, setSkipVotes] = useState(session.lastPhasePayload?.skipVotes || []);
    const [lostConnectionNotice, setLostConnectionNotice] = useState("");

    const me = players.find(p => p.id === myId);
    const isNight = phase === "NIGHT";
    const isVoting = phase === "VOTING";
    const phaseColor = PHASE_COLORS[phase] || "#00f5ff";
    const roleColor = ROLE_COLORS[myRole] || "#c8b8ff";

    // If the very first phase payload was received before this component mounted,
    // we won't catch the `phase:changed` event listener below. Use initial state
    // to trigger the Round 1 mission start screen.
    useEffect(() => {
        if (hasShownStartReveal) return;
        if (phase === "DAY_DISCUSSION" && round === 1 && players.length > 0) {
            setShowStartReveal(true);
            setHasShownStartReveal(true);
            setShowOverlay(false);
        }
    }, [phase, round, players.length, hasShownStartReveal]);

    // ── Listeners ─────────────────────────────────────────────
    useSocketEvent("phase:changed", ({ phase: p, round: r, timers: t, players: pl, skipVotes: sv }) => {
        setPhase(p); setRound(r); setTimers(t); setPlayers(pl);
        setSelectedTarget(null); setNightSubmitted(false);
        setActionError(""); setActionMsg("");
        setShowOverlay(true); setScanResult(null); setInspectResult(null); setGuardianResult(null);
        if (p !== "VOTE_REVEAL" && p !== "AFTERNOON") setVoteBreakdown(null);
        // sv is now an array of { id, username, profileId } objects from the server
        setSkipVotes(Array.isArray(sv) ? sv : []);
        if (p !== "MORNING") setMorningReport(null);
        if (p === "DAY_DISCUSSION" && r === 1 && !hasShownStartReveal) {
            setShowStartReveal(true);
            setHasShownStartReveal(true);
            setShowOverlay(false); // don't cover Mission Start
        }
    });
    // voters is an array of { id, username, profileId } — set directly, no lookup needed
    useSocketEvent("phase:skip:updated", (voters) => setSkipVotes(Array.isArray(voters) ? voters : []));
    useSocketEvent("vote:progress", ({ votesCast, totalAlive }) => setVoteProgress({ votesCast, totalAlive }));
    useSocketEvent("vote:result", result => {
        // Play reveal animation first; apply state after animation completes.
        setVoteBreakdown(result.votes || {});
        setVoteReveal({
            eliminatedId: result.eliminated || null,
            eliminatedUsername: result.eliminatedUsername || null,
            reason: result.reason || null,
        });
        setTimeout(() => {
            setMorningReport(prev => ({ ...(prev || {}), coldSleep: result.eliminated, coldSleepUsername: result.eliminatedUsername }));
            if (result.eliminated) {
                setPlayers(prev => prev.map(p => p.id === result.eliminated ? { ...p, alive: false, inColdSleep: true } : p));
            }
            setVoteReveal(null);
        }, 4200);
    });
    function showResultModal(payload) {
        setResultModal(payload);
        const ms = typeof payload?.durationMs === "number" ? payload.durationMs : 6000;
        setTimeout(() => setResultModal(null), ms);
    }

    useSocketEvent("night:scanResult", r => {
        setScanResult(r);
        const isGnosia = !!r?.isGnosia;
        showResultModal({
            variant: isGnosia ? "danger" : "info",
            title: "ENGINEER SCAN RESULT",
            message: `${r?.targetUsername || "Target"} is ${isGnosia ? "GNOSIA" : "HUMAN"}.`,
            durationMs: 6000,
        });
    });
    useSocketEvent("night:inspectResult", r => {
        setInspectResult(r);
        if (r?.error) return;
        const isGnosia = r?.role === "gnosia";
        showResultModal({
            variant: isGnosia ? "danger" : "success",
            title: "DOCTOR INSPECTION RESULT",
            message: `${r?.targetUsername || "Target"} was ${isGnosia ? "GNOSIA" : "HUMAN"}.`,
            durationMs: 6000,
        });
    });
    useSocketEvent("night:guardianResult", r => {
        setGuardianResult(r);
        showResultModal({
            variant: r?.worked ? "success" : "info",
            title: "PROTECTION OUTCOME",
            message: r?.worked 
                ? `You protected ${r?.targetUsername || "Target"} from Gnosia!`
                : `Your protection of ${r?.targetUsername || "Target"} was not needed.`,
            durationMs: 6000,
        });
    });
    useSocketEvent("night:scannedAlert", (payload) => {
        setScannedAlert(true);
        setTimeout(() => setScannedAlert(false), 8000);
        showResultModal({
            variant: "danger",
            title: "GNOSIA ALERT",
            message: payload?.message || "You have been scanned by the Engineer.",
            durationMs: 6000,
        });
    });
    useSocketEvent("ui:toast", (t) => {
        // Use big modal for Guardian/Gnosia notifications too.
        showResultModal({
            variant: t?.variant || "info",
            title: t?.title || "NOTICE",
            message: t?.message || "",
            durationMs: typeof t?.durationMs === "number" ? t.durationMs : 6000,
        });
    });

    // Mobile detection
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const m = window.matchMedia("(max-width: 768px)");
        const apply = () => setIsMobile(m.matches);
        apply();
        if (m.addEventListener) m.addEventListener("change", apply);
        else m.addListener(apply);
        return () => {
            if (m.removeEventListener) m.removeEventListener("change", apply);
            else m.removeListener(apply);
        };
    }, []);

    // Auto-close mobile chat on phase change (except DAY_DISCUSSION)
    useEffect(() => {
        if (!isMobile) return;
        const discussionPhases = ["DAY_DISCUSSION", "LOBBY"];
        if (!discussionPhases.includes(phase)) {
            setMobileChatOpen(false);
        }
    }, [phase, isMobile]);
    useSocketEvent("night:gnosiaVoteProgress", ({ votesIn, totalGnosia }) => {
        setGnosiaVP({ votesIn, totalGnosia });
        setActionMsg(`${votesIn}/${totalGnosia} Gnosia voted`);
    });
    useSocketEvent("game:over", r => { setGameOver(r); setPhase("END"); });
    useSocketEvent("player:disconnected", ({ socketId }) => {
        setPlayers(prev => prev.map(p => p.id === socketId ? { ...p, disconnected: true } : p));
    });
    useSocketEvent("player:reconnected", ({ previousId, newId }) => {
        setPlayers(prev => prev.map(p =>
            p.id === previousId ? { ...p, id: newId, disconnected: false } : p
        ));
    });
    useSocketEvent("player:lostConnection", ({ username, playerId }) => {
        setLostConnectionNotice(`${username} had lost connection.`);
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        setTimeout(() => setLostConnectionNotice(""), 7000);
    });

    // ── Actions ───────────────────────────────────────────────
    function submitVote() {
        if (!selectedTarget) return;
        socket.emit("vote:submit", { roomId, targetId: selectedTarget }, res => {
            if (!res.success) { setActionError(res.error); setTimeout(() => setActionError(""), 3000); }
            else { setActionMsg("Vote cast."); setSelectedTarget(null); }
        });
    }
    function submitNightAction(skipArg) {
        if (nightSubmitted) return;
        const target = skipArg === "skip" ? "skip" : selectedTarget;
        if (!target) return;
        const map = { gnosia: "gnosia_vote", engineer: "engineer", doctor: "doctor", guardian: "guardian" };
        const actionType = map[myRole]; if (!actionType) return;
        socket.emit("night:action", { roomId, actionType, targetId: target }, res => {
            if (!res.success) { setActionError(res.error); setTimeout(() => setActionError(""), 3000); }
            else setNightSubmitted(true);
        });
    }

    function requestSkipPhase() {
        socket.emit("phase:skip", { roomId }, (res) => {
            if (!res?.success) {
                setActionError(res?.error || "Failed to request skip.");
                setTimeout(() => setActionError(""), 3000);
                return;
            }
            setActionMsg("Skip requested.");
            setTimeout(() => setActionMsg(""), 2000);
        });
    }

    function leaveRoom() {
        if (!window.confirm("Are you sure you want to leave the room? You can only leave during the lobby.")) return;
        socket.emit("room:leave", { roomId }, res => {
            if (res.success) {
                clearPlaySession();
                onLeaveRoom?.();
            } else {
                alert(res.error || "Failed to leave room.");
            }
        });
    }

    function playAgain() {
        if (!me?.isHost) return alert("Waiting for Host to press Play Again...");
        socket.emit("room:playAgain", { roomId }, res => {
            if (!res.success) alert(res.error || "Failed to restart.");
        });
    }

    if (gameOver) return <GameOverScreen result={gameOver} onPlayAgain={playAgain} amHost={me?.isHost} />;

    // Show reconnecting UI
    if (reconnecting) {
        return (
            <div className="crt star-bg" style={{
                height: "100vh", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "linear-gradient(180deg, #07000fdd 0%, #0d001a99 100%)",
                overflow: "hidden",
            }}>
                {/* Scanlines */}
                <div style={{
                    position: "fixed", inset: 0, pointerEvents: "none",
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
                }} />

                {/* Reconnecting content */}
                <div style={{
                    position: "relative", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 32, zIndex: 10,
                }}>
                    {/* Pulsing indicator */}
                    <div style={{
                        fontSize: 72,
                        animation: "pulse 1.5s ease-in-out infinite",
                        filter: "drop-shadow(0 0 30px #00f5ff)",
                    }}>
                        ◈
                    </div>

                    {/* Text */}
                    <div style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 12,
                    }}>
                        <h1 style={{
                            fontSize: 28, letterSpacing: "0.15em",
                            color: "#00f5ff",
                            textShadow: "0 0 20px #00f5ff88",
                            margin: 0,
                        }}>
                            RECONNECTING...
                        </h1>
                        <p style={{
                            fontSize: 10, color: "#4a3060",
                            textAlign: "center", lineHeight: 1.8,
                            margin: 0,
                        }}>
                            Attempting to restore connection<br />to the game server.
                        </p>
                    </div>

                    {/* Loading animation */}
                    <div style={{
                        display: "flex", gap: 8, alignItems: "center",
                    }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: 8, height: 8,
                                borderRadius: "50%",
                                background: "#00f5ff",
                                boxShadow: "0 0 12px #00f5ff",
                                animation: `bounce 1.2s ease-in-out infinite`,
                                animationDelay: `${i * 0.2}s`,
                            }} />
                        ))}
                    </div>
                </div>

                {/* CSS animations */}
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(1.1); }
                    }
                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); opacity: 0.6; }
                        50% { transform: translateY(-12px); opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    const canTarget = p => {
        if (!me?.alive || p.id === myId) return false;
        if (isVoting) return p.alive;
        if (isNight) {
            if (myRole === "doctor") return p.inColdSleep;
            if (myRole === "human") return false;
            return p.alive;
        }
        return false;
    };

    const aliveCount = players.filter(p => p.alive).length;
    const chatPanelOpen = isMobile ? mobileChatOpen : chatOpen;
    const totalUnread = unread.public + unread.gnosia;

    return (
        <div className="crt star-bg" style={{
            height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
            {lostConnectionNotice && (
                <div style={{
                    position: "fixed",
                    top: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 999999,
                    padding: "10px 20px",
                    background: "#1a0008ee",
                    border: "1px solid #ff2a2a55",
                    color: "#ff8888",
                    fontSize: 9,
                    maxWidth: "90vw",
                    textAlign: "center",
                    boxShadow: "0 0 20px #000",
                    pointerEvents: "none",
                    animation: "fadeInUp 0.2s ease",
                }}>
                    {lostConnectionNotice}
                </div>
            )}
            {showStartReveal && players.length > 0 && (
                <StartReveal
                    players={players}
                    gnosiaCount={
                        typeof session.lastPhasePayload?.gnosiaCount === "number"
                            ? session.lastPhasePayload.gnosiaCount
                            : (typeof gnosiaCount === "number" ? gnosiaCount : Math.max(1, Math.floor(players.length / 3)))
                    }
                    onDismiss={() => { setShowStartReveal(false); setShowOverlay(true); }}
                />
            )}

            {/* Vote reveal overlay */}
            {voteReveal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 55,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(180deg, #07000ff0, #07000fcc)",
                    overflow: "hidden",
                }}>
                    <div style={{
                        position: "absolute", inset: 0,
                        backgroundImage:
                            "radial-gradient(1px 1px at 10% 20%, #fff2 0%, transparent 100%)," +
                            "radial-gradient(1px 1px at 60% 40%, #fff2 0%, transparent 100%)," +
                            "radial-gradient(2px 2px at 30% 80%, #00f5ff10 0%, transparent 100%)," +
                            "radial-gradient(2px 2px at 80% 15%, #9b30ff10 0%, transparent 100%)",
                        opacity: 0.8,
                    }} />
                    <div style={{
                        width: "min(680px, 92vw)",
                        border: "1px solid #2a1a4a",
                        background: "#0d0020cc",
                        padding: "28px 26px",
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
                                <div style={{ fontSize: 9, color: "#8a7aa0" }}>
                                    Drifting into deep space...
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: 12, color: "#8a7aa0" }}>
                                {voteReveal.reason || "No one entered Cold Sleep."}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showOverlay && !showStartReveal && phase !== "END" && (
                <PhaseOverlay phase={phase} morningReport={morningReport}
                    round={round} onDismiss={() => setShowOverlay(false)} />
            )}

            {/* Scanned alert */}
            {scannedAlert && (
                <div style={{
                    position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
                    zIndex: 40, padding: "12px 24px",
                    border: "1px solid #ff2a2a66", background: "#1a000899",
                    animation: "fadeInUp 0.3s ease",
                }}>
                    <p style={{
                        fontSize: 9, color: "#ff2a2a",
                        textShadow: "0 0 10px #ff2a2a"
                    }}>
                        ⚠  You have been scanned by the Engineer.
                    </p>
                </div>
            )}

            {/* Big result modal */}
            {resultModal && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 999999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 18,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(2px)",
                    animation: "fadeIn 0.15s ease",
                }}>
                    <div style={{
                        width: "min(720px, 94vw)",
                        border: "2px solid " + (
                            resultModal.variant === "danger" ? "#ff2a2a66"
                                : resultModal.variant === "success" ? "#b0ffb866"
                                    : resultModal.variant === "gold" ? "#ffd70066"
                                        : "#00f5ff66"
                        ),
                        background: "#0d0020f2",
                        boxShadow: "0 0 70px #000, 0 0 26px rgba(0,245,255,0.08)",
                        padding: "26px 22px",
                        textAlign: "center",
                        animation: "fadeInUp 0.18s ease",
                    }}>
                        <div style={{
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            color: "#8a7aa0",
                            marginBottom: 14,
                        }}>
                            NIGHT RESULT
                        </div>
                        <div style={{
                            fontSize: 18,
                            marginBottom: 12,
                            color: resultModal.variant === "danger" ? "#ff2a2a"
                                : resultModal.variant === "success" ? "#b0ffb8"
                                    : resultModal.variant === "gold" ? "#ffd700"
                                        : "#00f5ff",
                            textShadow: "0 0 18px rgba(0,0,0,0.5)",
                        }}>
                            {resultModal.title}
                        </div>
                        <div style={{
                            fontSize: 12,
                            color: "#e0d4ff",
                            lineHeight: 2,
                        }}>
                            {resultModal.message}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOP BAR ──────────────────────────────────────── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px", borderBottom: "1px solid #1a0a2a",
                background: "#08001299", flexShrink: 0, flexWrap: "wrap", gap: 12,
            }}>
                {/* Phase + round */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{
                        fontSize: 10, border: `1px solid ${phaseColor}55`,
                        color: phaseColor, padding: "6px 14px",
                        background: phaseColor + "0a",
                    }}>
                        {phase.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 9, color: "#4a3060" }}>RND {round}</div>
                </div>

                {/* Timer — prominent center */}
                {timers.endsAt && (
                    <PhaseTimer endsAt={timers.endsAt} color={phaseColor} />
                )}

                {/* Right: room code + role */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 9, color: "#2a1a3a" }}>{roomId}</div>
                    <div style={{
                        fontSize: 9, border: `1px solid ${roleColor}55`,
                        color: roleColor, padding: "6px 14px",
                        background: roleColor + "0a",
                    }}>
                        {myRole?.toUpperCase()}
                    </div>
                    {!isMobile && (
                        <button onClick={() => setChatOpen(o => !o)} style={{
                            fontSize: 8, color: "#8a7aa0", border: "1px solid #2a1a4a",
                            background: "transparent", padding: "6px 12px",
                            cursor: "pointer", fontFamily: "Press Start 2P",
                        }}>
                            {chatOpen ? "HIDE CHAT" : "SHOW CHAT"}
                        </button>
                    )}
                    {phase === "LOBBY" && (
                        <button onClick={leaveRoom} style={{
                            fontSize: 8, color: "#ff2a2a", border: "1px solid #ff2a2a44",
                            background: "transparent", padding: "6px 12px",
                            cursor: "pointer", fontFamily: "Press Start 2P",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={e => { e.target.borderColor = "#ff2a2a88"; e.target.backgroundColor = "#ff2a2a11"; }}
                        onMouseLeave={e => { e.target.borderColor = "#ff2a2a44"; e.target.backgroundColor = "transparent"; }}>
                            LEAVE
                        </button>
                    )}
                </div>
            </div>

            {/* ── BODY ──────────────────────────────────────────── */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

                {/* LEFT: player grid or NightPanel */}
                <div style={{
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    borderRight: "1px solid #1a0a2a",
                    width: chatPanelOpen && !isMobile ? "50%" : "100%",
                    minWidth: chatPanelOpen && !isMobile ? 280 : undefined,
                    transition: "width 0.2s",
                }}>
                    {isNight ? (
                        <NightPanel
                            myRole={myRole} players={players} myId={myId}
                            gnosiaAllies={allies}
                            selectedTarget={selectedTarget} onSelect={setSelectedTarget}
                            submitted={nightSubmitted} actionMsg={actionMsg}
                            actionError={actionError} onConfirm={submitNightAction}
                            gnosiaVoteProgress={gnosiaVP}
                            scanResult={scanResult} inspectResult={inspectResult} guardianResult={guardianResult}
                        />
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

                            {/* Vote progress bar */}
                            {isVoting && (
                                <div style={{
                                    padding: "10px 16px", flexShrink: 0,
                                    borderBottom: "1px solid #1a0a2a",
                                    display: "flex", alignItems: "center", gap: 12
                                }}>
                                    <span style={{ fontSize: 8, color: "#4a3060", flexShrink: 0 }}>VOTES</span>
                                    <div style={{ flex: 1, height: 4, background: "#1a0015", borderRadius: 2 }}>
                                        <div style={{
                                            height: "100%", background: "#ffd700",
                                            boxShadow: "0 0 8px #ffd700",
                                            borderRadius: 2, transition: "width 0.5s",
                                            width: `${voteProgress.totalAlive > 0 ? (voteProgress.votesCast / voteProgress.totalAlive) * 100 : 0}%`,
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 9, color: "#ffd700", flexShrink: 0 }}>
                                        {voteProgress.votesCast}/{voteProgress.totalAlive}
                                    </span>
                                </div>
                            )}

                            {/* Player grid */}
                            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                                <div style={{
                                    display: "flex", justifyContent: "space-between",
                                    alignItems: "center", marginBottom: 14,
                                }}>
                                    <span style={{ fontSize: 9, color: "#4a3060", letterSpacing: "0.1em" }}>
                                        CREW MANIFEST
                                    </span>
                                    <span style={{ fontSize: 9, color: "#4a3060" }}>
                                        {aliveCount} alive / {players.length}
                                    </span>
                                </div>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
                                    gap: 12,
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
                                            allPlayers={players} />
                                    ))}
                                </div>
                            </div>

                            {/* Voting action bar */}
                            {isVoting && me?.alive && (
                                <div style={{
                                    flexShrink: 0, borderTop: "1px solid #1a0a2a",
                                    padding: "14px 16px", background: "#07000f"
                                }}>
                                    {actionError && <div style={{ fontSize: 8, color: "#ff2a2a", marginBottom: 8 }}>⚠ {actionError}</div>}
                                    {actionMsg && <div style={{ fontSize: 8, color: "#00f5ff", marginBottom: 8 }}>{actionMsg}</div>}
                                    <button className="btn btn-gold" style={{ width: "100%", fontSize: 10 }}
                                        onClick={submitVote} disabled={!selectedTarget}>
                                        {selectedTarget
                                            ? `⚖  VOTE: ${players.find(p => p.id === selectedTarget)?.username || "..."}`
                                            : "SELECT WHO TO VOTE OUT"}
                                    </button>
                                </div>
                            )}

                            {/* Skip action bar */}
                            {(phase === "DAY_DISCUSSION" || phase === "AFTERNOON") && me?.alive && (
                                <div style={{
                                    flexShrink: 0, borderTop: "1px solid #1a0a2a",
                                    padding: "14px 16px", background: "#07000f",
                                    display: "flex", flexDirection: "column", gap: 10,
                                }}>
                                    {actionError && <div style={{ fontSize: 8, color: "#ff2a2a" }}>âš  {actionError}</div>}
                                    {actionMsg && <div style={{ fontSize: 8, color: "#00f5ff" }}>{actionMsg}</div>}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, flexWrap: "wrap" }}>
                                        {/* iVoted: check by ID in the rich voter array */}
                                        {(() => {
                                            const iVoted = skipVotes.some(v => v.id === myId);
                                            return (
                                                <button className="btn btn-secondary" style={{ fontSize: 9, flexShrink: 0 }}
                                                    onClick={() => {
                                                        if (!iVoted) requestSkipPhase();
                                                    }}
                                                    disabled={iVoted}>
                                                    {iVoted ? "✓ SKIP REQUESTED" : "⏭ SKIP PHASE"}
                                                </button>
                                            );
                                        })()}
                                        {/* Voter avatars — use profileId directly from server payload, no lookup */}
                                        <div style={{ display: "flex", alignItems: "center" }}>
                                            {skipVotes.map((voter, i) => (
                                                <img
                                                    key={voter.id}
                                                    src={`${SERVER}/profiles/${voter.profileId}.jpg`}
                                                    alt={voter.username}
                                                    title={`${voter.username} wants to skip`}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: "50%",
                                                        border: "2px solid #07000f", objectFit: "cover",
                                                        boxShadow: "0 0 8px #00f5ff44",
                                                        marginLeft: i > 0 ? -10 : 0,
                                                        zIndex: skipVotes.length - i,
                                                        animation: "fadeInUp 0.3s ease forwards",
                                                        position: "relative",
                                                    }}
                                                    onError={(e) => { e.target.style.display = "none"; }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Spectator bar */}
                            {!me?.alive && (
                                <div style={{
                                    flexShrink: 0, borderTop: "1px solid #1a0a2a",
                                    padding: "12px 16px", textAlign: "center"
                                }}>
                                    <span style={{ fontSize: 9, color: "#2a1a3a" }}>
                                        YOU ARE IN COLD SLEEP — SPECTATING
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT: Chat (desktop only) */}
                {!isMobile && chatOpen && (
                    <div style={{
                        display: "flex", flexDirection: "column", overflow: "hidden",
                        flex: 1, minWidth: 0,
                    }}>
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

            {/* Mobile chat FAB + modal drawer (kept mounted for unread counts) */}
            {isMobile && (
                <>
                    <button
                        onClick={() => setMobileChatOpen(true)}
                        aria-label="Open chat"
                        style={{
                            position: "fixed",
                            right: 16,
                            bottom: 16,
                            zIndex: 70,
                            width: 54,
                            height: 54,
                            borderRadius: 999,
                            border: "1px solid #00f5ff55",
                            background: "#0d0020ee",
                            color: "#00f5ff",
                            boxShadow: "0 0 24px #00f5ff22",
                            fontSize: 16,
                            cursor: "pointer",
                        }}
                    >
                        💬
                        {totalUnread > 0 && (
                            <span style={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                minWidth: 20,
                                height: 20,
                                padding: "0 6px",
                                borderRadius: 999,
                                background: "#ff2a2a",
                                color: "#07000f",
                                fontSize: 9,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #ff2a2a66",
                                boxShadow: "0 0 14px #ff2a2a66",
                            }}>
                                {Math.min(99, totalUnread)}
                            </span>
                        )}
                    </button>

                    {/* Backdrop */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 80,
                            background: mobileChatOpen ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
                            display: "flex",
                            justifyContent: "flex-end",
                            pointerEvents: mobileChatOpen ? "auto" : "none",
                            transition: "background 0.18s ease",
                        }}
                        onClick={() => setMobileChatOpen(false)}
                    >
                        <div
                            style={{
                                width: "100vw",
                                height: "100%",
                                background: "#07000f",
                                borderLeft: "1px solid #2a1a4a",
                                boxShadow: "-30px 0 80px #000",
                                display: "flex",
                                flexDirection: "column",
                                transform: mobileChatOpen ? "translateX(0)" : "translateX(110%)",
                                transition: "transform 0.18s ease",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                padding: "12px 14px",
                                borderBottom: "1px solid #1a0a2a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}>
                                <div style={{ fontSize: 9, color: "#8a7aa0" }}>CHAT</div>
                                <button
                                    onClick={() => setMobileChatOpen(false)}
                                    style={{
                                        fontSize: 10,
                                        border: "1px solid #2a1a4a",
                                        background: "transparent",
                                        color: "#e0d4ff",
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                        fontFamily: "Press Start 2P",
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <ChatPanel
                                    roomId={roomId}
                                    myRole={myRole}
                                    isAlive={me?.alive ?? true}
                                    phase={phase}
                                    socket={socket}
                                    isPanelOpen={mobileChatOpen}
                                    onUnreadChange={setUnread}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
