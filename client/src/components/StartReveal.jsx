// StartReveal.jsx
import { useEffect } from "react";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export default function StartReveal({ players, gnosiaCount, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(), 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

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
                        {players.map((p) => (
                            <div key={p.id} className="flex flex-col items-center w-[110px]">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#00f5ff55]">
                                    <img
                                        src={`${SERVER}/profiles/${p.profileId}.jpg`}
                                        alt={p.username}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display = "flex";
                                        }}
                                    />
                                    <div className="hidden w-full h-full items-center justify-center text-[#00f5ff] text-xl font-bold">
                                        {p.username[0].toUpperCase()}
                                    </div>
                                </div>
                                <div className="text-sm mt-3 text-white text-center truncate w-full">{p.username}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center mt-6 text-[#4a3060] text-sm animate-pulse">
                    The mission begins...
                </div>
            </div>
        </div>
    );
}