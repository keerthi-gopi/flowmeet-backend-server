// WebRTC signaling event handlers for FlowMeet
import { Server, Socket } from "socket.io";
import {
    addParticipant,
    removeParticipant,
    findUserBySocketId,
    getParticipants,
} from "./rooms";

interface JoinRoomPayload {
    roomId: string;
    userId: string;
    name: string;
}

interface SignalPayload {
    toUserId: string;
    offer?: any;
    answer?: any;
    candidate?: any;
}

interface ChatMessagePayload {
    text: string;
    sender: string;
    time: number;
}

interface MediaUpdatePayload {
    userId: string;
    isMuted?: boolean;
    isOff?: boolean;
}

export function setupSignaling(io: Server): void {
    io.on("connection", (socket: Socket) => {
        console.log(`[FlowMeet] Client connected: ${socket.id}`);

        // Join room
        socket.on("join-room", ({ roomId, userId, name }: JoinRoomPayload) => {
            socket.join(roomId);

            const existingParticipants = addParticipant(roomId, userId, name, socket.id);

            // Notify others in the room
            socket.to(roomId).emit("user-joined", { userId, name });

            // Send existing participants to the new user
            socket.emit("existing-participants", existingParticipants);

            console.log(`[FlowMeet] ${name} (${userId}) joined room ${roomId}`);
        });

        // WebRTC offer relay
        socket.on("webrtc-offer", ({ toUserId, offer, ...rest }: SignalPayload & { fromUserId: string }) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            const room = getParticipants(user.roomId);
            if (!room) return;

            const target = room.get(toUserId);
            if (target) {
                io.to(target.socketId).emit("webrtc-offer", {
                    offer,
                    fromUserId: user.userId,
                    fromName: user.name,
                });
            }
        });

        // WebRTC answer relay
        socket.on("webrtc-answer", ({ toUserId, answer }: SignalPayload) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            const room = getParticipants(user.roomId);
            if (!room) return;

            const target = room.get(toUserId);
            if (target) {
                io.to(target.socketId).emit("webrtc-answer", {
                    answer,
                    fromUserId: user.userId,
                    fromName: user.name,
                });
            }
        });

        // ICE candidate relay
        socket.on("ice-candidate", ({ toUserId, candidate }: SignalPayload) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            const room = getParticipants(user.roomId);
            if (!room) return;

            const target = room.get(toUserId);
            if (target) {
                io.to(target.socketId).emit("ice-candidate", {
                    candidate,
                    fromUserId: user.userId,
                    fromName: user.name,
                });
            }
        });

        // Chat message broadcast
        socket.on("chat-message", (payload: ChatMessagePayload) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            socket.to(user.roomId).emit("chat-message", payload);
        });

        // Mute state broadcast
        socket.on("mute-update", (payload: MediaUpdatePayload) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            socket.to(user.roomId).emit("mute-update", payload);
        });

        // Camera state broadcast
        socket.on("camera-update", (payload: MediaUpdatePayload) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            socket.to(user.roomId).emit("camera-update", payload);
        });

        // Screen share signals
        socket.on("screen-share-start", ({ userId }: { userId: string }) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            socket.to(user.roomId).emit("screen-share-start", { userId });
        });

        socket.on("screen-share-stop", ({ userId }: { userId: string }) => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            socket.to(user.roomId).emit("screen-share-stop", { userId });
        });

        // End room for all participants
        socket.on("end-room", () => {
            const user = findUserBySocketId(socket.id);
            if (!user) return;

            socket.to(user.roomId).emit("room-ended");
            console.log(`[FlowMeet] Room ${user.roomId} ended by host`);
        });

        // Disconnect handling
        socket.on("disconnect", () => {
            const user = findUserBySocketId(socket.id);
            if (user) {
                removeParticipant(user.roomId, user.userId);
                socket.to(user.roomId).emit("user-left", { userId: user.userId });
                console.log(`[FlowMeet] ${user.userId} disconnected from ${user.roomId}`);
            }
        });
    });
}
