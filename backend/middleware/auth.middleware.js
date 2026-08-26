const jwt = require("jsonwebtoken");
const config = require("../config");

/**
 * JWT Authentication Middleware
 * Extracts and verifies the Bearer token from the Authorization header.
 */
const auth = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired. Please login again.",
      });
    }
    return res.status(401).json({
      success: false,
      error: "Invalid token.",
    });
  }
};

/**
 * Optional auth — attaches user if token present, continues if not.
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      req.user = jwt.verify(token, config.jwt.secret);
    }
  } catch (_) {
    // Token invalid — continue without user
  }
  next();
};

module.exports = { auth, optionalAuth };
