const express = require("express");
const http = require("http");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const config = require("./config");
const database = require("./utils/database");
const routes = require("./routes");
const setupSocket = require("./socket");
const vectorStore = require("./services/vectorStore.service");
const { errorHandler, notFound } = require("./middleware/error.middleware");

// ============================================
// Express App Setup
// ============================================
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    abortOnLimit: true,
  })
);

// API Routes (supports both /api/* and direct /* endpoints)
app.use("/api", routes);
app.use("/", routes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// ============================================
// Socket.IO
// ============================================
const io = setupSocket(server);

// ============================================
// Start Server
// ============================================
async function start() {
  // Connect to MongoDB
  await database.connect();

  // Connect to ChromaDB
  const chromaConnected = await vectorStore.initialize();
  if (!chromaConnected) {
    console.warn(
      "⚠  ChromaDB not available — training/querying will not work."
    );
    console.warn(
      "   Start ChromaDB: docker-compose up -d"
    );
  }

  // Start listening
  server.listen(config.port, () => {
    console.log(`\n🤖 RAG Chatbot API running on port ${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Health check: http://localhost:${config.port}/api/health\n`);
  });
}

start().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
