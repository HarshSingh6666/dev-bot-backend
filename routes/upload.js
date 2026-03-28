const express = require("express");
const multer = require("multer");
const fs = require("fs");
const router = express.Router();
const History = require("../models/Conversation");
const authenticate = require("../middleware/authMiddleware"); // ✅ Import auth

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const upload = multer({ dest: "uploads/" });

router.post("/", authenticate, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const base64Image = fs.readFileSync(req.file.path, "base64");

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: req.body.prompt || "Describe this image" },
            {
              inline_data: {
                mime_type: req.file.mimetype,
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini Upload API error:", errText);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    let reply =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n")?.trim() ||
      "⚠️ No reply from Gemini";

    fs.unlinkSync(req.file.path);

    // ✅ Save history with userId
    await History.create({
      userId: req.user._id,
      userMessage: req.body.prompt || "Describe this image",
      botReply: reply,
      type: "image",
    });

    res.json({ reply });
  } catch (err) {
    console.error("Upload route error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
