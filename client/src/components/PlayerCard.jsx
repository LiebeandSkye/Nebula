/**
 * PlayerCard.jsx — Redesigned with profile images, larger, responsive.
 */
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

export default function PlayerCard({
    player, isMe, isSelected, canSelect, onSelect,
    phase, myRole, gnosiaAllies = [],
    voteBreakdown = {}, allPlayers = [], compact = false,
}) {
    const color = AVATAR_COLORS[player.profileId] || "#c8b8ff";
    const isAlly = gnosiaAllies.includes(player.id);
    const isDead = !player.alive;

    // Get voters for this player
    const voters = Object.entries(voteBreakdown || {})
        .filter(([_, targetId]) => targetId === player.id)
        .map(([voterId]) => allPlayers.find(p => p.id === voterId))
        .filter(Boolean);

    let borderColor = isDead ? "#1a0a2a" : isSelected ? "#00f5ff" : isAlly ? "#9b30ff" : color + "44";
    let bgColor = isDead ? "#07000f" : isSelected ? "#00f5ff0d" : isAlly ? "#13002533" : "#0d0020";
    let shadow = isSelected ? "0 0 20px #00f5ff66, 0 0 40px #00f5ff22"
        : isAlly ? "0 0 12px #9b30ff44"
            : canSelect && !isDead ? `0 0 10px ${color}22`
                : "none";

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: "100%" }}>
            <button
                onClick={() => canSelect && !isDead && onSelect(player.id)}
                disabled={!canSelect || isDead}
                style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: compact ? 6 : 12, padding: compact ? "8px 6px" : "16px 12px",
                    border: `1px solid ${borderColor}`,
                    background: isDead ? "#07000f" : `linear-gradient(135deg, ${bgColor}ee, ${bgColor}aa)`,
                    backdropFilter: "blur(12px)",
                    borderRadius: 16,
                    boxShadow: shadow !== "none" ? shadow : `0 8px 32px 0 rgba(0, 0, 0, 0.4)`,
                    cursor: !canSelect || isDead ? "default" : "pointer",
                    opacity: isDead ? 0.4 : 1,
                    transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                    position: "relative",
                    fontFamily: "Press Start 2P",
                    width: "100%",
                    transform: isSelected ? "translateY(-4px)" : "translateY(0)",
                }}>

                {/* Top Center Badges */}
                <div style={{
                    position: "absolute", top: compact ? -8 : -10, left: "50%", transform: "translateX(-50%)", display: "flex",
                    flexDirection: "row", gap: 4, alignItems: "center",
                    zIndex: 10,
                }}>
                    {player.isHost && <span className="badge" style={{ color: "#ffd700", fontSize: compact ? 5 : 6 }}>HOST</span>}
                    {isAlly && <span className="badge" style={{ color: "#9b30ff", fontSize: compact ? 5 : 6 }}>ALLY</span>}
                    {player.inColdSleep && <span className="badge" style={{ color: "#4a3060", fontSize: compact ? 5 : 6 }}>COLD</span>}
                </div>

                {/* Bottom YOU Badge */}
                {isMe && (
                    <div style={{
                        position: "absolute", bottom: compact ? -8 : -10, left: "50%", transform: "translateX(-50%)",
                        zIndex: 10,
                    }}>
                        <span className="badge" style={{ color: "#00f5ff", fontSize: compact ? 5 : 6 }}>YOU</span>
                    </div>
                )}

                {/* Avatar */}
                <div style={{
                    width: compact ? 48 : 76, 
                    height: compact ? 48 : 76,
                    border: `2px solid ${isDead ? "#1a0a2a" : color + "bb"}`,
                    background: color + "15",
                    borderRadius: "50%",
                    boxShadow: isDead ? "none" : `0 4px 14px ${color}44`,
                    overflow: "hidden", position: "relative",
                    flexShrink: 0,
                    transition: "all 0.3s",
                }}>
                    {isDead ? (
                        <div style={{
                            width: "100%", height: "100%", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            fontSize: 28, color: "#2a1a3a"
                        }}>✕</div>
                    ) : (
                        <>
                            <img src={`${SERVER}/profiles/${player.profileId}.jpg`}
                                alt={player.username}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={e => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                }} />
                            <div style={{
                                display: "none", position: "absolute", inset: 0,
                                alignItems: "center", justifyContent: "center",
                                color, fontSize: 26, fontWeight: "bold",
                            }}>
                                {player.username[0].toUpperCase()}
                            </div>
                        </>
                    )}
                    {/* Selection ring */}
                    {isSelected && (
                        <div style={{
                            position: "absolute", inset: -3,
                            border: "2px solid #00f5ff",
                            borderRadius: "50%",
                            animation: "pulseGlow 1.5s ease-in-out infinite",
                            pointerEvents: "none",
                        }} />
                    )}
                </div>

                {/* Name */}
                <div style={{ textAlign: "center", width: "100%" }}>
                    <div style={{
                        fontSize: compact ? 7 : 9, color: isDead ? "#2a1a3a" : color,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: 2,
                    }}>
                        {player.username}
                    </div>
                    {!compact && (
                        <div style={{ fontSize: 7, color: "#4a3060" }}>
                            {player.profileName || ""}
                        </div>
                    )}
                </div>

                {/* Select CTA */}
                {canSelect && !isDead && !isMe && (
                    <div style={{
                        width: "100%", padding: compact ? "4px 0" : "8px 0", textAlign: "center",
                        fontSize: compact ? 6 : 8, letterSpacing: "0.1em",
                        border: `1px solid ${isSelected ? "#00f5ff" : color + "44"}`,
                        borderRadius: 6,
                        color: isSelected ? "#07000f" : color,
                        background: isSelected ? "#00f5ff" : "rgba(0,0,0,0.4)",
                        marginTop: 2,
                        transition: "all 0.2s",
                        fontWeight: isSelected ? "bold" : "normal",
                        textShadow: isSelected ? "none" : `0 0 10px ${color}88`,
                    }}>
                        {isSelected ? "✓ SELECTED" :
                            phase === "VOTING" ? "VOTE" : "SELECT"}
                    </div>
                )}
            </button>

            {/* Vote indicators */}
            {voters.length > 0 && (
                <div style={{
                    display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap",
                    width: "100%", paddingTop: 4,
                }}>
                    {voters.map(voter => {
                        const voterColor = AVATAR_COLORS[voter.profileId] || "#c8b8ff";
                        return (
                            <div key={voter.id} style={{
                                width: 26, height: 26,
                                border: `1px solid ${voterColor}88`,
                                background: voterColor + "15",
                                borderRadius: "50%",
                                overflow: "hidden",
                                position: "relative",
                                flexShrink: 0,
                            }} title={voter.username}>
                                <img src={`${SERVER}/profiles/${voter.profileId}.jpg`}
                                    alt={voter.username}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={e => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display = "flex";
                                    }} />
                                <div style={{
                                    display: "none", position: "absolute", inset: 0,
                                    alignItems: "center", justifyContent: "center",
                                    color: voterColor, fontSize: 12, fontWeight: "bold",
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