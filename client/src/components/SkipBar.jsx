export default function SkipBar({ skipVotes, myId, onSkip, actionError, actionMsg }) {
    const iVoted = skipVotes.some(v => v.id === myId);
    return (
        <div className="cp-skip-bar" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {actionError && <div className="cp-hud-error" style={{ fontSize: 8, color: "#ff2a2a", width: "100%" }}>⚠ {actionError}</div>}
            {actionMsg  && <div className="cp-hud-message" style={{ fontSize: 8, color: "#00f5ff", width: "100%" }}>{actionMsg}</div>}
            <button className="btn btn-secondary cp-skip-button" style={{ fontSize: 8, padding: "8px 12px", flexShrink: 0 }} onClick={() => { if (!iVoted) onSkip(); }} disabled={iVoted}>
                {iVoted ? "✓ SKIP REQUESTED" : "⏭ SKIP PHASE"}
            </button>
            <div className="cp-skip-voters" style={{ display: "flex", alignItems: "center" }}>
                {skipVotes.map((voter, i) => (
                    <img key={voter.id} src={`/profiles/${voter.profileId}.jpg`} alt={voter.username} title={`${voter.username} wants to skip`}
                        style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid #07000f", objectFit: "cover", boxShadow: "0 0 8px #00f5ff44", marginLeft: i > 0 ? -8 : 0, zIndex: skipVotes.length - i, position: "relative", animation: "fadeInUp 0.3s ease forwards" }}
                        onError={e => { e.target.style.display = "none"; }} />
                ))}
            </div>
        </div>
    );
}
