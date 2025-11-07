// server/server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.static(path.join(process.cwd(), "client")));

const http = createServer(app);
const io = new Server(http, { cors: { origin: "*" } });

// Simple server-side storage (in-memory)
let ops = [];        // main operation list (order of strokes)
let redoStack = [];  // undone strokes for redo

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // send current ops to new client
  socket.emit("init", ops);

  // receive a finished stroke (array of points with styles)
  socket.on("stroke", (stroke) => {
    if (!stroke || !Array.isArray(stroke) || stroke.length === 0) return;
    ops.push(stroke);
    // new action invalidates redo stack
    redoStack = [];
    // broadcast new stroke to others (optional incremental)
    socket.broadcast.emit("stroke", stroke);

  });
  // When a new user connects
io.emit("userCount", io.engine.clientsCount);

socket.on("disconnect", () => {
  io.emit("userCount", io.engine.clientsCount);
  console.log("User disconnected:", socket.id);
});


  // undo: remove last stroke and push to redoStack
  socket.on("undo", () => {
    if (ops.length === 0) {
      socket.emit("no-op", { reason: "nothing to undo" });
      return;
    }
    const last = ops.pop();
    redoStack.push(last);
    // broadcast full updated ops to everyone
    io.emit("init", ops);
  });

  // redo: pop from redoStack and push back to ops
  socket.on("redo", () => {
    if (redoStack.length === 0) {
      socket.emit("no-op", { reason: "nothing to redo" });
      return;
    }
    const r = redoStack.pop();
    ops.push(r);
    io.emit("init", ops);
  });

  // clear: clear all strokes (store them into redoStack so redo can restore)
  socket.on("clear", () => {
    if (ops.length === 0) {
      socket.emit("no-op", { reason: "nothing to clear" });
      return;
    }
    // move current ops to redoStack (in order) so redo can restore them
    // keep redoStack as last-action-first-restore? We'll push the whole ops as one item
    redoStack.push(...ops.splice(0, ops.length)); // push all
    io.emit("init", ops); // now ops is empty
  });

  // optional: client requests full ops
  socket.on("request_init", () => {
    socket.emit("init", ops);
  });

  socket.on("disconnect", () => {
    console.log("disconnect:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server listening on", PORT));
