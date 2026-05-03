import { useState, useEffect } from "react";

export default function PhaseTimer({ endsAt, color }) {
    const [rem, setRem] = useState(0);
    useEffect(() => {
        if (!endsAt) return;
        const tick = () => setRem(Math.max(0, endsAt - Date.now()));
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [endsAt]);

    const secs = Math.ceil(rem / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const urgent = secs <= 30 && secs > 0;

    return (
        <div className="cp-phase-timer" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 7, color: "#8a7aa0", letterSpacing: "0.2em", marginBottom: 4 }}>TIME REMAINING</div>
            <div style={{
                fontSize: 32, color: urgent ? "#ff2a2a" : color,
                textShadow: urgent ? "0 0 16px #ff2a2a" : "0 0 16px " + color + "aa",
                animation: urgent ? "urgentPulse 0.6s infinite" : "none",
                fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em",
            }}>
                {String(mins).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </div>
        </div>
    );
}
