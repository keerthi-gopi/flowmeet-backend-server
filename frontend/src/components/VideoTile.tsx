"use client";

import { useEffect, useRef, useCallback } from "react";

interface VideoTileProps {
    stream: MediaStream | null;
    name: string;
    isMuted: boolean;
    isCameraOff: boolean;
    isLocal?: boolean;
    isScreenSharing?: boolean;
}

export default function VideoTile({
    stream,
    name,
    isMuted,
    isCameraOff,
    isLocal = false,
    isScreenSharing = false,
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Attach stream to video element and ensure playback
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;

        // Only re-assign if the stream changed
        if (video.srcObject !== stream) {
            video.srcObject = stream;
        }

        // Attempt to play (handles autoplay policy)
        const tryPlay = async () => {
            if (!video) return;
            try {
                await video.play();
            } catch (err: any) {
                // Autoplay was blocked — common on mobile
                console.warn("[VideoTile] Autoplay blocked:", err.message);
            }
        };

        tryPlay();

        // Re-play when new tracks are added to the stream
        const handleTrackAdded = () => {
            tryPlay();
        };

        // Listen for track changes (important for renegotiation)
        const handleTrackRemoved = () => {
            // Stream still exists, just a track was removed
            console.log("[VideoTile] Track removed from stream");
        };

        stream.addEventListener("addtrack", handleTrackAdded);
        stream.addEventListener("removetrack", handleTrackRemoved);

        return () => {
            stream.removeEventListener("addtrack", handleTrackAdded);
            stream.removeEventListener("removetrack", handleTrackRemoved);
        };
    }, [stream]);

    // Also re-trigger play when the stream identity changes (for renegotiation)
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;

        // If the video is paused, try to play it
        if (video.paused) {
            video.play().catch(() => { });
        }
    });

    // Handle click to resume playback (autoplay policy workaround on mobile)
    const handleClick = useCallback(() => {
        const video = videoRef.current;
        if (video && video.paused && stream) {
            video.play().catch(() => { });
        }
    }, [stream]);

    // Generate initials from name
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const showAvatarOverlay = isCameraOff && !isScreenSharing;

    return (
        <div
            className="video-tile w-full h-full min-h-[120px] sm:min-h-[180px] relative group"
            onClick={handleClick}
        >
            {/* Video element — always rendered for remote to ensure audio plays */}
            {stream && (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    onLoadedMetadata={(e) => {
                        console.log("[VideoTile] Metadata loaded, attempting play");
                        (e.target as HTMLVideoElement).play().catch(console.warn);
                    }}
                    className={`w-full h-full object-cover ${isLocal && !isScreenSharing ? "scale-x-[-1]" : ""} ${showAvatarOverlay && !isLocal ? "absolute inset-0 opacity-0 pointer-events-none" : ""
                        } ${showAvatarOverlay && isLocal ? "hidden" : ""}`}
                />
            )}

            {/* Avatar when camera is off */}
            {(showAvatarOverlay || !stream) && (
                <div
                    className={`w-full h-full flex items-center justify-center ${!isLocal && stream ? "absolute inset-0 z-10" : ""}`}
                    style={{ background: "var(--fm-bg-surface)" }}
                >
                    <div
                        className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold"
                        style={{
                            background: "linear-gradient(135deg, var(--fm-primary), var(--fm-accent))",
                            fontFamily: "var(--fm-font-display)",
                        }}
                    >
                        {initials}
                    </div>
                </div>
            )}

            {/* Bottom overlay — name + indicators */}
            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-black/70 to-transparent z-20">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Mute indicator */}
                    {isMuted && (
                        <span
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                            style={{ background: "var(--fm-danger)" }}
                            title="Muted"
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.36 2.18" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </span>
                    )}

                    {/* Screen sharing indicator */}
                    {isScreenSharing && (
                        <span
                            className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium flex-shrink-0"
                            style={{ background: "var(--fm-success)", color: "#000" }}
                        >
                            Sharing
                        </span>
                    )}

                    {/* Name */}
                    <span
                        className="text-xs sm:text-sm font-medium truncate"
                        style={{ fontFamily: "var(--fm-font-body)", color: "var(--fm-text-primary)" }}
                    >
                        {isLocal ? `${name} (You)` : name}
                    </span>
                </div>
            </div>
        </div>
    );
}
