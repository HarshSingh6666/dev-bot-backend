// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ msg: "Invalid token" });

    req.user = user; // ✅ Attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
};

module.exports = authenticate;
