const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "yoursecretkey";

exports.protect = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};
exports.adminProtect = async (req, res, next) => {
  try {
    await exports.protect(req, res, async () => {
      if (req.user.isAdmin !== true) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }
      next();
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
};