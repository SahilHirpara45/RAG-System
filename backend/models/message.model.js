const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Source chunks that were used to generate this response
    sources: [
      {
        chunk: String,
        score: Number,
        sourceType: String,
        sourceName: String,
      },
    ],
    // Confidence score of the response (0-1)
    confidence: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient session-based queries, sorted by time
messageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
