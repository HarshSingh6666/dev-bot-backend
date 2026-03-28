const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
// Note: Model ka naam file ke hisaab se Conversation rakha hai
const Conversation = require("../models/Conversation"); 

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-pro";

router.post("/", authenticate, async (req, res) => {
  // Frontend se ab 'conversationId' bhi bhejna padega agar purani chat hai
  const { prompt, conversationId } = req.body; 

  try {
    // --- 1. Gemini API Call ---
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n")?.trim() ||
      "⚠️ No response from Gemini";

    // --- 2. Database Saving Logic (Fixed for New Schema) ---
    
    let chat;

    // A. Agar Conversation ID aayi hai, to purani chat dhoondo
    if (conversationId) {
      chat = await Conversation.findOne({ _id: conversationId, userId: req.user._id });
    }

    // B. Agar ID nahi hai ya chat nahi mili, to Nayi Conversation banao
    if (!chat) {
      chat = new Conversation({
        userId: req.user._id,
        title: prompt.substring(0, 30) + "...", // Title set karo
        messages: [] // Empty array start karo
      });
    }

    // C. Messages Array me data Push karo (Schema ke hisaab se)
    
    // User ka message
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: new Date()
    });

    // AI ka message
    chat.messages.push({
      role: "model",
      content: reply,
      timestamp: new Date()
    });

    // D. Final Save
    chat.lastUpdated = new Date();
    await chat.save();

    // --- 3. Response to Frontend ---
    // Frontend ko conversationId bhejna zaroori hai taaki agla msg isime add ho
    res.json({ 
      reply, 
      conversationId: chat._id 
    });

  } catch (err) {
    console.error("Chat route error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;