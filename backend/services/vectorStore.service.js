const { ChromaClient } = require("chromadb");
const config = require("../config");

/**
 * Vector Store Service — ChromaDB Integration
 *
 * Handles all vector storage and similarity search operations.
 * ChromaDB provides native ANN (Approximate Nearest Neighbor) search,
 * replacing the brute-force cosine similarity approach.
 */
class VectorStoreService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isConnected = false;
  }

  /**
   * Initialize ChromaDB connection and get/create collection
   */
  async initialize() {
    try {
      this.client = new ChromaClient({ path: config.chroma.url });

      // Heartbeat check
      await this.client.heartbeat();

      // Get or create the collection
      this.collection = await this.client.getOrCreateCollection({
        name: config.chroma.collection,
        metadata: {
          description: "RAG Chatbot training data embeddings",
          "hnsw:space": "cosine", // Use cosine similarity
        },
      });

      this.isConnected = true;
      console.log(
        `✔  ChromaDB connected (collection: ${config.chroma.collection})`
      );
      return true;
    } catch (error) {
      console.error("❌ ChromaDB connection failed:", error.message);
      console.error(
        "   Make sure ChromaDB is running: docker-compose up -d"
      );
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Ensure connection is alive, reconnect if needed
   */
  async ensureConnection() {
    if (!this.isConnected) {
      await this.initialize();
    }
    if (!this.isConnected) {
      throw new Error(
        "ChromaDB is not available. Start it with: docker-compose up -d"
      );
    }
  }

  /**
   * Add documents (chunks + embeddings) to the collection
   *
   * @param {Object} params
   * @param {string[]} params.ids - Unique IDs for each document
   * @param {number[][]} params.embeddings - Embedding vectors
   * @param {string[]} params.documents - Text chunks
   * @param {Object[]} params.metadatas - Metadata per document
   * @returns {Promise<string[]>} - IDs of added documents
   */
  async addDocuments({ ids, embeddings, documents, metadatas }) {
    await this.ensureConnection();

    // ChromaDB has a batch limit, process in chunks of 100
    const batchSize = 100;
    const addedIds = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batchEmbeddings = embeddings.slice(i, i + batchSize);
      const batchDocuments = documents.slice(i, i + batchSize);
      const batchMetadatas = metadatas.slice(i, i + batchSize);

      await this.collection.add({
        ids: batchIds,
        embeddings: batchEmbeddings,
        documents: batchDocuments,
        metadatas: batchMetadatas,
      });

      addedIds.push(...batchIds);
    }

    return addedIds;
  }

  /**
   * Query the collection for similar documents
   *
   * @param {Object} params
   * @param {number[]} params.queryEmbedding - Query embedding vector
   * @param {number} [params.topK=5] - Number of results to return
   * @param {Object} [params.where] - Metadata filter
   * @returns {Promise<Object>} - { ids, documents, distances, metadatas }
   */
  async query({ queryEmbedding, topK = config.rag.topK, where = null }) {
    await this.ensureConnection();

    const queryParams = {
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    };

    if (where) {
      queryParams.where = where;
    }

    const results = await this.collection.query(queryParams);

    // Transform results into a cleaner format
    return {
      ids: results.ids[0] || [],
      documents: results.documents[0] || [],
      distances: results.distances[0] || [],
      metadatas: results.metadatas[0] || [],
    };
  }

  /**
   * Delete documents by their IDs
   *
   * @param {string[]} ids - Document IDs to delete
   */
  async deleteDocuments(ids) {
    await this.ensureConnection();

    if (!ids || ids.length === 0) return;

    // Delete in batches
    const batchSize = 100;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      await this.collection.delete({ ids: batchIds });
    }
  }

  /**
   * Delete all documents in the collection (reset)
   */
  async resetCollection() {
    await this.ensureConnection();

    // Delete and recreate the collection
    try {
      await this.client.deleteCollection({ name: config.chroma.collection });
    } catch (_) {
      // Collection might not exist
    }

    this.collection = await this.client.getOrCreateCollection({
      name: config.chroma.collection,
      metadata: {
        description: "RAG Chatbot training data embeddings",
        "hnsw:space": "cosine",
      },
    });
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    await this.ensureConnection();
    const count = await this.collection.count();
    return {
      totalDocuments: count,
      collectionName: config.chroma.collection,
    };
  }
}

// Export singleton
module.exports = new VectorStoreService();
