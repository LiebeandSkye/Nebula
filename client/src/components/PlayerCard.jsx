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
    voteBreakdown = {}, allPlayers = [],
}) {
    const color = AVATAR_COLORS[player.profileId] || "#c8b8ff";
    const isAlly = gnosiaAllies.includes(player.id);
    const isDead = !player.alive;

    // Get voters for this player
    const voters = Object.entries(voteBreakdown)
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
                    gap: 10, padding: 14,
                    border: `2px solid ${borderColor}`,
                    background: bgColor,
                    boxShadow: shadow,
                    cursor: !canSelect || isDead ? "default" : "pointer",
                    opacity: isDead ? 0.35 : 1,
                    transition: "all 0.15s",
                    position: "relative",
                    fontFamily: "Press Start 2P",
                    width: "100%",
                }}>

                {/* Badges */}
                <div style={{
                    position: "absolute", top: 6, right: 6, display: "flex",
                    flexDirection: "column", gap: 3, alignItems: "flex-end",
                }}>
                    {isMe && <span className="badge" style={{ color: "#00f5ff" }}>YOU</span>}
                    {player.isHost && <span className="badge" style={{ color: "#ffd700" }}>HOST</span>}
                    {isAlly && <span className="badge" style={{ color: "#9b30ff" }}>ALLY</span>}
                    {player.inColdSleep && <span className="badge" style={{ color: "#4a3060" }}>COLD</span>}
                </div>

                {/* Avatar */}
                <div style={{
                    width: 72, height: 72,
                    border: `2px solid ${isDead ? "#1a0a2a" : color + "88"}`,
                    background: color + "15",
                    overflow: "hidden", position: "relative",
                    flexShrink: 0,
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
                            animation: "pulseGlow 1s ease-in-out infinite",
                            pointerEvents: "none",
                        }} />
                    )}
                </div>

                {/* Name */}
                <div style={{ textAlign: "center", width: "100%" }}>
                    <div style={{
                        fontSize: 9, color: isDead ? "#2a1a3a" : color,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: 4,
                    }}>
                        {player.username}
                    </div>
                    <div style={{ fontSize: 7, color: "#4a3060" }}>
                        {player.profileName || ""}
                    </div>
                </div>

                {/* Select CTA */}
                {canSelect && !isDead && !isMe && (
                    <div style={{
                        width: "100%", padding: "7px 0", textAlign: "center",
                        fontSize: 8,
                        border: `1px solid ${isSelected ? "#00f5ff" : color + "33"}`,
                        color: isSelected ? "#00f5ff" : color,
                        background: isSelected ? "#00f5ff11" : "transparent",
                        marginTop: 2,
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
                                width: 28, height: 28,
                                border: `1px solid ${voterColor}66`,
                                background: voterColor + "15",
                                borderRadius: 2,
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