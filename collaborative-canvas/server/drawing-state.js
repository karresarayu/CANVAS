// server/drawing-state.js
import { nanoid } from "nanoid";

export class DrawingState {
  constructor() {
    this.ops = []; // all drawing operations
    this.seq = 0;
  }

  addOp(op) {
    this.seq++;
    const entry = {
      seq: this.seq,
      opId: op.opId || nanoid(),
      userId: op.userId,
      points: op.points,
      color: op.color,
      size: op.size,
      tool: op.tool || "brush",
      timestamp: op.timestamp || Date.now(),
      visible: true
    };
    this.ops.push(entry);
    return entry;
  }

  toggleOpVisibility(opId, visible, userId) {
    const index = this.ops.findIndex(o => o.opId === opId);
    if (index === -1) return null;

    this.ops[index].visible = visible;
    this.seq++;
    const toggleEntry = {
      seq: this.seq,
      type: "toggle",
      opId,
      visible,
      userId,
      timestamp: Date.now()
    };
    this.ops.push(toggleEntry);
    return toggleEntry;
  }

  getVisibleOps() {
    return this.ops.filter(o => o.visible && o.points);
  }
}
