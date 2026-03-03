"use client";

import { X, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface ParticipantInfo {
    userId: string;
    name: string;
    isMuted?: boolean;
    isCameraOff?: boolean;
    isLocal?: boolean;
}

interface ParticipantListProps {
    isOpen: boolean;
    onClose: () => void;
    participants: ParticipantInfo[];
}

export default function ParticipantList({ isOpen, onClose, participants }: ParticipantListProps) {
    return (
        <div
            className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            style={{
                width: "min(320px, 100vw)",
                background: "var(--fm-bg-dark)",
                borderLeft: "1px solid var(--fm-border)",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--fm-border)" }}
            >
                <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--fm-font-display)" }}>
                    Participants ({participants.length})
                </h3>
                <button onClick={onClose} className="toolbar-btn w-8 h-8" aria-label="Close participants">
                    <X size={16} />
                </button>
            </div>

            {/* List */}
            <div className="p-3 space-y-1 overflow-y-auto" style={{ height: "calc(100% - 56px)" }}>
                {participants.map((p) => {
                    const initials = p.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                    return (
                        <div
                            key={p.userId}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5"
                        >
                            {/* Avatar */}
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{
                                    background: p.isLocal
                                        ? "linear-gradient(135deg, var(--fm-primary), var(--fm-accent))"
                                        : "var(--fm-bg-surface)",
                                }}
                            >
                                {initials}
                            </div>

                            {/* Name */}
                            <span className="flex-1 text-sm font-medium truncate">
                                {p.name} {p.isLocal && <span style={{ color: "var(--fm-text-muted)" }}>(You)</span>}
                            </span>

                            {/* Status indicators */}
                            <div className="flex items-center gap-1.5">
                                {p.isMuted ? (
                                    <MicOff size={14} style={{ color: "var(--fm-danger)" }} />
                                ) : (
                                    <Mic size={14} style={{ color: "var(--fm-text-muted)" }} />
                                )}
                                {p.isCameraOff ? (
                                    <VideoOff size={14} style={{ color: "var(--fm-danger)" }} />
                                ) : (
                                    <Video size={14} style={{ color: "var(--fm-text-muted)" }} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
