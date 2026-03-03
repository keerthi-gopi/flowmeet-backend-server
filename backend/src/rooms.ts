// Room management for FlowMeet signaling server

export interface Participant {
    name: string;
    socketId: string;
}

// Map<roomId, Map<userId, Participant>>
const rooms = new Map<string, Map<string, Participant>>();

export function addParticipant(
    roomId: string,
    userId: string,
    name: string,
    socketId: string
): Participant[] {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
    }
    const room = rooms.get(roomId)!;
    room.set(userId, { name, socketId });

    // Return all other participants
    return Array.from(room.entries())
        .filter(([id]) => id !== userId)
        .map(([id, p]) => ({ ...p, userId: id }));
}

export function removeParticipant(
    roomId: string,
    userId: string
): boolean {
    const room = rooms.get(roomId);
    if (!room) return false;

    room.delete(userId);

    // Clean up empty rooms
    if (room.size === 0) {
        rooms.delete(roomId);
    }

    return true;
}

export function getParticipants(roomId: string): Map<string, Participant> | undefined {
    return rooms.get(roomId);
}

export function findUserBySocketId(
    socketId: string
): { roomId: string; userId: string; name: string } | null {
    for (const [roomId, room] of rooms) {
        for (const [userId, participant] of room) {
            if (participant.socketId === socketId) {
                return { roomId, userId, name: participant.name };
            }
        }
    }
    return null;
}

export function getRoomCount(): number {
    return rooms.size;
}
