/**
 * ChatPanel.jsx — Dual-tab chat. Fully redesigned with working send logic.
 */
import { useState, useEffect, useRef } from "react";
import { useSocketEvent } from "../hooks/useSocket";

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

const PUBLIC_OPEN_PHASES = ["LOBBY", "DAY_DISCUSSION", "VOTING", "AFTERNOON", "MORNING"];
const GNOSIA_OPEN_PHASES = ["DAY_DISCUSSION", "NIGHT"];

function MsgBubble({ msg, isMe }) {
    if (msg.type === "system") {
        return (
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
                <div style={{
                    fontSize: 8, color: "#4a3060",
                    border: "1px solid #2a1a4a", padding: "5px 12px",
                    background: "#07000f",
                }}>
                    {msg.text}
                </div>
            </div>
        );
    }
    const color = AVATAR_COLORS[msg.profileId] || "#c8b8ff";
    const isDead = msg.isAlive === false;
    const deadColor = "#ff6b6b";
    
    return (
        <div style={{
            display: "flex", flexDirection: "column",
            alignItems: isMe ? "flex-end" : "flex-start",
            gap: 5, marginBottom: 10,
            animation: "fadeInUp 0.2s ease forwards",
            opacity: isDead ? 0.85 : 1,
        }}>
            {/* Sender row */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                flexDirection: isMe ? "row-reverse" : "row"
            }}>
                {/* Mini avatar */}
                <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    border: isDead ? `1px solid ${deadColor}66` : `1px solid ${color}55`, 
                    background: isDead ? deadColor + "18" : color + "18",
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                }}>
                    <img src={`${SERVER}/profiles/${msg.profileId}.jpg`}
                        alt={msg.senderName}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isDead ? 0.6 : 1 }}
                        onError={e => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "block";
                        }} />
                    <span style={{ display: "none", fontSize: 10, color: isDead ? deadColor : color, fontWeight: "bold" }}>
                        {msg.senderName[0].toUpperCase()}
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
                background: isMe
                    ? (msg.channel === "gnosia" ? "#9b30ff18" : "#00f5ff12")
                    : "#0d0020",
                border: `1px solid ${isMe
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

export default function ChatPanel({ roomId, myRole, isAlive, phase, socket, isPanelOpen = true, onUnreadChange }) {
    const isGnosia = myRole === "gnosia";
    const [tab, setTab] = useState("public");
    const [pubMsgs, setPubMsgs] = useState([]);
    const [gnMsgs, setGnMsgs] = useState([]);
    const [unreadPub, setUnreadPub] = useState(0);
    const [unreadGn, setUnreadGn] = useState(0);
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const pubOpen = PUBLIC_OPEN_PHASES.includes(phase);
    const gnOpen = isGnosia && GNOSIA_OPEN_PHASES.includes(phase);
    const canSend = isAlive && (tab === "public" ? pubOpen : gnOpen);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [pubMsgs, gnMsgs, tab]);

    // Auto-switch tab on phase change
    useEffect(() => {
        if (phase === "NIGHT" && isGnosia) setTab("gnosia");
        if (phase === "AFTERNOON" && tab === "gnosia") setTab("public");
    }, [phase]);

    // Clear unread when viewing tab (and panel is open)
    useEffect(() => {
        if (!isPanelOpen) return;
        if (tab === "public") setUnreadPub(0);
        if (tab === "gnosia") setUnreadGn(0);
    }, [tab, isPanelOpen]);

    // Bubble unread counts up for badges (Game FAB, etc.)
    useEffect(() => {
        onUnreadChange?.({ public: unreadPub, gnosia: unreadGn });
    }, [unreadPub, unreadGn, onUnreadChange]);

    useSocketEvent("chat:message", msg => {
        const formatted = {
            ...msg,
            isMe: false, // determined at render via socket.id
            time: new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        if (msg.channel === "gnosia") {
            setGnMsgs(p => [...p, formatted]);
            const shouldCount = !(isPanelOpen && tab === "gnosia");
            if (shouldCount) setUnreadGn(n => n + 1);
        } else {
            setPubMsgs(p => [...p, formatted]);
            const shouldCount = !(isPanelOpen && tab === "public");
            if (shouldCount) setUnreadPub(n => n + 1);
        }
    });

    useSocketEvent("phase:changed", ({ phase: p }) => {
        const label = {
            DAY_DISCUSSION: "☀  Day Discussion begins.",
            VOTING: "⚖  Voting phase — choose wisely.",
            AFTERNOON: "🌅  Afternoon cooldown.",
            NIGHT: "🌑  Night has fallen.",
            MORNING: "🌄  Morning — results revealed.",
        }[p];
        if (!label) return;
        const sys = { id: Date.now(), type: "system", text: label };
        setPubMsgs(p => [...p, sys]);
        if (isGnosia) setGnMsgs(p => [...p, sys]);
    });

    function send() {
        const text = input.trim();
        if (!text || !canSend || sending) return;
        setSending(true); setError("");
        socket.emit("chat:message", { roomId, channel: tab, text }, res => {
            setSending(false);
            if (!res.success) { setError(res.error); setTimeout(() => setError(""), 3000); }
            else { setInput(""); inputRef.current?.focus(); }
        });
    }

    const msgs = tab === "public" ? pubMsgs : gnMsgs;
    const tabColor = tab === "gnosia" ? "#9b30ff" : "#00f5ff";

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #1a0a2a", flexShrink: 0 }}>
                <button onClick={() => setTab("public")} style={{
                    flex: 1, padding: "13px 0", fontSize: 9,
                    fontFamily: "Press Start 2P", cursor: "pointer",
                    background: tab === "public" ? "#00f5ff0d" : "transparent",
                    color: tab === "public" ? "#00f5ff" : "#4a3060",
                    border: "none",
                    borderBottom: `2px solid ${tab === "public" ? "#00f5ff" : "transparent"}`,
                    transition: "all 0.15s",
                }}>
                    🌐 CREW
                    {unreadPub > 0 && tab !== "public" && (
                        <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: 8,
                            minWidth: 18,
                            height: 18,
                            padding: "0 6px",
                            borderRadius: 999,
                            background: "#ff2a2a",
                            color: "#07000f",
                            fontSize: 8,
                            border: "1px solid #ff2a2a66",
                        }}>
                            {Math.min(99, unreadPub)}
                        </span>
                    )}
                    {!pubOpen && <span style={{ fontSize: 7, color: "#2a1a3a", marginLeft: 6 }}>[CLOSED]</span>}
                </button>
                {isGnosia && (
                    <button onClick={() => setTab("gnosia")} style={{
                        flex: 1, padding: "13px 0", fontSize: 9,
                        fontFamily: "Press Start 2P", cursor: "pointer",
                        background: tab === "gnosia" ? "#9b30ff0d" : "transparent",
                        color: tab === "gnosia" ? "#9b30ff" : "#4a3060",
                        border: "none",
                        borderBottom: `2px solid ${tab === "gnosia" ? "#9b30ff" : "transparent"}`,
                        transition: "all 0.15s",
                    }}>
                        👁 GNOSIA
                        {unreadGn > 0 && tab !== "gnosia" && (
                            <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: 8,
                                minWidth: 18,
                                height: 18,
                                padding: "0 6px",
                                borderRadius: 999,
                                background: "#ff2a2a",
                                color: "#07000f",
                                fontSize: 8,
                                border: "1px solid #ff2a2a66",
                            }}>
                                {Math.min(99, unreadGn)}
                            </span>
                        )}
                        {!gnOpen && <span style={{ fontSize: 7, color: "#2a1a3a", marginLeft: 6 }}>[CLOSED]</span>}
                    </button>
                )}
            </div>

            {/* Channel indicator */}
            <div style={{
                padding: "8px 16px", flexShrink: 0, display: "flex", alignItems: "center", gap: 10,
                background: tab === "gnosia" ? "#13002533" : "#07000f44",
                borderBottom: "1px solid #1a0a2a",
            }}>
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
                    <MsgBubble key={msg.id} msg={msg} isMe={msg.senderId === socket.id} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
                flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: 12,
                background: "#07000f"
            }}>
                {error && (
                    <div style={{ fontSize: 8, color: "#ff2a2a", marginBottom: 8 }}>⚠ {error}</div>
                )}
                {!isAlive ? (
                    <div style={{ textAlign: "center", fontSize: 9, color: "#2a1a3a", padding: "8px 0" }}>
                        SPECTATOR — READ ONLY
                    </div>
                ) : !canSend ? (
                    <div style={{ textAlign: "center", fontSize: 9, color: "#2a1a3a", padding: "8px 0" }}>
                        {tab === "public" && phase === "NIGHT" ? "SILENCE DURING NIGHT" : "CHANNEL CLOSED"}
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 10 }}>
                        <input ref={inputRef} className="input"
                            style={{ fontSize: 10, borderColor: tab === "gnosia" ? "#9b30ff44" : undefined }}
                            placeholder={tab === "gnosia" ? "gnosia only..." : "transmit message..."}
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
        </div>
    );
}