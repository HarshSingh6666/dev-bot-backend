const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const chat = require("./routes/chat");
const upload = require("./routes/upload");
const history = require("./routes/history");
const auth = require("./routes/auth");

const app = express();

// === Middleware ===
app.use(cors());
app.use(express.json());
app.use("/api/save", require("./routes/save"));


// === MongoDB Connection ===
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// === Routes ===
app.use("/api/auth", auth);
app.use("/api/chat", chat);
app.use("/api/upload", upload);
app.use("/api/history", history);

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
