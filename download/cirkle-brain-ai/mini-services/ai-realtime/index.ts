/**
 * CIRKLE Brain AI — Real-Time WebSocket Service (Upgrade 7)
 * ============================================================================
 *
 * Socket.io mini-service for real-time AI updates:
 *   - TEE execution progress (step-by-step)
 *   - UOB plan generation progress
 *   - LIEE proposal notifications
 *   - TGSE approval requests
 *   - AHG fix execution progress
 *
 * Frontend connects via: io("/?XTransformPort=3001")
 * ============================================================================
 */

import { createServer } from "http";
import { Server } from "socket.io";

const PORT = 3001;

const httpServer = createServer((req, res) => {
  // Health check endpoint.
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "ai-realtime", port: PORT }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("CIRKLE AI Real-Time Service");
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/",
});

// ── Connection handling ──────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[ai-realtime] Client connected: ${socket.id}`);

  // Join rooms for specific topics.
  socket.on("subscribe", (rooms: string[]) => {
    for (const room of rooms) {
      socket.join(room);
      console.log(`[ai-realtime] ${socket.id} joined room: ${room}`);
    }
  });

  socket.on("unsubscribe", (rooms: string[]) => {
    for (const room of rooms) {
      socket.leave(room);
    }
  });

  // ── TEE execution progress ─────────────────────────────────────────
  socket.on("tee:execution-started", (data: { executionId: string; planId: string }) => {
    io.to(`tee:${data.executionId}`).emit("tee:progress", { ...data, step: "started" });
  });

  socket.on("tee:step-completed", (data: { executionId: string; stepId: string; capabilityId: string; state: string }) => {
    io.to(`tee:${data.executionId}`).emit("tee:progress", { ...data, step: "step-completed" });
  });

  socket.on("tee:execution-completed", (data: { executionId: string; state: string; summary: string }) => {
    io.to(`tee:${data.executionId}`).emit("tee:progress", { ...data, step: "completed" });
  });

  // ── AHG fix progress ───────────────────────────────────────────────
  socket.on("ahg:fix-started", (data: { problemId: string; fixId: string }) => {
    io.to(`ahg:${data.problemId}`).emit("ahg:progress", { ...data, step: "fix-started" });
  });

  socket.on("ahg:fix-completed", (data: { problemId: string; fixId: string; resolved: boolean }) => {
    io.to(`ahg:${data.problemId}`).emit("ahg:progress", { ...data, step: "fix-completed" });
  });

  // ── TGSE approval notifications ────────────────────────────────────
  socket.on("tgse:approval-requested", (data: { requestId: string; target: string; trigger: string }) => {
    io.to("tgse:approvals").emit("tgse:approval", data);
  });

  socket.on("disconnect", () => {
    console.log(`[ai-realtime] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[ai-realtime] WebSocket service running on port ${PORT}`);
});
