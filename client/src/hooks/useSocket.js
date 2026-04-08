/**
 * useSocket.js
 * Manages the single Socket.io connection for the entire app.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let socketInstance = null;

function getSocket() {
    if (!socketInstance) {
        socketInstance = io(SERVER_URL, {
            autoConnect: false,
            reconnection: false,
            timeout: 30000,
            // Polling-first tends to be more resilient during Render cold starts.
            transports: ["polling", "websocket"],
        });
    }
    return socketInstance;
}

export function useSocket() {
    const socket = getSocket();
    const [connected, setConnected] = useState(socket.connected);
    const [reconnecting, setReconnecting] = useState(false);
    const hadConnectedRef = useRef(socket.connected);

    useEffect(() => {
        function onConnect() {
            hadConnectedRef.current = true;
            setConnected(true);
            setReconnecting(false);
        }

        function onDisconnect() {
            setConnected(false);
            if (hadConnectedRef.current) {
                setReconnecting(true);
            }
        }

        function onConnectError() {
            setConnected(false);
            setReconnecting(true);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
        };
    }, [socket]);

    const emit = useCallback((event, payload) => {
        return new Promise((resolve) => {
            socket.emit(event, payload, (response) => {
                resolve(response);
            });
        });
    }, [socket]);

    const connectSocket = useCallback(() => {
        if (!socket.connected) {
            socket.connect();
        }
    }, [socket]);

    return { socket, connected, reconnecting, emit, connectSocket };
}

export function useSocketEvent(event, handler) {
    const socket = getSocket();
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const fn = (...args) => handlerRef.current(...args);
        socket.on(event, fn);
        return () => socket.off(event, fn);
    }, [socket, event]);
}

export { getSocket };
