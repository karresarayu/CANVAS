// server/server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

// ✅ Connect to MongoDB
await connectDB();

// ✅ Initialize express app
const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "client")));
app.use("/api/auth", authRoutes);

const http = createServer(app);
const io = new Server(http, { cors: { origin: "*" } });

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
let ops = [];
let redoStack = [];

// 🧠 Authenticate Socket.IO connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { id: payload.id, username: payload.username, color: payload.color };
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    next(new Error("Invalid token"));
  }
});

// 🎨 Handle socket events
io.on("connection", (socket) => {
  console.log(`✅ ${socket.user.username} connected (${socket.id})`);

  // Send existing drawings to new user
  socket.emit("init", ops);
  broadcastUserList();

  // ✏️ Drawing event
  socket.on("stroke", (stroke) => {
    ops.push(stroke);
    redoStack = [];
    socket.broadcast.emit("stroke", stroke);
  });

  // ↩️ Undo
  socket.on("undo", () => {
    if (ops.length === 0) return;
    const last = ops.pop();
    redoStack.push(last);
    io.emit("init", ops);
  });

  // ↪️ Redo
  socket.on("redo", () => {
    if (redoStack.length === 0) return;
    const redoItem = redoStack.pop();
    ops.push(redoItem);
    io.emit("init", ops);
  });

  // 🗑️ Clear canvas
  socket.on("clear", () => {
    if (ops.length === 0) return;
    redoStack.push(...ops.splice(0, ops.length));
    io.emit("init", ops);
  });

  // 🖱️ Cursor movement
  socket.on("cursor", (data) => {
    socket.broadcast.emit("cursor", {
      id: socket.id,
      username: socket.user.username,
      color: socket.user.color,
      x: data.x,
      y: data.y,
    });
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    console.log(`❌ ${socket.user.username} disconnected`);
    socket.broadcast.emit("user-disconnected", socket.id);
    broadcastUserList();
  });
});

// 🧩 Helper: Broadcast list of online users
function broadcastUserList() {
  const users = Array.from(io.sockets.sockets.values()).map((s) => ({
    socketId: s.id,
    username: s.user?.username,
    color: s.user?.color,
  }));
  io.emit("userList", users);
}

// 🚀 Start server with auto port handling
const PORT = process.env.PORT || 3000;

http.listen(PORT)
  .on("listening", () => console.log(`✅ Server running on port ${PORT}`))
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const altPort = Number(PORT) + 1;
      console.warn(`⚠️ Port ${PORT} in use, trying ${altPort}...`);
      http.listen(altPort, () => console.log(`✅ Server running on port ${altPort}`));
    } else {
      throw err;
    }
  });
