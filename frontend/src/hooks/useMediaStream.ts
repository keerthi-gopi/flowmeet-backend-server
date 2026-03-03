"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useMediaStream() {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const screenStreamRef = useRef<MediaStream | null>(null);
    const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

    // Initialize camera and microphone
    const initStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            setLocalStream(stream);
            setPermissionError(null);
            return stream;
        } catch (err) {
            const error = err as Error;
            if (error.name === "NotAllowedError") {
                setPermissionError("Camera and microphone access was denied. Please allow access in your browser settings.");
            } else if (error.name === "NotFoundError") {
                setPermissionError("No camera or microphone found. Please connect a device.");
            } else {
                setPermissionError("Unable to access media devices. Please check your settings.");
            }
            return null;
        }
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (!localStream) return;
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach((track) => {
            track.enabled = !track.enabled;
        });
        setIsMuted((prev) => !prev);
    }, [localStream]);

    // Toggle camera
    const toggleCamera = useCallback(() => {
        if (!localStream) return;
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach((track) => {
            track.enabled = !track.enabled;
        });
        setIsCameraOff((prev) => !prev);
    }, [localStream]);

    // Start screen sharing
    const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            screenStreamRef.current = stream;
            setScreenStream(stream);

            // Save original video track
            if (localStream) {
                originalVideoTrackRef.current = localStream.getVideoTracks()[0] || null;
            }

            // Listen for browser's stop sharing
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    stopScreenShare();
                };
            }

            setIsScreenSharing(true);
            return stream;
        } catch {
            // User cancelled or permission denied
            return null;
        }
    }, [localStream]);

    // Stop screen sharing
    const stopScreenShare = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
            setScreenStream(null);
        }
        setIsScreenSharing(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            localStream?.getTracks().forEach((track) => track.stop());
            screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, [localStream]);

    return {
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
    };
}
