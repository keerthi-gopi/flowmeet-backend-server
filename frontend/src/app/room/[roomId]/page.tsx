"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useSocket } from "@/hooks/useSocket";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoGrid from "@/components/VideoGrid";
import MeetingToolbar from "@/components/MeetingToolbar";
import ChatPanel from "@/components/ChatPanel";
import ParticipantList from "@/components/ParticipantList";
import { Loader2, AlertCircle } from "lucide-react";

interface ChatMessage {
    id: string;
    text: string;
    sender: string;
    time: number;
    isLocal?: boolean;
}

interface ParticipantState {
    isMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const userIdRef = useRef(uuidv4());
    const userId = userIdRef.current;

    // State
    const [displayName, setDisplayName] = useState("Guest");
    const [isJoined, setIsJoined] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [participantStates, setParticipantStates] = useState<Map<string, ParticipantState>>(new Map());
    const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());

    // Hooks
    const {
        localStream,
        screenStream,
        isMuted,
        isCameraOff,
        isScreenSharing,
        permissionError,
        initStream,
        toggleMute,
        toggleCamera,
        startScreenShare,
        stopScreenShare,
    } = useMediaStream();

    const { socket, isConnected, joinRoom } = useSocket(roomId, userId, displayName);
    const { remoteStreams, replaceVideoTrack } = useWebRTC(socket, localStream, roomId, userId);

    // Load display name from session storage
    useEffect(() => {
        const storedName = sessionStorage.getItem("flowmeet-name");
        if (storedName) {
            setDisplayName(storedName);
        }
    }, []);

    // Initialize media on mount, then join room
    useEffect(() => {
        initStream().then((stream) => {
            if (stream) {
                setIsJoined(true);
                joinRoom();
            }
        });
    }, [initStream, joinRoom]);

    // Retry joining room when socket connects (handles Render cold start delay)
    useEffect(() => {
        if (isConnected && isJoined) {
            joinRoom();
        }
    }, [isConnected, isJoined, joinRoom]);

    // Socket event listeners for chat and participant states
    useEffect(() => {
        if (!socket) return;

        socket.on("chat-message", (msg: ChatMessage) => {
            setChatMessages((prev) => [...prev, { ...msg, id: uuidv4() }]);
            if (!isChatOpen) {
                setUnreadCount((prev) => prev + 1);
            }
        });

        socket.on("user-joined", ({ userId: uid, name }: { userId: string; name: string }) => {
            setParticipantNames((prev) => {
                const next = new Map(prev);
                next.set(uid, name);
                return next;
            });
        });

        socket.on("existing-participants", (participants: Array<{ userId: string; name: string }>) => {
            setParticipantNames((prev) => {
                const next = new Map(prev);
                participants.forEach((p) => next.set(p.userId, p.name));
                return next;
            });
        });

        socket.on("user-left", ({ userId: uid }: { userId: string }) => {
            setParticipantNames((prev) => {
                const next = new Map(prev);
                next.delete(uid);
                return next;
            });
            setParticipantStates((prev) => {
                const next = new Map(prev);
                next.delete(uid);
                return next;
            });
        });

        socket.on("mute-update", ({ userId: uid, isMuted: muted }: { userId: string; isMuted: boolean }) => {
            setParticipantStates((prev) => {
                const next = new Map(prev);
                const current = next.get(uid) || { isMuted: false, isCameraOff: false, isScreenSharing: false };
                next.set(uid, { ...current, isMuted: muted });
                return next;
            });
        });

        socket.on("camera-update", ({ userId: uid, isOff }: { userId: string; isOff: boolean }) => {
            setParticipantStates((prev) => {
                const next = new Map(prev);
                const current = next.get(uid) || { isMuted: false, isCameraOff: false, isScreenSharing: false };
                next.set(uid, { ...current, isCameraOff: isOff });
                return next;
            });
        });

        socket.on("screen-share-start", ({ userId: uid }: { userId: string }) => {
            setParticipantStates((prev) => {
                const next = new Map(prev);
                const current = next.get(uid) || { isMuted: false, isCameraOff: false, isScreenSharing: false };
                next.set(uid, { ...current, isScreenSharing: true });
                return next;
            });
        });

        socket.on("screen-share-stop", ({ userId: uid }: { userId: string }) => {
            setParticipantStates((prev) => {
                const next = new Map(prev);
                const current = next.get(uid) || { isMuted: false, isCameraOff: false, isScreenSharing: false };
                next.set(uid, { ...current, isScreenSharing: false });
                return next;
            });
        });

        socket.on("room-ended", () => {
            router.push("/");
        });

        return () => {
            socket.off("chat-message");
            socket.off("user-joined");
            socket.off("existing-participants");
            socket.off("user-left");
            socket.off("mute-update");
            socket.off("camera-update");
            socket.off("screen-share-start");
            socket.off("screen-share-stop");
            socket.off("room-ended");
        };
    }, [socket, isChatOpen, router]);

    // Handlers
    const handleToggleMic = useCallback(() => {
        toggleMute();
        socket?.emit("mute-update", { userId, isMuted: !isMuted });
    }, [toggleMute, socket, userId, isMuted]);

    const handleToggleCamera = useCallback(() => {
        toggleCamera();
        socket?.emit("camera-update", { userId, isOff: !isCameraOff });
    }, [toggleCamera, socket, userId, isCameraOff]);

    const handleToggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            stopScreenShare();
            // Restore camera track
            if (localStream) {
                const cameraTrack = localStream.getVideoTracks()[0];
                if (cameraTrack) {
                    replaceVideoTrack(cameraTrack);
                }
            }
            socket?.emit("screen-share-stop", { userId });
        } else {
            const stream = await startScreenShare();
            if (stream) {
                const screenTrack = stream.getVideoTracks()[0];
                if (screenTrack) {
                    replaceVideoTrack(screenTrack);
                }
                socket?.emit("screen-share-start", { userId });
            }
        }
    }, [isScreenSharing, stopScreenShare, startScreenShare, localStream, replaceVideoTrack, socket, userId]);

    const handleSendMessage = useCallback(
        (text: string) => {
            const msg: ChatMessage = {
                id: uuidv4(),
                text,
                sender: displayName,
                time: Date.now(),
                isLocal: true,
            };
            setChatMessages((prev) => [...prev, msg]);
            socket?.emit("chat-message", { text, sender: displayName, time: msg.time });
        },
        [displayName, socket]
    );

    const handleToggleChat = useCallback(() => {
        setIsChatOpen((prev) => {
            if (!prev) setUnreadCount(0);
            return !prev;
        });
        if (isParticipantsOpen) setIsParticipantsOpen(false);
    }, [isParticipantsOpen]);

    const handleToggleParticipants = useCallback(() => {
        setIsParticipantsOpen((prev) => !prev);
        if (isChatOpen) setIsChatOpen(false);
    }, [isChatOpen]);

    const handleLeave = useCallback(() => {
        localStream?.getTracks().forEach((track) => track.stop());
        router.push("/");
    }, [localStream, router]);

    const handleEndForAll = useCallback(() => {
        socket?.emit("end-room");
        handleLeave();
    }, [socket, handleLeave]);

    // Build remote participants list for grid
    const remoteParticipants = Array.from(remoteStreams.values()).map((rs) => ({
        ...rs,
        isMuted: participantStates.get(rs.userId)?.isMuted || false,
        isCameraOff: participantStates.get(rs.userId)?.isCameraOff || false,
        isScreenSharing: participantStates.get(rs.userId)?.isScreenSharing || false,
    }));

    // Build participant list for panel
    const allParticipants = [
        {
            userId,
            name: displayName,
            isMuted,
            isCameraOff,
            isLocal: true,
        },
        ...Array.from(remoteStreams.values()).map((rs) => ({
            userId: rs.userId,
            name: participantNames.get(rs.userId) || rs.name,
            isMuted: participantStates.get(rs.userId)?.isMuted || false,
            isCameraOff: participantStates.get(rs.userId)?.isCameraOff || false,
            isLocal: false,
        })),
    ];

    // Permission error screen
    if (permissionError) {
        return (
            <div
                className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4"
                style={{ background: "var(--fm-bg-deep)" }}
            >
                <div className="glass-card p-6 sm:p-8 max-w-md text-center">
                    <AlertCircle size={40} className="mx-auto mb-4" style={{ color: "var(--fm-danger)" }} />
                    <h2
                        className="text-lg sm:text-xl font-bold mb-3"
                        style={{ fontFamily: "var(--fm-font-display)" }}
                    >
                        Permission Required
                    </h2>
                    <p className="mb-6 text-sm sm:text-base" style={{ color: "var(--fm-text-muted)" }}>
                        {permissionError}
                    </p>
                    <button onClick={() => router.push("/")} className="btn-secondary">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Loading screen — only block on camera access, NOT socket connection
    if (!isJoined) {
        return (
            <div
                className="min-h-screen min-h-[100dvh] flex items-center justify-center"
                style={{ background: "var(--fm-bg-deep)" }}
            >
                <div className="text-center px-4">
                    <Loader2
                        size={36}
                        className="animate-spin mx-auto mb-4"
                        style={{ color: "var(--fm-primary)" }}
                    />
                    <p
                        className="text-base sm:text-lg font-medium"
                        style={{ fontFamily: "var(--fm-font-display)" }}
                    >
                        Requesting camera access...
                    </p>
                    <p
                        className="text-xs sm:text-sm mt-2 truncate max-w-[280px] mx-auto"
                        style={{ color: "var(--fm-text-muted)", fontFamily: "var(--fm-font-mono)" }}
                    >
                        Room: {roomId}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-[100dvh] h-screen flex flex-col overflow-hidden"
            style={{ background: "var(--fm-bg-deep)" }}
        >
            {/* Reconnecting banner — shows when socket is not connected */}
            {!isConnected && (
                <div
                    className="flex items-center justify-center gap-2 px-3 py-2 flex-shrink-0"
                    style={{
                        background: "rgba(245, 158, 11, 0.15)",
                        borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                >
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--fm-warning)" }} />
                    <span className="text-xs sm:text-sm font-medium" style={{ color: "var(--fm-warning)" }}>
                        Connecting to server... Please wait
                    </span>
                </div>
            )}

            {/* Room header */}
            <div
                className="flex items-center justify-between px-3 sm:px-4 py-2 flex-shrink-0"
                style={{
                    borderBottom: "1px solid var(--fm-border)",
                    minHeight: "var(--fm-header-height)",
                }}
            >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <h1
                        className="text-sm font-bold gradient-text flex-shrink-0"
                        style={{ fontFamily: "var(--fm-font-display)" }}
                    >
                        FlowMeet
                    </h1>
                    <span
                        className="px-2 py-0.5 rounded text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-[200px]"
                        style={{
                            background: "var(--fm-bg-surface)",
                            color: "var(--fm-text-muted)",
                            fontFamily: "var(--fm-font-mono)",
                        }}
                    >
                        {roomId}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: isConnected ? "var(--fm-success)" : "var(--fm-danger)" }}
                    />
                    <span className="text-[10px] sm:text-xs hidden sm:inline" style={{ color: "var(--fm-text-muted)" }}>
                        {isConnected ? "Connected" : "Reconnecting..."}
                    </span>
                </div>
            </div>

            {/* Video grid */}
            <VideoGrid
                localStream={isScreenSharing && screenStream ? screenStream : localStream}
                localName={displayName}
                localIsMuted={isMuted}
                localIsCameraOff={isCameraOff}
                remoteParticipants={remoteParticipants}
            />

            {/* Chat panel */}
            <ChatPanel
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                localName={displayName}
            />

            {/* Participant list */}
            <ParticipantList
                isOpen={isParticipantsOpen}
                onClose={() => setIsParticipantsOpen(false)}
                participants={allParticipants}
            />

            {/* Toolbar */}
            <MeetingToolbar
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                isChatOpen={isChatOpen}
                isParticipantsOpen={isParticipantsOpen}
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                onToggleScreenShare={handleToggleScreenShare}
                onToggleChat={handleToggleChat}
                onToggleParticipants={handleToggleParticipants}
                onLeave={handleLeave}
                onEndForAll={handleEndForAll}
                unreadCount={unreadCount}
                participantCount={allParticipants.length}
                isHost={true}
            />
        </div>
    );
}
