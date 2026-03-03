// FlowMeet Backend — Express + Socket.IO entry point
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupSignaling } from "./signaling";
import { getRoomCount } from "./rooms";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// CORS
app.use(
    cors({
        origin: [CLIENT_URL, "http://localhost:3000"],
        methods: ["GET", "POST"],
    })
);

app.use(express.json());

// Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: [CLIENT_URL, "http://localhost:3000"],
        methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Health check
app.get("/", (_req, res) => {
    res.json({
        status: "ok",
        service: "FlowMeet Signaling Server",
        rooms: getRoomCount(),
        uptime: process.uptime(),
    });
});

// Setup signaling events
setupSignaling(io);

httpServer.listen(PORT, () => {
    console.log(`\n🚀 FlowMeet signaling server running on port ${PORT}`);
    console.log(`   Client URL: ${CLIENT_URL}`);
    console.log(`   Health: http://localhost:${PORT}/\n`);
});
