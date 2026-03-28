const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation"); 

// 1. GET: Fetch Sidebar History (Sirf Titles aur ID)
router.get("/", authenticate, async (req, res) => {
  try {
    const history = await Conversation.find({ userId: req.user._id })
      .select("title lastUpdated isPinned") // isPinned bhi select karein
      .sort({ isPinned: -1, lastUpdated: -1 }); // Pinned chat sabse upar, fir latest

    res.json(history);
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2. PUT: Rename Chat
router.put("/rename/:id", authenticate, async (req, res) => {
  try {
    const { newTitle } = req.body;
    const chat = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: newTitle },
      { new: true }
    );
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ error: "Rename failed" });
  }
});

// 3. PUT: Pin Chat
router.put("/pin/:id", authenticate, async (req, res) => {
  try {
    const chat = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Toggle Pin Status
    chat.isPinned = !chat.isPinned;
    await chat.save();

    res.json({ success: true, isPinned: chat.isPinned });
  } catch (err) {
    res.status(500).json({ error: "Pin failed" });
  }
});

// ✅ FIX: DELETE /clear ko '/:id' se PEHLE rakha hai
// 4. DELETE: Clear All History
router.delete("/clear", authenticate, async (req, res) => {
  try {
    // Current user ki saari chats delete karo
    await Conversation.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: "All history cleared" });
  } catch (err) {
    console.error("Clear history error:", err);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

// 5. GET: Fetch ONE Specific Conversation
// Note: Yeh dynamic route hai, isliye isse specific routes ke baad hi rakhein
router.get("/:id", authenticate, async (req, res) => {
  try {
    const chat = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json(chat);
  } catch (err) {
    console.error("Single chat fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 6. DELETE: Remove a specific history item
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const historyId = req.params.id;

    const deletedItem = await Conversation.findOneAndDelete({
      _id: historyId,
      userId: req.user._id 
    });

    if (!deletedItem) {
      return res.status(404).json({ success: false, msg: "Item not found or unauthorized" });
    }

    res.json({ success: true, msg: "History item deleted" });

  } catch (err) {
    console.error("History delete error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;