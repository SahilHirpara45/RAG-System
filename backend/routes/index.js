const router = require("express").Router();

const authRoutes = require("./auth.routes");
const trainingRoutes = require("./training.routes");
const chatRoutes = require("./chat.routes");

router.use("/auth", authRoutes);
router.use("/training", trainingRoutes);
router.use("/chat", chatRoutes);

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "RAG Chatbot API is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
