"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

interface RemoteStream {
    stream: MediaStream;
    userId: string;
    name: string;
}

export function useWebRTC(
    socket: Socket | null,
    localStream: MediaStream | null,
    roomId: string,
    userId: string
) {
    const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    const localStreamRef = useRef(localStream);
    const socketRef = useRef(socket);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    const createPeerConnection = useCallback((remoteUserId: string, remoteName: string): RTCPeerConnection => {
        const existingPc = peerConnections.current.get(remoteUserId);
        if (existingPc) {
            console.log(`[WebRTC] Closing existing PC for ${remoteUserId}`);
            existingPc.close();
        }

        console.log(`[WebRTC] Creating new PC for ${remoteUserId}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks
        const stream = localStreamRef.current;
        if (stream) {
            console.log(`[WebRTC] Adding local tracks for ${remoteUserId}`);
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log(`[WebRTC] Received track from ${remoteUserId}:`, event.track.kind);
            const [remoteStream] = event.streams;
            if (remoteStream) {
                setRemoteStreams((prev) => {
                    const next = new Map(prev);
                    next.set(remoteUserId, {
                        stream: remoteStream,
                        userId: remoteUserId,
                        name: remoteName,
                    });
                    return next;
                });
            }
        };

        // Send ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("ice-candidate", {
                    candidate: event.candidate.toJSON(),
                    toUserId: remoteUserId,
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE state for ${remoteUserId}: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === "failed") {
                console.warn(`[WebRTC] ICE failed for ${remoteUserId}, attempting restart`);
                pc.restartIce();
            } else if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "closed") {
                if (pc.iceConnectionState === "closed") {
                    peerConnections.current.delete(remoteUserId);
                    setRemoteStreams((prev) => {
                        const next = new Map(prev);
                        next.delete(remoteUserId);
                        return next;
                    });
                }
            }
        };

        // Signaling state logging
        pc.onsignalingstatechange = () => {
            console.log(`[WebRTC] Signaling state for ${remoteUserId}: ${pc.signalingState}`);
        };

        peerConnections.current.set(remoteUserId, pc);
        return pc;
    }, []);

    const createOffer = useCallback(async (remoteUserId: string, remoteName: string) => {
        console.log(`[WebRTC] Creating offer for ${remoteUserId}`);
        const pc = createPeerConnection(remoteUserId, remoteName);

        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);

            if (socketRef.current) {
                socketRef.current.emit("webrtc-offer", {
                    offer: pc.localDescription,
                    toUserId: remoteUserId,
                });
            }
        } catch (err) {
            console.error("[WebRTC] Error creating offer:", err);
        }
    }, [createPeerConnection]);

    const handleOffer = useCallback(async (fromUserId: string, offer: RTCSessionDescriptionInit, fromName: string = "Participant") => {
        console.log(`[WebRTC] Received offer from ${fromUserId}`);
        const pc = createPeerConnection(fromUserId, fromName);

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Apply pending candidates immediately after setting remote description
            const pending = pendingCandidates.current.get(fromUserId) || [];
            for (const candidate of pending) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("[WebRTC] Error applying pending candidate:", e);
                }
            }
            pendingCandidates.current.delete(fromUserId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (socketRef.current) {
                socketRef.current.emit("webrtc-answer", {
                    answer: pc.localDescription, // Send the local description which represents the answer
                    toUserId: fromUserId,
                });
            }
        } catch (err) {
            console.error("[WebRTC] Error handling offer:", err);
        }
    }, [createPeerConnection]);

    const handleAnswer = useCallback(async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
        console.log(`[WebRTC] Received answer from ${fromUserId}`);
        const pc = peerConnections.current.get(fromUserId);

        if (!pc) {
            console.warn(`[WebRTC] No peer connection to handle answer from ${fromUserId}`);
            return;
        }

        try {
            if (pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));

                const pending = pendingCandidates.current.get(fromUserId) || [];
                for (const candidate of pending) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error("[WebRTC] Error applying pending candidate:", e);
                    }
                }
                pendingCandidates.current.delete(fromUserId);
            } else {
                console.warn(`[WebRTC] Unexpected signaling state: ${pc.signalingState}. Expected have-local-offer`);
            }
        } catch (err) {
            console.error("[WebRTC] Error handling answer:", err);
        }
    }, []);

    const handleIceCandidate = useCallback(async (fromUserId: string, candidate: RTCIceCandidateInit) => {
        const pc = peerConnections.current.get(fromUserId);

        if (!pc || !pc.remoteDescription) {
            console.log(`[WebRTC] Queuing candidate from ${fromUserId} (no pc or remote description yet)`);
            if (!pendingCandidates.current.has(fromUserId)) {
                pendingCandidates.current.set(fromUserId, []);
            }
            pendingCandidates.current.get(fromUserId)!.push(candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error("[WebRTC] Error adding ICE candidate:", err);
        }
    }, []);

    const removePeer = useCallback((remoteUserId: string) => {
        const pc = peerConnections.current.get(remoteUserId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(remoteUserId);
        }
        pendingCandidates.current.delete(remoteUserId);

        setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(remoteUserId);
            return next;
        });
    }, []);

    const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
        peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
                sender.replaceTrack(newTrack);
            }
        });
    }, []);

    useEffect(() => {
        if (!socket) return;

        console.log("[WebRTC] Registering socket listeners");

        const onExistingParticipants = (participants: Array<{ userId: string; name: string }>) => {
            console.log(`[WebRTC] Received ${participants.length} existing participants`);
            participants.forEach((p) => {
                // Ensure we don't spam offers if we already have a connection
                if (!peerConnections.current.has(p.userId)) {
                    createOffer(p.userId, p.name);
                }
            });
        };

        const onUserJoined = ({ userId: newUserId, name }: { userId: string; name: string }) => {
            console.log(`[WebRTC] User joined: ${name} (${newUserId})`);
        };

        const onOffer = ({ offer, fromUserId, fromName }: { offer: RTCSessionDescriptionInit; fromUserId: string; fromName?: string }) => {
            handleOffer(fromUserId, offer, fromName);
        };

        const onAnswer = ({ answer, fromUserId }: { answer: RTCSessionDescriptionInit; fromUserId: string }) => {
            handleAnswer(fromUserId, answer);
        };

        const onIceCandidate = ({ candidate, fromUserId }: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
            handleIceCandidate(fromUserId, candidate);
        };

        const onUserLeft = ({ userId: leftUserId }: { userId: string }) => {
            removePeer(leftUserId);
        };

        const onRoomEnded = () => {
            peerConnections.current.forEach((pc) => pc.close());
            peerConnections.current.clear();
            pendingCandidates.current.clear();
            setRemoteStreams(new Map());
        };

        socket.on("existing-participants", onExistingParticipants);
        socket.on("user-joined", onUserJoined);
        socket.on("webrtc-offer", onOffer);
        socket.on("webrtc-answer", onAnswer);
        socket.on("ice-candidate", onIceCandidate);
        socket.on("user-left", onUserLeft);
        socket.on("room-ended", onRoomEnded);

        return () => {
            console.log("[WebRTC] Cleaning up socket listeners");
            socket.off("existing-participants", onExistingParticipants);
            socket.off("user-joined", onUserJoined);
            socket.off("webrtc-offer", onOffer);
            socket.off("webrtc-answer", onAnswer);
            socket.off("ice-candidate", onIceCandidate);
            socket.off("user-left", onUserLeft);
            socket.off("room-ended", onRoomEnded);
        };
    }, [socket, createOffer, handleOffer, handleAnswer, handleIceCandidate, removePeer]);

    useEffect(() => {
        return () => {
            peerConnections.current.forEach((pc) => pc.close());
            peerConnections.current.clear();
        };
    }, []);

    return {
        remoteStreams,
        replaceVideoTrack,
    };
}
