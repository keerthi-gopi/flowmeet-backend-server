"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export function useSocket(roomId: string, userId: string, name: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const sock = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            // Robust reconnection for mobile (network switches, sleep/wake)
            reconnection: true,
            reconnectionAttempts: 15,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 60000,
        });

        socketRef.current = sock;

        sock.on("connect", () => {
            console.log(`[Socket] Connected: ${sock.id}`);
            setIsConnected(true);
        });

        sock.on("disconnect", (reason) => {
            console.warn(`[Socket] Disconnected: ${reason}`);
            setIsConnected(false);
        });

        sock.on("reconnect", (attemptNumber: number) => {
            console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
            // Re-join the room on reconnect so signaling continues
            sock.emit("join-room", { roomId, userId, name });
        });

        sock.on("reconnect_error", (err: Error) => {
            console.error(`[Socket] Reconnection error:`, err.message);
        });

        // Set socket as state so consumers re-render when it's available
        setSocket(sock);

        return () => {
            sock.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, []); // Connect once

    // Explicit join-room call that the page will invoke once localStream is ready
    const joinRoom = useCallback(() => {
        if (socketRef.current?.connected) {
            socketRef.current.emit("join-room", { roomId, userId, name });
        } else {
            // If not yet connected, wait for connect event then join
            socketRef.current?.once("connect", () => {
                socketRef.current?.emit("join-room", { roomId, userId, name });
            });
        }
    }, [roomId, userId, name]);

    return { socket, isConnected, joinRoom };
}
