const mongoose = require("mongoose");
const config = require("../config");

const connection = mongoose.connection;

let isConnected = false;

const connect = async () => {
  try {
    await mongoose.connect(config.database.uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast (5s)
    });
    isConnected = true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error(
      "   The server will start, but auth/training/chat won't work."
    );
    console.error("   Fix your DB_URI in .env and restart.");
  }
};

connection
  .on("connected", () => {
    isConnected = true;
    console.log("✔  MongoDB connected");
  })
  .on("disconnected", () => {
    isConnected = false;
    console.log("✗  MongoDB disconnected");
  })
  .on("error", (err) => {
    console.error("✗  MongoDB error:", err.message);
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  if (isConnected) {
    await connection.close();
    console.log("✗  MongoDB disconnected (app shutdown)");
  }
  process.exit(0);
});

module.exports = { connect, get isConnected() { return isConnected; } };