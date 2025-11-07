// client/websocket.js
const socket = io(); // connect to same host

// will be set by main.js
let canvasApp = null;

socket.on("connect", () => {
  console.log("connected", socket.id);
});

// initial state: list of ops to replay and users
socket.on("init", (payload) => {
  // payload.ops = visible ops
  if (canvasApp) {
    canvasApp.reconstruct(payload.ops);
  }
  updateUserCount(payload.users.length);
});

// server broadcasts a stroke_op entry
socket.on("stroke_op", (entry) => {
  if (canvasApp) {
    // entry is server-approved op with seq
    canvasApp.applyOp(entry);
  }
});

// toggle event: undo/redo
socket.on("op_toggle", (entry) => {
  // entry: { seq, type: "toggle", opId, visible, ... }
  // ask server for full visible ops to recompose, or maintain on client
  // simpler: request a fresh op list (for small scale we can rebuild using init)
  socket.emit('request_ops'); // not implemented server-side in this small example
});

// cursor updates
socket.on("cursor", (data) => {
  // data: { socketId, userId, x, y }
  showRemoteCursor(data);
});

// helper functions to use in main.js
function sendStroke(op) {
  socket.emit("stroke_op", op);
}

function sendCursor(userId, x, y) {
  socket.emit("cursor", { userId, x, y });
}

function requestUndo(userId, opId) {
  socket.emit("undo", { userId, opId });
}
function requestRedo(userId, opId) {
  socket.emit("redo", { userId, opId });
}

// export for main
window.socketBridge = {
  sendStroke, sendCursor, requestUndo, requestRedo, socket
};

socket.on("op_toggle", (toggle) => {
  console.log("Toggled:", toggle);
  // request full visible ops again
  socket.emit("request_visible_ops");
});

socket.on("visible_ops", (ops) => {
  if (window.canvasApp) {
    canvasApp.reconstruct(ops);
  }
});
socket.on("request_visible_ops", () => {
  socket.emit("visible_ops", drawingState.getVisibleOps());
});
