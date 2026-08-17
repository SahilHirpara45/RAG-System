const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    // User who owns this session
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Human-readable session title (auto-generated from first query)
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
    // Whether this session is active
    isActive: {
      type: Boolean,
      default: true,
    },
    // Total messages in this session
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
