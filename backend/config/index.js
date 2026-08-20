require("dotenv").config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  // MongoDB
  database: {
    uri: process.env.DB_URI,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // OpenAI / LLM Provider Configuration
  openai: {
    // --- ACTIVE PROVIDER: Google Gemini API (100% Free via OpenAI SDK Compatibility) ---
    apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
    chatModel: process.env.CHAT_MODEL || "gemini-1.5-flash",
    embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-004",
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION, 10) || 768,

    // --- FUTURE USE: Official Paid OpenAI Configuration (Uncomment to switch back to OpenAI GPT) ---
    /*
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: undefined, // Default official OpenAI endpoint
    chatModel: "gpt-4o-mini",
    embeddingModel: "text-embedding-ada-002",
    embeddingDimension: 1536,
    */
  },

  // ChromaDB
  chroma: {
    url: process.env.CHROMA_URL || "http://localhost:8000",
    collection: process.env.CHROMA_COLLECTION || "rag_chatbot",
  },

  // Password Hashing
  saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || 10,

  // RAG Pipeline
  rag: {
    chunkSize: 500,       // tokens per chunk
    chunkOverlap: 50,     // overlap tokens between chunks
    topK: 5,              // top K similar chunks to retrieve
    confidenceThreshold: 0.72,
    maxCrawlDepth: 3,
    maxCrawlPages: 50,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },
};

// Validate required config
const requiredEnvVars = ["DB_URI", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error(`   Copy .env.example to .env and fill in your values.`);
    process.exit(1);
  }
}

if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
  console.error(`❌ Missing required API Key environment variable: OPENAI_API_KEY or GEMINI_API_KEY`);
  console.error(`   Copy .env.example to .env and fill in your values.`);
  process.exit(1);
}

module.exports = config;
