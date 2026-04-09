/**
 * ChatPanel.jsx — Dual-tab chat. Fully redesigned with working send logic.
 * Refactored to be a controlled component that receives messages and active tab 
 * via props for precise synchronization and unread ping management.
 */
import { useState, useEffect, useRef } from "react";
import { AVATAR_COLORS } from "../lib/profiles.js";
import { BsArrowsFullscreen } from "react-icons/bs";
import { RiGlobalLine } from "react-icons/ri";

const PUBLIC_OPEN_PHASES = ["LOBBY", "DAY_DISCUSSION", "AFTERNOON", "MORNING"];
const GNOSIA_OPEN_PHASES = ["LOBBY", "DAY_DISCUSSION", "AFTERNOON", "NIGHT", "MORNING"];
const isGnosiaRole = (role) => role === "gnosia" || role === "illusionist";

function MsgBubble({ msg, isMe, socketId }) {
    if (msg.type === "system") {
        return (
            <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
                <div style={{
                    fontSize: 8, color: "#8a7aa0",
                    borderTop: "1px dashed #2a1a4a", borderBottom: "1px dashed #2a1a4a",
                    padding: "6px 16px",
                    background: "#07000f",
                    letterSpacing: "0.1em"
                }}>
                    {msg.text}
                </div>
            </div>
        );
    }
    const color = AVATAR_COLORS[msg.profileId] || "#c8b8ff";
    const isDead = msg.isAlive === false;
    const deadColor = "#ff6b6b";

    const finalIsMe = isMe || (msg.senderId === socketId);

    return (
        <div style={{
            display: "flex", flexDirection: "column",
            alignItems: finalIsMe ? "flex-end" : "flex-start",
            gap: 5, marginBottom: 10,
            animation: "fadeInUp 0.2s ease forwards",
            opacity: isDead ? 0.85 : 1,
        }}>
            {/* Sender row */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                flexDirection: finalIsMe ? "row-reverse" : "row"
            }}>
                {/* Mini avatar */}
                <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    border: isDead ? `1px solid ${deadColor}66` : `1px solid ${color}55`,
                    background: isDead ? deadColor + "18" : color + "18",
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                }}>
                    <img src={`/profiles/${msg.profileId}.jpg`}
                        alt={msg.senderName}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isDead ? 0.6 : 1 }}
                        onError={e => {
                            e.target.style.display = "none";
                            if (e.target.nextSibling) e.target.nextSibling.style.display = "block";
                        }} />
                    <span style={{ display: "none", fontSize: 10, color: isDead ? deadColor : color, fontWeight: "bold" }}>
                        {msg.senderName ? msg.senderName[0].toUpperCase() : "?"}
                    </span>
                    {isDead && (
                        <div style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(0,0,0,0.3)",
                            fontSize: 14,
                        }}>☠</div>
                    )}
                </div>
                <span style={{ fontSize: 8, color: isDead ? deadColor : color }}>{msg.senderName}</span>
                {isDead && (
                    <span style={{ fontSize: 7, color: deadColor, fontWeight: "bold" }}>DEAD</span>
                )}
                <span style={{ fontSize: 7, color: "#2a1a3a" }}>{msg.time}</span>
            </div>
            {/* Bubble */}
            <div style={{
                maxWidth: "75%", padding: "10px 14px",
                background: finalIsMe
                    ? (msg.channel === "gnosia" ? "#9b30ff18" : "#00f5ff12")
                    : "#0d0020",
                border: `1px solid ${finalIsMe
                    ? (msg.channel === "gnosia" ? "#9b30ff44" : "#00f5ff33")
                    : "#1a0a2a"}`,
                color: "#e0d4ff", fontSize: 10, lineHeight: 1.7,
                wordBreak: "break-word",
            }}>
                {msg.text}
            </div>
        </div>
    );
}

export default function ChatPanel({
    roomId, myRole, isAlive, phase, socket, 
    isPanelOpen = true,
    pubMsgs = [], gnMsgs = [], 
    unreadPub = 0, unreadGn = 0,
    onViewTab, onExpand, 
    tab = "public", onTabChange, // Controlled tab state
    players = [], myId
}) {
    const isGnosia = isGnosiaRole(myRole);
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [impersonatingId, setImpersonatingId] = useState(null);
    const [showImpersonateModal, setShowImpersonateModal] = useState(false);
    const [impersonateSearch, setImpersonateSearch] = useState("");
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const pubOpen = PUBLIC_OPEN_PHASES.includes(phase);
    const gnOpen = isGnosia && GNOSIA_OPEN_PHASES.includes(phase);
    const canSend = tab === "public" ? (pubOpen || !isAlive) : (isAlive && gnOpen);
    
    // Safety: Reset impersonation if the target player dies
    useEffect(() => {
        if (!impersonatingId) return;
        const target = players.find(p => p.id === impersonatingId);
        if (!target || !target.alive) {
            setImpersonatingId(null);
            if (showImpersonateModal) setShowImpersonateModal(false);
        }
    }, [players, impersonatingId, showImpersonateModal]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [pubMsgs, gnMsgs, tab]);

    // Clear unread in parent when viewing tab
    useEffect(() => {
        if (!isPanelOpen) return;
        onViewTab?.(tab);
    }, [tab, isPanelOpen, onViewTab]);

    function send() {
        const text = input.trim();
        if (!text || !canSend || sending) return;
        setSending(true); setError("");
        const payload = { roomId, channel: tab, text };
        if (tab === "public" && myRole === "illusionist" && impersonatingId) {
            payload.targetId = impersonatingId;
        }
        socket.emit("chat:message", payload, res => {
            setSending(false);
            if (!res.success) { setError(res.error); setTimeout(() => setError(""), 3000); }
            else { setInput(""); inputRef.current?.focus(); }
        });
    }

    const msgs = tab === "public" ? pubMsgs : gnMsgs;
    const tabColor = tab === "gnosia" ? "#9b30ff" : "#00f5ff";

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minHeight: 0, position: "relative" }}>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #1a0a2a", flexShrink: 0 }}>
                <button onClick={() => onTabChange?.("public")} style={{
                    flex: 1, padding: "13px 0", fontSize: 9,
                    fontFamily: "Press Start 2P", cursor: "pointer",
                    background: tab === "public" ? "#00f5ff0d" : "transparent",
                    color: tab === "public" ? "#00f5ff" : "#4a3060",
                    border: "none",
                    borderBottom: `2px solid ${tab === "public" ? "#00f5ff" : "transparent"}`,
                    transition: "all 0.15s",
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <RiGlobalLine style={{ fontSize: 13, marginBottom: 1 }} />
                        <span>CREW</span>
                        {unreadPub > 0 && tab !== "public" && (
                            <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: 4,
                                minWidth: 16,
                                height: 16,
                                padding: "0 4px",
                                borderRadius: 999,
                                background: "#ff2a2a",
                                color: "#07000f",
                                fontSize: 7,
                                border: "1px solid #ff2a2a66",
                            }}>
                                {Math.min(99, unreadPub)}
                            </span>
                        )}
                    </div>
                    {!pubOpen && <span style={{ fontSize: 7, color: "#2a1a3a", marginTop: 4, display: "block" }}>[CLOSED]</span>}
                </button>
                {isGnosia && (
                    <button onClick={() => onTabChange?.("gnosia")} style={{
                        flex: 1, padding: "13px 0", fontSize: 9,
                        fontFamily: "Press Start 2P", cursor: "pointer",
                        background: tab === "gnosia" ? "#9b30ff0d" : "transparent",
                        color: tab === "gnosia" ? "#9b30ff" : "#4a3060",
                        border: "none",
                        borderBottom: `2px solid ${tab === "gnosia" ? "#9b30ff" : "transparent"}`,
                        transition: "all 0.15s",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <span>👁 GNOSIA</span>
                            {unreadGn > 0 && tab !== "gnosia" && (
                                <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginLeft: 4,
                                    minWidth: 16,
                                    height: 16,
                                    padding: "0 4px",
                                    borderRadius: 999,
                                    background: "#ff2a2a",
                                    color: "#07000f",
                                    fontSize: 7,
                                    border: "1px solid #ff2a2a66",
                                }}>
                                    {Math.min(99, unreadGn)}
                                </span>
                            )}
                        </div>
                        {!gnOpen && <span style={{ fontSize: 7, color: "#2a1a3a", marginTop: 4, display: "block" }}>[CLOSED]</span>}
                    </button>
                )}
            </div>

            {/* Channel indicator */}
            <div style={{
                padding: "10px 16px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
                background: tab === "gnosia" ? "#13002533" : "#07000f44",
                borderBottom: "1px solid #1a0a2a",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: canSend ? tabColor : "#2a1a3a",
                        boxShadow: canSend ? `0 0 6px ${tabColor}` : "none",
                        flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 8, color: "#4a3060" }}>
                        {tab === "gnosia" ? "ENCRYPTED GNOSIA CHANNEL" : "PUBLIC CREW CHANNEL"}
                        {!isAlive && " · SPECTATOR"}
                        {isAlive && !canSend && " · INACTIVE"}
                    </span>
                </div>
                {onExpand && (
                    <div 
                        onClick={(e) => { e.stopPropagation(); onExpand(); }} 
                        style={{ 
                            color: "#00f5ff", 
                            filter: "drop-shadow(0 0 6px #00f5ffaa)",
                            display: "flex", alignItems: "center",
                            padding: "4px", cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = "drop-shadow(0 0 10px #00f5ff)"}
                        onMouseLeave={e => e.currentTarget.style.filter = "drop-shadow(0 0 6px #00f5ffaa)"}
                    >
                        <BsArrowsFullscreen style={{ fontSize: 13 }} />
                    </div>
                )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", minHeight: 0 }}>
                {msgs.length === 0 && (
                    <div style={{
                        height: "100%", display: "flex", alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <p style={{ fontSize: 9, color: "#2a1a3a", textAlign: "center", lineHeight: 2 }}>
                            {tab === "gnosia"
                                ? "Gnosia channel open.\nYour allies can see this."
                                : "No messages yet."}
                        </p>
                    </div>
                )}
                {msgs.map(msg => (
                    <MsgBubble key={msg.id} msg={msg} isMe={msg.senderId === socket.id} socketId={socket.id} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Identity Switcher UI */}
            {tab === "public" && myRole === "illusionist" && (
                <div style={{
                    flexShrink: 0, padding: "8px 12px", background: "#1a002a", 
                    borderTop: "1px solid #330066", display: "flex", 
                    alignItems: "center", justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 24, height: 24, borderRadius: "50%", 
                            overflow: "hidden", border: "1px solid #c46bff"
                        }}>
                            <img 
                                src={`/profiles/${impersonatingId ? players.find(p => p.id === impersonatingId)?.profileId : players.find(p => p.id === myId)?.profileId}.jpg`} 
                                alt="Persona"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                onError={(e) => e.target.style.display = "none"}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 7, color: "#8f68b5" }}>SPEAKING AS</span>
                            <span style={{ fontSize: 9, color: "#e0d4ff", fontFamily: "Press Start 2P" }}>
                                {impersonatingId ? players.find(p => p.id === impersonatingId)?.username : "YOURSELF"}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowImpersonateModal(true)}
                        className="btn" 
                        style={{ padding: "4px 8px", fontSize: 8, borderColor: "#c46bff", color: "#c46bff" }}>
                        SWITCH
                    </button>
                </div>
            )}

            {/* Input */}
            <div style={{
                flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: 12,
                background: "#07000f"
            }}>
                {error && (
                    <div style={{ fontSize: 8, color: "#ff2a2a", marginBottom: 8 }}>⚠ {error}</div>
                )}
                {!canSend ? (
                    <div style={{ textAlign: "center", fontSize: 9, color: "#2a1a3a", padding: "8px 0" }}>
                        {tab === "public" && phase === "NIGHT" ? "SILENCE DURING NIGHT" :
                            tab === "public" && phase === "VOTING" ? "VOTING PHASE CANNOT TALK" : "CHANNEL CLOSED"}
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 10 }}>
                        <input ref={inputRef} className="input"
                            style={{ fontSize: 10, borderColor: tab === "gnosia" ? "#9b30ff44" : undefined }}
                            placeholder={tab === "gnosia" ? "gnosia only..." : (!isAlive ? "spectral chat..." : "transmit message...")}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                            maxLength={300}
                        />
                        <button className={`btn btn-sm ${tab === "gnosia" ? "btn-gnosia" : ""}`}
                            onClick={send} disabled={!input.trim() || sending}
                            style={{ flexShrink: 0, minWidth: 48 }}>
                            {sending ? "·" : "►"}
                        </button>
                    </div>
                )}
            </div>
            {/* Impersonate Modal */}
            {showImpersonateModal && (
                <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, top: 0,
                    background: "rgba(10, 0, 20, 0.95)", zIndex: 10,
                    display: "flex", flexDirection: "column",
                    animation: "fadeInUp 0.2s ease"
                }}>
                    <div style={{ padding: 12, borderBottom: "1px solid #c46bff44", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "#c46bff", fontFamily: "Press Start 2P" }}>SHAPESHIFT</span>
                        <button onClick={() => setShowImpersonateModal(false)} style={{ background: "transparent", border: "none", color: "#ff2a2a", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                    <div style={{ padding: 12 }}>
                        <input 
                            placeholder="Search crew..." 
                            value={impersonateSearch}
                            onChange={e => setImpersonateSearch(e.target.value)}
                            style={{ 
                                width: "100%", background: "#000", border: "1px solid #c46bff44", 
                                color: "#fff", padding: "8px", fontSize: 10, outline: "none",
                                fontFamily: "sans-serif"
                            }} 
                        />
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <button 
                            onClick={() => { setImpersonatingId(null); setShowImpersonateModal(false); }}
                            style={{ 
                                padding: 12, background: !impersonatingId ? "#c46bff22" : "#1a0f2e", 
                                border: `1px solid ${!impersonatingId ? "#c46bff" : "#1a0f2e"}`,
                                color: "#e0d4ff", cursor: "pointer", textAlign: "left", fontSize: 10,
                                display: "flex", alignItems: "center", gap: 10
                            }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", border: "1px solid #c46bff" }}>
                                <img src={`/profiles/${players.find(p => p.id === myId)?.profileId}.jpg`} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display="none"} />
                            </div>
                            <span>Return to True Form (Yourself)</span>
                        </button>
                        {players.filter(p => p.alive && p.id !== myId && p.username.toLowerCase().includes(impersonateSearch.toLowerCase())).map(p => (
                            <button 
                                key={p.id}
                                onClick={() => { setImpersonatingId(p.id); setShowImpersonateModal(false); }}
                                style={{ 
                                    padding: 12, background: impersonatingId === p.id ? "#c46bff22" : "#1a0f2e", 
                                    border: `1px solid ${impersonatingId === p.id ? "#c46bff" : "#1a0f2e"}`,
                                    color: "#e0d4ff", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10
                                }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden" }}>
                                    <img src={`/profiles/${p.profileId}.jpg`} alt={p.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display="none"} />
                                </div>
                                <span style={{ fontSize: 10 }}>{p.username}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
