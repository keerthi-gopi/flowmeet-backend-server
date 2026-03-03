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
        });

        socketRef.current = sock;

        sock.on("connect", () => {
            setIsConnected(true);
            // NOTE: We don't join-room here. The room page will join
            // after localStream is ready, via the joinRoom callback.
        });

        sock.on("disconnect", () => {
            setIsConnected(false);
        });

        // Set socket as state so consumers re-render when it's available
        setSocket(sock);

        return () => {
            sock.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, []); // Connect once — don't recreate on roomId/userId/name changes

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
