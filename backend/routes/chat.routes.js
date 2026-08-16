const router = require("express").Router();
const chatController = require("../controllers/chat.controller");
const { auth, optionalAuth } = require("../middleware/auth.middleware");

// Query can work with or without auth (optional auth attaches user if present)
router.post("/query", optionalAuth, chatController.query);

// Session management requires auth
router.get("/sessions", auth, chatController.getSessions);
router.get("/sessions/:id", auth, chatController.getSessionMessages);
router.delete("/sessions/:id", auth, chatController.deleteSession);

module.exports = router;
