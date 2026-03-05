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
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3"
            style={{
                background: "linear-gradient(to top, rgba(5, 8, 22, 0.95), rgba(5, 8, 22, 0.8))",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderTop: "1px solid var(--fm-border)",
                paddingBottom: "calc(8px + var(--fm-safe-bottom))",
            }}
        >
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                {/* Mic toggle */}
                <button
                    onClick={onToggleMic}
                    className={`toolbar-btn ${isMuted ? "active" : ""}`}
                    title={isMuted ? "Unmute" : "Mute"}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Camera toggle */}
                <button
                    onClick={onToggleCamera}
                    className={`toolbar-btn ${isCameraOff ? "active" : ""}`}
                    title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                    aria-label={isCameraOff ? "Turn on camera" : "Turn off camera"}
                >
                    {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>

                {/* Screen share — hidden on small screens (not supported on iOS, inconsistent on Android) */}
                <button
                    onClick={onToggleScreenShare}
                    className={`toolbar-btn hidden sm:flex ${isScreenSharing ? "highlight" : ""}`}
                    title={isScreenSharing ? "Stop sharing" : "Share screen"}
                    aria-label={isScreenSharing ? "Stop screen sharing" : "Share your screen"}
                >
                    {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
                </button>

                {/* Divider */}
                <div className="w-px h-6 sm:h-8 mx-0.5 sm:mx-1" style={{ background: "var(--fm-border)" }} />

                {/* Chat toggle */}
                <button
                    onClick={onToggleChat}
                    className={`toolbar-btn ${isChatOpen ? "highlight" : ""}`}
                    title="Chat"
                    aria-label="Toggle chat panel"
                >
                    <MessageSquare size={18} />
                    {unreadCount > 0 && (
                        <span
                            className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-xs flex items-center justify-center font-bold"
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
                    <Users size={18} />
                    <span
                        className="absolute -top-1 -right-1 min-w-[16px] sm:min-w-[20px] h-4 sm:h-5 rounded-full text-[10px] sm:text-xs flex items-center justify-center font-bold px-0.5 sm:px-1"
                        style={{ background: "var(--fm-primary)", color: "white" }}
                    >
                        {participantCount}
                    </span>
                </button>

                {/* Divider */}
                <div className="w-px h-6 sm:h-8 mx-0.5 sm:mx-1" style={{ background: "var(--fm-border)" }} />

                {/* Leave */}
                <button
                    onClick={onLeave}
                    className="btn-danger flex items-center gap-1.5 sm:gap-2 text-sm"
                    title="Leave meeting"
                    aria-label="Leave meeting"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Leave</span>
                </button>

                {/* End for all (host only) */}
                {isHost && onEndForAll && (
                    <button
                        onClick={onEndForAll}
                        className="btn-danger flex items-center gap-1.5 sm:gap-2 text-sm opacity-80 hover:opacity-100"
                        title="End meeting for all"
                        aria-label="End meeting for all participants"
                        style={{ background: "#991B1B" }}
                    >
                        <PhoneOff size={16} />
                        <span className="hidden md:inline">End All</span>
                    </button>
                )}
            </div>
        </div>
    );
}
