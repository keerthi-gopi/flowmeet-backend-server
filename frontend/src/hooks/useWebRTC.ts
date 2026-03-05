"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // Free TURN relay servers — critical for connections across different networks
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
    iceCandidatePoolSize: 10,
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
    // Track which side is the offerer (to avoid duplicate offers on negotiationneeded)
    const isOfferer = useRef<Set<string>>(new Set());
    // Flag to suppress negotiationneeded during initial setup
    const makingOffer = useRef<Set<string>>(new Set());
    // Track ICE disconnect timeouts
    const iceTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

        // Clear any existing ICE timeout
        const existingTimeout = iceTimeouts.current.get(remoteUserId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            iceTimeouts.current.delete(remoteUserId);
        }

        console.log(`[WebRTC] Creating new PC for ${remoteUserId}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks if available
        const stream = localStreamRef.current;
        if (stream) {
            console.log(`[WebRTC] Adding ${stream.getTracks().length} local tracks for ${remoteUserId}`);
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });
        } else {
            console.warn(`[WebRTC] No local stream available yet for ${remoteUserId} — tracks will be added later`);
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log(`[WebRTC] Received track from ${remoteUserId}: ${event.track.kind}, readyState=${event.track.readyState}`);
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

                // Listen for track unmute (important for mobile where tracks may start muted)
                event.track.onunmute = () => {
                    console.log(`[WebRTC] Track unmuted from ${remoteUserId}: ${event.track.kind}`);
                    // Force re-render by updating the stream reference
                    setRemoteStreams((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(remoteUserId);
                        if (existing) {
                            next.set(remoteUserId, { ...existing });
                        }
                        return next;
                    });
                };
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

        // ICE gathering state logging
        pc.onicegatheringstatechange = () => {
            console.log(`[WebRTC] ICE gathering state for ${remoteUserId}: ${pc.iceGatheringState}`);
        };

        // Connection state monitoring with smart reconnection
        pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE connection state for ${remoteUserId}: ${pc.iceConnectionState}`);

            // Clear any pending timeout
            const pendingTimeout = iceTimeouts.current.get(remoteUserId);
            if (pendingTimeout) {
                clearTimeout(pendingTimeout);
                iceTimeouts.current.delete(remoteUserId);
            }

            switch (pc.iceConnectionState) {
                case "connected":
                case "completed":
                    console.log(`[WebRTC] ✅ Connected to ${remoteUserId}`);
                    break;

                case "disconnected":
                    // Wait 5 seconds — temporary disconnections are common on mobile
                    console.warn(`[WebRTC] Disconnected from ${remoteUserId}, waiting 5s before restart...`);
                    const timeout = setTimeout(() => {
                        if (pc.iceConnectionState === "disconnected") {
                            console.warn(`[WebRTC] Still disconnected from ${remoteUserId}, restarting ICE`);
                            pc.restartIce();
                        }
                    }, 5000);
                    iceTimeouts.current.set(remoteUserId, timeout);
                    break;

                case "failed":
                    console.warn(`[WebRTC] ICE failed for ${remoteUserId}, attempting ICE restart`);
                    pc.restartIce();
                    break;

                case "closed":
                    peerConnections.current.delete(remoteUserId);
                    setRemoteStreams((prev) => {
                        const next = new Map(prev);
                        next.delete(remoteUserId);
                        return next;
                    });
                    break;
            }
        };

        // Handle negotiationneeded — fires when tracks are added after initial SDP
        pc.onnegotiationneeded = async () => {
            // Only the offerer side should send renegotiation offers
            if (!isOfferer.current.has(remoteUserId)) {
                console.log(`[WebRTC] negotiationneeded for ${remoteUserId} but we're the answerer — skipping`);
                return;
            }

            if (makingOffer.current.has(remoteUserId)) {
                console.log(`[WebRTC] negotiationneeded for ${remoteUserId} but already making offer — skipping`);
                return;
            }

            console.log(`[WebRTC] negotiationneeded for ${remoteUserId} — sending renegotiation offer`);
            makingOffer.current.add(remoteUserId);

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
                console.error("[WebRTC] Error creating renegotiation offer:", err);
            } finally {
                makingOffer.current.delete(remoteUserId);
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
        isOfferer.current.add(remoteUserId);
        makingOffer.current.add(remoteUserId);

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
        } finally {
            makingOffer.current.delete(remoteUserId);
        }
    }, [createPeerConnection]);

    const handleOffer = useCallback(async (fromUserId: string, offer: RTCSessionDescriptionInit, fromName: string = "Participant") => {
        console.log(`[WebRTC] Received offer from ${fromUserId}`);
        // The person receiving the offer is the answerer
        isOfferer.current.delete(fromUserId);

        const pc = createPeerConnection(fromUserId, fromName);

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Apply pending candidates immediately after setting remote description
            const pending = pendingCandidates.current.get(fromUserId) || [];
            console.log(`[WebRTC] Applying ${pending.length} pending candidates for ${fromUserId}`);
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
                    answer: pc.localDescription,
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
                console.log(`[WebRTC] Applying ${pending.length} pending candidates for ${fromUserId} after answer`);
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
        isOfferer.current.delete(remoteUserId);
        makingOffer.current.delete(remoteUserId);

        const timeout = iceTimeouts.current.get(remoteUserId);
        if (timeout) {
            clearTimeout(timeout);
            iceTimeouts.current.delete(remoteUserId);
        }

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

    // === KEY FIX: When localStream becomes available, add tracks to all existing peer connections ===
    useEffect(() => {
        if (!localStream) return;

        console.log(`[WebRTC] localStream available with ${localStream.getTracks().length} tracks — adding to ${peerConnections.current.size} existing PCs`);

        peerConnections.current.forEach((pc, peerId) => {
            const senders = pc.getSenders();

            localStream.getTracks().forEach((track) => {
                // Check if this track kind is already being sent
                const existingSender = senders.find(
                    (s) => s.track?.kind === track.kind
                );

                if (existingSender) {
                    // Replace existing track (e.g., if we had a placeholder)
                    console.log(`[WebRTC] Replacing ${track.kind} track in PC for ${peerId}`);
                    existingSender.replaceTrack(track);
                } else {
                    // Add new track — this will trigger negotiationneeded
                    console.log(`[WebRTC] Adding ${track.kind} track to PC for ${peerId}`);
                    pc.addTrack(track, localStream);
                }
            });
        });
    }, [localStream]);

    // Socket event listeners
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
            // The new user will send us an offer via existing-participants,
            // so we just wait for the offer here.
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
            isOfferer.current.clear();
            makingOffer.current.clear();
            iceTimeouts.current.forEach((t) => clearTimeout(t));
            iceTimeouts.current.clear();
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            peerConnections.current.forEach((pc) => pc.close());
            peerConnections.current.clear();
            iceTimeouts.current.forEach((t) => clearTimeout(t));
            iceTimeouts.current.clear();
        };
    }, []);

    return {
        remoteStreams,
        replaceVideoTrack,
    };
}
