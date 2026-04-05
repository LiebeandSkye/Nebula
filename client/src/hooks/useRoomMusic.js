import { useEffect, useRef, useState } from "react";
import { useSocketEvent } from "./useSocket";

const TRACKS = {
    lobby: "/audio/Lobby_Music.mp3",
    humanWin: "/audio/HumanWin.mp3",
    gnosiaWin: "/audio/GnosiaWin.mp3",
};

const MUSIC_VOLUME_KEY = "nebula:music-volume";
const MUSIC_MUTED_KEY = "nebula:music-muted";

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function loadStoredVolume() {
    if (typeof window === "undefined") return 0.1;
    const stored = window.localStorage.getItem(MUSIC_VOLUME_KEY);
    // If no value stored, return 10% default
    if (stored === null) return 0.1;
    const storedNum = Number(stored);
    return Number.isFinite(storedNum) ? clamp(storedNum, 0, 1) : 0.1;
}

function loadStoredMuted() {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MUSIC_MUTED_KEY) === "true";
}

export function useRoomMusic(activeRoomId) {
    const audioRef = useRef(null);
    const fadeRef = useRef(null);
    const startTimerRef = useRef(null);
    const pendingStateRef = useRef(null);
    const lastRevisionRef = useRef(null);
    const [musicVolume, setMusicVolume] = useState(loadStoredVolume);
    const [musicMuted, setMusicMuted] = useState(loadStoredMuted);

    const effectiveVolume = musicMuted ? 0 : musicVolume;

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(MUSIC_VOLUME_KEY, String(musicVolume));
    }, [musicVolume]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(MUSIC_MUTED_KEY, musicMuted ? "true" : "false");
    }, [musicMuted]);

    useEffect(() => {
        if (typeof Audio === "undefined") return undefined;
        const audio = new Audio();
        audio.preload = "auto";
        audio.volume = effectiveVolume;
        audioRef.current = audio;

        return () => {
            if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
            if (startTimerRef.current) clearTimeout(startTimerRef.current);
            audio.pause();
            audio.src = "";
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || fadeRef.current) return;
        audio.volume = effectiveVolume;
    }, [effectiveVolume]);

    useEffect(() => {
        function retryPending() {
            if (!pendingStateRef.current) return;
            const next = pendingStateRef.current;
            pendingStateRef.current = null;
            applyMusicState(next);
        }

        window.addEventListener("pointerdown", retryPending);
        window.addEventListener("keydown", retryPending);

        return () => {
            window.removeEventListener("pointerdown", retryPending);
            window.removeEventListener("keydown", retryPending);
        };
    }, []);

    useEffect(() => {
        if (activeRoomId) return;
        const audio = audioRef.current;
        if (!audio) return;
        if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
        if (startTimerRef.current) clearTimeout(startTimerRef.current);
        fadeRef.current = null;
        startTimerRef.current = null;
        pendingStateRef.current = null;
        lastRevisionRef.current = null;
        audio.pause();
        audio.currentTime = 0;
        audio.volume = effectiveVolume;
        audio.src = "";
    }, [activeRoomId, effectiveVolume]);

    function fadeOutCurrent(durationMs) {
        const audio = audioRef.current;
        if (!audio) return;
        if (fadeRef.current) cancelAnimationFrame(fadeRef.current);

        if (!durationMs || audio.paused) {
            audio.pause();
            audio.volume = effectiveVolume;
            return;
        }

        const startedAt = performance.now();
        const initialVolume = audio.volume;

        const tick = (now) => {
            const progress = clamp((now - startedAt) / durationMs, 0, 1);
            audio.volume = initialVolume * (1 - progress);
            if (progress >= 1) {
                audio.pause();
                audio.volume = effectiveVolume;
                fadeRef.current = null;
                return;
            }
            fadeRef.current = requestAnimationFrame(tick);
        };

        fadeRef.current = requestAnimationFrame(tick);
    }

    async function startTrack(playback) {
        const audio = audioRef.current;
        if (!audio || !playback?.trackKey || !TRACKS[playback.trackKey]) return;

        const src = TRACKS[playback.trackKey];
        const desiredElapsed = playback.startedAt ? Math.max(0, (Date.now() - playback.startedAt) / 1000) : 0;

        if (!audio.src || !audio.src.endsWith(src)) {
            audio.src = src;
            audio.load();
        }

        audio.loop = !!playback.loop;
        audio.volume = effectiveVolume;

        const seekWhenReady = () => {
            const duration = Number.isFinite(audio.duration) ? audio.duration : null;
            if (duration && duration > 0) {
                audio.currentTime = playback.loop ? (desiredElapsed % duration) : Math.min(desiredElapsed, Math.max(0, duration - 0.01));
            } else {
                audio.currentTime = desiredElapsed;
            }
        };

        if (audio.readyState >= 1) {
            seekWhenReady();
        } else {
            audio.addEventListener("loadedmetadata", seekWhenReady, { once: true });
        }

        try {
            await audio.play();
        } catch (_err) {
            pendingStateRef.current = playback;
        }
    }

    function applyMusicState(payload) {
        if (!payload?.playback) return;
        if (lastRevisionRef.current === payload.playback.revision) return;
        lastRevisionRef.current = payload.playback.revision;

        const audio = audioRef.current;
        if (!audio) return;

        if (startTimerRef.current) {
            clearTimeout(startTimerRef.current);
            startTimerRef.current = null;
        }

        const transitionMs = Math.max(0, payload.playback.transitionDurationMs || 0);
        const startDelayMs = payload.playback.startedAt ? Math.max(0, payload.playback.startedAt - Date.now()) : 0;

        if (!payload.playback.trackKey) {
            fadeOutCurrent(transitionMs);
            return;
        }

        const incomingSrc = TRACKS[payload.playback.trackKey];
        const currentSrc = audio.src ? new URL(audio.src).pathname : "";
        const isSameTrack = currentSrc.endsWith(incomingSrc);

        if (isSameTrack && startDelayMs === 0) {
            startTrack(payload.playback);
            return;
        }

        if (!audio.paused && transitionMs > 0) {
            fadeOutCurrent(Math.min(transitionMs, startDelayMs || transitionMs));
        } else if (!audio.paused && !isSameTrack) {
            audio.pause();
        }

        const launch = () => {
            if (audio.src && !isSameTrack) {
                audio.pause();
            }
            startTrack(payload.playback);
        };

        if (startDelayMs > 0) {
            startTimerRef.current = setTimeout(launch, startDelayMs);
            return;
        }

        launch();
    }

    useSocketEvent("music:state", (payload) => {
        applyMusicState(payload);
    });

    return {
        musicVolume,
        setMusicVolume: (value) => setMusicVolume(clamp(value, 0, 1)),
        musicMuted,
        setMusicMuted,
        effectiveVolume,
    };
}

