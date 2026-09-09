const ragService = require("../services/rag.service");

/**
 * Training Controller — Data Ingestion Endpoints
 */

/**
 * POST /api/training/upload-file
 * Upload a file (PDF, DOCX, TXT) for training
 */
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        error: "No file provided. Please upload a PDF, DOCX, or TXT file.",
      });
    }

    const file = req.files.file;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: ${file.mimetype}. Supported: PDF, DOCX, TXT`,
      });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 10MB.",
      });
    }

    const result = await ragService.trainFromFile(file);

    res.status(200).json({
      success: true,
      message: `Successfully processed "${file.name}" — ${result.chunks} chunks created.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/training/upload-url
 * Submit a URL for crawling and training
 */
exports.uploadURL = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required.",
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL format.",
      });
    }

    const result = await ragService.trainFromURL(url);

    res.status(200).json({
      success: true,
      message: `Successfully crawled ${result.pagesCrawled} pages — ${result.chunks} chunks created.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/training/add-qna
 * Add a Q&A pair for training
 */
exports.addQnA = async (req, res, next) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: "Both question and answer are required.",
      });
    }

    if (question.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Question must be at least 5 characters.",
      });
    }

    if (answer.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Answer must be at least 5 characters.",
      });
    }

    const result = await ragService.trainFromQA(question, answer);

    res.status(200).json({
      success: true,
      message: "Q&A pair added successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/training/sources
 * List all training data sources
 */
exports.getSources = async (req, res, next) => {
  try {
    const sources = await ragService.getSources();
    res.json({ success: true, data: sources });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/training/sources/:id
 * Remove a training source and its embeddings
 */
exports.deleteSource = async (req, res, next) => {
  try {
    const result = await ragService.deleteSource(req.params.id);
    res.json({
      success: true,
      message: `Deleted training source: ${result.deleted}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/training/reset
 * Clear all training data
 */
exports.resetTraining = async (req, res, next) => {
  try {
    const result = await ragService.resetAllData();
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/training/stats
 * Get training statistics
 */
exports.getStats = async (req, res, next) => {
  try {
    const stats = await ragService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
