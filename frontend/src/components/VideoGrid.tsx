"use client";

import VideoTile from "./VideoTile";

interface Participant {
    stream: MediaStream;
    userId: string;
    name: string;
    isMuted?: boolean;
    isCameraOff?: boolean;
    isScreenSharing?: boolean;
}

interface VideoGridProps {
    localStream: MediaStream | null;
    localName: string;
    localIsMuted: boolean;
    localIsCameraOff: boolean;
    remoteParticipants: Participant[];
}

export default function VideoGrid({
    localStream,
    localName,
    localIsMuted,
    localIsCameraOff,
    remoteParticipants,
}: VideoGridProps) {
    const totalParticipants = remoteParticipants.length + 1; // +1 for local

    // Dynamic grid classes — mobile-first approach
    const getGridClass = () => {
        if (totalParticipants === 1) return "grid-cols-1";
        if (totalParticipants === 2) return "grid-cols-1 sm:grid-cols-2";
        if (totalParticipants <= 4) return "grid-cols-2";
        if (totalParticipants <= 6) return "grid-cols-2 md:grid-cols-3";
        return "grid-cols-2 md:grid-cols-3";
    };

    return (
        <div
            className={`grid ${getGridClass()} gap-1.5 sm:gap-2 p-1.5 sm:p-2 flex-1 auto-rows-fr overflow-hidden`}
            style={{
                /* Use dvh for iOS Safari dynamic viewport, fallback to vh */
                height: "calc(100dvh - var(--fm-toolbar-height) - var(--fm-header-height))",
            }}
        >
            {/* Local video tile */}
            <div className="min-h-0">
                <VideoTile
                    stream={localStream}
                    name={localName}
                    isMuted={localIsMuted}
                    isCameraOff={localIsCameraOff}
                    isLocal
                />
            </div>

            {/* Remote video tiles */}
            {remoteParticipants.map((participant) => (
                <div key={participant.userId} className="min-h-0">
                    <VideoTile
                        stream={participant.stream}
                        name={participant.name}
                        isMuted={participant.isMuted || false}
                        isCameraOff={participant.isCameraOff || false}
                        isScreenSharing={participant.isScreenSharing || false}
                    />
                </div>
            ))}
        </div>
    );
}
