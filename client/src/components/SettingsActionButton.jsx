export default function SettingsActionButton({
    label,
    status,
    active = false,
    disabled = false,
    onClick,
    accent = "#ff8c1a",
    children,
}) {
    return (
        <button
            className="cp-settings-action-btn"
            onClick={onClick}
            disabled={disabled}
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                background: active ? "rgba(255, 140, 26, 0.16)" : "rgba(10, 3, 0, 0.8)",
                border: `1px solid ${active ? accent : "rgba(255, 140, 26, 0.28)"}`,
                boxShadow: active ? `0 0 18px ${accent}33` : "none",
                color: active ? "#ffd7b0" : "#ffb36b",
                fontFamily: "Press Start 2P",
                fontSize: 8,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1,
                textAlign: "left",
            }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {children}
                <span>{label}</span>
            </span>
            <span style={{
                flexShrink: 0,
                padding: "4px 8px",
                border: `1px solid ${active ? "#ffd18a66" : "#ff8c1a33"}`,
                background: active ? "rgba(255, 209, 138, 0.12)" : "transparent",
                color: active ? "#ffd18a" : "#ff8c1a",
                fontSize: 7,
                letterSpacing: "0.08em",
            }}>
                {status}
            </span>
        </button>
    );
}
