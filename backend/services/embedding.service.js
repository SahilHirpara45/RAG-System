const OpenAI = require("openai");
const config = require("../config");

/**
 * Embedding Service — Text Embeddings (via OpenAI SDK)
 *
 * Centralized embedding generation using the configured LLM provider.
 * Currently uses Google Gemini text-embedding-004 (768 dims) via OpenAI SDK compatibility.
 * Supports single and batch embedding creation.
 *
 * To switch back to OpenAI ada-002 (1536 dims), see commented config in config/index.js.
 */
class EmbeddingService {
  constructor() {
    // --- ACTIVE PROVIDER: Google Gemini API (via OpenAI SDK Compatibility) ---
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
    });
    this.model = config.openai.embeddingModel;

    // --- FUTURE USE: Official Paid OpenAI Client Setup ---
    /*
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    this.model = "text-embedding-ada-002";
    */
  }

  /**
   * Generate embedding for a single text
   *
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector (dimensions depend on configured model)
   */
  async embed(text) {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      throw new Error("Text is required for embedding generation");
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text.trim(),
    });

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts in batch
   * OpenAI supports up to 2048 inputs per request.
   *
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async embedBatch(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty strings
    const validTexts = texts.map((t) => (t || "").trim()).filter((t) => t.length > 0);

    if (validTexts.length === 0) {
      return [];
    }

    // OpenAI batch limit is 2048 inputs
    const batchSize = 2048;
    const allEmbeddings = [];

    for (let i = 0; i < validTexts.length; i += batchSize) {
      const batch = validTexts.slice(i, i + batchSize);

      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });

      // Sort by index to ensure correct order
      const sorted = response.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map((item) => item.embedding));
    }

    return allEmbeddings;
  }
}

// Export singleton
module.exports = new EmbeddingService();
