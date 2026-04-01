/**
 * Persists room identity on device so refresh / reconnect can resume the same seat.
 * sessionToken is stable per browser; socket.id changes on each connection.
 */

const STORAGE_KEY = "nebula_session_v1";

/**
 * @returns {string}
 */
export function getOrCreateSessionToken() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.sessionToken) return parsed.sessionToken;
        }
    } catch {
        /* ignore */
    }
    const token =
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            v: 1,
            sessionToken: token,
            roomId: null,
            username: "",
            profileId: null,
            password: null,
        }));
    } catch {
        /* ignore */
    }
    return token;
}

/**
 * @param {{ sessionToken?: string, roomId: string | null, username: string, profileId: string | null, password: string | null }} data
 */
export function savePlaySession(data) {
    try {
        let prev = {};
        try {
            prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        } catch {
            prev = {};
        }
        const next = {
            v: 1,
            sessionToken: data.sessionToken || prev.sessionToken || getOrCreateSessionToken(),
            roomId: data.roomId ?? prev.roomId ?? null,
            username: data.username ?? prev.username ?? "",
            profileId: data.profileId ?? prev.profileId ?? null,
            password: data.password !== undefined ? data.password : (prev.password ?? null),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* private mode / quota */
    }
}

export function loadPlaySession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.sessionToken) return null;
        return {
            sessionToken: parsed.sessionToken,
            roomId: parsed.roomId || null,
            username: parsed.username || "",
            profileId: parsed.profileId || null,
            password: parsed.password ?? null,
        };
    } catch {
        return null;
    }
}

export function clearPlaySession() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}
