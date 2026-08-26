const { Server } = require("socket.io");
const ragService = require("../services/rag.service");
const ChatSession = require("../models/chatSession.model");
const Message = require("../models/message.model");
const config = require("../config");

/**
 * Socket.IO Setup — Real-time Chat Communication
 *
 * Handles:
 * - Real-time chat with the RAG bot
 * - Training progress updates
 */
function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: config.cors.origin },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    /**
     * Join a chat session room
     */
    socket.on("joinSession", async ({ sessionId }) => {
      if (sessionId) {
        socket.join(sessionId);
        socket.sessionId = sessionId;
      }
    });

    /**
     * Handle user message — query the RAG bot and respond
     */
    socket.on("sendMessage", async ({ message, sessionId }) => {
      try {
        if (!message || message.trim().length === 0) return;

        // Get or create session
        let session;
        if (sessionId) {
          session = await ChatSession.findById(sessionId);
        }
        if (!session) {
          session = await ChatSession.create({
            title: message.substring(0, 60),
          });
          socket.sessionId = session._id.toString();
          socket.join(socket.sessionId);

          // Notify client of new session
          socket.emit("sessionCreated", {
            sessionId: session._id,
            title: session.title,
          });
        }

        // Save user message
        await Message.create({
          sessionId: session._id,
          role: "user",
          content: message,
        });

        // Show typing indicator
        socket.emit("botTyping", { isTyping: true });

        // Get conversation history
        const previousMessages = await Message.find({
          sessionId: session._id,
        })
          .sort({ createdAt: 1 })
          .limit(10)
          .select("role content");

        // Query RAG
        const result = await ragService.query(message, previousMessages);

        // Save assistant response
        const assistantMessage = await Message.create({
          sessionId: session._id,
          role: "assistant",
          content: result.response,
          sources: result.sources,
          confidence: result.confidence,
        });

        // Update session
        session.messageCount = await Message.countDocuments({
          sessionId: session._id,
        });
        await session.save();

        // Send response
        socket.emit("botTyping", { isTyping: false });
        socket.emit("botMessage", {
          id: assistantMessage._id,
          content: result.response,
          sources: result.sources.map((s) => ({
            chunk: s.chunk.substring(0, 200) + "...",
            score: Math.round(s.score * 100) / 100,
            sourceType: s.sourceType,
            sourceName: s.sourceName,
          })),
          confidence: Math.round(result.confidence * 100) / 100,
          timestamp: assistantMessage.createdAt,
        });
      } catch (error) {
        console.error("Socket message error:", error.message);
        socket.emit("botTyping", { isTyping: false });
        socket.emit("botMessage", {
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
          sources: [],
          confidence: 0,
          error: true,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = setupSocket;
