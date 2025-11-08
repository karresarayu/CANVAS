// server/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  color: { type: String, default: "#000000" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
