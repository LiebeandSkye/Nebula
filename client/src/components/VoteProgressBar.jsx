export default function VoteProgressBar({ votesCast, totalAlive }) {
    const pct = totalAlive > 0 ? (votesCast / totalAlive) * 100 : 0;
    return (
        <div className="cp-vote-progress" style={{ padding: "10px 16px", flexShrink: 0, borderBottom: "1px solid #1a0a2a", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 8, color: "#4a3060", flexShrink: 0 }}>VOTES</span>
            <div className="cp-vote-progress__track" style={{ flex: 1, height: 4, background: "#1a0015", borderRadius: 2 }}>
                <div className="cp-vote-progress__fill" style={{ height: "100%", background: "#ffd700", boxShadow: "0 0 8px #ffd700", borderRadius: 2, transition: "width 0.5s", width: `${pct}%` }} />
            </div>
            <span style={{ fontSize: 9, color: "#ff8c1a", flexShrink: 0 }}>{votesCast}/{totalAlive}</span>
        </div>
    );
}
