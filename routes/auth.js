const express = require("express");
require("dotenv").config(); // ✅ FIX 1: Sabse upar hona chahiye
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authenticate = require("../middleware/authMiddleware");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Conversation = require("../models/Conversation");
const router = express.Router();

// --- Debugging Config (Check karein keys load hui ya nahi) ---
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error("❌ ERROR: Cloudinary Config Missing in .env file");
}

// --- 1. Cloudinary Config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- 2. Multer Config ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// JWT helper
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// ... (Signup aur Login Routes same rahenge) ...
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// === 3. GET Profile ===
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// === 4. PUT Profile (Main Fix Here) ===
router.put("/profile", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    console.log("🔹 Hit /profile update route"); // Debug Log
    console.log("🔹 Body Name:", req.body.name); // Check name
    console.log("🔹 File Received:", req.file ? "Yes" : "No"); // Check file

    const { name } = req.body;
    let avatarUrl = null;

    // A. Image Upload Logic
    if (req.file) {
      console.log("🔹 Uploading to Cloudinary...");
      
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "devbot_profiles" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      console.log("✅ Cloudinary Success URL:", result.secure_url);
      avatarUrl = result.secure_url;
    }

    // B. Database Update Logic
    const updateData = { name };
    if (avatarUrl) {
        updateData.avatar = avatarUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select("-password");

    console.log("✅ User Updated in DB:", updatedUser); // Confirm DB update
    res.json({ success: true, user: updatedUser });

  } catch (err) {
    console.error("❌ Profile Update Error:", err);
    res.status(500).json({ msg: "Update failed", error: err.message });
  }
});

router.post("/logout", (req, res) => {
  res.json({ msg: "Logged out" });
});


router.delete("/delete", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Pehle User ki saari chats delete karo
    await Conversation.deleteMany({ userId: userId });

    // 2. Ab User ko delete karo
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;