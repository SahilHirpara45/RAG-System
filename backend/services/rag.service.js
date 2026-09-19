const { v4: uuidv4 } = require("uuid");
const OpenAI = require("openai");
const config = require("../config");
const vectorStore = require("./vectorStore.service");
const embeddingService = require("./embedding.service");
const crawlerService = require("./crawler.service");
const {
  extractTextFromFile,
  chunkText,
  cleanText,
  formatQAPair,
} = require("../utils/textProcessor");
const TrainingSource = require("../models/trainingSource.model");

/**
 * RAG Service — Core Retrieval-Augmented Generation Pipeline
 *
 * This is the brain of the chatbot. It handles:
 * 1. Training: Ingesting data → chunking → embedding → storing in ChromaDB
 * 2. Querying: Embedding query → searching ChromaDB → generating answer with context
 */
class RAGService {
  constructor() {
    // --- ACTIVE PROVIDER: Google Gemini API (via OpenAI SDK Compatibility) ---
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
    });

    // --- FUTURE USE: Official Paid OpenAI Client Setup ---
    /*
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    */
  }

  // ============================================
  // TRAINING METHODS
  // ============================================

  /**
   * Train from an uploaded file (PDF, DOCX, TXT)
   *
   * @param {Object} file - Express file upload object
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>} - Training result
   */
  async trainFromFile(file, onProgress = null) {
    // Create tracking record
    const source = await TrainingSource.create({
      type: this.getFileType(file.mimetype),
      name: file.name,
      source: file.name,
      status: "processing",
    });

    try {
      // 1. Extract text
      if (onProgress) onProgress({ stage: "extracting", progress: 10 });
      const rawText = await extractTextFromFile(file);
      const text = cleanText(rawText);

      if (!text || text.length < 20) {
        throw new Error("File contains no usable text content.");
      }

      // 2. Chunk the text
      if (onProgress) onProgress({ stage: "chunking", progress: 25 });
      const chunks = chunkText(
        text,
        config.rag.chunkSize,
        config.rag.chunkOverlap
      );

      // 3. Generate embeddings (batch)
      if (onProgress) onProgress({ stage: "embedding", progress: 40 });
      const embeddings = await embeddingService.embedBatch(chunks);

      // 4. Store in ChromaDB
      if (onProgress) onProgress({ stage: "storing", progress: 70 });
      const ids = chunks.map(() => uuidv4());
      const metadatas = chunks.map((_, i) => ({
        sourceId: source._id.toString(),
        sourceType: source.type,
        sourceName: file.name,
        chunkIndex: i,
      }));

      await vectorStore.addDocuments({
        ids,
        embeddings,
        documents: chunks,
        metadatas,
      });

      // 5. Update tracking record
      if (onProgress) onProgress({ stage: "complete", progress: 100 });
      source.status = "completed";
      source.chunkCount = chunks.length;
      source.characterCount = text.length;
      source.chromaIds = ids;
      await source.save();

      return {
        success: true,
        sourceId: source._id,
        name: file.name,
        type: source.type,
        chunks: chunks.length,
        characters: text.length,
      };
    } catch (error) {
      source.status = "failed";
      source.errorMessage = error.message;
      await source.save();
      throw error;
    }
  }

  /**
   * Train from a URL (crawl website)
   *
   * @param {string} url - Website URL to crawl
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>} - Training result
   */
  async trainFromURL(url, onProgress = null) {
    const source = await TrainingSource.create({
      type: "url",
      name: new URL(url).hostname,
      source: url,
      status: "processing",
    });

    try {
      // 1. Crawl the website
      if (onProgress) onProgress({ stage: "crawling", progress: 10 });
      const crawlResult = await crawlerService.crawl(url, {
        maxDepth: config.rag.maxCrawlDepth,
        maxPages: config.rag.maxCrawlPages,
        onProgress: (p) => {
          if (onProgress) {
            onProgress({
              stage: "crawling",
              progress: 10 + Math.min(30, (p.pagesCrawled / config.rag.maxCrawlPages) * 30),
              detail: `Crawled ${p.pagesCrawled} pages...`,
            });
          }
        },
      });

      const text = cleanText(crawlResult.text);

      if (!text || text.length < 20) {
        throw new Error("No usable text content found at this URL.");
      }

      // 2. Chunk
      if (onProgress) onProgress({ stage: "chunking", progress: 45 });
      const chunks = chunkText(
        text,
        config.rag.chunkSize,
        config.rag.chunkOverlap
      );

      // 3. Embed
      if (onProgress) onProgress({ stage: "embedding", progress: 55 });
      const embeddings = await embeddingService.embedBatch(chunks);

      // 4. Store
      if (onProgress) onProgress({ stage: "storing", progress: 80 });
      const ids = chunks.map(() => uuidv4());
      const metadatas = chunks.map((_, i) => ({
        sourceId: source._id.toString(),
        sourceType: "url",
        sourceName: new URL(url).hostname,
        chunkIndex: i,
        url,
      }));

      await vectorStore.addDocuments({
        ids,
        embeddings,
        documents: chunks,
        metadatas,
      });

      // 5. Update tracking
      if (onProgress) onProgress({ stage: "complete", progress: 100 });
      source.status = "completed";
      source.chunkCount = chunks.length;
      source.characterCount = text.length;
      source.chromaIds = ids;
      await source.save();

      return {
        success: true,
        sourceId: source._id,
        name: source.name,
        type: "url",
        chunks: chunks.length,
        characters: text.length,
        pagesCrawled: crawlResult.pagesCrawled,
      };
    } catch (error) {
      source.status = "failed";
      source.errorMessage = error.message;
      await source.save();
      throw error;
    }
  }

  /**
   * Train from a Q&A pair
   *
   * @param {string} question
   * @param {string} answer
   * @returns {Promise<Object>}
   */
  async trainFromQA(question, answer) {
    const source = await TrainingSource.create({
      type: "qna",
      name: question.substring(0, 80),
      source: "manual",
      question,
      answer,
      status: "processing",
    });

    try {
      const formattedText = formatQAPair(question, answer);
      const embedding = await embeddingService.embed(formattedText);
      const id = uuidv4();

      await vectorStore.addDocuments({
        ids: [id],
        embeddings: [embedding],
        documents: [formattedText],
        metadatas: [
          {
            sourceId: source._id.toString(),
            sourceType: "qna",
            sourceName: "Q&A",
            question,
          },
        ],
      });

      source.status = "completed";
      source.chunkCount = 1;
      source.characterCount = formattedText.length;
      source.chromaIds = [id];
      await source.save();

      return {
        success: true,
        sourceId: source._id,
        type: "qna",
        question,
        answer,
      };
    } catch (error) {
      source.status = "failed";
      source.errorMessage = error.message;
      await source.save();
      throw error;
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Query the trained data and generate a response
   *
   * @param {string} query - User's question
   * @param {Object[]} [conversationHistory=[]] - Previous messages for context
   * @returns {Promise<Object>} - { response, sources, confidence }
   */
  async query(query, conversationHistory = []) {
    // 1. Generate query embedding
    const queryEmbedding = await embeddingService.embed(query);

    // 2. Search ChromaDB for relevant chunks
    const results = await vectorStore.query({
      queryEmbedding,
      topK: config.rag.topK,
    });

    if (!results.documents || results.documents.length === 0) {
      return {
        response:
          "I don't have any training data to answer your question. Please upload documents or add Q&A pairs first.",
        sources: [],
        confidence: 0,
      };
    }

    // 3. Build context from top-K chunks
    // ChromaDB returns cosine distances (0 = identical, 2 = opposite)
    // Convert to similarity score: similarity = 1 - (distance / 2)
    const sources = results.documents.map((doc, i) => ({
      chunk: doc,
      score: 1 - results.distances[i] / 2,
      sourceType: results.metadatas[i]?.sourceType || "unknown",
      sourceName: results.metadatas[i]?.sourceName || "unknown",
    }));

    // Average confidence from top sources
    const confidence =
      sources.reduce((sum, s) => sum + s.score, 0) / sources.length;

    // If confidence is too low, indicate uncertainty
    if (confidence < config.rag.confidenceThreshold) {
      return {
        response:
          "I'm not confident I have the right information to answer this question accurately. The closest information I found may not be relevant.",
        sources: sources.slice(0, 3),
        confidence,
      };
    }

    // 4. Build the context string from relevant chunks
    const contextChunks = sources
      .slice(0, config.rag.topK)
      .map((s, i) => `[Source ${i + 1}]: ${s.chunk}`)
      .join("\n\n");

    // 5. Build conversation messages for LLM
    const messages = [
      {
        role: "system",
        content: `You are an intelligent AI assistant. Answer the user's question based ONLY on the provided context. 
If the context doesn't contain enough information to answer the question, say so honestly.
Be concise, accurate, and helpful. If you reference information, indicate which source it came from.

CONTEXT:
${contextChunks}`,
      },
    ];

    // Add recent conversation history (last 6 messages max)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add the current query
    messages.push({
      role: "user",
      content: query,
    });

    // 6. Generate response with LLM
    // --- ACTIVE PROVIDER: Gemini (via OpenAI compatibility) ---
    const completion = await this.openai.chat.completions.create({
      model: config.openai.chatModel,
      messages,
      temperature: 0.3, // Lower temperature for more factual responses
      max_tokens: 1000,
    });

    // --- FUTURE USE: Original Paid OpenAI GPT-4o-mini Call ---
    /*
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 1000,
    });
    */

    return {
      response: completion.choices[0].message.content,
      sources: sources.slice(0, 3), // Return top 3 sources for citation
      confidence,
    };
  }

  // ============================================
  // MANAGEMENT METHODS
  // ============================================

  /**
   * Delete a training source and its associated embeddings
   */
  async deleteSource(sourceId) {
    const source = await TrainingSource.findById(sourceId);
    if (!source) throw new Error("Training source not found");

    // Delete from ChromaDB
    if (source.chromaIds && source.chromaIds.length > 0) {
      await vectorStore.deleteDocuments(source.chromaIds);
    }

    // Delete from MongoDB
    await TrainingSource.findByIdAndDelete(sourceId);

    return { success: true, deleted: source.name };
  }

  /**
   * Get all training sources
   */
  async getSources() {
    return TrainingSource.find()
      .sort({ createdAt: -1 })
      .select("-chromaIds");
  }

  /**
   * Reset all training data
   */
  async resetAllData() {
    await vectorStore.resetCollection();
    await TrainingSource.deleteMany({});
    return { success: true, message: "All training data has been reset" };
  }

  /**
   * Get training statistics
   */
  async getStats() {
    const vectorStats = await vectorStore.getStats();
    const sourceStats = await TrainingSource.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalChunks: { $sum: "$chunkCount" },
          totalCharacters: { $sum: "$characterCount" },
        },
      },
    ]);

    const totalSources = await TrainingSource.countDocuments({
      status: "completed",
    });

    return {
      totalEmbeddings: vectorStats.totalDocuments,
      totalSources,
      byType: sourceStats,
      collectionName: vectorStats.collectionName,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  getFileType(mimeType) {
    const types = {
      "application/pdf": "pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "text/plain": "txt",
    };
    return types[mimeType] || "txt";
  }
}

module.exports = new RAGService();
