// server/controllers/authController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js"; // Fixed path

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

// 🎨 Utility: Generate a random pastel color for each user
function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// 🧾 SIGNUP
export async function signup(req, res) {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user with a random color
    const user = await User.create({
      username,
      passwordHash,
      color: randomColor(),
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, color: user.color },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ New user signed up: ${user.username}`);

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, color: user.color },
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ error: "Server error during signup." });
  }
}

// 🔑 LOGIN
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, color: user.color },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ User logged in: ${user.username}`);

    res.status(200).json({
      token,
      user: { id: user._id, username: user.username, color: user.color },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
}
