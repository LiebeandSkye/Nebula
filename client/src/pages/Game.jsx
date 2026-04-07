import { useState, useEffect, useRef } from "react";
import { animate } from "animejs";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
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

const PHASE_COLORS = {
    DAY_DISCUSSION: "#00f5ff", VOTING: "#ffd700", AFTERNOON: "#ffb347",
    NIGHT: "#9b30ff", MORNING: "#ff9ef5", END: "#ff2a2a",
};

const AURA_ROLL_OPTIONS = [
    "aura-rage-mode", 
    "aura-golden-saiyan", 
    "aura-glacier",
    "aura-sunset",
    "aura-glitch",
    "aura-sparkle-white",
    "aura-sparkle-yellow",
    "aura-sparkle-pink",
    "aura-judgement",
    // New auras
    "aura-red-saiyan",
    "aura-halo",
    "aura-void",
    "aura-sparkle-rainbow",
    "aura-sparkle-red"
];

const AURA_PREVIEW = {
    "aura-rage-mode": {
        border: "#f5f5f588",
        shadow: "0 0 22px rgba(255, 255, 255, 0.16)",
        color: "#f5f5f5",
        label: "RAGE MODE",
    },
    "aura-golden-saiyan": {
        border: "#ffd70088",
        shadow: "0 0 28px rgba(255, 215, 0, 0.26)",
        color: "#ffd700",
        label: "GOLDEN SAIYAN",
    },
    "aura-glacier": {
        border: "#8fe8ff88",
        shadow: "0 0 28px rgba(113, 220, 255, 0.22)",
        color: "#8fe8ff",
        label: "GLACIER",
    },
    "aura-sunset": {
        border: "#ff450088",
        shadow: "0 0 28px rgba(255, 69, 0, 0.3)",
        color: "#ff8c00",
        label: "SUNSET",
    },
    "aura-glitch": {
        border: "#00ff0088",
        shadow: "0 0 22px rgba(0, 255, 0, 0.22)",
        color: "#00ff00",
        label: "GLITCH",
    },
    "aura-sparkle-white": {
        border: "#ffffff88",
        shadow: "0 0 22px rgba(255, 255, 255, 0.22)",
        color: "#ffffff",
        label: "WHITE SPARKLE",
    },
    "aura-sparkle-yellow": {
        border: "#fff62d88",
        shadow: "0 0 22px rgba(255, 246, 45, 0.22)",
        color: "#fff62d",
        label: "YELLOW SPARKLE",
    },
    "aura-sparkle-pink": {
        border: "#ff69b488",
        shadow: "0 0 22px rgba(255, 105, 180, 0.22)",
        color: "#ff69b4",
        label: "PINK SPARKLE",
    },
    "aura-judgement": {
        border: "#00f5ff88",
        shadow: "0 0 32px rgba(0, 245, 255, 0.28)",
        color: "#00f5ff",
        label: "JUDGEMENT",
    },
    // New aura previews
    "aura-red-saiyan": {
        border: "#ff6b6b88",
        shadow: "0 0 25px rgba(255, 107, 107, 0.24)",
        color: "#ff6b6b",
        label: "RED SAIYAN",
    },
    "aura-halo": {
        border: "#ffd70088",
        shadow: "0 0 20px rgba(255, 215, 0, 0.30)",
        color: "#ffd700",
        label: "HALO",
    },
    "aura-void": {
        border: "#4a008088",
        shadow: "0 0 30px rgba(74, 0, 128, 0.32)",
        color: "#4a0080",
        label: "VOID",
    },
    "aura-sparkle-rainbow": {
        border: "#ff00ff88",
        shadow: "0 0 26px rgba(255, 0, 255, 0.30)",
        color: "#ff00ff",
        label: "RAINBOW SPARKLE",
    },
    "aura-sparkle-red": {
        border: "#ff6b6b88",
        shadow: "0 0 22px rgba(255, 107, 107, 0.28)",
        color: "#ff6b6b",
        label: "RED SPARKLE",
    },
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
            <div style={{ fontSize: 7, color: "#8a7aa0", letterSpacing: "0.2em", marginBottom: 4 }}>TIME REMAINING</div>
            <div style={{
                fontSize: 32, color: urgent ? "#ff2a2a" : color,
                textShadow: urgent ? "0 0 16px #ff2a2a" : "0 0 16px " + color + "aa",
                animation: urgent ? "urgentPulse 0.6s infinite" : "none",
                fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em",
            }}>
                {String(mins).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </div>
        </div>
    );
}

function SettingsActionButton({
    label,
    status,
    active = false,
    disabled = false,
    onClick,
    accent = "#ff8c1a",
    children,
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                background: active ? "rgba(255, 140, 26, 0.16)" : "rgba(10, 3, 0, 0.8)",
                border: `1px solid ${active ? accent : "rgba(255, 140, 26, 0.28)"}`,
                boxShadow: active ? `0 0 18px ${accent}33` : "none",
                color: active ? "#ffd7b0" : "#ffb36b",
                fontFamily: "Press Start 2P",
                fontSize: 8,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1,
                textAlign: "left",
            }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {children}
                <span>{label}</span>
            </span>
            <span style={{
                flexShrink: 0,
                padding: "4px 8px",
                border: `1px solid ${active ? "#ffd18a66" : "#ff8c1a33"}`,
                background: active ? "rgba(255, 209, 138, 0.12)" : "transparent",
                color: active ? "#ffd18a" : "#ff8c1a",
                fontSize: 7,
                letterSpacing: "0.08em",
            }}>
                {status}
            </span>
        </button>
    );
}

function GameOverScreen({ result, onPlayAgain, amHost, musicVolume, setMusicVolume, musicMuted, setMusicMuted, myId = null, playerEmotes = {}, onEmote }) {
    const hw = result.winner === "humans";
    const wc = hw ? "#00f5ff" : "#9b30ff";
    const [volumePanelPosition, setVolumePanelPosition] = useState({ x: null, y: null });
    const dragStateRef = useRef(null);

    // Emote wheel state for game-over screen
    const holdRafRef   = useRef(null);
    const holdStartRef = useRef(null);
    const avatarRefs   = useRef({});
    const [goHoldProgress, setGoHoldProgress] = useState(0);
    const [goEmoteWheel,   setGoEmoteWheel]   = useState(null);

    function goStartHold(playerId, e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        holdStartRef.current = Date.now();
        const tick = () => {
            if (!holdStartRef.current) return;
            const pct = Math.min(100, ((Date.now() - holdStartRef.current) / 2000) * 100);
            setGoHoldProgress(pct);
            if (pct < 100) {
                holdRafRef.current = requestAnimationFrame(tick);
            } else {
                holdStartRef.current = null;
                setGoHoldProgress(0);
                const rect = avatarRefs.current[playerId]?.getBoundingClientRect();
                if (rect) setGoEmoteWheel({ cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, emotes: getRandomEmotes() });
            }
        };
        holdRafRef.current = requestAnimationFrame(tick);
    }

    function goCancelHold() {
        cancelAnimationFrame(holdRafRef.current);
        holdStartRef.current = null;
        setGoHoldProgress(0);
    }

    function startVolumePanelDrag(event) {
        if (event.target.closest("button, input")) return;
        const panelRect = event.currentTarget.getBoundingClientRect();
        dragStateRef.current = {
            offsetX: event.clientX - panelRect.left,
            offsetY: event.clientY - panelRect.top,
        };
        event.preventDefault();
    }

    useEffect(() => {
        function handlePointerMove(event) {
            if (!dragStateRef.current) return;
            const width = window.innerWidth;
            const height = window.innerHeight;
            const panelWidth = 280;
            const panelHeight = 120;
            const nextX = Math.min(Math.max(12, event.clientX - dragStateRef.current.offsetX), Math.max(12, width - panelWidth - 12));
            const nextY = Math.min(Math.max(12, event.clientY - dragStateRef.current.offsetY), Math.max(12, height - panelHeight - 12));
            setVolumePanelPosition({ x: nextX, y: nextY });
        }

        function stopDrag() {
            dragStateRef.current = null;
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

    return (
        <div className="crt star-bg" style={{
            position: "fixed", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 28, padding: 32,
            zIndex: 60, overflowY: "auto", animation: "fadeIn 0.4s ease",
        }}>
            {goEmoteWheel && (
                <EmoteWheel
                    cx={goEmoteWheel.cx} cy={goEmoteWheel.cy}
                    emotes={goEmoteWheel.emotes}
                    onSelect={emote => { setGoEmoteWheel(null); onEmote?.(emote); }}
                    onClose={() => setGoEmoteWheel(null)}
                />
            )}
            <div style={{ fontSize: 80, filter: `drop-shadow(0 0 30px ${wc})` }}>{hw ? "◈" : "👁"}</div>
            <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 28, color: wc, textShadow: `0 0 20px ${wc}`, marginBottom: 12 }}>
                    {hw ? "HUMANS WIN" : "GNOSIA WIN"}
                </h1>
                <p style={{ fontSize: 10, color: "#4a3060" }}>
                    {hw ? "All Gnosia eliminated. The crew survives." : "The Gnosia have taken control."}
                </p>
            </div>
            <div style={{ border: `1px solid ${wc}33`, padding: 24, maxWidth: 480, width: "100%", background: "#0d002088" }}>
                <div style={{ fontSize: 9, color: "#4a3060", marginBottom: 16 }}>FINAL MANIFEST</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.players.map(p => {
                        const rc = ROLE_COLORS[p.role] || "#c8b8ff";
                        const ac = AVATAR_COLORS[p.profileId] || "#c8b8ff";
                        const isMe = p.id === myId;
                        return (
                            <div key={p.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, paddingBottom: 10, borderBottom: "1px solid #1a0a2a" }}>
                                {playerEmotes[p.id] && (
                                    <div style={{ position: "absolute", top: -58, left: 0, zIndex: 30, pointerEvents: "none", animation: "emotePopIn 0.25s ease both" }}>
                                        <div style={{ background: "rgba(13,0,32,0.92)", border: "1px solid #2a1a4a", borderRadius: 8, padding: 4, boxShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>
                                            <img src={playerEmotes[p.id].src} alt={playerEmotes[p.id].label} style={{ width: 56, height: "auto", objectFit: "contain", borderRadius: 6, display: "block" }} />
                                        </div>
                                    </div>
                                )}
                                <div
                                    ref={el => { if (isMe) avatarRefs.current[p.id] = el; }}
                                    onPointerDown={isMe ? e => goStartHold(p.id, e) : undefined}
                                    onPointerUp={isMe ? goCancelHold : undefined}
                                    onPointerLeave={isMe ? goCancelHold : undefined}
                                    onPointerCancel={isMe ? goCancelHold : undefined}
                                    style={{ width: 40, height: 40, flexShrink: 0, border: `2px solid ${ac}55`, background: ac + "15", overflow: "hidden", position: "relative", cursor: isMe ? (goHoldProgress > 0 ? "grabbing" : "grab") : "default", touchAction: isMe ? "none" : undefined }}>
                                    <img src={`/profiles/${p.profileId}.jpg`} alt={p.username} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                                    <div style={{ display: "none", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: ac, fontSize: 16, fontWeight: "bold" }}>
                                        {p.username[0].toUpperCase()}
                                    </div>
                                    {isMe && goHoldProgress > 0 && (
                                        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 40 40">
                                            <circle cx="20" cy="20" r="17" stroke="#c8b8ff" strokeWidth="2.5" fill="none"
                                                strokeDasharray={`${2 * Math.PI * 17}`}
                                                strokeDashoffset={`${2 * Math.PI * 17 * (1 - goHoldProgress / 100)}`}
                                                transform="rotate(-90 20 20)" strokeLinecap="round" />
                                        </svg>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, color: "#e0d4ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</div>
                                    <div style={{ fontSize: 8, color: p.alive ? "#4a3060" : "#2a1a3a", marginTop: 3 }}>{p.alive ? "SURVIVED" : "ELIMINATED"}</div>
                                </div>
                                <span style={{ fontSize: 8, border: `1px solid ${rc}44`, color: rc, padding: "4px 10px", flexShrink: 0 }}>{p.role.toUpperCase()}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            <button className="btn btn-lg" onClick={onPlayAgain} style={{ opacity: amHost ? 1 : 0.6 }}>
                {amHost ? "PLAY AGAIN" : "WAITING FOR HOST"}
            </button>
            <div
                onPointerDown={startVolumePanelDrag}
                style={{
                    position: "fixed",
                    right: volumePanelPosition.x === null ? 24 : "auto",
                    bottom: volumePanelPosition.y === null ? 24 : "auto",
                    left: volumePanelPosition.x === null ? "auto" : volumePanelPosition.x,
                    top: volumePanelPosition.y === null ? "auto" : volumePanelPosition.y,
                    width: "min(280px, calc(100vw - 32px))",
                    border: `1px solid ${wc}44`,
                    background: "#0d0020ee",
                    boxShadow: `0 0 20px ${wc}22`,
                    padding: 16,
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
                        border: `1px solid ${wc}33`,
                        background: `${wc}08`,
                        color: wc,
                        fontSize: 6,
                        letterSpacing: "0.1em",
                    }}>
                        DRAG
                    </div>
                </div>
                <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${wc}66, transparent)`, marginBottom: 12 }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 9, color: wc }}>{musicMuted ? "MUTED" : `${Math.round(musicVolume * 100)}%`}</span>
                    <button
                        className="btn-topbar"
                        onClick={() => setMusicMuted(!musicMuted)}
                        style={{ borderColor: `${wc}44`, color: musicMuted ? "#8a7aa0" : wc }}>
                        {musicMuted ? "UNMUTE" : "MUTE"}
                    </button>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(musicVolume * 100)}
                    onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                    style={{ width: "100%", accentColor: wc }}
                />
            </div>
        </div>
    );
}

function ReconnectingScreen() {
    return (
        <div className="crt star-bg" style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)" }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 32, zIndex: 10 }}>
                <div style={{ fontSize: 72, animation: "pulse 1.5s ease-in-out infinite", filter: "drop-shadow(0 0 30px #00f5ff)" }}>◈</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <h1 style={{ fontSize: 28, letterSpacing: "0.15em", color: "#00f5ff", textShadow: "0 0 20px #00f5ff88", margin: 0 }}>RECONNECTING...</h1>
                    <p style={{ fontSize: 10, color: "#4a3060", textAlign: "center", lineHeight: 1.8, margin: 0 }}>Attempting to restore connection<br />to the game server.</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#00f5ff", boxShadow: "0 0 12px #00f5ff", animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
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

function SkipBar({ skipVotes, myId, onSkip, actionError, actionMsg }) {
    const iVoted = skipVotes.some(v => v.id === myId);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {actionError && <div style={{ fontSize: 8, color: "#ff2a2a", width: "100%" }}>⚠ {actionError}</div>}
            {actionMsg  && <div style={{ fontSize: 8, color: "#00f5ff", width: "100%" }}>{actionMsg}</div>}
            <button className="btn btn-secondary" style={{ fontSize: 8, padding: "8px 12px", flexShrink: 0 }} onClick={() => { if (!iVoted) onSkip(); }} disabled={iVoted}>
                {iVoted ? "✓ SKIP REQUESTED" : "⏭ SKIP PHASE"}
            </button>
            <div style={{ display: "flex", alignItems: "center" }}>
                {skipVotes.map((voter, i) => (
                    <img key={voter.id} src={`/profiles/${voter.profileId}.jpg`} alt={voter.username} title={`${voter.username} wants to skip`}
                        style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid #07000f", objectFit: "cover", boxShadow: "0 0 8px #00f5ff44", marginLeft: i > 0 ? -8 : 0, zIndex: skipVotes.length - i, position: "relative", animation: "fadeInUp 0.3s ease forwards" }}
                        onError={e => { e.target.style.display = "none"; }} />
                ))}
            </div>
        </div>
    );
}

function VoteProgressBar({ votesCast, totalAlive }) {
    const pct = totalAlive > 0 ? (votesCast / totalAlive) * 100 : 0;
    return (
        <div style={{ padding: "10px 16px", flexShrink: 0, borderBottom: "1px solid #1a0a2a", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 8, color: "#4a3060", flexShrink: 0 }}>VOTES</span>
            <div style={{ flex: 1, height: 4, background: "#1a0015", borderRadius: 2 }}>
                <div style={{ height: "100%", background: "#ffd700", boxShadow: "0 0 8px #ffd700", borderRadius: 2, transition: "width 0.5s", width: `${pct}%` }} />
            </div>
            <span style={{ fontSize: 9, color: "#ffd700", flexShrink: 0 }}>{votesCast}/{totalAlive}</span>
        </div>
    );
}

export default function Game({ session, socket, onLeaveRoom, musicVolume, setMusicVolume, musicMuted, setMusicMuted }) {
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

    const [isRolling,   setRolling]   = useState(false);
    const [rollingAura, setRollingAura] = useState("aura-rage-mode");
    const [showAuraPicker, setShowAuraPicker] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [auraVisibility,   setAuraVisibility]   = useState("all");
    const [emoteVisibility,  setEmoteVisibility]  = useState("all");

    // Emote state
    const [playerEmotes,  setPlayerEmotes]  = useState({});  // { [playerId]: { src, label, id } }
    const [emoteWheel,    setEmoteWheel]    = useState(null); // { cx, cy, emotes[] }
    const emoteTimeoutsRef = useRef({});

    const [isMobile,       setIsMobile]       = useState(false);
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

    useSocketEvent("chat:message", msg => {
        const formatted = {
            ...msg,
            time: new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        if (msg.channel === "gnosia") {
            setGnMsgs(p => [...p, formatted]);
            const isViewingGn = (desktopChat || mobileChatOpen) && activeChatTab === "gnosia";
            if (!isViewingGn) setUnreadGn(n => n + 1);
        } else {
            setPubMsgs(p => [...p, formatted]);
            const isViewingPub = (desktopChat || mobileChatOpen) && activeChatTab === "public";
            if (!isViewingPub) setUnreadPub(n => n + 1);
        }
    });

    // Auto-switch channel based on phase
    useEffect(() => {
        if (phase === "NIGHT" && myRole === "gnosia") {
            setActiveChatTab("gnosia");
        } else if (phase === "DAY_DISCUSSION") {
            setActiveChatTab("public");
        }
    }, [phase, myRole]);

    useSocketEvent("phase:changed", ({ phase: p }) => {
        const label = {
            DAY_DISCUSSION: "☀ Day Discussion begins.",
            VOTING: "⚖ Voting phase — choose wisely.",
            AFTERNOON: "🌅 Afternoon cooldown.",
            NIGHT: "🌑 Night has fallen.",
            MORNING: "🌄 Morning — results revealed.",
        }[p];
        if (!label) return;
        const sys = { id: Date.now(), type: "system", text: label };
        setPubMsgs(p => [...p, sys]);
        if (myRole === "gnosia") setGnMsgs(p => [...p, sys]);
    });

    const handleClearUnread = (tab) => {
        if (tab === "public") setUnreadPub(0);
        else if (tab === "gnosia") setUnreadGn(0);
    };

    const me         = players.find(p => p.id === myId);
    const isNight    = phase === "NIGHT";
    const isVoting   = phase === "VOTING";
    const phaseColor = PHASE_COLORS[phase] || "#00f5ff";
    const roleColor  = ROLE_COLORS[myRole] || "#c8b8ff";
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

    function showResultModal(payload) {
        setResultModal(payload);
        const ms = typeof payload?.durationMs === "number" ? payload.durationMs : 6000;
        setTimeout(() => setResultModal(null), ms);
    }

    useSocketEvent("game:roleAssigned", rolePayload => {
        if (rolePayload.role === "gnosia" && rolePayload.gnosiaAllies) setAllies(rolePayload.gnosiaAllies);
    });

    useSocketEvent("phase:changed", ({ phase: p, round: r, timers: t, players: pl, skipVotes: sv, morningReport: mr }) => {
        setPhase(p); setRound(r); setTimers(t); setPlayers(pl);
        setSelectedTarget(null); setNightSubmitted(false);
        setActionError(""); setActionMsg(""); setHasVoted(false);
        setShowOverlay(true); setScanResult(null); setInspectResult(null); setGuardianResult(null);
        if (p !== "VOTE_REVEAL" && p !== "AFTERNOON") setVoteBreakdown(null);
        setSkipVotes(Array.isArray(sv) ? sv : []);
        setMorningReport(mr || null);
    });

    useSocketEvent("phase:skip:updated", voters => setSkipVotes(Array.isArray(voters) ? voters : []));
    useSocketEvent("vote:progress",      ({ votesCast, totalAlive }) => setVoteProgress({ votesCast, totalAlive }));
    useSocketEvent("vote:dismissed",     ({ byUsername, message }) => {
        setVoteDismissed({ byUsername, message });
        setTimeout(() => setVoteDismissed(null), 3500);
    });

    useSocketEvent("vote:result", result => {
        setVoteBreakdown(result.votes || {});
        setVoteReveal({ eliminatedId: result.eliminated || null, eliminatedUsername: result.eliminatedUsername || null, reason: result.reason || null });
        setTimeout(() => {
            setMorningReport(prev => ({ ...(prev || {}), coldSleep: result.eliminated, coldSleepUsername: result.eliminatedUsername }));
            if (result.eliminated) setPlayers(prev => prev.map(p => p.id === result.eliminated ? { ...p, alive: false, inColdSleep: true } : p));
            setVoteReveal(null);
        }, 4200);
    });

    useSocketEvent("night:scanResult", r => {
        setScanResult(r);
        showResultModal({ variant: r?.isGnosia ? "danger" : "info", title: "ENGINEER SCAN RESULT", message: `${r?.targetUsername || "Target"} is ${r?.isGnosia ? "GNOSIA" : "HUMAN"}.` });
    });

    useSocketEvent("night:inspectResult", r => {
        setInspectResult(r); if (r?.error) return;
        showResultModal({ variant: r?.role === "gnosia" ? "danger" : "success", title: "DOCTOR INSPECTION RESULT", message: `${r?.targetUsername || "Target"} was ${r?.role === "gnosia" ? "GNOSIA" : "HUMAN"}.` });
    });

    useSocketEvent("night:guardianResult", r => {
        setGuardianResult(r);
        showResultModal({ variant: r?.worked ? "success" : "info", title: "PROTECTION OUTCOME", message: r?.worked ? `You protected ${r?.targetUsername || "Target"} from the Gnosia!` : `Your ward ${r?.targetUsername || "Target"} was not targeted tonight.` });
    });

    useSocketEvent("night:scannedAlert", payload => {
        setScannedAlert(true); setTimeout(() => setScannedAlert(false), 8000);
        showResultModal({ variant: "danger", title: "GNOSIA ALERT", message: payload?.message || "You have been scanned by the Engineer." });
    });

    useSocketEvent("ui:toast", t => showResultModal({ variant: t?.variant || "info", title: t?.title || "NOTICE", message: t?.message || "", durationMs: t?.durationMs }));
    useSocketEvent("night:gnosiaVoteProgress", ({ votesIn, totalGnosia }) => { setGnosiaVP({ votesIn, totalGnosia }); setActionMsg(`${votesIn}/${totalGnosia} Gnosia voted`); });
    useSocketEvent("game:over", r => { setGameOver(r); setPhase("END"); });
    useSocketEvent("player:disconnected", ({ socketId }) => { setPlayers(prev => prev.map(p => p.id === socketId ? { ...p, disconnected: true } : p)); });
    useSocketEvent("player:reconnected", ({ previousId, newId }) => { setPlayers(prev => prev.map(p => p.id === previousId ? { ...p, id: newId, disconnected: false } : p)); });
    useSocketEvent("player:lostConnection", ({ username, playerId }) => { setLostConnectionNotice(`${username} lost connection.`); setPlayers(prev => prev.filter(p => p.id !== playerId)); setTimeout(() => setLostConnectionNotice(""), 7000); });
    useSocketEvent("player:auraUpdated", ({ playerId, aura, rollsRemaining }) => { setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, aura, rollsRemaining } : p)); });

    useSocketEvent("player:emote", ({ playerId, emote }) => {
        setPlayerEmotes(prev => ({ ...prev, [playerId]: emote }));
        clearTimeout(emoteTimeoutsRef.current[playerId]);
        emoteTimeoutsRef.current[playerId] = setTimeout(() => {
            setPlayerEmotes(prev => { const n = { ...prev }; delete n[playerId]; return n; });
        }, 5000);
    });

    function handleHoldComplete(cx, cy) {
        setEmoteWheel({ cx, cy, emotes: getRandomEmotes() });
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

    if (reconnecting) return <ReconnectingScreen />;
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
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: "min(560px, 94vw)",
                            background: "linear-gradient(180deg, rgba(26,10,0,0.96), rgba(12,5,0,0.96))",
                            border: "1px solid rgba(255, 140, 26, 0.7)",
                            boxShadow: "0 0 0 1px rgba(255, 140, 26, 0.18), 0 0 28px rgba(255, 140, 26, 0.22)",
                            padding: 24,
                        }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
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
                        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255, 140, 26, 0.9), transparent)", marginBottom: 18 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                    emotes={emoteWheel.emotes}
                    onSelect={handleEmoteSelect}
                    onClose={() => setEmoteWheel(null)}
                />
            )}
        </>
    );

    const topBar = (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #1a0a2a", background: "#08001299", flexShrink: 0, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: isMobile ? 8 : 10, border: `1px solid ${phaseColor}55`, color: phaseColor, padding: "6px 14px", background: phaseColor + "0a" }}>{phase.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 9, color: "#4a3060" }}>RND {round}</div>
            </div>
            {timers.endsAt && <PhaseTimer endsAt={timers.endsAt} color={phaseColor} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {me && !me.alive && (
                    <div className="btn-topbar" style={{ background: "#5a0000", border: "1px solid #7a0000", cursor: "default" }}>
                        DEAD
                    </div>
                )}
                <button onClick={() => setShowRoleInfo(true)} className="btn-topbar" style={{ border: `1px solid ${roleColor}55`, color: roleColor }}>
                    {myRole?.toUpperCase()} ?
                </button>
                <button
                    onClick={openSettingsModal}
                    className="btn-topbar"
                    style={{
                        border: "1px solid #ff8c1a88",
                        color: "#ff9b3d",
                        background: "rgba(255, 140, 26, 0.08)",
                        boxShadow: "0 0 18px rgba(255, 140, 26, 0.12)",
                    }}>
                    <CiSettings size={18} /> SETTING
                </button>
                {!isMobile && (
                    <button onClick={() => setDesktopChat(o => !o)} className="btn-topbar" style={{ color: "#8a7aa0" }}>
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
                        <div style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "14px 16px", background: "#07000f" }}>
                            {actionError && <div style={{ fontSize: 8, color: "#ff2a2a", marginBottom: 8 }}>⚠ {actionError}</div>}
                            {actionMsg && <div style={{ fontSize: 8, color: "#00f5ff", marginBottom: 8 }}>{actionMsg}</div>}
                            <button className="btn btn-gold" style={{ width: "100%", fontSize: 10 }} onClick={submitVote} disabled={!selectedTarget || hasVoted}>{hasVoted ? "✓ VOTE LOCKED" : selectedTarget ? `⚖ VOTE: ${players.find(p => p.id === selectedTarget)?.username}` : "SELECT TO VOTE"}</button>
                            {myRole === "lawyer" && <button style={{ width: "100%", marginTop: 10, padding: "10px", fontSize: 9, background: hasLawyerDismissed ? "#1a0a2a" : "#7a3a00", color: hasLawyerDismissed ? "#3a2a4a" : "#ffbb55", border: "1px solid #ff8833", fontFamily: "Press Start 2P" }} onClick={dismissVote} disabled={hasLawyerDismissed}>{hasLawyerDismissed ? "DISMISS USED" : "⚖ DISMISS VOTE"}</button>}
                        </div>
                    )}
                    {showSkipBar && (
                        <div style={{ flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "12px 16px", background: "#07000f" }}>
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
                    {!(isNight && myRole === "gnosia") && (
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
                                <div style={{ 
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
                                            className="btn"
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
                                    <div style={{ padding: "12px 16px", background: "#0d0020", borderBottom: "1px solid #1a0a2a" }}>
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
                            roomId={roomId} myRole={myRole} isAlive={me?.alive ?? true} phase={phase} socket={socket} 
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
                        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#07000ffc", display: "flex", flexDirection: "column", animation: "fadeInUp 0.3s ease-out" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1a0a2a", background: "#0d0020" }}>
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
                                    roomId={roomId} myRole={myRole} isAlive={me?.alive ?? true} phase={phase} socket={socket} 
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
                                roomId={roomId} myRole={myRole} isAlive={me?.alive ?? true} phase={phase} socket={socket} 
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
