const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation"); // Naam check kar lena

router.post("/", authenticate, async (req, res) => {
  const { messages, conversationId } = req.body; // conversationId bhi frontend se bhejo agar existing chat hai

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: "No messages to save" });
  }

  try {
    // 1. Data Mapping (Frontend format -> Database Schema format)
    // Frontend shayad "text" bhej raha hai, par DB me "content" hai
    // Frontend "assistant" bhej raha hai, par DB me "model" hai
    const formattedMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : msg.role, // Role fix
      content: msg.text || msg.content, // Content fix
      image: msg.image || null,
      timestamp: new Date()
    }));

    let savedChat;

    // 2. Scenario A: Agar purani chat update karni hai
    if (conversationId) {
      savedChat = await Conversation.findOneAndUpdate(
        { _id: conversationId, userId: req.user._id },
        { 
          $set: { messages: formattedMessages }, // Pura array replace/update kar do
          lastUpdated: new Date() 
        },
        { new: true }
      );
    } 
    
    // 3. Scenario B: Agar nayi chat save karni hai
    else {
      // Title generate karo (First message ke pehle 30 chars)
      const firstMsg = formattedMessages[0].content || "New Chat";
      const title = firstMsg.substring(0, 30) + "...";

      savedChat = await Conversation.create({
        userId: req.user._id,
        title: title,
        messages: formattedMessages
      });
    }

    res.json({ success: true, chat: savedChat });

  } catch (err) {
    console.error("Error saving chat:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;