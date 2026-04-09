// StartReveal.jsx
import { useEffect } from "react";
const ROLE_COLORS = {
    gnosia: "#9b30ff", engineer: "#00f5ff", doctor: "#b0ffb8",
    illusionist: "#9b30ff", guardian: "#ffd700", human: "#c8b8ff", lawyer: "#ff8833", traitor: "#ff4040",
};

export default function StartReveal({ players, gnosiaCount, myId, myRole, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(), 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const roleColor = ROLE_COLORS[myRole] || "#00f5ff";

    return (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl mx-4">
                <div className="text-center mb-4">
                    <div className="glow-cyan text-3xl mb-3">MISSION START</div>
                    <div className="text-2xl text-white leading-snug">
                        There are <span className="glow-danger">{gnosiaCount}</span> Gnosia Among Us
                    </div>
                </div>

                <div className="panel-glow p-6 bg-black/60">
                    <div className="flex flex-wrap justify-center gap-6">
                        {players.map((p) => {
                            const isMe = p.id === myId;
                            const borderColor = isMe ? roleColor : "#00f5ff55";
                            const boxShadow = isMe ? `0 0 12px ${roleColor}88` : "none";
                            return (
                                <div key={p.id} className="flex flex-col items-center w-[110px]">
                                    <div className="w-20 h-20 rounded-full overflow-hidden border-2"
                                        style={{ borderColor, boxShadow }}>
                                        <img
                                            src={`/profiles/${p.profileId}.jpg`}
                                            alt={p.username}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = "none";
                                                e.target.nextSibling.style.display = "flex";
                                            }}
                                        />
                                        <div className="hidden w-full h-full items-center justify-center text-xl font-bold"
                                            style={{ color: borderColor }}>
                                            {p.username[0].toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="text-sm mt-3 text-center truncate w-full"
                                        style={{ color: isMe ? roleColor : "white" }}>
                                        {p.username}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-center mt-6 text-[#4a3060] text-sm animate-pulse">
                    The mission begins...
                </div>
            </div>
        </div>
    );
}
