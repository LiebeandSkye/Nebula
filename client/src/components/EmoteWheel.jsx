import { useEffect, useState } from "react";

export const ALL_EMOTES = [
    { id: "absolute_cinema", src: "/emotes/absolute_cinema.gif", label: "CINEMA" },
    { id: "ahhh",            src: "/emotes/ahhh.gif",            label: "AHHH" },
    { id: "cat",             src: "/emotes/cat.gif",             label: "CAT" },
    { id: "damn",            src: "/emotes/damn.gif",            label: "DAMN" },
    { id: "dance",           src: "/emotes/dance.gif",           label: "DANCE" },
    { id: "dance2",          src: "/emotes/dance2.gif",          label: "DANCE2" },
    { id: "goblin_cry",      src: "/emotes/goblin_cry.gif",      label: "CRY" },
    { id: "hmmm",            src: "/emotes/hmmm.gif",            label: "HMMM" },
    { id: "horray",          src: "/emotes/horray.gif",          label: "YAYY" },
    { id: "i_am_hero",       src: "/emotes/i_am_hero.gif",       label: "HERO" },
    { id: "lion",            src: "/emotes/lion.gif",            label: "LION" },
    { id: "muw",             src: "/emotes/muw.gif",             label: "MUW" },
    { id: "nooo",            src: "/emotes/nooo.gif",            label: "NOOO" },
    { id: "oppenheimer",     src: "/emotes/oppenheimer.gif",     label: "OPPY" },
    { id: "punch",           src: "/emotes/punch.gif",           label: "PUNCH" },
    { id: "putin_trump",     src: "/emotes/putin_trump.gif",     label: "TWINS" },
    { id: "saj",             src: "/emotes/saj.gif",             label: "SAJ" },
    { id: "sigma",           src: "/emotes/sigma.gif",           label: "SIGMA" },
    { id: "skeleton",        src: "/emotes/skeleton.gif",        label: "SPOOK" },
    { id: "tesla_einstein",  src: "/emotes/tesla_einstein.gif",  label: "GENIUS" },
    { id: "tuna",            src: "/emotes/tuna.gif",            label: "TUNA" },
    { id: "wat",             src: "/emotes/wat.gif",             label: "WAT" },
];

export function getRandomEmotes() {
    return [...ALL_EMOTES].sort(() => Math.random() - 0.5).slice(0, 6);
}

const WHEEL_RADIUS = 92;
const DEAD_ZONE = 34;

function getHoveredIndex(cx, cy, px, py) {
    const dx = px - cx;
    const dy = py - cy;
    if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE) return -1;
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    // Normalize so 0° = top (item 0), each sector is 60°
    const normalized = ((angleDeg + 90 + 360) % 360);
    return Math.floor(((normalized + 30) % 360) / 60);
}

export default function EmoteWheel({ cx, cy, emotes, onSelect, onClose }) {
    const [hoveredIndex, setHoveredIndex] = useState(-1);

    useEffect(() => {
        let rafId = null;
        const onMove = (e) => {
            if (rafId) return; // Throttle using RAF
            rafId = requestAnimationFrame(() => {
                const px = e.clientX ?? e.touches?.[0]?.clientX;
                const py = e.clientY ?? e.touches?.[0]?.clientY;
                if (px == null) return;
                setHoveredIndex(getHoveredIndex(cx, cy, px, py));
                rafId = null;
            });
        };
        const onUp = (e) => {
            const t = e.changedTouches?.[0];
            const px = t ? t.clientX : e.clientX;
            const py = t ? t.clientY : e.clientY;
            if (px != null) {
                const idx = getHoveredIndex(cx, cy, px, py);
                if (idx >= 0 && emotes && emotes[idx]) {
                    try {
                        onSelect(emotes[idx]);
                        return;
                    } catch (error) {
                        console.error('Error selecting emote:', error);
                    }
                }
            }
            onClose();
        };
        const onKey = (e) => { if (e.key === "Escape") onClose(); };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("mouseup",   onUp);
        window.addEventListener("touchend",  onUp);
        window.addEventListener("keydown",   onKey);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("mouseup",   onUp);
            window.removeEventListener("touchend",  onUp);
            window.removeEventListener("keydown",   onKey);
        };
    }, [cx, cy, emotes, onSelect, onClose]);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "none" }}>
            {/* Dark backdrop circle behind center */}
            <div style={{
                position: "absolute",
                left: cx - 68, top: cy - 68,
                width: 136, height: 136,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(7,0,15,0.96) 50%, transparent 100%)",
                border: "1px solid #2a1a4a",
                boxShadow: "0 0 40px rgba(0,0,0,0.9), 0 0 16px rgba(155,48,255,0.15)",
                animation: "emoteWheelIn 0.15s ease both",
            }} />

            {/* 6 emote items */}
            {emotes.map((emote, i) => {
                const rad = (-90 + i * 60) * (Math.PI / 180);
                const ex = cx + Math.cos(rad) * WHEEL_RADIUS;
                const ey = cy + Math.sin(rad) * WHEEL_RADIUS;
                const hovered = i === hoveredIndex;
                return (
                    <div key={emote.id} style={{
                        position: "absolute",
                        left: ex - 30, top: ey - 30,
                        width: 60, height: 60,
                        borderRadius: "50%",
                        background: hovered ? "rgba(26,0,60,0.97)" : "rgba(13,0,32,0.92)",
                        border: `2px solid ${hovered ? "#c8b8ff" : "#2a1a4a99"}`,
                        boxShadow: hovered
                            ? "0 0 20px #9b30ff99, 0 0 8px #c8b8ff55"
                            : "0 4px 14px rgba(0,0,0,0.6)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        transform: hovered ? "scale(1.25)" : "scale(1)",
                        transition: "transform 0.08s ease, box-shadow 0.08s ease, border-color 0.08s ease",
                        animation: `emoteItemIn 0.2s ${i * 0.025}s both ease`,
                        overflow: "hidden",
                    }}>
                        <img
                            src={emote.src}
                            alt={`Emote: ${emote.label}`}
                            style={{
                                width: hovered ? 38 : 32,
                                height: hovered ? 38 : 32,
                                objectFit: "cover",
                                borderRadius: "50%",
                                transition: "width 0.08s, height 0.08s",
                                userSelect: "none",
                                pointerEvents: "none",
                            }}
                        />
                        <div style={{
                            fontSize: 5,
                            fontFamily: "Press Start 2P",
                            color: hovered ? "#c8b8ff" : "#4a3060",
                            letterSpacing: "0.04em",
                            userSelect: "none",
                            lineHeight: 1,
                        }}>
                            {emote.label}
                        </div>
                    </div>
                );
            })}

            {/* Center label / preview */}
            <div style={{
                position: "absolute",
                left: cx - 26, top: cy - 13,
                width: 52,
                textAlign: "center",
                pointerEvents: "none",
                userSelect: "none",
            }}>
                {hoveredIndex >= 0 ? (
                    <img
                        src={emotes[hoveredIndex]?.src}
                        alt={`Preview: ${emotes[hoveredIndex]?.label || 'emote'}`}
                        style={{
                            width: 28, height: 28,
                            objectFit: "cover",
                            borderRadius: "50%",
                            opacity: 0.9,
                        }}
                    />
                ) : (
                    <div style={{
                        fontSize: 7,
                        fontFamily: "Press Start 2P",
                        color: "#2a1a4a",
                        lineHeight: 1.5,
                    }}>···</div>
                )}
            </div>
        </div>
    );
}
