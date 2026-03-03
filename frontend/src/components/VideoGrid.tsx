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

    // Dynamic grid layout
    const getGridClass = () => {
        if (totalParticipants === 1) return "grid-cols-1";
        if (totalParticipants === 2) return "grid-cols-1 md:grid-cols-2";
        if (totalParticipants <= 4) return "grid-cols-2";
        if (totalParticipants <= 6) return "grid-cols-2 md:grid-cols-3";
        return "grid-cols-3";
    };

    // Dynamic height for each tile
    const getRowHeight = () => {
        if (totalParticipants === 1) return "h-full";
        if (totalParticipants <= 2) return "h-[calc(100vh-120px)] md:h-[calc(100vh-120px)]";
        if (totalParticipants <= 4) return "h-[calc(50vh-60px)]";
        return "h-[calc(33vh-50px)]";
    };

    return (
        <div
            className={`grid ${getGridClass()} gap-2 p-2 flex-1 auto-rows-fr`}
            style={{ maxHeight: "calc(100vh - 90px)" }}
        >
            {/* Local video tile */}
            <div className={`${getRowHeight()}`}>
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
                <div key={participant.userId} className={`${getRowHeight()}`}>
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
