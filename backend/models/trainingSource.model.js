const mongoose = require("mongoose");

/**
 * Tracks what data sources have been used to train the bot.
 * The actual vector embeddings live in ChromaDB.
 * This model provides metadata for the training dashboard.
 */
const trainingSourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["pdf", "docx", "txt", "url", "qna"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Original URL for web sources, filename for uploads
    source: {
      type: String,
      required: true,
    },
    // Number of chunks generated from this source
    chunkCount: {
      type: Number,
      default: 0,
    },
    // Total characters in the extracted text
    characterCount: {
      type: Number,
      default: 0,
    },
    // ChromaDB document IDs for this source (for deletion)
    chromaIds: {
      type: [String],
      default: [],
    },
    // Processing status
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    // For Q&A type — store the original question and answer
    question: { type: String, default: null },
    answer: { type: String, default: null },
    // Who uploaded it
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TrainingSource", trainingSourceSchema);
