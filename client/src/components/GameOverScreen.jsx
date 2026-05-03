import { useState, useEffect, useRef } from "react";
import { AVATAR_COLORS } from "../lib/profiles.js";
import { ROLE_COLORS } from "../lib/gameConfig.jsx";
import EmoteWheel, { getRandomEmotes } from "./EmoteWheel.jsx";

export default function GameOverScreen({ 
    result, onPlayAgain, amHost, musicVolume, setMusicVolume, musicMuted, setMusicMuted, 
    myId = null, playerEmotes = {}, onEmote 
}) {
    const hw = result.winner === "humans";
    const wc = hw ? "#00f5ff" : "#9b30ff";
    const [volumePanelPosition, setVolumePanelPosition] = useState({ x: null, y: null });
    const dragStateRef = useRef(null);

    // Emote wheel state for game-over screen
    const holdTimerRef = useRef(null);
    const avatarRefs = useRef({});
    const [goIsHolding, setGoIsHolding] = useState(false);
    const [goEmoteWheel, setGoEmoteWheel] = useState(null);

    function goStartHold(playerId, e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        setGoIsHolding(true);
        holdTimerRef.current = setTimeout(() => {
            setGoIsHolding(false);
            const rect = avatarRefs.current[playerId]?.getBoundingClientRect();
            if (rect) setGoEmoteWheel({ 
                cx: rect.left + rect.width / 2, 
                cy: rect.top + rect.height / 2, 
                emotes: getRandomEmotes(), 
                borderRadius: "4px" 
            });
        }, 2000);
    }

    function goCancelHold() {
        clearTimeout(holdTimerRef.current);
        setGoIsHolding(false);
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
                    emotes={goEmoteWheel.emotes} borderRadius={goEmoteWheel.borderRadius}
                    onSelect={emote => { setGoEmoteWheel(null); onEmote?.(emote); }}
                    onClose={() => setGoEmoteWheel(null)}
                />
            )}
            <div style={{ fontSize: 80, filter: `drop-shadow(0 0 30px ${wc})` }}>{hw ? "◈" : "👁"}</div>
            <div style={{ textAlign: "center" }}>
                <h1 className="cp-title-flicker cp-flicker-shake" style={{ fontSize: 28, color: wc, textShadow: `0 0 20px ${wc}`, marginBottom: 12 }}>
                    {hw ? "HUMANS WIN" : "GNOSIA WIN"}
                </h1>
                <p style={{ fontSize: 10, color: "#4a3060" }}>
                    {hw ? "All Gnosia eliminated. The crew survives." : "The Gnosia have taken control."}
                </p>
            </div>
            <div style={{ border: `1px solid ${wc}33`, padding: 24, maxWidth: 480, width: "100%", background: "#0d002088" }}>
                <div style={{ fontSize: 9, color: "#ff8c1a", marginBottom: 16 }}>RESULT</div>
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
                                    onContextMenu={e => e.preventDefault()}
                                    className={isMe ? "no-callout" : ""}
                                    style={{ width: 40, height: 40, flexShrink: 0, border: `2px solid ${ac}55`, background: ac + "15", overflow: "hidden", position: "relative", cursor: isMe ? (goIsHolding ? "grabbing" : "grab") : "default", touchAction: isMe ? "none" : undefined }}>
                                    <img src={`/profiles/${p.profileId}.jpg`} alt={p.username} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        draggable="false"
                                        onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                                    <div style={{ display: "none", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: ac, fontSize: 16, fontWeight: "bold" }}>
                                        {p.username[0].toUpperCase()}
                                    </div>
                                    {isMe && (
                                        <svg className="hold-ring-svg" viewBox="0 0 40 40" style={{ position: "absolute", inset: 0 }}>
                                            <rect
                                                className={`hold-ring-circle ${goIsHolding ? 'active' : ''}`}
                                                x="2" y="2" width="36" height="36" rx="4"
                                                pathLength="100"
                                                strokeDasharray="100"
                                                strokeDashoffset="100"
                                                strokeLinejoin="round"
                                            />
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
