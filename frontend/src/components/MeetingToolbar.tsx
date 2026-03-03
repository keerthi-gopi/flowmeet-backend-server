"use client";

import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    MonitorOff,
    MessageSquare,
    Users,
    PhoneOff,
    LogOut,
} from "lucide-react";

interface MeetingToolbarProps {
    isMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
    isChatOpen: boolean;
    isParticipantsOpen: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    onLeave: () => void;
    onEndForAll?: () => void;
    unreadCount: number;
    participantCount: number;
    isHost: boolean;
}

export default function MeetingToolbar({
    isMuted,
    isCameraOff,
    isScreenSharing,
    isChatOpen,
    isParticipantsOpen,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    onToggleChat,
    onToggleParticipants,
    onLeave,
    onEndForAll,
    unreadCount,
    participantCount,
    isHost,
}: MeetingToolbarProps) {
    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-3"
            style={{
                background: "linear-gradient(to top, rgba(5, 8, 22, 0.95), rgba(5, 8, 22, 0.8))",
                backdropFilter: "blur(20px)",
                borderTop: "1px solid var(--fm-border)",
            }}
        >
            <div className="flex items-center gap-2 md:gap-3">
                {/* Mic toggle */}
                <button
                    onClick={onToggleMic}
                    className={`toolbar-btn ${isMuted ? "active" : ""}`}
                    title={isMuted ? "Unmute" : "Mute"}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Camera toggle */}
                <button
                    onClick={onToggleCamera}
                    className={`toolbar-btn ${isCameraOff ? "active" : ""}`}
                    title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                    aria-label={isCameraOff ? "Turn on camera" : "Turn off camera"}
                >
                    {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>

                {/* Screen share */}
                <button
                    onClick={onToggleScreenShare}
                    className={`toolbar-btn ${isScreenSharing ? "highlight" : ""}`}
                    title={isScreenSharing ? "Stop sharing" : "Share screen"}
                    aria-label={isScreenSharing ? "Stop screen sharing" : "Share your screen"}
                >
                    {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                </button>

                {/* Divider */}
                <div className="w-px h-8 mx-1" style={{ background: "var(--fm-border)" }} />

                {/* Chat toggle */}
                <button
                    onClick={onToggleChat}
                    className={`toolbar-btn ${isChatOpen ? "highlight" : ""}`}
                    title="Chat"
                    aria-label="Toggle chat panel"
                >
                    <MessageSquare size={20} />
                    {unreadCount > 0 && (
                        <span
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                            style={{ background: "var(--fm-danger)", color: "white" }}
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>

                {/* Participants */}
                <button
                    onClick={onToggleParticipants}
                    className={`toolbar-btn ${isParticipantsOpen ? "highlight" : ""}`}
                    title="Participants"
                    aria-label="Toggle participants panel"
                >
                    <Users size={20} />
                    <span
                        className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-xs flex items-center justify-center font-bold px-1"
                        style={{ background: "var(--fm-primary)", color: "white" }}
                    >
                        {participantCount}
                    </span>
                </button>

                {/* Divider */}
                <div className="w-px h-8 mx-1" style={{ background: "var(--fm-border)" }} />

                {/* Leave */}
                <button
                    onClick={onLeave}
                    className="btn-danger flex items-center gap-2 text-sm"
                    title="Leave meeting"
                    aria-label="Leave meeting"
                >
                    <LogOut size={18} />
                    <span className="hidden md:inline">Leave</span>
                </button>

                {/* End for all (host only) */}
                {isHost && onEndForAll && (
                    <button
                        onClick={onEndForAll}
                        className="btn-danger flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
                        title="End meeting for all"
                        aria-label="End meeting for all participants"
                        style={{ background: "#991B1B" }}
                    >
                        <PhoneOff size={18} />
                        <span className="hidden md:inline">End All</span>
                    </button>
                )}
            </div>
        </div>
    );
}
