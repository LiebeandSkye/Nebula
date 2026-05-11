const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "https://aodyeyrnyfldrylkpdxk.supabase.co").replace(/\/$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_P1UElF7IMenGkumoGOmrxw_boEPQ39m";

const SESSION_KEY = "nebula:supabase-session";

function canUseSupabase() {
    return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function authHeaders(token) {
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token || SUPABASE_KEY}`,
        "Content-Type": "application/json",
    };
}

function normalizeSession(payload) {
    if (!payload?.access_token) return null;
    return {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token || null,
        expires_at: payload.expires_at || (payload.expires_in ? Math.floor(Date.now() / 1000) + Number(payload.expires_in) : null),
        token_type: payload.token_type || "bearer",
        user: payload.user || null,
    };
}

function saveSession(session) {
    if (!session) return null;
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent("nebula:auth", { detail: session }));
    return session;
}

async function readJson(res) {
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
        throw new Error(data?.error_description || data?.msg || data?.message || "Authentication failed.");
    }
    return data;
}

export function getSupabaseConfigStatus() {
    return {
        configured: canUseSupabase(),
        url: SUPABASE_URL,
    };
}

export function getStoredAuthSession() {
    if (typeof window === "undefined") return null;
    try {
        const stored = window.localStorage.getItem(SESSION_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

export function consumeOAuthRedirect() {
    if (typeof window === "undefined" || !window.location.hash.includes("access_token")) {
        return getStoredAuthSession();
    }

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const session = normalizeSession({
        access_token: hash.get("access_token"),
        refresh_token: hash.get("refresh_token"),
        expires_in: hash.get("expires_in"),
        token_type: hash.get("token_type"),
    });

    if (session) {
        saveSession(session);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
    return session || getStoredAuthSession();
}

export async function signUpWithEmail(email, password) {
    if (!canUseSupabase()) throw new Error("Supabase is not configured.");
    const data = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
            email,
            password,
            data: { app: "project-nebula" },
            gotrue_meta_security: {},
        }),
    }).then(readJson);

    const session = normalizeSession(data);
    if (session) return saveSession(session);
    return { user: data.user || null, needsConfirmation: true };
}

export async function signInWithEmail(email, password) {
    if (!canUseSupabase()) throw new Error("Supabase is not configured.");
    const data = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email, password }),
    }).then(readJson);

    return saveSession(normalizeSession(data));
}

export async function fetchCurrentUser(session = getStoredAuthSession()) {
    if (!canUseSupabase() || !session?.access_token) return null;
    const data = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: authHeaders(session.access_token),
    }).then(readJson);
    const next = { ...session, user: data };
    saveSession(next);
    return data;
}

export function startOAuthSignIn(provider) {
    if (!canUseSupabase()) throw new Error("Supabase is not configured.");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({
        provider,
        redirect_to: redirectTo,
    });
    window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`);
}

export async function signOutAuth() {
    const session = getStoredAuthSession();
    if (session?.access_token && canUseSupabase()) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: "POST",
            headers: authHeaders(session.access_token),
        }).catch(() => {});
    }
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent("nebula:auth", { detail: null }));
}
