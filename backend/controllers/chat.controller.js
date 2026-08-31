const ragService = require("../services/rag.service");
const ChatSession = require("../models/chatSession.model");
const Message = require("../models/message.model");

/**
 * Chat Controller — Query & Session Management
 */

/**
 * POST /api/chat/query
 * Query the trained bot
 */
exports.query = async (req, res, next) => {
  try {
    const { query, sessionId } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Query is required.",
      });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await ChatSession.findById(sessionId);
    }

    if (!session) {
      session = await ChatSession.create({
        userId: req.user?.userId || null,
        title: query.substring(0, 60),
      });
    }

    // Get conversation history for context
    const previousMessages = await Message.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .limit(10)
      .select("role content");

    // Save user message
    await Message.create({
      sessionId: session._id,
      role: "user",
      content: query,
    });

    // Query the RAG pipeline
    const result = await ragService.query(query, previousMessages);

    // Save assistant response
    await Message.create({
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

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        response: result.response,
        sources: result.sources.map((s) => ({
          chunk: s.chunk.substring(0, 200) + "...",
          score: Math.round(s.score * 100) / 100,
          sourceType: s.sourceType,
          sourceName: s.sourceName,
        })),
        confidence: Math.round(result.confidence * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/sessions
 * List all chat sessions
 */
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.find(
      req.user?.userId ? { userId: req.user.userId } : {}
    )
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/sessions/:id
 * Get a session's messages
 */
exports.getSessionMessages = async (req, res, next) => {
  try {
    const session = await ChatSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Chat session not found.",
      });
    }

    const messages = await Message.find({ sessionId: session._id }).sort({
      createdAt: 1,
    });

    res.json({
      success: true,
      data: {
        session,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/chat/sessions/:id
 * Delete a session and its messages
 */
exports.deleteSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Chat session not found.",
      });
    }

    await Message.deleteMany({ sessionId: session._id });
    await ChatSession.findByIdAndDelete(session._id);

    res.json({
      success: true,
      message: "Chat session deleted.",
    });
  } catch (error) {
    next(error);
  }
};
