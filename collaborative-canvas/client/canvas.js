// client/canvas.js
// Exposes: CanvasApp class


class CanvasApp {
  constructor(canvasEl, cursorsEl, sendStrokeFn, options = {}) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext("2d");
    this.cursorsEl = cursorsEl;
    this.sendStroke = sendStrokeFn; // callback to emit stroke to server

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // drawing state
    this.drawing = false;
    this.currentPoints = [];
    this.color = options.color || "#000";
    this.size = options.size || 4;
    this.tool = "brush";

    // history for local UI (we still rely on server for global consistency)
    this.localOps = []; // store ops local copy (opId)
    this.visibleOps = []; // op entries applied locally

    // event listeners
    this.initEvents();
  }

  resizeCanvas() {
    // preserve drawing by copying current image
    const w = Math.min(window.innerWidth - 80, 1200);
    const h = Math.min(window.innerHeight - 150, 800);
    const temp = document.createElement('canvas');
    temp.width = this.canvas.width;
    temp.height = this.canvas.height;
    const tctx = temp.getContext('2d');
    tctx.drawImage(this.canvas, 0, 0);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(temp, 0, 0);
  }

  setColor(c) { this.color = c; }
  setSize(s) { this.size = s; }
  setTool(tool) { this.tool = tool; }

  initEvents() {
    // mouse
    this.canvas.addEventListener('mousedown', e => this.start(e));
    document.addEventListener('mouseup', e => this.stop(e));
    this.canvas.addEventListener('mousemove', e => this.move(e));

    // touch
    this.canvas.addEventListener('touchstart', e => this.start(e, true), {passive:false});
    document.addEventListener('touchend', e => this.stop(e), {passive:false});
    this.canvas.addEventListener('touchmove', e => this.move(e, true), {passive:false});

    // prevent context menu
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  getPos(e, isTouch = false) {
    const rect = this.canvas.getBoundingClientRect();
    if (isTouch) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    } else {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }

  start(e, isTouch=false) {
    e.preventDefault();
    const p = this.getPos(e, isTouch);
    this.drawing = true;
    this.currentPoints = [{x: p.x, y: p.y}];
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
  }

  move(e, isTouch=false) {
    if (!this.drawing) return;
    e.preventDefault();
    const p = this.getPos(e, isTouch);
    this.currentPoints.push({x: p.x, y: p.y});
    this.drawSegment(this.currentPoints[this.currentPoints.length-2], p, { color: this.tool === 'eraser' ? '#ffffff' : this.color, size: this.size });
  }

  stop(e) {
    if (!this.drawing) return;
    this.drawing = false;
    // finalize stroke: emit stroke op
    if (this.currentPoints.length > 0) {
      const op = {
        opId: this.generateOpId(),
        userId: this.getUserId(),
        points: this.simplifyPoints(this.currentPoints),
        color: this.tool === 'eraser' ? '#ffffff' : this.color,
        size: this.size,
        tool: this.tool,
        timestamp: Date.now()
      };
      this.localOps.push(op);
      if (this.sendStroke) this.sendStroke(op);
    }
    this.currentPoints = [];
    this.ctx.beginPath();
  }

  // dumb simplification - optionally use Ramer–Douglas–Peucker in advanced version
  simplifyPoints(points) {
    // remove duplicates
    const res = [];
    let last = null;
    for (const p of points) {
      if (!last || last.x !== p.x || last.y !== p.y) res.push(p);
      last = p;
    }
    return res;
  }

  drawSegment(p1, p2, style) {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = style.color;
    this.ctx.lineWidth = style.size;
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  // apply op from server (in sequence)
  applyOp(op) {
    if (!op || !op.points) return;
    // draw all segments
    for (let i=1; i<op.points.length; i++) {
      this.drawSegment(op.points[i-1], op.points[i], { color: op.color, size: op.size });
    }
    this.visibleOps.push(op);
  }

  // reconstruct canvas from visible operations (used on toggle events or initial state)
 reconstruct(ops) {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  for (const op of ops) {
    if (op.visible !== false && op.points) {
      for (let i = 1; i < op.points.length; i++) {
        this.drawSegment(op.points[i - 1], op.points[i], {
          color: op.color,
          size: op.size
        });
      }
    }
  }
}


  // helper IDs
  generateOpId() {
    return 'op_' + Math.random().toString(36).slice(2,10);
  }
  getUserId() {
    // put something unique per client: use socket id or random id set from main.js
    return this._userId || (this._userId = 'u_' + Math.random().toString(36).slice(2,8));
  }

  // cursor overlay managers
  setRemoteCursors(users) {
    // expects users: [{ socketId, x, y }]
    // handled by websocket.js
  }
}




window.CanvasApp = CanvasApp;
