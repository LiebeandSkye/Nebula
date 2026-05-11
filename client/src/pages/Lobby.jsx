/**
 * Lobby.jsx — Create/Join room + waiting room. Fully redesigned.
 */
import { useState, useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { clearPlaySession, getOrCreateSessionToken, savePlaySession } from "../lib/sessionPersistence.js";
import { PROFILES, AVATAR_COLORS } from "../lib/profiles.js";
import { getStoredTheme, applyTheme } from "../lib/themeStore.js";
import {
    consumeOAuthRedirect,
    fetchCurrentUser,
    getStoredAuthSession,
    getSupabaseConfigStatus,
    signInWithEmail,
    signOutAuth,
    signUpWithEmail,
    startOAuthSignIn,
} from "../lib/supabaseAuth.js";
import EmoteWheel, { getRandomEmotes } from "../components/EmoteWheel.jsx";
import "../lobby-nebula.css";
import {
    Bell,
    ChevronRight,
    Home,
    KeyRound,
    Lock,
    Globe,
    Mail,
    Menu,
    Music,
    Package,
    Palette,
    Play,
    Plus,
    Rocket,
    Settings2,
    ShoppingBag,
    UserPlus,
    User,
    Users,
    Volume2,
} from "lucide-react";
import { FaDiscord, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { LOBBY_CAROUSEL_SLIDES } from "../lib/lobbyCarouselSlides.js";

/** Public asset (see `client/public/Logo.png`). */
const LOBBY_LOGO_SRC = "/Logo.png";

const CAROUSEL_MS = 3000;

function NebulaCarousel({ slides }) {
    const list = slides?.length ? slides : [{ src: "", alt: "" }];
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (list.length <= 1) return;
        const t = setInterval(() => {
            setIdx((i) => (i + 1) % list.length);
        }, CAROUSEL_MS);
        return () => clearInterval(t);
    }, [list.length]);

    return (
        <div className="nebula-carousel-card" aria-label="Featured slides">
            <div className="nebula-carousel-viewport">
                {list.map((s, i) => (
                    <div
                        key={i}
                        className={
                            "nebula-carousel-slide" +
                            (i === idx ? " nebula-carousel-slide--visible" : "") +
                            (!s.src ? " nebula-carousel-slide--placeholder" : "")
                        }
                        style={s.src ? { backgroundImage: `url(${s.src})` } : undefined}
                        role="img"
                        aria-label={s.alt || `Slide ${i + 1}`}
                    />
                ))}
            </div>
            {list.length > 1 && (
                <div className="nebula-carousel-dots">
                    {list.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={"nebula-carousel-dot" + (i === idx ? " nebula-carousel-dot--on" : "")}
                            aria-label={`Go to slide ${i + 1}`}
                            onClick={() => setIdx(i)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function NebulaMobileHeader({ variant, roomId, connected }) {
    const isWaiting = variant === "waiting";
    return (
        <div className="nebula-mobile-header">
            <div className="nebula-mobile-header-left">
                <img src={LOBBY_LOGO_SRC} alt="" className="nebula-mobile-header-logo" width={44} height={44} />
                <div className="nebula-mobile-header-text">
                    <div className="nebula-mobile-header-title flex flex-col">PROJECT <span>NEBULA</span></div>
                    {isWaiting ? (
                        <div className="nebula-mobile-header-code">{roomId}</div>
                    ) : (
                        <div className="nebula-mobile-header-sub">DEEP SPACE SOCIAL DEDUCTION</div>
                    )}
                </div>
            </div>
            <div className="nebula-mobile-header-actions">
                {!isWaiting && (
                    <div className={connected ? "nebula-status-pill" : "nebula-status-pill nebula-status-pill--off"} style={{ margin: 0, padding: "6px 10px", fontSize: 8 }}>
                        <span className="nebula-status-dot" aria-hidden />
                        {connected ? "ON" : "…"}
                    </div>
                )}
                <button type="button" className="nebula-icon-btn" aria-label="Notifications"><Bell size={18} strokeWidth={2} /></button>
                <button type="button" className="nebula-icon-btn" aria-label="Settings"><Settings2 size={18} strokeWidth={2} /></button>
            </div>
        </div>
    );
}

function NebulaMobileDock({ activeKey, onNav }) {
    const items = [
        { key: "home", label: "HOME", Icon: Home },
        { key: "rooms", label: "ROOMS", Icon: Users },
        { key: "profile", label: "PROFILE", Icon: User },
        { key: "store", label: "STORE", Icon: ShoppingBag },
        { key: "inventory", label: "MORE", Icon: Menu },
    ];
    return (
        <nav className="nebula-mobile-dock" aria-label="Primary">
            {items.map((entry) => {
                const DockIcon = entry.Icon;
                return (
                    <button
                        key={entry.key}
                        type="button"
                        className={activeKey === entry.key ? "nebula-mobile-dock--active" : ""}
                        onClick={() => onNav?.(entry.key)}
                    >
                        <DockIcon size={22} strokeWidth={2} aria-hidden />
                        {entry.label}
                    </button>
                );
            })}
        </nav>
    );
}

function NebulaLobbySidebar({ activeKey, onNav }) {
    return (
        <aside className="nebula-sidebar">
            <div className="nebula-logo-wrap">
                <img src={LOBBY_LOGO_SRC} alt="Project Nebula" className="nebula-logo-img"  />
            </div>
            <nav className="nebula-nav" aria-label="Lobby navigation">
                {[
                    { key: "home", label: "HOME", Icon: Home },
                    { key: "rooms", label: "ROOMS", Icon: Users },
                    { key: "profile", label: "PROFILE", Icon: User },
                    { key: "inventory", label: "INVENTORY", Icon: Package },
                    { key: "store", label: "STORE", Icon: ShoppingBag },
                ].map((entry) => {
                    const NavIconEl = entry.Icon;
                    return (
                    <button
                        key={entry.key}
                        type="button"
                        className={
                            "nebula-nav-item" + (activeKey === entry.key ? " nebula-nav-item--active" : "")
                        }
                        onClick={() => onNav?.(entry.key)}
                    >
                        <NavIconEl size={18} strokeWidth={2} aria-hidden />
                        {entry.label}
                    </button>
                    );
                })}
            </nav>
            <NebulaCarousel slides={LOBBY_CAROUSEL_SLIDES} />
            <div className="nebula-social">
                <a href="https://discord.com" target="_blank" rel="noreferrer noopener" aria-label="Discord">
                    <FaDiscord size={16} />
                </a>
                <a href="https://x.com" target="_blank" rel="noreferrer noopener" aria-label="X">
                    <FaXTwitter size={15} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer noopener" aria-label="YouTube">
                    <FaYoutube size={16} />
                </a>
            </div>
        </aside>
    );
}

const PROTECTED_NAV = new Set(["profile", "store", "inventory"]);

function AuthModal({ open, reason, session, onClose, onAuthed, onSignOut }) {
    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const { configured } = getSupabaseConfigStatus();

    if (!open) return null;

    const userEmail = session?.user?.email || session?.user?.user_metadata?.email;
    const targetLabel = reason === "store"
        ? "Store"
        : reason === "inventory"
            ? "Inventory"
            : "Profile";

    async function submitAuth(event) {
        event.preventDefault();
        if (!configured) {
            setMessage("Supabase is not configured for this build.");
            return;
        }
        if (!email.trim() || !password) {
            setMessage("Enter your email and password.");
            return;
        }
        setBusy(true);
        setMessage("");
        try {
            const next = mode === "signup"
                ? await signUpWithEmail(email.trim(), password)
                : await signInWithEmail(email.trim(), password);
            if (next?.needsConfirmation) {
                setMessage("Check your email to confirm your account, then return here to sign in.");
                return;
            }
            await fetchCurrentUser(next);
            onAuthed?.(next);
        } catch (err) {
            setMessage(err?.message || "Authentication failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="nebula-auth-backdrop" role="dialog" aria-modal="true" aria-label="Authentication">
            <div className="nebula-auth-card">
                <button type="button" className="nebula-auth-close" onClick={onClose} aria-label="Close">x</button>
                <div className="nebula-auth-kicker">ACCESS REQUIRED</div>
                <h2>{session ? "Operator Linked" : `${targetLabel} Access`}</h2>
                <p>
                    {session
                        ? "Your Nebula account is connected. Protected navigation is unlocked."
                        : "Create an account or sign in to open crew profile, store, and inventory systems."}
                </p>

                {session ? (
                    <div className="nebula-auth-signed">
                        <div>
                            <span>Signed in as</span>
                            <strong>{userEmail || "Nebula Operator"}</strong>
                        </div>
                        <button type="button" className="nebula-auth-primary" onClick={onClose}>
                            CONTINUE
                        </button>
                        <button type="button" className="nebula-auth-secondary" onClick={onSignOut}>
                            SIGN OUT
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="nebula-auth-tabs">
                            <button type="button" className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")}>LOGIN</button>
                            <button type="button" className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")}>SIGN UP</button>
                        </div>
                        <form className="nebula-auth-form" onSubmit={submitAuth}>
                            <input
                                type="email"
                                placeholder="email@domain.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                            <input
                                type="password"
                                placeholder="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                minLength={6}
                            />
                            {message && <div className="nebula-auth-message">{message}</div>}
                            <button type="submit" className="nebula-auth-primary" disabled={busy || !configured}>
                                {busy ? "CONNECTING..." : mode === "signup" ? "CREATE ACCOUNT" : "LOGIN"}
                            </button>
                        </form>
                        <div className="nebula-auth-divider"><span>OR CONTINUE WITH</span></div>
                        <div className="nebula-auth-oauth">
                            <button type="button" onClick={() => startOAuthSignIn("google")} disabled={!configured}>
                                <UserPlus size={16} aria-hidden /> GOOGLE
                            </button>
                            <button type="button" onClick={() => startOAuthSignIn("discord")} disabled={!configured}>
                                <FaDiscord size={16} aria-hidden /> DISCORD
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Avatar({ profileId, username, size = 56, color }) {
    const c = color || AVATAR_COLORS[profileId] || "#c8b8ff";
    return (
        <div style={{
            width: size, height: size, flexShrink: 0,
            border: `2px solid ${c}66`,
            background: c + "15",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            position: "relative",
        }}>
            <img
                src={`/profiles/${profileId}.jpg`}
                alt={username || profileId}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
            />
            <div style={{
                display: "none", position: "absolute", inset: 0,
                alignItems: "center", justifyContent: "center",
                color: c, fontSize: size * 0.38, fontWeight: "bold",
            }}>
                {(username || profileId)[0].toUpperCase()}
            </div>
        </div>
    );
}

const ROLE_DESCRIPTIONS = {
    engineer: "Each night, scan one player to learn if they are Gnosia. If they are, they receive a warning — not your identity.",
    doctor: "Each night, inspect one player in Cold Sleep to reveal their true role.",
    guardian: "Each night, protect one other player. If the Gnosia target them, the kill is blocked.",
    lawyer: "Once per game, you may dismiss the vote during any voting round — cancelling it entirely so no one is eliminated.",
    traitor: "You have no special ability, but you appear human to all scans and inspections. You win with the Gnosia.",
};

ROLE_DESCRIPTIONS.traitor = "50% chance to appear. If chosen, you have no special ability, appear human to all scans and inspections, and win with the Gnosia.";
ROLE_DESCRIPTIONS.illusionist = "One Gnosia becomes the Illusionist. Before the mission begins, they infect one player and add 1 more Gnosia to the match.";

function SettingToggle({ label, desc, checked, onChange, onInfo }) {
    return (
        <label style={{
            display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
            padding: "14px 0", borderBottom: "1px solid #1a0a2a"
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#e0d4ff", marginBottom: 4 }}>{label}</div>
                {desc && <div style={{ fontSize: 8, color: "#4a3060" }}>{desc}</div>}
            </div>
            {onInfo && (
                <button onClick={e => { e.preventDefault(); onInfo(); }} style={{
                    fontSize: 8, color: "#4a3060", border: "1px solid #2a1a4a",
                    background: "transparent", padding: "4px 8px",
                    cursor: "pointer", fontFamily: "Press Start 2P", flexShrink: 0,
                }}>?</button>
            )}
            <input type="checkbox" className="toggle" checked={checked}
                onChange={e => onChange(e.target.checked)} />
        </label>
    );
}

export default function Lobby({
    onReady,
    resumeFrom,
    onLeaveRoom,
    musicVolume,
    setMusicVolume,
    musicMuted,
    setMusicMuted,
}) {
    const { emit, connected } = useSocket();
    const [screen, setScreen] = useState("setup"); // setup | waiting
    const [mode, setMode] = useState("create");
    const [username, setUsername] = useState("");
    const [profileId, setProfileId] = useState(null);
    const [joinCode, setJoinCode] = useState("");
    const [joinPass, setJoinPass] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [myId, setMyId] = useState(null);
    const [lobbyState, setLobbyState] = useState(null);
    const [musicState, setMusicState] = useState(null);
    const [expandedRole, setExpandedRole] = useState(null);
    const [musicPanelPosition, setMusicPanelPosition] = useState({ x: null, y: null });
    const [volumePanelPosition, setVolumePanelPosition] = useState({ x: null, y: null });
    const [settings, setSettings] = useState({
        password: "", hasEngineer: false, hasDoctor: false,
        hasGuardian: false, hasLawyer: false, hasTraitor: false, hasIllusionist: false, gnosiaCount: "",
        lobbyMusicEnabled: true, endGameMusicEnabled: true,
    });
    const dragStateRef = useRef(null);
    const volumeDragStateRef = useRef(null);
    const [currentTheme, setCurrentTheme] = useState(getStoredTheme);

    // Emote state for lobby
    const [lobbyEmotes, setLobbyEmotes] = useState({});
    const [lobbyEmoteWheel, setLobbyEmoteWheel] = useState(null);
    const [lobbyIsHolding, setLobbyIsHolding] = useState(false);
    const lobbyTimerRef = useRef(null);
    const lobbyAvatarRef = useRef(null);
    const lobbyEmoteTimers = useRef({});
    const [roomPrivacy, setRoomPrivacy] = useState("public");
    const [sidebarNav, setSidebarNav] = useState("home");
    const [authSession, setAuthSession] = useState(() => consumeOAuthRedirect() || getStoredAuthSession());
    const [authModalNav, setAuthModalNav] = useState(null);
    const [pendingNav, setPendingNav] = useState(null);
    const [waitingTab, setWaitingTab] = useState("overview");
    const profileSectionRef = useRef(null);
    const heroActionsRef = useRef(null);

    function runNav(key) {
        setSidebarNav(key);
        if (key === "profile") {
            profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (key === "rooms") {
            heroActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (key === "home") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (key === "store" || key === "inventory") {
            heroActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function handleSidebarNav(key) {
        if (PROTECTED_NAV.has(key) && !authSession) {
            setPendingNav(key);
            setAuthModalNav(key);
            return;
        }
        runNav(key);
    }

    function handleAuthSuccess(nextSession) {
        setAuthSession(nextSession || getStoredAuthSession());
        setAuthModalNav(null);
        if (pendingNav) {
            runNav(pendingNav);
            setPendingNav(null);
        }
    }

    async function handleSignOut() {
        await signOutAuth();
        setAuthSession(null);
        setAuthModalNav(null);
        setPendingNav(null);
    }

    function syncSettingsFromState(state) {
        if (!state?.settings) return;
        setSettings(prev => ({
            ...prev,
            hasEngineer: !!state.settings.hasEngineer,
            hasDoctor: !!state.settings.hasDoctor,
            hasGuardian: !!state.settings.hasGuardian,
            hasLawyer: !!state.settings.hasLawyer,
            hasTraitor: !!state.settings.hasTraitor,
            hasIllusionist: !!state.settings.hasIllusionist,
            gnosiaCount: state.settings.gnosiaCount ?? "",
            lobbyMusicEnabled: state.settings.lobbyMusicEnabled !== false,
            endGameMusicEnabled: state.settings.endGameMusicEnabled !== false,
        }));
        if (state.music) {
            setMusicState({
                settings: {
                    lobbyMusicEnabled: state.settings.lobbyMusicEnabled !== false,
                    endGameMusicEnabled: state.settings.endGameMusicEnabled !== false,
                },
                playback: state.music.playback,
            });
        }
    }

    useSocketEvent("lobby:updated", ({ state }) => {
        setLobbyState(state);
        syncSettingsFromState(state);
    });
    useSocketEvent("lobby:hostChanged", ({ newHostId }) => {
        setLobbyState(prev => prev ? {
            ...prev,
            players: prev.players.map(p => ({ ...p, isHost: p.id === newHostId }))
        } : prev);
    });
    useSocketEvent("game:starting", () => setLoading(true));
    useSocketEvent("music:state", (payload) => setMusicState(payload));
    useSocketEvent("player:emote", ({ playerId, emote }) => {
        setLobbyEmotes(prev => ({ ...prev, [playerId]: emote }));
        // Clear existing timer before setting new one to prevent memory leaks
        if (lobbyEmoteTimers.current[playerId]) {
            clearTimeout(lobbyEmoteTimers.current[playerId]);
        }
        lobbyEmoteTimers.current[playerId] = setTimeout(() => {
            setLobbyEmotes(prev => { const n = { ...prev }; delete n[playerId]; return n; });
            delete lobbyEmoteTimers.current[playerId];
        }, 5000);
    });

    useEffect(() => {
        const session = getStoredAuthSession();
        if (session?.access_token) {
            fetchCurrentUser(session).then((user) => {
                setAuthSession((prev) => prev ? { ...prev, user } : prev);
            }).catch(() => {});
        }

        const onAuth = (event) => setAuthSession(event.detail || null);
        window.addEventListener("nebula:auth", onAuth);
        return () => window.removeEventListener("nebula:auth", onAuth);
    }, []);

    useEffect(() => {
        if (!resumeFrom?.lobbyState || !resumeFrom.roomId || !resumeFrom.myId) return;
        setRoomId(resumeFrom.roomId);
        setMyId(resumeFrom.myId);
        setLobbyState(resumeFrom.lobbyState);
        syncSettingsFromState(resumeFrom.lobbyState);
        setScreen("waiting");
    }, [resumeFrom]);

    // Cleanup emote timers on unmount
    useEffect(() => {
        return () => {
            Object.values(lobbyEmoteTimers.current).forEach(timerId => {
                clearTimeout(timerId);
            });
            lobbyEmoteTimers.current = {};
        };
    }, []);

    const takenProfiles = lobbyState?.players.map(p => p.profileId) || [];
    const amHost = lobbyState?.players.find(p => p.id === myId && p.isHost);
    const canStart = amHost && (lobbyState?.players.length || 0) >= 2 && !loading;

    function lobbyStartHold(e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        setLobbyIsHolding(true);
        lobbyTimerRef.current = setTimeout(() => {
            setLobbyIsHolding(false);
            const rect = lobbyAvatarRef.current?.getBoundingClientRect();
            if (rect && roomId) setLobbyEmoteWheel({ cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, emotes: getRandomEmotes(), borderRadius: "4px" });
        }, 2000);
    }

    function lobbyCancelHold() {
        clearTimeout(lobbyTimerRef.current);
        setLobbyIsHolding(false);
    }

    async function handleCreate() {
        if (!username.trim()) return setError("Enter a callsign.");
        if (!profileId) return setError("Select a profile.");
        setError(""); setLoading(true);
        const sessionToken = getOrCreateSessionToken();
        const res = await emit("room:create", {
            username: username.trim(), profileId,
            sessionToken,
            settings: {
                password: roomPrivacy === "private" ? (settings.password || null) : null,
                hasEngineer: settings.hasEngineer,
                hasDoctor: settings.hasDoctor,
                hasGuardian: settings.hasGuardian,
                hasLawyer: settings.hasLawyer,
                hasTraitor: settings.hasTraitor,
                hasIllusionist: settings.hasIllusionist,
                gnosiaCount: settings.gnosiaCount ? parseInt(settings.gnosiaCount) : null,
                lobbyMusicEnabled: settings.lobbyMusicEnabled,
                endGameMusicEnabled: settings.endGameMusicEnabled,
            },
        });
        setLoading(false);
        if (!res.success) return setError(res.error);
        const me = res.state.players.find(p => p.username === username.trim());
        setMyId(me?.id); setRoomId(res.roomId); setLobbyState(res.state);
        syncSettingsFromState(res.state);
        savePlaySession({
            sessionToken,
            roomId: res.roomId,
            username: username.trim(),
            profileId,
            password: roomPrivacy === "private" ? (settings.password || null) : null,
        });
        onReady?.(res.roomId, me?.id, profileId, username.trim(), sessionToken);
        setScreen("waiting");
    }

    async function handleJoin() {
        if (!username.trim()) return setError("Enter a callsign.");
        if (!profileId) return setError("Select a profile.");
        if (!joinCode.trim()) return setError("Enter a room code.");
        setError(""); setLoading(true);
        const sessionToken = getOrCreateSessionToken();
        const res = await emit("room:join", {
            roomId: joinCode.trim().toUpperCase(),
            username: username.trim(), profileId,
            password: joinPass || null,
            sessionToken,
        });
        setLoading(false);
        if (!res.success) return setError(res.error);
        const me = res.state.players.find(p => p.username === username.trim());
        const rid = joinCode.trim().toUpperCase();
        setMyId(me?.id); setRoomId(rid); setLobbyState(res.state);
        syncSettingsFromState(res.state);
        savePlaySession({
            sessionToken,
            roomId: rid,
            username: username.trim(),
            profileId,
            password: joinPass || null,
        });
        onReady?.(rid, me?.id, profileId, username.trim(), sessionToken);
        setScreen("waiting");
    }

    async function pushSettings(next) {
        if (!roomId) return;
        await emit("room:updateSettings", {
            roomId,
            settings: {
                password: next.password || null,
                hasEngineer: next.hasEngineer,
                hasDoctor: next.hasDoctor,
                hasGuardian: next.hasGuardian,
                hasLawyer: next.hasLawyer,
                hasTraitor: next.hasTraitor,
                hasIllusionist: next.hasIllusionist,
                gnosiaCount: next.gnosiaCount ? parseInt(next.gnosiaCount) : null,
                lobbyMusicEnabled: next.lobbyMusicEnabled,
                endGameMusicEnabled: next.endGameMusicEnabled,
            },
        });
    }

    function changeSetting(key, value) {
        const next = { ...settings, [key]: value };
        setSettings(next);
        if (screen === "waiting") pushSettings(next);
    }

    async function startGame() {
        if (!canStart) return;
        setLoading(true);
        const res = await emit("game:start", { roomId });
        if (!res.success) { setError(res.error); setLoading(false); }
    }

    async function playSharedMusic() {
        if (!roomId) return;
        const res = await emit("music:play", { roomId });
        if (!res?.success) setError(res?.error || "Failed to start music.");
    }

    function startMusicPanelDrag(event) {
        if (event.target.closest("button, input, label")) return;
        const panelRect = event.currentTarget.parentElement.getBoundingClientRect();
        dragStateRef.current = {
            offsetX: event.clientX - panelRect.left,
            offsetY: event.clientY - panelRect.top,
        };
        event.preventDefault();
    }

    function startVolumePanelDrag(event) {
        if (event.target.closest("button, input")) return;
        const panelRect = event.currentTarget.getBoundingClientRect();
        volumeDragStateRef.current = {
            offsetX: event.clientX - panelRect.left,
            offsetY: event.clientY - panelRect.top,
        };
        event.preventDefault();
    }

    useEffect(() => {
        function handlePointerMove(event) {
            if (dragStateRef.current) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const panelWidth = 360;
                const panelHeight = 260;
                const nextX = Math.min(Math.max(12, event.clientX - dragStateRef.current.offsetX), Math.max(12, width - panelWidth - 12));
                const nextY = Math.min(Math.max(12, event.clientY - dragStateRef.current.offsetY), Math.max(12, height - panelHeight - 12));
                setMusicPanelPosition({ x: nextX, y: nextY });
            }
            if (volumeDragStateRef.current) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const panelWidth = 260;
                const panelHeight = 120;
                const nextX = Math.min(Math.max(12, event.clientX - volumeDragStateRef.current.offsetX), Math.max(12, width - panelWidth - 12));
                const nextY = Math.min(Math.max(12, event.clientY - volumeDragStateRef.current.offsetY), Math.max(12, height - panelHeight - 12));
                setVolumePanelPosition({ x: nextX, y: nextY });
            }
        }

        function stopDrag() {
            dragStateRef.current = null;
            volumeDragStateRef.current = null;
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", stopDrag);
        window.addEventListener("pointercancel", stopDrag);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", stopDrag);
            window.removeEventListener("pointercancel", stopDrag);
        };
    }, []);

    // ── WAITING ROOM ──────────────────────────────────────────────────
    if (screen === "waiting") {
        const playerCount = lobbyState?.players.length || 0;
        const nowPlayingLabel = musicState?.playback?.trackKey === "lobby"
            ? "LOBBY MUSIC"
            : musicState?.playback?.trackKey === "humanWin"
                ? "HUMAN WIN"
                : musicState?.playback?.trackKey === "gnosiaWin"
                    ? "GNOSIA WIN"
                    : "OFF";
        const displayName = lobbyState?.players.find(p => p.id === myId)?.username || username.trim() || "Operator";
        const displayProfileId = lobbyState?.players.find(p => p.id === myId)?.profileId || profileId;
        return (
            <div className="nebula-lobby">
                <NebulaLobbySidebar activeKey="rooms" onNav={() => { }} />
                <div className="nebula-main">
                    <NebulaMobileHeader variant="waiting" roomId={roomId} connected={connected} />
                    <div className="nebula-topbar">
                        <div>
                            <div className="nebula-brand">
                                <div className="nebula-brand-title">PROJECT NEBULA</div>
                                <div className="nebula-brand-sub">DEEP SPACE SOCIAL DEDUCTION</div>
                            </div>
                            <div className={connected ? "nebula-status-pill" : "nebula-status-pill nebula-status-pill--off"}>
                                <span className="nebula-status-dot" aria-hidden />
                                {connected ? "SERVER ONLINE" : "CONNECTING..."}
                            </div>
                        </div>
                        <div className="nebula-user-card">
                            {displayProfileId ? (
                                <img className="nebula-user-avatar" src={`/profiles/${displayProfileId}.jpg`} alt="" />
                            ) : (
                                <div
                                    className="nebula-user-avatar"
                                    style={{
                                        display: "grid",
                                        placeItems: "center",
                                        fontFamily: "Orbitron, sans-serif",
                                        fontWeight: 700,
                                        fontSize: 18,
                                        color: "#2ee8ff",
                                    }}
                                >
                                    {(displayName[0] || "?").toUpperCase()}
                                </div>
                            )}
                            <div className="nebula-user-meta">
                                <div className="nebula-user-name">{displayName}</div>
                                <div className="nebula-user-level">Level 27</div>
                                <div className="nebula-xp-bar">
                                    <div className="nebula-xp-fill" style={{ width: "70%" }} />
                                </div>
                                <div className="nebula-xp-label">2,450 / 3,500 XP</div>
                            </div>
                            <div className="nebula-user-actions">
                                <button type="button" className="nebula-icon-btn" aria-label="Friends"><Users size={18} strokeWidth={2} /></button>
                                <button type="button" className="nebula-icon-btn" aria-label="Notifications"><Mail size={18} strokeWidth={2} /></button>
                                <button type="button" className="nebula-icon-btn" aria-label="Quick settings"><Settings2 size={18} strokeWidth={2} /></button>
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: "center", marginBottom: 18 }}>
                        <div className="nebula-brand-sub" style={{ marginBottom: 8 }}>ROOM CODE</div>
                        <div className="nebula-code-display">{roomId}</div>
                        <div style={{ fontSize: 13, color: "rgba(200,220,255,0.45)", fontWeight: 600 }}>Share this code with your crew</div>
                    </div>
                    <div className="nebula-room-tabs" role="tablist" aria-label="Room sections">
                        {[
                            ["overview", "OVERVIEW"],
                            ["crew", "CREW"],
                            ["missions", "MISSIONS"],
                            ["settings", "SETTINGS"],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                className={waitingTab === key ? "is-active" : ""}
                                onClick={() => setWaitingTab(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className={`nebula-waiting-grid nebula-waiting-grid--tab-${waitingTab}`} style={{ width: "100%", maxWidth: 1540 }}>

                    {/* Player list */}
                    <div className="nebula-panel nebula-waiting-panel" style={{ minWidth: 0 }}>
                        <div style={{
                            padding: "16px 20px", borderBottom: "1px solid rgba(46,232,255,0.15)",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                            <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(200,220,255,0.45)" }}>CREW MANIFEST</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#e8f4ff" }}>
                                {playerCount}<span style={{ color: "rgba(200,220,255,0.35)" }}>/12</span>
                            </span>
                        </div>
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            {lobbyState?.players.map(p => (
                                <div key={p.id} className={`anim-fadeInUp lobby-player-row ${p.id === myId ? "lobby-player-me" : ""}`} style={{
                                    position: "relative",
                                    display: "flex", alignItems: "center", gap: 14,
                                    padding: "10px 12px",
                                    background: p.id === myId ? "#00f5ff08" : "transparent",
                                    border: `1px solid ${p.id === myId ? "#00f5ff22" : "transparent"}`,
                                }}>
                                    {lobbyEmotes[p.id] && (
                                        <div style={{ position: "absolute", top: -58, left: 8, zIndex: 30, pointerEvents: "none", animation: "emotePopIn 0.25s ease both" }}>
                                            <div style={{ background: "rgba(13,0,32,0.92)", border: "1px solid #2a1a4a", borderRadius: 8, padding: 4, boxShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>
                                                <img src={lobbyEmotes[p.id].src} alt={lobbyEmotes[p.id].label} style={{ width: 56, height: "auto", objectFit: "contain", borderRadius: 6, display: "block" }} />
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        ref={p.id === myId ? lobbyAvatarRef : undefined}
                                        onPointerDown={p.id === myId ? lobbyStartHold : undefined}
                                        onPointerUp={p.id === myId ? lobbyCancelHold : undefined}
                                        onPointerLeave={p.id === myId ? lobbyCancelHold : undefined}
                                        onPointerCancel={p.id === myId ? lobbyCancelHold : undefined}
                                        onContextMenu={e => e.preventDefault()}
                                        className={p.id === myId ? "no-callout" : ""}
                                        style={{
                                            position: "relative",
                                            cursor: p.id === myId ? (lobbyIsHolding ? "grabbing" : "grab") : "default",
                                            touchAction: p.id === myId ? "none" : undefined
                                        }}
                                    >
                                        <Avatar profileId={p.profileId} username={p.username} size={44} />
                                        {p.id === myId && (
                                            <svg className="hold-ring-svg" style={{ width: 50, height: 50, left: -3, top: -3 }} viewBox="0 0 50 50">
                                                <rect
                                                    className={`hold-ring-circle ${lobbyIsHolding ? 'active' : ''}`}
                                                    x="3" y="3" width="44" height="44" rx="4"
                                                    pathLength="100"
                                                    strokeDasharray="100"
                                                    strokeDashoffset="100"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 10, color: "#e0d4ff",
                                            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"
                                        }}>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {p.username}
                                            </span>
                                            {p.id === myId &&
                                                <span className="badge" style={{ color: "#00f5ff" }}>YOU</span>}
                                            {p.isHost &&
                                                <span className="badge" style={{ color: "#ffd700" }}>HOST</span>}
                                        </div>
                                        <div style={{ fontSize: 8, color: "#4a3060", marginTop: 4 }}>
                                            {p.profileName || ""}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {playerCount < 2 && (
                                <div style={{
                                    padding: 16, textAlign: "center",
                                    fontSize: 9, color: "#2a1a3a"
                                }}>
                                    Waiting for more crew...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Host settings + start */}
                    <div style={{
                        minWidth: 0, display: "flex",
                        flexDirection: "column", gap: 16
                    }}>
                        {amHost ? (
                            <div className="nebula-panel nebula-waiting-panel" style={{ padding: 20 }}>
                                <div style={{
                                    fontFamily: "Orbitron, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                                    color: "rgba(200,220,255,0.45)",
                                    marginBottom: 16
                                }}>
                                    MISSION SETTINGS
                                </div>
                                {/* Gnosia count */}
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 8 }}>
                                        GNOSIA COUNT
                                    </div>
                                    <div style={{ fontSize: 8, color: "#4a3060", marginBottom: 8 }}>
                                        Auto = floor(players / 3). Override below.
                                    </div>
                                    <input
                                        className="input input-sm"
                                        type="number" min="1" max="10"
                                        placeholder={`Auto (${Math.max(1, Math.floor(playerCount / 3))})`}
                                        value={settings.gnosiaCount}
                                        onChange={e => changeSetting("gnosiaCount", e.target.value)}
                                    />
                                    {settings.hasIllusionist && (
                                        <div style={{ fontSize: 8, color: "#9b30ff", marginTop: 8, lineHeight: 1.8 }}>
                                            Illusionist adds +1 Gnosia after infecting a target at mission start.
                                        </div>
                                    )}
                                </div>
                                <SettingToggle label="ENGINEER ROLE"
                                    desc="Scans players at night for Gnosia"
                                    checked={settings.hasEngineer}
                                    onChange={v => changeSetting("hasEngineer", v)}
                                    onInfo={() => setExpandedRole(r => r === "engineer" ? null : "engineer")} />
                                {expandedRole === "engineer" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.engineer}
                                    </div>
                                )}
                                <SettingToggle label="DOCTOR ROLE"
                                    desc="Inspects Cold Sleep players"
                                    checked={settings.hasDoctor}
                                    onChange={v => changeSetting("hasDoctor", v)}
                                    onInfo={() => setExpandedRole(r => r === "doctor" ? null : "doctor")} />
                                {expandedRole === "doctor" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.doctor}
                                    </div>
                                )}
                                <SettingToggle label="GUARDIAN ANGEL"
                                    desc="Protects one player per night"
                                    checked={settings.hasGuardian}
                                    onChange={v => changeSetting("hasGuardian", v)}
                                    onInfo={() => setExpandedRole(r => r === "guardian" ? null : "guardian")} />
                                {expandedRole === "guardian" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.guardian}
                                    </div>
                                )}
                                <SettingToggle label="LAWYER ROLE"
                                    desc="Can dismiss one vote per game"
                                    checked={settings.hasLawyer}
                                    onChange={v => changeSetting("hasLawyer", v)}
                                    onInfo={() => setExpandedRole(r => r === "lawyer" ? null : "lawyer")} />
                                {expandedRole === "lawyer" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.lawyer}
                                    </div>
                                )}
                                <SettingToggle label="TRAITOR ROLE"
                                    desc="1/2 chance to appear and secretly support Gnosia"
                                    checked={settings.hasTraitor}
                                    onChange={v => changeSetting("hasTraitor", v)}
                                    onInfo={() => setExpandedRole(r => r === "traitor" ? null : "traitor")} />
                                {expandedRole === "traitor" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.traitor}
                                    </div>
                                )}
                                <SettingToggle label="ILLUSIONIST ROLE"
                                    desc="Transforms one Gnosia and adds +1 more at mission start"
                                    checked={settings.hasIllusionist}
                                    onChange={v => changeSetting("hasIllusionist", v)}
                                    onInfo={() => setExpandedRole(r => r === "illusionist" ? null : "illusionist")} />
                                {expandedRole === "illusionist" && (
                                    <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                        {ROLE_DESCRIPTIONS.illusionist}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="nebula-panel nebula-waiting-panel" style={{ padding: 20 }}>
                                <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(200,220,255,0.45)", marginBottom: 16 }}>
                                    ACTIVE SETTINGS
                                </div>
                                {[
                                    { key: "hasEngineer", label: "ENGINEER", role: "engineer" },
                                    { key: "hasDoctor", label: "DOCTOR", role: "doctor" },
                                    { key: "hasGuardian", label: "GUARDIAN ANGEL", role: "guardian" },
                                    { key: "hasLawyer", label: "LAWYER", role: "lawyer" },
                                    { key: "hasTraitor", label: "TRAITOR", role: "traitor" },
                                    { key: "hasIllusionist", label: "ILLUSIONIST", role: "illusionist" },
                                    { key: "lobbyMusicEnabled", label: "LOBBY MUSIC", role: null },
                                    { key: "endGameMusicEnabled", label: "END GAME MUSIC", role: null },
                                ].map(({ key, label, role }) => (
                                    <div key={key}>
                                        <div style={{
                                            display: "flex", justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "10px 0", borderBottom: "1px solid #1a0a2a",
                                            fontSize: 9
                                        }}>
                                            <span style={{ color: "#4a3060" }}>{label}</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                {role && (
                                                    <button onClick={() => setExpandedRole(r => r === role ? null : role)} style={{
                                                        fontSize: 8, color: "#4a3060", border: "1px solid #2a1a4a",
                                                        background: "transparent", padding: "2px 7px",
                                                        cursor: "pointer", fontFamily: "Press Start 2P",
                                                    }}>?</button>
                                                )}
                                                <span style={{ color: lobbyState?.settings[key] ? "#00f5ff" : "#2a1a3a" }}>
                                                    {key === "hasTraitor"
                                                        ? (lobbyState?.settings[key] ? "1/2 CHANCE" : "OFF")
                                                        : (lobbyState?.settings[key] ? "ON" : "OFF")}
                                                </span>
                                            </div>
                                        </div>
                                        {role && expandedRole === role && (
                                            <div style={{ fontSize: 8, color: "#6a5080", lineHeight: 1.8, padding: "8px 0 12px", borderBottom: "1px solid #1a0a2a" }}>
                                                {ROLE_DESCRIPTIONS[role]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div style={{
                                fontSize: 9, color: "#ff2a2a", padding: "10px 14px",
                                border: "1px solid #ff2a2a33", background: "#1a000833"
                            }}>
                                ⚠ {error}
                            </div>
                        )}

                        {amHost ? (
                            <button className="btn btn-lg" style={{ width: "100%" }}
                                onClick={startGame} disabled={!canStart}>
                                {loading ? "INITIATING..." :
                                    playerCount < 2 ? "WAITING FOR CREW..." :
                                        "▶  LAUNCH MISSION"}
                            </button>
                        ) : (
                            <div className="nebula-panel nebula-waiting-panel" style={{ padding: 20, textAlign: "center" }}>
                                <div style={{ fontSize: 13, color: "rgba(200,220,255,0.45)", fontWeight: 600 }}
                                    className="anim-fadeIn">
                                    AWAITING HOST...
                                </div>
                            </div>
                        )}

                        <button className="btn" style={{
                            width: "100%",
                            color: "#ff2a2a",
                            borderColor: "#ff2a2a44",
                            background: "transparent"
                        }}
                            onClick={() => {
                                if (window.confirm("Leave the room?")) {
                                    emit("room:leave", { roomId }).then((res) => {
                                        if (!res?.success) {
                                            setError(res?.error || "Failed to leave room.");
                                            return;
                                        }
                                        clearPlaySession();
                                        setRoomId(null);
                                        setMyId(null);
                                        setLobbyState(null);
                                        setMusicState(null);
                                        setScreen("setup");
                                        onLeaveRoom?.();
                                    });
                                }
                            }}>
                            LEAVE ROOM
                        </button>
                    </div>
                    <aside className="nebula-room-aside">
                        <section className="nebula-panel nebula-waiting-panel nebula-music-card">
                            <div className="nebula-side-title">
                                <Music size={20} aria-hidden />
                                <span>SHARED MUSIC CONTROL</span>
                            </div>
                            <div className="nebula-music-now">
                                <span>NOW PLAYING</span>
                                <strong>{nowPlayingLabel}</strong>
                            </div>
                            {amHost && (
                                <div className="nebula-music-options">
                                    <label>
                                        <div>
                                            <strong>LOBBY MUSIC</strong>
                                            <span>Synced room track while everyone waits in lobby.</span>
                                        </div>
                                        <input type="checkbox" className="toggle" checked={settings.lobbyMusicEnabled}
                                            onChange={e => changeSetting("lobbyMusicEnabled", e.target.checked)} />
                                    </label>
                                    <label>
                                        <div>
                                            <strong>END GAME MUSIC</strong>
                                            <span>Human or Gnosia victory music after the match.</span>
                                        </div>
                                        <input type="checkbox" className="toggle" checked={settings.endGameMusicEnabled}
                                            onChange={e => changeSetting("endGameMusicEnabled", e.target.checked)} />
                                    </label>
                                    <button
                                        type="button"
                                        className="nebula-auth-primary nebula-music-play"
                                        onClick={playSharedMusic}
                                        disabled={!settings.lobbyMusicEnabled}
                                    >
                                        <Play size={16} aria-hidden /> PLAY MUSIC
                                    </button>
                                </div>
                            )}
                            <div className="nebula-volume-box">
                                <div>
                                    <strong>YOUR VOLUME</strong>
                                    <span>Applies only to your device.</span>
                                </div>
                                <button
                                    className="btn-topbar"
                                    onClick={() => setMusicMuted(!musicMuted)}
                                    style={{ borderColor: "#9b63ff66", color: musicMuted ? "#8a7aa0" : "#f3e9ff" }}>
                                    {musicMuted ? "UNMUTE" : "MUTE"}
                                </button>
                                <div className="nebula-range-row">
                                    <Volume2 size={15} aria-hidden />
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={Math.round(musicVolume * 100)}
                                        onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                                    />
                                </div>
                            </div>
                        </section>
                        <section className="nebula-panel nebula-waiting-panel nebula-room-info">
                            <h3>ROOM INFO</h3>
                            <dl>
                                <div><dt>CREW</dt><dd>{playerCount} / 12</dd></div>
                                <div><dt>GAME MODE</dt><dd>Standard</dd></div>
                                <div><dt>VOICE CHAT</dt><dd>Enabled <span className="nebula-status-dot" /></dd></div>
                                <div><dt>REGION</dt><dd>Automatic</dd></div>
                            </dl>
                        </section>
                    </aside>
                </div>
                    <p className="nebula-footer-tip">
                        TIP: Tip is to tip me pls :)!
                    </p>
                {amHost && (
                    <div style={{
                        position: "fixed",
                        right: musicPanelPosition.x === null ? 24 : "auto",
                        bottom: musicPanelPosition.y === null ? 24 : "auto",
                        left: musicPanelPosition.x === null ? "auto" : musicPanelPosition.x,
                        top: musicPanelPosition.y === null ? "auto" : musicPanelPosition.y,
                        width: "min(360px, calc(100vw - 32px))",
                        border: "1px solid #00f5ff44",
                        background: "linear-gradient(180deg, rgba(7,0,15,0.96), rgba(19,0,37,0.96))",
                        boxShadow: "0 0 0 1px rgba(0,245,255,0.08), 0 0 28px rgba(0,245,255,0.12)",
                        padding: 18,
                        zIndex: 10,
                    }} className="nebula-floating-music">
                        <div
                            onPointerDown={startMusicPanelDrag}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 10,
                                cursor: "grab",
                                userSelect: "none",
                                touchAction: "none",
                            }}>
                            <div>
                                <div style={{ fontSize: 8, color: "#4a3060", letterSpacing: "0.18em", marginBottom: 6 }}>
                                    SHARED MUSIC CONTROL
                                </div>
                                <div style={{ fontSize: 11, color: "#00f5ff", textShadow: "0 0 12px rgba(0,245,255,0.35)" }}>
                                    {nowPlayingLabel}
                                </div>
                            </div>
                            <div style={{
                                padding: "6px 10px",
                                border: "1px solid #00f5ff33",
                                background: "rgba(0,245,255,0.06)",
                                color: "#8ef7ff",
                                fontSize: 7,
                                letterSpacing: "0.12em",
                            }}>
                                DRAG
                            </div>
                        </div>
                        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.75), transparent)", marginBottom: 12 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <label style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 14,
                                padding: "10px 12px",
                                border: "1px solid #1f2d4d",
                                background: "rgba(0,0,0,0.25)",
                            }}>
                                <div>
                                    <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 4 }}>LOBBY MUSIC</div>
                                    <div style={{ fontSize: 7, color: "#5d5f86", lineHeight: 1.8 }}>Synced room track while everyone waits in lobby.</div>
                                </div>
                                <input type="checkbox" className="toggle" checked={settings.lobbyMusicEnabled}
                                    onChange={e => changeSetting("lobbyMusicEnabled", e.target.checked)} />
                            </label>
                            <label style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 14,
                                padding: "10px 12px",
                                border: "1px solid #1f2d4d",
                                background: "rgba(0,0,0,0.25)",
                            }}>
                                <div>
                                    <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 4 }}>END GAME MUSIC</div>
                                    <div style={{ fontSize: 7, color: "#5d5f86", lineHeight: 1.8 }}>Play Human or Gnosia victory music after the match.</div>
                                </div>
                                <input type="checkbox" className="toggle" checked={settings.endGameMusicEnabled}
                                    onChange={e => changeSetting("endGameMusicEnabled", e.target.checked)} />
                            </label>
                            <button
                                className="btn"
                                style={{
                                    width: "100%",
                                    background: settings.lobbyMusicEnabled ? "rgba(0,245,255,0.1)" : "rgba(42,26,74,0.4)",
                                    borderColor: settings.lobbyMusicEnabled ? "#00f5ff55" : "#2a1a4a",
                                    color: settings.lobbyMusicEnabled ? "#00f5ff" : "#4a3060",
                                }}
                                onClick={playSharedMusic}
                                disabled={!settings.lobbyMusicEnabled}>
                                PLAY MUSIC
                            </button>
                            <div style={{
                                padding: "12px",
                                border: "1px solid #1f2d4d",
                                background: "rgba(0,0,0,0.25)",
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 9, color: "#e0d4ff", marginBottom: 4 }}>YOUR VOLUME</div>
                                        <div style={{ fontSize: 7, color: "#5d5f86" }}>Applies only to your device.</div>
                                    </div>
                                    <button
                                        className="btn-topbar"
                                        onClick={() => setMusicMuted(!musicMuted)}
                                        style={{ borderColor: "#00f5ff44", color: musicMuted ? "#8a7aa0" : "#00f5ff" }}>
                                        {musicMuted ? "UNMUTE" : "MUTE"}
                                    </button>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(musicVolume * 100)}
                                    onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                                    style={{ width: "100%", accentColor: "#00f5ff" }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {!amHost && (
                    <div
                        className="nebula-floating-music"
                        onPointerDown={startVolumePanelDrag}
                        style={{
                            position: "fixed",
                            right: volumePanelPosition.x === null ? 24 : "auto",
                            bottom: volumePanelPosition.y === null ? 24 : "auto",
                            left: volumePanelPosition.x === null ? "auto" : volumePanelPosition.x,
                            top: volumePanelPosition.y === null ? "auto" : volumePanelPosition.y,
                            width: "min(260px, calc(100vw - 32px))",
                            border: "1px solid #00f5ff33",
                            background: "linear-gradient(180deg, rgba(7,0,15,0.94), rgba(13,0,32,0.94))",
                            boxShadow: "0 0 18px rgba(0,245,255,0.1)",
                            padding: 14,
                            zIndex: 10,
                        }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 10,
                                cursor: "grab",
                                userSelect: "none",
                                touchAction: "none",
                            }}>
                            <div style={{ fontSize: 8, color: "#4a3060", letterSpacing: "0.16em" }}>
                                YOUR MUSIC VOLUME
                            </div>
                            <div style={{
                                padding: "4px 8px",
                                border: "1px solid #00f5ff33",
                                background: "rgba(0,245,255,0.06)",
                                color: "#8ef7ff",
                                fontSize: 6,
                                letterSpacing: "0.1em",
                            }}>
                                DRAG
                            </div>
                        </div>
                        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.75), transparent)", marginBottom: 12 }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 9, color: "#00f5ff" }}>{musicMuted ? "MUTED" : `${Math.round(musicVolume * 100)}%`}</span>
                            <button
                                className="btn-topbar"
                                onClick={() => setMusicMuted(!musicMuted)}
                                style={{ borderColor: "#00f5ff44", color: musicMuted ? "#8a7aa0" : "#00f5ff" }}>
                                {musicMuted ? "UNMUTE" : "MUTE"}
                            </button>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(musicVolume * 100)}
                            onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                            style={{ width: "100%", accentColor: "#00f5ff" }}
                        />
                    </div>
                )}
                {lobbyEmoteWheel && (
                    <EmoteWheel
                        cx={lobbyEmoteWheel.cx}
                        cy={lobbyEmoteWheel.cy}
                        emotes={lobbyEmoteWheel.emotes} borderRadius={lobbyEmoteWheel.borderRadius}
                        onSelect={emote => { setLobbyEmoteWheel(null); emit("player:emote", { roomId, emote }); }}
                        onClose={() => setLobbyEmoteWheel(null)}
                    />
                )}
                <AuthModal
                    open={!!authModalNav}
                    reason={authModalNav}
                    session={authSession}
                    onClose={() => { setAuthModalNav(null); setPendingNav(null); }}
                    onAuthed={handleAuthSuccess}
                    onSignOut={handleSignOut}
                />
                </div>
                <NebulaMobileDock activeKey="rooms" onNav={handleSidebarNav} />
            </div>
        );
    }

    // ── SETUP SCREEN ──────────────────────────────────────────────────
    const setupDisplayName = username.trim() || "Operator";
    return (
        <div className="nebula-lobby">
            <NebulaLobbySidebar activeKey={sidebarNav} onNav={handleSidebarNav} />
            <div className="nebula-main">
                <NebulaMobileHeader variant="setup" connected={connected} />
                <div className="nebula-topbar">
                    <div className="flex flex-row gap-2 relative w-full">
                        <div className="nebula-brand">
                            <div className="nebula-brand-title flex flex-col">PROJECT <span className="NEBULA">NEBULA</span></div>
                            <div className="nebula-brand-sub">DEEP SPACE SOCIAL DEDUCTION</div>
                        </div>
                        <div className={connected ? "nebula-status-pill" : "nebula-status-pill nebula-status-pill--off"}>
                            <span className="nebula-status-dot" aria-hidden />
                            {connected ? "SERVER ONLINE" : "CONNECTING..."}
                        </div>
                    </div>
                    <div className="nebula-user-card">
                        {profileId ? (
                            <img className="nebula-user-avatar" src={`/profiles/${profileId}.jpg`} alt="" />
                        ) : (
                            <div
                                className="nebula-user-avatar"
                                style={{
                                    display: "grid",
                                    placeItems: "center",
                                    fontFamily: "Orbitron, sans-serif",
                                    fontWeight: 700,
                                    fontSize: 18,
                                    color: "#2ee8ff",
                                }}
                            >
                                {(setupDisplayName[0] || "?").toUpperCase()}
                            </div>
                        )}
                        <div className="nebula-user-meta">
                            <div className="nebula-user-name">{setupDisplayName}</div>
                            <div className="nebula-user-level">Level 27</div>
                            <div className="nebula-xp-bar">
                                <div className="nebula-xp-fill" style={{ width: "70%" }} />
                            </div>
                            <div className="nebula-xp-label">2,450 / 3,500 XP</div>
                        </div>
                        <div className="nebula-user-actions">
                            <button type="button" className="nebula-icon-btn" aria-label="Friends"><Users size={18} strokeWidth={2} /></button>
                            <button type="button" className="nebula-icon-btn" aria-label="Notifications"><Mail size={18} strokeWidth={2} /></button>
                            <button type="button" className="nebula-icon-btn" aria-label="Quick settings"><Settings2 size={18} strokeWidth={2} /></button>
                        </div>
                    </div>
                </div>

                <div className="nebula-hero-row" ref={heroActionsRef}>
                    <button
                        type="button"
                        className={"nebula-hero-btn nebula-hero-btn--cyan" + (mode === "create" ? " nebula-hero-btn--on" : "")}
                        onClick={() => { setMode("create"); setError(""); setSidebarNav("rooms"); }}
                    >
                        <div className="nebula-hero-icon-wrap" aria-hidden>
                            <Plus size={26} strokeWidth={2.5} />
                        </div>
                        <div className="nebula-hero-text">
                            <div className="nebula-hero-title">CREATE ROOM</div>
                            <div className="nebula-hero-sub">Start a new game.</div>
                        </div>
                        <ChevronRight className="nebula-hero-chevron" size={28} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className={"nebula-hero-btn nebula-hero-btn--purple" + (mode === "join" ? " nebula-hero-btn--on" : "")}
                        onClick={() => { setMode("join"); setError(""); setSidebarNav("rooms"); }}
                    >
                        <div className="nebula-hero-icon-wrap" aria-hidden>
                            <Users size={26} strokeWidth={2.5} />
                        </div>
                        <div className="nebula-hero-text">
                            <div className="nebula-hero-title">JOIN ROOM</div>
                            <div className="nebula-hero-sub">Join with a code.</div>
                        </div>
                        <ChevronRight className="nebula-hero-chevron" size={28} aria-hidden />
                    </button>
                </div>

                <section className="nebula-mobile-quick">
                    <div className="nebula-mobile-section-head">
                        <span><Users size={17} aria-hidden /> QUICK PROFILE</span>
                        <button type="button" onClick={() => profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                            VIEW ALL
                        </button>
                    </div>
                    <div className="nebula-mobile-profile-strip">
                        {PROFILES.slice(0, 8).map((p) => {
                            const selected = profileId === p.id;
                            const color = AVATAR_COLORS[p.id] || "#c8b8ff";
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={selected ? "is-selected" : ""}
                                    onClick={() => setProfileId(p.id)}
                                    style={{ "--profile-color": color }}
                                >
                                    <Avatar profileId={p.id} username={p.name} size={48} color={color} />
                                    <span>{p.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="nebula-mobile-preset">
                    <div>
                        <Palette size={24} aria-hidden />
                        <span>
                            GAME SETTINGS PRESET
                            <strong>{currentTheme === "cyberpunk" ? "CYBERPUNK" : "GALACTIC NEON"}</strong>
                        </span>
                    </div>
                    <ChevronRight size={24} aria-hidden />
                </section>

                <div className="nebula-panels">
                    <section className="nebula-panel nebula-panel--accent-cyan">
                        <h2 className="nebula-panel-title">
                            {mode === "create" ? "CREATE YOUR ROOM" : "JOIN A ROOM"}
                        </h2>

                        <div>
                            <label className="nebula-field-label">USERNAME</label>
                            <div className="nebula-input-wrap">
                                <User size={20} strokeWidth={2} aria-hidden />
                                <input
                                    className="nebula-input"
                                    placeholder="Enter callsign..."
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    maxLength={20}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {mode === "create" && (
                            <div>
                                <label className="nebula-field-label">ROOM PASSWORD (OPTIONAL)</label>
                                <div className="nebula-input-wrap">
                                    <Lock size={20} strokeWidth={2} aria-hidden />
                                    <input
                                        className="nebula-input"
                                        type="password"
                                        placeholder="Leave blank if none"
                                        value={settings.password}
                                        onChange={e => setSettings(s => ({ ...s, password: e.target.value }))}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        )}

                        {mode === "join" && (
                            <>
                                <div>
                                    <label className="nebula-field-label">ROOM CODE</label>
                                    <div className="nebula-input-wrap">
                                        <KeyRound size={20} strokeWidth={2} aria-hidden />
                                        <input
                                            className="nebula-input"
                                            style={{ textTransform: "uppercase" }}
                                            placeholder="ABCD1234"
                                            value={joinCode}
                                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                            maxLength={8}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="nebula-field-label">ROOM PASSWORD</label>
                                    <div className="nebula-input-wrap">
                                        <Lock size={20} strokeWidth={2} aria-hidden />
                                        <input
                                            className="nebula-input"
                                            type="password"
                                            placeholder="If required"
                                            value={joinPass}
                                            onChange={e => setJoinPass(e.target.value)}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {mode === "create" && (
                            <>
                                <div className="nebula-privacy-row">
                                    <button
                                        type="button"
                                        className={"nebula-privacy-btn" + (roomPrivacy === "public" ? " nebula-privacy-btn--on" : "")}
                                        onClick={() => { setRoomPrivacy("public"); }}
                                    >
                                        <Globe size={18} strokeWidth={2} />
                                        PUBLIC
                                    </button>
                                    <button
                                        type="button"
                                        className={"nebula-privacy-btn" + (roomPrivacy === "private" ? " nebula-privacy-btn--on" : "")}
                                        onClick={() => setRoomPrivacy("private")}
                                    >
                                        <Lock size={18} strokeWidth={2} />
                                        PRIVATE
                                    </button>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="nebula-error" role="alert">
                                {error}
                            </div>
                        )}

                        {mode === "create" ? (
                            <button
                                type="button"
                                className="nebula-launch-btn"
                                onClick={handleCreate}
                                disabled={loading || !connected}
                            >
                                <Rocket size={22} strokeWidth={2} />
                                {loading ? "TRANSMITTING..." : "LAUNCH ROOM"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="nebula-launch-btn nebula-launch-btn--purple"
                                onClick={handleJoin}
                                disabled={loading || !connected}
                            >
                                <Users size={22} strokeWidth={2} />
                                {loading ? "TRANSMITTING..." : "JOIN ROOM"}
                            </button>
                        )}
                    </section>

                    <section className="nebula-panel nebula-panel--accent-purple" ref={profileSectionRef}>
                        <h2 className="nebula-panel-title nebula-panel-title--purple">GAME SETTINGS</h2>
                        <div>
                            <label className="nebula-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Palette size={16} strokeWidth={2} aria-hidden />
                                VISUAL THEME
                            </label>
                            <select
                                className="nebula-select"
                                value={currentTheme}
                                onChange={e => {
                                    const t = e.target.value;
                                    setCurrentTheme(t);
                                    applyTheme(t);
                                }}
                            >
                                <option value="standard">GALACTIC NEON</option>
                                <option value="cyberpunk">CYBERPUNK — EDGERUNNERS</option>
                            </select>
                        </div>
                        <div>
                            <label className="nebula-field-label">SELECT PROFILE</label>
                            <div className="nebula-profile-grid">
                                {PROFILES.map(p => {
                                    const color = AVATAR_COLORS[p.id] || "#c8b8ff";
                                    const selected = profileId === p.id;
                                    const taken = takenProfiles.includes(p.id) && !selected;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className={"nebula-profile-cell" + (selected ? " nebula-profile-cell--selected" : "")}
                                            style={{
                                                borderColor: selected ? color : taken ? "rgba(46,232,255,0.1)" : `${color}66`,
                                                boxShadow: selected ? `0 0 16px ${color}33` : undefined,
                                            }}
                                            onClick={() => !taken && setProfileId(p.id)}
                                            disabled={taken}
                                        >
                                            <Avatar profileId={p.id} username={p.name} size={52} color={color} />
                                            <span className="nebula-profile-name">{p.name}</span>
                                            {taken && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(200,220,255,0.35)" }}>TAKEN</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </div>

                <p className="nebula-footer-tip">
                    TIP: Tip is to tip me pls :)
                </p>
            </div>
            <AuthModal
                open={!!authModalNav}
                reason={authModalNav}
                session={authSession}
                onClose={() => { setAuthModalNav(null); setPendingNav(null); }}
                onAuthed={handleAuthSuccess}
                onSignOut={handleSignOut}
            />
            <NebulaMobileDock activeKey={sidebarNav} onNav={handleSidebarNav} />
        </div>
    );
}
