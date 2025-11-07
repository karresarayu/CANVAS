// client/main.js
const socket = io();

const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

// Adjust canvas size dynamically
function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth - 40, 1200);
  canvas.height = Math.min(window.innerHeight - 140, 800);
  socket.emit("request_init");
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Drawing variables
let drawing = false;
let tool = "brush";
let color = "#000000";
let size = 5;
let currentStroke = [];

// UI elements
const brushBtn = document.getElementById("brushBtn");
const eraserBtn = document.getElementById("eraserBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");

// 🧠 Utility: highlight active tool button
function setActive(button) {
  document.querySelectorAll("#toolbar button").forEach(btn => btn.classList.remove("active"));
  button.classList.add("active");
}

// 🖌️ Brush Tool
brushBtn.onclick = () => {
  tool = "brush";
  setActive(brushBtn);
  canvas.style.cursor = "crosshair";
};

// 🧽 Eraser Tool
eraserBtn.onclick = () => {
  tool = "eraser";
  setActive(eraserBtn);
  canvas.style.cursor = "cell";
};

// 🎨 Color and Size Pickers
colorPicker.oninput = (e) => (color = e.target.value);
sizePicker.oninput = (e) => (size = e.target.value);

// ↩️ Undo
undoBtn.onclick = () => {
  socket.emit("undo");
  flashActive(undoBtn);
};

// ↪️ Redo
redoBtn.onclick = () => {
  socket.emit("redo");
  flashActive(redoBtn);
};

// 🗑️ Clear Canvas
clearBtn.onclick = () => {
  if (confirm("Clear canvas for everyone?")) {
    socket.emit("clear");
    flashActive(clearBtn);
  }
};

// 💾 Download
downloadBtn.onclick = () => {
  const link = document.createElement("a");
  link.download = `canvas_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  flashActive(downloadBtn);
};

// 💫 Temporary flash for one-time buttons
function flashActive(button) {
  setActive(button);
  setTimeout(() => button.classList.remove("active"), 400);
}

// 🖱️ Mouse / Touch Drawing Handlers
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  currentStroke = [];
  const p = getPos(e);
  currentStroke.push({ x: p.x, y: p.y, color, size, tool });
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
});

canvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = getPos(e);
  const last = currentStroke[currentStroke.length - 1];
  ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  currentStroke.push({ x: p.x, y: p.y, color, size, tool });
});

canvas.addEventListener("pointerup", () => {
  if (!drawing) return;
  drawing = false;
  ctx.beginPath();
  if (currentStroke.length > 1) {
    socket.emit("stroke", currentStroke);
  }
  currentStroke = [];
});

// 🧩 Redraw helper for full refresh
function redrawAll(strokes) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!Array.isArray(strokes)) return;
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2) continue;
    for (let i = 1; i < stroke.length; i++) {
      const p1 = stroke[i - 1];
      const p2 = stroke[i];
      ctx.strokeStyle = p2.tool === "eraser" ? "#ffffff" : p2.color;
      ctx.lineWidth = p2.size;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }
}

// 🔌 Socket listeners
socket.on("connect", () => {
  socket.emit("request_init");
});

socket.on("stroke", (stroke) => {
  // incremental draw from another user
  if (!stroke || stroke.length < 2) return;
  for (let i = 1; i < stroke.length; i++) {
    const p1 = stroke[i - 1];
    const p2 = stroke[i];
    ctx.strokeStyle = p2.tool === "eraser" ? "#ffffff" : p2.color;
    ctx.lineWidth = p2.size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
});

socket.on("init", (allOps) => {
  redrawAll(allOps);
});

socket.on("clear", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on("no-op", (info) => {
  console.log("Nothing to undo/redo:", info);
});

const userCountEl = document.getElementById("userCount");

socket.on("userCount", (count) => {
  userCountEl.textContent = `👥 Users Online: ${count}`;
});


// 🔗 Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") {
    socket.emit("undo");
    flashActive(undoBtn);
  }
  if (e.ctrlKey && e.key === "y") {
    socket.emit("redo");
    flashActive(redoBtn);
  }
});
