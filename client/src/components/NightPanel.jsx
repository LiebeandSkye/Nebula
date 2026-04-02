/**
 * NightPanel.jsx — Redesigned night action panel with profile images.
 */
const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const AVATAR_COLORS = {
    setsu: "#a8d8ff", sq: "#00f5ff", raqio: "#ff9ef5", comet: "#ffe066",
    stella: "#b0ffb8", kornaros: "#ffb347", yuriko: "#ffaec0", jonas: "#c8b8ff",
    nyx: "#ff6b6b", parallax: "#66e0ff", voss: "#ffd700", echo: "#d0ffe8",
};

const ROLE_META = {
    gnosia: {
        icon: "👁", color: "#9b30ff", heading: "COORDINATE THE KILL",
        instruction: "Vote for a kill target. Majority decides. Ties = no kill.",
        actionLabel: "KILL", filterFn: (p, myId, allies = []) => p.alive && p.id !== myId && !allies.some(a => a.id === p.id)
    },
    engineer: {
        icon: "⚡", color: "#00f5ff", heading: "RUN BIOSCAN",
        instruction: "Select one crew member to scan. They'll get a warning if Gnosia.",
        actionLabel: "SCAN", filterFn: (p, myId) => p.alive && p.id !== myId
    },
    doctor: {
        icon: "☤", color: "#b0ffb8", heading: "INSPECT COLD SLEEP",
        instruction: "Select a cold-slept player to reveal their true role.",
        actionLabel: "INSPECT", filterFn: (p) => p.inColdSleep
    },
    guardian: {
        icon: "🛡", color: "#ffd700", heading: "ASSIGN PROTECTION",
        instruction: "Protect one crew member. If Gnosia targets them, kill is blocked.",
        actionLabel: "PROTECT", filterFn: (p, myId) => p.alive && p.id !== myId
    },
    human: {
        icon: "◈", color: "#4a3060", heading: "WAIT FOR DAWN",
        instruction: "You have no night ability. Hope the Gnosia don't choose you.",
        actionLabel: null, filterFn: () => false
    },
};

function TargetRow({ player, isSelected, label, color, onSelect }) {
    const ac = AVATAR_COLORS[player.profileId] || "#c8b8ff";
    return (
        <button onClick={() => onSelect(player.id)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", width: "100%",
            border: `1px solid ${isSelected ? color : "#1a0a2a"}`,
            background: isSelected ? color + "11" : "transparent",
            boxShadow: isSelected ? `0 0 16px ${color}44` : "none",
            cursor: "pointer", transition: "all 0.15s", fontFamily: "Press Start 2P",
            textAlign: "left",
        }}>
            <div style={{
                width: 44, height: 44, flexShrink: 0,
                border: `2px solid ${isSelected ? color : ac + "55"}`,
                background: ac + "15", overflow: "hidden", position: "relative",
            }}>
                <img src={`${SERVER}/profiles/${player.profileId}.jpg`} alt={player.username}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                <div style={{
                    display: "none", position: "absolute", inset: 0,
                    alignItems: "center", justifyContent: "center",
                    color: ac, fontSize: 16, fontWeight: "bold"
                }}>
                    {player.username[0].toUpperCase()}
                </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 10, color: isSelected ? color : "#e0d4ff",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                }}>
                    {player.username}
                </div>
                <div style={{ fontSize: 8, color: "#4a3060", marginTop: 4 }}>
                    {player.profileName || ""}
                </div>
            </div>
            {label && (
                <span style={{
                    fontSize: 8, border: `1px solid ${isSelected ? color : "#2a1a4a"}`,
                    color: isSelected ? color : "#4a3060", padding: "4px 10px", flexShrink: 0
                }}>
                    {isSelected ? "✓" : label}
                </span>
            )}
        </button>
    );
}

export default function NightPanel({
    myRole, players, myId, gnosiaAllies = [],
    selectedTarget, onSelect, submitted,
    actionMsg, actionError, onConfirm,
    gnosiaVoteProgress = { votesIn: 0, totalGnosia: 0 },
    scanResult, inspectResult, guardianResult,
}) {
    const meta = ROLE_META[myRole] || ROLE_META.human;
    const color = meta.color;
    const targets = players.filter(p => meta.filterFn(p, myId, gnosiaAllies));

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

            {/* Role header */}
            <div style={{
                padding: "20px 20px 16px", flexShrink: 0,
                borderBottom: "1px solid #1a0a2a",
                background: color + "08",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                    <span style={{ fontSize: 28, filter: `drop-shadow(0 0 10px ${color})` }}>
                        {meta.icon}
                    </span>
                    <div>
                        <div style={{ fontSize: 8, color: "#4a3060", marginBottom: 4 }}>NIGHT ACTION</div>
                        <div style={{ fontSize: 11, color }}>{meta.heading}</div>
                    </div>
                </div>
                <p style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8 }}>{meta.instruction}</p>
            </div>

            {/* Gnosia allies */}
            {myRole === "gnosia" && gnosiaAllies.length > 0 && (
                <div style={{
                    padding: "10px 16px", flexShrink: 0,
                    borderBottom: "1px solid #1a0a2a", background: "#13002533",
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap"
                }}>
                    <span style={{ fontSize: 8, color: "#9b30ff" }}>ALLIES:</span>
                    {gnosiaAllies.map(a => (
                        <span key={a.id} style={{
                            fontSize: 8, color: "#c8b8ff",
                            border: "1px solid #9b30ff33", padding: "3px 10px"
                        }}>
                            {a.username}
                        </span>
                    ))}
                </div>
            )}

            {/* Gnosia vote progress */}
            {myRole === "gnosia" && gnosiaVoteProgress.totalGnosia > 0 && (
                <div style={{
                    padding: "10px 16px", flexShrink: 0,
                    borderBottom: "1px solid #1a0a2a",
                    display: "flex", alignItems: "center", gap: 12
                }}>
                    <div style={{ flex: 1, height: 4, background: "#1a0030", borderRadius: 2 }}>
                        <div style={{
                            height: "100%", borderRadius: 2, background: "#9b30ff",
                            boxShadow: "0 0 8px #9b30ff",
                            width: `${(gnosiaVoteProgress.votesIn / gnosiaVoteProgress.totalGnosia) * 100}%`,
                            transition: "width 0.4s",
                        }} />
                    </div>
                    <span style={{ fontSize: 8, color: "#9b30ff", flexShrink: 0 }}>
                        {gnosiaVoteProgress.votesIn}/{gnosiaVoteProgress.totalGnosia}
                    </span>
                </div>
            )}

            {/* Private results */}
            {scanResult && (
                <div style={{
                    margin: "12px 16px 0", padding: "14px 16px",
                    border: `1px solid ${scanResult.isGnosia ? "#ff2a2a44" : "#00f5ff33"}`,
                    background: scanResult.isGnosia ? "#1a000833" : "#00001533",
                    flexShrink: 0,
                }}>
                    <div style={{ fontSize: 8, color: "#4a3060", marginBottom: 6 }}>SCAN RESULT</div>
                    <div style={{ fontSize: 11, color: scanResult.isGnosia ? "#ff2a2a" : "#00f5ff" }}>
                        {scanResult.targetUsername}
                    </div>
                    <div style={{
                        fontSize: 9, marginTop: 4,
                        color: scanResult.isGnosia ? "#ff2a2a" : "#00f5ff"
                    }}>
                        {scanResult.isGnosia ? "⚠  CONFIRMED GNOSIA" : "✓  NOT GNOSIA"}
                    </div>
                </div>
            )}
            {inspectResult && !inspectResult.error && (
                <div style={{
                    margin: "12px 16px 0", padding: "14px 16px",
                    border: "1px solid #b0ffb833", background: "#00100533", flexShrink: 0,
                }}>
                    <div style={{ fontSize: 8, color: "#4a3060", marginBottom: 6 }}>INSPECTION RESULT</div>
                    <div style={{ fontSize: 11, color: "#b0ffb8" }}>{inspectResult.targetUsername}</div>
                    <div style={{ fontSize: 9, color: "#b0ffb8", marginTop: 4 }}>
                        ROLE: {inspectResult.role?.toUpperCase()}
                    </div>
                </div>
            )}
            {guardianResult && (
                <div style={{
                    margin: "12px 16px 0", padding: "14px 16px",
                    border: `1px solid ${guardianResult.worked ? "#ffd70044" : "#6a508044"}`,
                    background: guardianResult.worked ? "#3a2a0033" : "#1a0a2a33",
                    flexShrink: 0,
                }}>
                    <div style={{ fontSize: 8, color: "#4a3060", marginBottom: 6 }}>PROTECTION OUTCOME</div>
                    <div style={{ fontSize: 11, color: guardianResult.worked ? "#ffd700" : "#b0a0c0" }}>
                        {guardianResult.targetUsername}
                    </div>
                    <div style={{
                        fontSize: 9, marginTop: 4,
                        color: guardianResult.worked ? "#ffd700" : "#b0a0c0"
                    }}>
                        {guardianResult.worked ? "✓  PROTECTED FROM KILL" : "—  NO KILL ATTEMPT"}
                    </div>
                </div>
            )}

            {/* Target list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
                {myRole === "human" ? (
                    <div style={{
                        height: "100%", display: "flex", alignItems: "center",
                        justifyContent: "center", flexDirection: "column", gap: 16
                    }}>
                        <div style={{ fontSize: 48, opacity: 0.2 }}>◈</div>
                        <p style={{ fontSize: 9, color: "#2a1a3a" }}>Await morning.</p>
                    </div>
                ) : submitted ? (
                    <div style={{
                        height: "100%", display: "flex", alignItems: "center",
                        justifyContent: "center", flexDirection: "column", gap: 14
                    }}>
                        <div style={{ fontSize: 36, color, filter: `drop-shadow(0 0 12px ${color})` }}>✓</div>
                        <div style={{ fontSize: 10, color }}>ACTION SUBMITTED</div>
                        <div style={{ fontSize: 9, color: "#4a3060" }}>Awaiting others...</div>
                        {actionMsg && <div style={{ fontSize: 9, color }}>{actionMsg}</div>}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{
                            fontSize: 8, color: "#4a3060", padding: "0 2px 6px",
                            letterSpacing: "0.1em"
                        }}>
                            SELECT TARGET
                        </div>
                        {targets.length === 0 ? (
                            <p style={{ fontSize: 9, color: "#2a1a3a", textAlign: "center", padding: 16 }}>
                                {myRole === "doctor" ? "No one in cold sleep yet." : "No valid targets."}
                            </p>
                        ) : targets.map(p => (
                            <TargetRow key={p.id} player={p}
                                isSelected={selectedTarget === p.id}
                                label={meta.actionLabel} color={color}
                                onSelect={id => onSelect(selectedTarget === id ? null : id)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Confirm bar */}
            {myRole !== "human" && !submitted && (
                <div style={{
                    flexShrink: 0, borderTop: "1px solid #1a0a2a", padding: "14px 16px",
                    background: "#07000f", display: "flex", flexDirection: "column", gap: 10
                }}>
                    {actionError && (
                        <div style={{ fontSize: 8, color: "#ff2a2a", marginBottom: 8 }}>⚠ {actionError}</div>
                    )}
                    <button
                        className={`btn ${myRole === "gnosia" ? "btn-gnosia" : myRole === "doctor" ? "" : myRole === "guardian" ? "btn-gold" : ""}`}
                        style={{
                            width: "100%", fontSize: 10, borderColor: selectedTarget ? color : undefined,
                            color: selectedTarget ? color : undefined
                        }}
                        onClick={() => onConfirm()} disabled={!selectedTarget}>
                        {!selectedTarget ? "SELECT A TARGET"
                            : `${meta.actionLabel}: ${players.find(p => p.id === selectedTarget)?.username || "..."}`}
                    </button>
                    {myRole === "gnosia" && (
                        <button
                            className="btn btn-secondary"
                            style={{ width: "100%", fontSize: 9 }}
                            onClick={() => onConfirm("skip")}
                        >
                            SKIP KILL
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}