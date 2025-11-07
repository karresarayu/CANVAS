// server/rooms.js
export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Set(socketId)
  }
  addUser(roomId, socketId) {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
    this.rooms.get(roomId).add(socketId);
  }
  removeUser(roomId, socketId) {
    if (!this.rooms.has(roomId)) return;
    this.rooms.get(roomId).delete(socketId);
  }
  getUsers(roomId) {
    const set = this.rooms.get(roomId) || new Set();
    return Array.from(set);
  }
}
