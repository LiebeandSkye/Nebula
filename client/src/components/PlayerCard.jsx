import { useRef, useState, useEffect } from "react";
import { AVATAR_COLORS } from "../lib/profiles.js";

const buildAuraColumns = (specs, delayStep) =>
    specs.map(([left, bottom, width, height, rotate, thrust, layer], index) => ({
        left,
        bottom,
        width,
        height,
        rotate,
        thrust,
        layer,
        delay: index * delayStep,
    }));

const RAGE_COLUMNS = buildAuraColumns([
    [50, 54, 22, 58, 0, 21, 8],
    [40, 49, 18, 48, -8, 17, 7],
    [60, 49, 18, 48, 8, 17, 7],
    [45, 51, 16, 53, -4, 18, 8],
    [55, 51, 16, 53, 4, 18, 8],
    [30, 40, 14, 41, -14, 14, 6],
    [70, 40, 14, 41, 14, 14, 6],
    [35, 42, 14, 43, -10, 15, 6],
    [65, 42, 14, 43, 10, 15, 6],
    [19, 30, 12, 34, -22, 10, 5],
    [81, 30, 12, 34, 22, 10, 5],
    [24, 32, 12, 36, -18, 11, 5],
    [76, 32, 12, 36, 18, 11, 5],
    [11, 19, 11, 26, -32, 8, 4],
    [89, 19, 11, 26, 32, 8, 4],
    [35, 17, 10, 21, -12, 5.5, 3],
    [65, 17, 10, 21, 12, 5.5, 3],
], 0.045);

const GOLDEN_COLUMNS = buildAuraColumns([
    [50, 54, 22, 58, 0, 21, 8],
    [40, 49, 18, 48, -8, 17, 7],
    [60, 49, 18, 48, 8, 17, 7],
    [45, 51, 16, 53, -4, 18, 8],
    [55, 51, 16, 53, 4, 18, 8],
    [30, 40, 14, 41, -14, 14, 6],
    [70, 40, 14, 41, 14, 14, 6],
    [35, 42, 14, 43, -10, 15, 6],
    [65, 42, 14, 43, 10, 15, 6],
    [19, 30, 12, 34, -22, 10, 5],
    [81, 30, 12, 34, 22, 10, 5],
    [24, 32, 12, 36, -18, 11, 5],
    [76, 32, 12, 36, 18, 11, 5],
    [11, 19, 11, 26, -32, 8, 4],
    [89, 19, 11, 26, 32, 8, 4],
    [35, 17, 10, 21, -12, 5.5, 3],
    [65, 17, 10, 21, 12, 5.5, 3],
], 0.045);

const GLACIER_COLUMNS = buildAuraColumns([
    [50, 50, 18, 78, 0, 10, 7],
    [39, 43, 15, 62, -8, 8, 6],
    [61, 43, 15, 62, 8, 8, 6],
    [27, 34, 14, 54, -16, 7, 5],
    [73, 34, 14, 54, 16, 7, 5],
    [16, 24, 12, 42, -26, 6, 4],
    [84, 24, 12, 42, 26, 6, 4],
    [9, 14, 10, 30, -34, 5, 3],
    [91, 14, 10, 30, 34, 5, 3],
], 0.065);

const SPARKLE_COLUMNS = buildAuraColumns([
    [20, 60, 4, 4, 0, 8, 5],
    [80, 55, 5, 5, 0, 12, 5],
    [15, 35, 4, 4, 0, 10, 5],
    [85, 25, 6, 6, 0, 14, 5],
    [50, 70, 4, 4, 0, 10, 5],
    [30, 10, 5, 5, 0, 12, 5],
    [70, 8, 4, 4, 0, 8, 5],
], 0.25);

// New aura columns for the 5 new auras
const RED_SAIYAN_COLUMNS = buildAuraColumns([
    [50, 54, 22, 58, 0, 21, 8],
    [40, 49, 18, 48, -8, 17, 7],
    [60, 49, 18, 48, 8, 17, 7],
    [45, 51, 16, 53, -4, 18, 8],
    [55, 51, 16, 53, 4, 18, 8],
    [30, 40, 14, 41, -14, 14, 6],
    [70, 40, 14, 41, 14, 14, 6],
    [35, 42, 14, 43, -10, 15, 6],
    [65, 42, 14, 43, 10, 15, 6],
    [19, 30, 12, 34, -22, 10, 5],
    [81, 30, 12, 34, 22, 10, 5],
    [24, 32, 12, 36, -18, 11, 5],
    [76, 32, 12, 36, 18, 11, 5],
    [11, 19, 11, 26, -32, 8, 4],
    [89, 19, 11, 26, 32, 8, 4],
    [35, 17, 10, 21, -12, 5.5, 3],
    [65, 17, 10, 21, 12, 5.5, 3],
], 0.045);

const RAINBOW_SPARKLE_COLUMNS = buildAuraColumns([
    [20, 60, 4, 4, 0, 8, 5],
    [80, 55, 5, 5, 0, 12, 5],
    [15, 35, 4, 4, 0, 10, 5],
    [85, 25, 6, 6, 0, 14, 5],
    [50, 70, 4, 4, 0, 10, 5],
    [30, 10, 5, 5, 0, 12, 5],
    [70, 8, 4, 4, 0, 8, 5],
], 0.25);

const RAINBOW_SPARKLE_COLORS = [
    '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#ff00ff', '#ff1493'
];

const RED_SPARKLE_COLUMNS = buildAuraColumns([
    [20, 60, 4, 4, 0, 8, 5],
    [80, 55, 5, 5, 0, 12, 5],
    [15, 35, 4, 4, 0, 10, 5],
    [85, 25, 6, 6, 0, 14, 5],
    [50, 70, 4, 4, 0, 10, 5],
    [30, 10, 5, 5, 0, 12, 5],
    [70, 8, 4, 4, 0, 8, 5],
], 0.25);

const AURA_CONFIG = {
    "aura-rage-mode": {
        label: "Rage Mode",
        columns: RAGE_COLUMNS,
    },
    "aura-golden-saiyan": {
        label: "Golden Saiyan",
        columns: GOLDEN_COLUMNS,
    },
    "aura-glacier": {
        label: "Glacier",
        columns: GLACIER_COLUMNS,
    },
    "aura-sunset": {
        label: "Sunset",
        columns: [],
    },
    "aura-glitch": {
        label: "Glitch",
        columns: [],
    },
    "aura-sparkle-white": {
        label: "White Sparkles",
        columns: SPARKLE_COLUMNS,
    },
    "aura-sparkle-yellow": {
        label: "Yellow Sparkles",
        columns: SPARKLE_COLUMNS,
    },
    "aura-sparkle-pink": {
        label: "Pink Sparkles",
        columns: SPARKLE_COLUMNS,
    },
    "aura-judgement": {
        label: "Judgement",
        columns: [], // Removed blades as requested
    },
    // New auras
    "aura-red-saiyan": {
        label: "Red Saiyan",
        columns: RED_SAIYAN_COLUMNS,
    },
    "aura-halo": {
        label: "Halo",
        columns: [], // Special halo ring rendering
    },
    "aura-void": {
        label: "Void",
        columns: [], // Special void particles rendering
    },
    "aura-sparkle-rainbow": {
        label: "Rainbow Sparkle",
        columns: RAINBOW_SPARKLE_COLUMNS,
    },
    "aura-sparkle-red": {
        label: "Red Sparkle",
        columns: RED_SPARKLE_COLUMNS,
    },
};

export default function PlayerCard({
    player, isMe, isSelected, canSelect, onSelect,
    phase, myRole, gnosiaAllies = [],
    voteBreakdown = {}, allPlayers = [], compact = false,
    auraVisibility = "all",
    emoteVisibility = "all",
    activeEmote = null,
    onHoldComplete = null,
}) {
    // Hold-to-emote state
    const cardRef = useRef(null);
    const holdTimerRef = useRef(null);
    const [isHolding, setIsHolding] = useState(false);

    const HOLD_MS = 2000;

    function startHold(e) {
        if (!isMe || !onHoldComplete) return;
        // Only primary button / first touch
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        setIsHolding(true);
        holdTimerRef.current = setTimeout(() => {
            setIsHolding(false);
            const rect = cardRef.current?.getBoundingClientRect();
            if (rect) onHoldComplete(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }, HOLD_MS);
    }

    function cancelHold() {
        clearTimeout(holdTimerRef.current);
        setIsHolding(false);
    }

    useEffect(() => () => clearTimeout(holdTimerRef.current), []);
    const color = AVATAR_COLORS[player.profileId] || "#c8b8ff";
    const isAlly = gnosiaAllies.includes(player.id);
    const isDead = !player.alive;
    const auraKey = auraVisibility === "all" || (auraVisibility === "self" && isMe)
        ? player.aura
        : null;
    const aura = AURA_CONFIG[auraKey] || null;
    const hasAura = Boolean(aura);
    const avatarSize = compact ? 48 : 76;
    const auraScale = compact ? 0.78 : 1;
    const showPortrait = !isDead || hasAura;

    const voters = Object.entries(voteBreakdown || {})
        .filter(([, targetId]) => targetId === player.id)
        .map(([voterId]) => allPlayers.find(p => p.id === voterId))
        .filter(Boolean);

    const isGnosiaTarget = phase === "NIGHT" && myRole === "gnosia" && isSelected;
    let borderColor = isDead ? "#1a0a2a" : isGnosiaTarget ? "#9b30ff" : isSelected ? "#00f5ff" : isAlly ? "#9b30ff" : `${color}44`;
    let bgColor = isDead ? "#07000f" : isGnosiaTarget ? "#9b30ff0d" : isSelected ? "#00f5ff0d" : isAlly ? "#13002533" : "#0d0020";
    let shadow = isGnosiaTarget ? "0 0 24px #9b30ff66, 0 0 48px #9b30ff22"
        : isSelected ? "0 0 20px #00f5ff66, 0 0 40px #00f5ff22"
            : isAlly ? "0 0 12px #9b30ff44"
                : canSelect && !isDead ? `0 0 10px ${color}22`
                    : "none";

    if (auraKey === "aura-rage-mode") {
        borderColor = "transparent";
        bgColor = "#09090c";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 255, 255, 0.08)";
    } else if (auraKey === "aura-golden-saiyan") {
        borderColor = "transparent";
        bgColor = "#171003";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.56), 0 0 24px rgba(255, 215, 0, 0.14)";
    } else if (auraKey === "aura-glacier") {
        borderColor = "transparent";
        bgColor = "#071320";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.56), 0 0 22px rgba(119, 222, 255, 0.16)";
    } else if (auraKey === "aura-sunset") {
        borderColor = "transparent";
        bgColor = "#1a0800";
        shadow = "0 0 20px rgba(255, 69, 0, 0.22)";
    } else if (auraKey === "aura-glitch") {
        borderColor = "transparent";
        bgColor = "#020202";
        shadow = "0 0 16px rgba(0, 255, 0, 0.12)";
    } else if (auraKey === "aura-judgement") {
        borderColor = "transparent";
        bgColor = "#050508";
        shadow = "0 18px 48px rgba(0, 0, 0, 0.72), 0 0 32px rgba(0, 245, 255, 0.2)";
    } else if (auraKey === "aura-red-saiyan") {
        borderColor = "transparent";
        bgColor = "#1a0000";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 107, 107, 0.12)";
    } else if (auraKey === "aura-halo") {
        borderColor = "transparent";
        bgColor = "#1a1500";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.15)";
    } else if (auraKey === "aura-void") {
        borderColor = "transparent";
        bgColor = "#0a001a";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.7), 0 0 30px rgba(74, 0, 128, 0.18)";
    } else if (auraKey === "aura-sparkle-rainbow") {
        borderColor = "transparent";
        bgColor = "#0a001a";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.5), 0 0 25px rgba(255, 0, 255, 0.15)";
    } else if (auraKey === "aura-sparkle-red") {
        borderColor = "transparent";
        bgColor = "#1a0000";
        shadow = "0 14px 34px rgba(0, 0, 0, 0.6), 0 0 22px rgba(255, 107, 107, 0.16)";
    }

    const avatarBorderColor = auraKey === "aura-rage-mode"
        ? "rgba(255, 255, 255, 0.82)"
        : auraKey === "aura-golden-saiyan"
            ? "rgba(255, 216, 94, 0.88)"
            : auraKey === "aura-glacier"
                ? "rgba(168, 242, 255, 0.88)"
                : auraKey === "aura-judgement"
                    ? "#00f5ff"
                    : auraKey === "aura-red-saiyan"
                        ? "rgba(255, 107, 107, 0.88)"
                        : auraKey === "aura-halo"
                            ? "rgba(255, 215, 0, 0.92)"
                            : auraKey === "aura-void"
                                ? "rgba(74, 0, 128, 0.88)"
                                : auraKey === "aura-sparkle-rainbow"
                                    ? "rgba(255, 0, 255, 0.88)"
                                    : auraKey === "aura-sparkle-red"
                                        ? "rgba(255, 107, 107, 0.88)"
                                        : isDead
                                            ? "#1a0a2a"
                                            : `${color}bb`;

    const avatarBackground = auraKey === "aura-rage-mode"
        ? "rgba(255, 255, 255, 0.03)"
        : auraKey === "aura-golden-saiyan"
            ? "rgba(255, 215, 0, 0.1)"
            : auraKey === "aura-glacier"
                ? "rgba(136, 218, 255, 0.08)"
                : auraKey === "aura-judgement"
                    ? "rgba(0, 245, 255, 0.08)"
                    : auraKey === "aura-red-saiyan"
                        ? "rgba(255, 107, 107, 0.05)"
                        : auraKey === "aura-halo"
                            ? "rgba(255, 215, 0, 0.12)"
                            : auraKey === "aura-void"
                                ? "rgba(74, 0, 128, 0.06)"
                                : auraKey === "aura-sparkle-rainbow"
                                    ? "rgba(255, 0, 255, 0.06)"
                                    : auraKey === "aura-sparkle-red"
                                        ? "rgba(255, 107, 107, 0.05)"
                                        : `${color}15`;

    const avatarShadow = auraKey === "aura-rage-mode"
        ? "0 0 18px rgba(255, 255, 255, 0.12)"
        : auraKey === "aura-golden-saiyan"
            ? "0 0 22px rgba(255, 215, 0, 0.26)"
            : auraKey === "aura-glacier"
                ? "0 0 22px rgba(124, 228, 255, 0.22)"
                : auraKey === "aura-judgement"
                    ? "0 0 26px rgba(0, 245, 255, 0.28)"
                    : auraKey === "aura-red-saiyan"
                        ? "0 0 20px rgba(255, 107, 107, 0.24)"
                        : auraKey === "aura-halo"
                            ? "0 0 24px rgba(255, 215, 0, 0.30)"
                            : auraKey === "aura-void"
                                ? "0 0 28px rgba(74, 0, 128, 0.32)"
                                : auraKey === "aura-sparkle-rainbow"
                                    ? "0 0 26px rgba(255, 0, 255, 0.30)"
                                    : auraKey === "aura-sparkle-red"
                                        ? "0 0 22px rgba(255, 107, 107, 0.28)"
                                        : isDead
                                            ? "0 0 20px rgba(255, 0, 0, 0.3), inset 0 0 15px rgba(255, 0, 0, 0.2)"
                                            : `0 4px 14px ${color}44`;

    const cardClassName = ["player-card-frame", hasAura ? `has-aura ${auraKey}` : ""]
        .filter(Boolean)
        .join(" ");

    const avatarClassName = ["avatar-shell", hasAura ? `avatar-aura ${auraKey}` : ""]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            ref={cardRef}
            onPointerDown={isMe && onHoldComplete ? startHold : undefined}
            onPointerUp={isMe && onHoldComplete ? cancelHold : undefined}
            onPointerLeave={isMe && onHoldComplete ? cancelHold : undefined}
            onPointerCancel={isMe && onHoldComplete ? cancelHold : undefined}
            style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 6, width: "100%", position: "relative",
                touchAction: isMe && onHoldComplete ? "none" : undefined,
            }}>

            {/* Active emote popup */}
            {activeEmote && (emoteVisibility === "all" || (emoteVisibility === "self" && isMe)) && (
                <div style={{
                    position: "absolute",
                    top: compact ? -14 : -24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 30,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    animation: "emotePopIn 0.25s ease both",
                    pointerEvents: "none",
                }}>
                    <div style={{
                        background: "rgba(13,0,32,0.92)",
                        border: "1px solid #2a1a4a",
                        borderRadius: 8,
                        padding: compact ? "3px" : "4px",
                        boxShadow: "0 4px 18px rgba(0,0,0,0.7), 0 0 12px rgba(155,48,255,0.2)",
                    }}>
                        <img
                            src={activeEmote.src}
                            alt={activeEmote.label}
                            style={{
                                width: compact ? 80 : 90,
                                height: "auto",
                                objectFit: "contain",
                                borderRadius: 6,
                                display: "block",
                            }}
                        />
                    </div>
                    <div style={{
                        fontSize: 5,
                        fontFamily: "Press Start 2P",
                        color: "#8a7aa0",
                        letterSpacing: "0.06em",
                    }}>
                        {activeEmote.label}
                    </div>
                </div>
            )}
            <button
                id={`player-card-${player.id}`}
                onClick={() => canSelect && !isDead && onSelect(player.id)}
                disabled={(!canSelect || isDead) && !isMe}
                className={cardClassName}
                style={{
                    padding: compact ? "8px 6px" : "16px 12px",
                    border: `1px solid ${borderColor}`,
                    background: isDead
                        ? `linear-gradient(180deg, ${bgColor}, #05050a)`
                        : `linear-gradient(135deg, ${bgColor}ee, ${bgColor}aa)`,
                    backdropFilter: "blur(12px)",
                    borderRadius: 16,
                    boxShadow: shadow !== "none" ? shadow : "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
                    cursor: isMe && onHoldComplete
                        ? (isHolding ? "grabbing" : "grab")
                        : (!canSelect || isDead ? "default" : "pointer"),
                    opacity: isDead ? (hasAura ? 0.94 : 0.7) : 1,
                    transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                    position: "relative",
                    fontFamily: "Press Start 2P",
                    width: "100%",
                    transform: isSelected ? "translateY(-4px)" : "translateY(0)",
                    isolation: "isolate",
                    userSelect: "none",
                }}>

                <div style={{
                    position: "absolute",
                    top: compact ? -8 : -10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "row",
                    gap: 4,
                    alignItems: "center",
                    zIndex: 10,
                }}>
                    {player.isHost && <span className="badge" style={{ color: "#ffd700", fontSize: compact ? 5 : 6 }}>HOST</span>}
                    {isAlly && <span className="badge" style={{ color: "#9b30ff", fontSize: compact ? 5 : 6 }}>ALLY</span>}
                    {player.inColdSleep && <span className="badge" style={{ color: "#4a3060", fontSize: compact ? 5 : 6 }}>COLD</span>}
                </div>

                {isMe && (
                    <div style={{
                        position: "absolute",
                        bottom: compact ? -8 : -10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 10,
                    }}>
                        <span className="badge" style={{ color: "#00f5ff", fontSize: compact ? 5 : 6 }}>YOU</span>
                    </div>
                )}

                <div style={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: compact ? 6 : 12,
                }}>
                    <div
                        className={avatarClassName}
                        style={{
                            width: avatarSize,
                            height: avatarSize,
                        }}>
                        {hasAura && (
                            <div
                                className="avatar-aura-field"
                                aria-hidden="true"
                                style={{ transform: `scale(${auraScale})`, transformOrigin: "50% 68%" }}>
                                <div className="avatar-aura-core" />
                                {aura.columns.map((column, index) => (
                                    <span
                                        key={`${auraKey}-${index}`}
                                        className="aura-column"
                                        style={{
                                            left: `${column.left}%`,
                                            bottom: `${column.bottom}%`,
                                            zIndex: column.layer,
                                        }}>
                                        <span
                                            className="aura-blade"
                                            style={{
                                                "--blade-width": `${column.width}px`,
                                                "--blade-height": `${column.height}px`,
                                                "--blade-rotate": `${column.rotate}deg`,
                                                "--blade-thrust": `${column.thrust}px`,
                                                "--delay": `${column.delay}s`,
                                            }}
                                        />
                                    </span>
                                ))}
                                {auraKey === "aura-glacier" && <div className="glacier-haze" />}
                            </div>
                        )}

                        {auraKey === "aura-rage-mode" && (
                            <>
                                <div className="rage-face-mask" aria-hidden="true" />
                                <div className="rage-eyes" aria-hidden="true">
                                    <span className="rage-eye rage-eye--left">
                                        <span className="rage-eye__pupil" />
                                    </span>
                                    <span className="rage-eye rage-eye--right">
                                        <span className="rage-eye__pupil" />
                                    </span>
                                </div>
                            </>
                        )}

                        {/* New Aura Components - Using blade system instead of custom rendering */}
                        {auraKey === "aura-halo" && (
                            <>
                                {/* Halo ring - special case since no blades */}
                                <div className="halo-ring" />
                            </>
                        )}

                        {auraKey === "aura-void" && (
                            <>
                                {/* Void haze - special case since no blades */}
                                <div className="void-haze" />
                                {/* Void particles */}
                                <div className="void-particles">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="void-particle"
                                            style={{
                                                position: 'absolute',
                                                left: `${30 + (i * 5)}%`,
                                                top: `${20 + (i % 3) * 20}%`,
                                                '--tx': `${(Math.random() - 0.5) * 40}px`,
                                                '--ty': `${(Math.random() - 0.5) * 40}px`,
                                                animationDelay: `${i * 0.3}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {auraKey === "aura-judgement" && (
                            <>
                                {/* Void veil — drowns avatar in darkness */}
                                <div className="j-veil" aria-hidden="true" />

                                <div className="judgement-eyes" aria-hidden="true">
                                    {/* Viewer-LEFT = Cold white raging eye */}
                                    <div className="j-eye-wrapper j-eye--cold">
                                        <div className="j-eye-shape" />

                                        {/* Cold Wisps */}
                                        <div className="j-wisp jw-co" />
                                        <div className="j-wisp jw-ci" />
                                        <div className="j-wisp jw-ct" />
                                    </div>

                                    {/* Viewer-RIGHT = Sans Cyan flame raging eye */}
                                    <div className="j-eye-wrapper j-eye--flame">
                                        <div className="j-eye-shape" />

                                        {/* Flame Wisps */}
                                        <div className="j-wisp jw-fo" />
                                        <div className="j-wisp jw-fi" />
                                        <div className="j-wisp jw-ft" />

                                        {/* Embers drifting off the active eye */}
                                        <div className="j-emb je1" />
                                        <div className="j-emb je2" />
                                        <div className="j-emb je3" />
                                        <div className="j-emb je4" />
                                    </div>
                                </div>
                            </>
                        )}

                        {auraKey === "aura-glitch" && (
                            <div className="aura-glitch-overlay" aria-hidden="true">
                                <div className="aura-glitch-text">404</div>
                                <div className="aura-glitch-crack" />
                            </div>
                        )}

                        {auraKey === "aura-golden-saiyan" && (
                            <div className="golden-crown" aria-hidden="true">
                                <span className="golden-crown__base" />
                                <span className="golden-crown__point golden-crown__point--left" />
                                <span className="golden-crown__point golden-crown__point--center" />
                                <span className="golden-crown__point golden-crown__point--right" />
                                <span className="golden-crown__gem" />
                            </div>
                        )}

                        <div style={{
                            width: "100%",
                            height: "100%",
                            border: `2px solid ${avatarBorderColor}`,
                            background: avatarBackground,
                            borderRadius: "50%",
                            boxShadow: avatarShadow,
                            overflow: "hidden",
                            position: "relative",
                            flexShrink: 0,
                            transition: "all 0.3s",
                            zIndex: 2,
                        }}>
                            {showPortrait ? (
                                <>
                                    <img
                                        src={`/profiles/${player.profileId}.jpg`}
                                        alt={player.username}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            filter: isDead ? "grayscale(0.92) brightness(0.72)" : "none",
                                        }}
                                        onError={e => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display = "flex";
                                        }}
                                    />
                                    <div style={{
                                        display: "none",
                                        position: "absolute",
                                        inset: 0,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color,
                                        fontSize: compact ? 18 : 26,
                                        fontWeight: "bold",
                                        background: isDead ? "rgba(0, 0, 0, 0.32)" : "transparent",
                                    }}>
                                        {player.username[0].toUpperCase()}
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 28,
                                    color: "#2a1a3a",
                                    position: "relative",
                                    zIndex: 2,
                                }}>X</div>
                            )}

                            {isDead && showPortrait && (
                                <>
                                    <div className="avatar-dead-veil" />
                                    <div className="avatar-dead-mark">X</div>
                                </>
                            )}

                            {isSelected && (
                                <div
                                    className={isGnosiaTarget ? "anim-pulseGnosia" : ""}
                                    style={{
                                        position: "absolute",
                                        inset: -3,
                                        border: `2px solid ${isGnosiaTarget ? "#9b30ff" : "#00f5ff"}`,
                                        borderRadius: "50%",
                                        animation: isGnosiaTarget ? undefined : "pulseGlow 1.5s ease-in-out infinite",
                                        pointerEvents: "none",
                                    }}
                                />
                            )}
                        </div>

                        {/* Hold-to-emote progress ring */}
                        {isMe && onHoldComplete && (
                            <svg
                                className="hold-ring-svg"
                                style={{
                                    width: avatarSize + 6,
                                    height: avatarSize + 6,
                                }}
                                viewBox={`0 0 ${avatarSize + 6} ${avatarSize + 6}`}
                            >
                                <circle
                                    className={`hold-ring-circle ${isHolding ? 'active' : ''}`}
                                    cx={(avatarSize + 6) / 2}
                                    cy={(avatarSize + 6) / 2}
                                    r={(avatarSize + 6) / 2 - 2.5}
                                    strokeDasharray={`${2 * Math.PI * ((avatarSize + 6) / 2 - 2.5)}`}
                                    strokeDashoffset={`${2 * Math.PI * ((avatarSize + 6) / 2 - 2.5)}`}
                                />
                            </svg>
                        )}
                    </div>

                    <div style={{ textAlign: "center", width: "100%" }}>
                        <div style={{
                            fontSize: compact ? 7 : 9,
                            color: isDead && !hasAura ? "#2a1a3a" : color,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginBottom: 2,
                        }}>
                            {player.username}
                        </div>
                        {!compact && (
                            <div style={{ fontSize: 7, color: "#4a3060" }}>
                                {player.profileName || aura?.label || ""}
                            </div>
                        )}
                    </div>

                    {canSelect && !isDead && !isMe && (
                        <div style={{
                            width: "100%",
                            padding: compact ? "4px 0" : "8px 0",
                            textAlign: "center",
                            fontSize: compact ? 6 : 8,
                            letterSpacing: "0.1em",
                            border: `1px solid ${isSelected ? "#00f5ff" : `${color}44`}`,
                            borderRadius: 6,
                            color: isSelected ? "#07000f" : color,
                            background: isSelected ? "#00f5ff" : "rgba(0,0,0,0.4)",
                            marginTop: 2,
                            transition: "all 0.2s",
                            fontWeight: isSelected ? "bold" : "normal",
                            textShadow: isSelected ? "none" : `0 0 10px ${color}88`,
                        }}>
                            {isSelected ? (isGnosiaTarget ? "TARGETED" : "SELECTED") :
                                phase === "VOTING" ? "VOTE" : "SELECT"}
                        </div>
                    )}
                </div>
            </button>

            {voters.length > 0 && (
                <div style={{
                    display: "flex",
                    gap: 4,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    width: "100%",
                    paddingTop: 4,
                }}>
                    {voters.map(voter => {
                        const voterColor = AVATAR_COLORS[voter.profileId] || "#c8b8ff";
                        return (
                            <div
                                key={voter.id}
                                style={{
                                    width: 26,
                                    height: 26,
                                    border: `1px solid ${voterColor}88`,
                                    background: `${voterColor}15`,
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    position: "relative",
                                    flexShrink: 0,
                                }}
                                title={voter.username}>
                                <img
                                    src={`/profiles/${voter.profileId}.jpg`}
                                    alt={voter.username}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={e => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display = "flex";
                                    }}
                                />
                                <div style={{
                                    display: "none",
                                    position: "absolute",
                                    inset: 0,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: voterColor,
                                    fontSize: 12,
                                    fontWeight: "bold",
                                }}>
                                    {voter.username[0].toUpperCase()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
