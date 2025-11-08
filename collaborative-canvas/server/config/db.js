// server/config/db.js
import mongoose from "mongoose";

export async function connectDB() {
  const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collabCanvas";
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
