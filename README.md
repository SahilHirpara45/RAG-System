# 🤖 RAG Chatbot — Train & Chat with Your Data

<div align="center">

**An intelligent AI chatbot powered by Retrieval-Augmented Generation (RAG).**

Train it with PDFs, web URLs, and Q&A pairs — then chat with your data through a premium dark-theme interface.

Built with **Node.js** · **Google Gemini (Free)** · **ChromaDB** · **Next.js** · **MongoDB**

</div>

---

## ✨ Features

- **Multi-Source Training** — Upload PDFs, DOCX, TXT files, crawl websites, or add Q&A pairs
- **Intelligent Chunking** — Recursive text splitting with overlap to prevent context loss
- **Vector Search (ANN)** — ChromaDB for blazing-fast approximate nearest neighbor search
- **Conversation Context** — Maintains chat history for natural follow-up questions
- **Source Citations** — Every answer shows which training sources were used, with confidence scores
- **Real-time Chat** — Socket.IO for instant messaging with typing indicators
- **Premium UI** — Dark-theme glassmorphism design with smooth Framer Motion animations
- **Training Dashboard** — Drag & drop uploads, live progress, source management

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Login   │  │ Training │  │      Chat        │  │
│  │ Register │  │  Panel   │  │  (with sources)  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │ REST API + Socket.IO
┌─────────────────────┴───────────────────────────────┐
│                Node.js/Express Backend              │
│  ┌──────────────────────────────────────────────┐   │
│  │           RAG Pipeline Service               │   │
│  │  Extract → Chunk → Embed → Store → Retrieve  │   │
│  └──────┬────────────────────────┬──────────────┘   │
│         │                        │                  │
│  ┌──────┴──────┐          ┌──────┴──────┐          │
│  │   Gemini   │          │  ChromaDB   │          │
│  │ Embeddings │          │ Vector DB   │          │
│  │ (Free API) │          │ (ANN Search)│          │
│  └─────────────┘          └─────────────┘          │
│         │                                           │
│  ┌──────┴──────────────────────────────────────┐   │
│  │             MongoDB (Metadata)              │   │
│  │   Users · Sessions · Messages · Sources     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Docker** (for ChromaDB) — [Install Docker](https://docs.docker.com/get-docker/)
- **MongoDB** (Atlas free tier or local) — [Create free cluster](https://cloud.mongodb.com)
- **Google Gemini API Key** (Free) — [Get free API key](https://aistudio.google.com/)  
  _(Optional: Paid [OpenAI API Key](https://platform.openai.com/api-keys) also supported)_

### 1. Clone & Install

```bash
git clone https://github.com/SahilHirpara45/Chatbot-Dialogflow.git
cd Chatbot-Dialogflow
```

**Backend:**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials (MongoDB URI, Gemini API key)
```

**Frontend:**

```bash
cd whatsApp-chat-ui-main
npm install
```

### 2. Start ChromaDB (Vector Database)

```bash
cd backend
docker-compose up -d
```

This starts ChromaDB on port 8000. Verify: `curl http://localhost:8000/api/v1/heartbeat`

### 3. Start the Backend

```bash
cd backend
npm run dev
```

You should see:

```
✔  MongoDB connected
✔  ChromaDB connected (collection: rag_chatbot)
🤖 RAG Chatbot API running on port 5000
```

### 4. Start the Frontend

```bash
cd whatsApp-chat-ui-main
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 📁 Project Structure

```
Chatbot/
├── backend/                     # Node.js/Express API
│   ├── config/index.js          # Centralized configuration
│   ├── controllers/             # Request handlers
│   │   ├── auth.controller.js
│   │   ├── training.controller.js
│   │   └── chat.controller.js
│   ├── middleware/              # Auth & error handling
│   ├── models/                  # Mongoose schemas
│   │   ├── user.model.js        # Users (user/agent/admin roles)
│   │   ├── trainingSource.model.js  # Training data metadata
│   │   ├── chatSession.model.js     # Chat session tracking
│   │   └── message.model.js         # Messages with source citations
│   ├── routes/                  # API route definitions
│   ├── services/                # Business logic
│   │   ├── rag.service.js       # Core RAG pipeline
│   │   ├── vectorStore.service.js   # ChromaDB integration
│   │   ├── embedding.service.js     # OpenAI embeddings
│   │   └── crawler.service.js       # Web crawling
│   ├── socket/index.js          # Socket.IO real-time chat
│   ├── utils/                   # Helpers
│   │   ├── textProcessor.js     # Chunking, text extraction
│   │   └── database.js          # MongoDB connection
│   ├── docker-compose.yml       # ChromaDB setup
│   └── .env.example             # Environment template
│
└── whatsApp-chat-ui-main/       # Next.js Frontend
    └── src/app/
        ├── login/               # Authentication
        ├── register/
        └── dashboard/
            ├── page.tsx         # Stats overview
            ├── training/        # Upload files, URLs, Q&A
            └── chat/            # Chat interface
```

---

## 🔌 API Reference

### Auth

| Method | Endpoint             | Description              |
| ------ | -------------------- | ------------------------ |
| POST   | `/api/auth/register` | Register a new user      |
| POST   | `/api/auth/login`    | Login & get JWT token    |
| GET    | `/api/auth/me`       | Get current user profile |

### Training

| Method | Endpoint                    | Description         |
| ------ | --------------------------- | ------------------- |
| POST   | `/api/training/upload-file` | Upload PDF/DOCX/TXT |
| POST   | `/api/training/upload-url`  | Crawl a website     |
| POST   | `/api/training/add-qna`     | Add Q&A pair        |
| GET    | `/api/training/sources`     | List all sources    |
| GET    | `/api/training/stats`       | Get training stats  |
| DELETE | `/api/training/sources/:id` | Remove a source     |
| POST   | `/api/training/reset`       | Clear all data      |

### Chat

| Method | Endpoint                 | Description           |
| ------ | ------------------------ | --------------------- |
| POST   | `/api/chat/query`        | Query the trained bot |
| GET    | `/api/chat/sessions`     | List chat sessions    |
| GET    | `/api/chat/sessions/:id` | Get session messages  |
| DELETE | `/api/chat/sessions/:id` | Delete a session      |

---

## 🧠 How the RAG Pipeline Works

1. **Ingest** — Upload a PDF, crawl a URL, or add a Q&A pair
2. **Extract** — Pull text from the source (pdf-parse, cheerio, etc.)
3. **Chunk** — Split text into ~500 token chunks with 50 token overlap
4. **Embed** — Generate embedding vectors using Gemini `gemini-embedding-001` (3072 dims)
5. **Store** — Save vectors in ChromaDB for ANN (Approximate Nearest Neighbor) search
6. **Query** — When user asks a question:
   - Embed the query → Search ChromaDB for top-5 similar chunks
   - Build a context window from retrieved chunks
   - Send context + query to Gemini Flash for answer generation
   - Return response with source citations and confidence score

---

## 🛠️ Tech Stack

| Layer           | Technology                | Purpose                         |
| --------------- | ------------------------- | ------------------------------- |
| **Backend**     | Node.js, Express          | REST API & business logic       |
| **Vector DB**   | ChromaDB                  | Embedding storage & ANN search  |
| **Document DB** | MongoDB Atlas             | Users, sessions, metadata       |
| **Embeddings**  | Gemini gemini-embedding-001 | Text → vector conversion (free) |
| **LLM**         | Gemini Flash (gemini-flash-lite-latest) | Answer generation (free) |
| **Frontend**    | Next.js 14, React 18      | Dashboard & chat UI             |
| **Styling**     | Tailwind CSS              | Dark-theme design system        |
| **Animation**   | Framer Motion             | Smooth page transitions         |
| **Real-time**   | Socket.IO                 | Live chat messaging             |
| **Auth**        | JWT + bcrypt              | Secure authentication           |

---

## 📝 Environment Variables

| Variable              | Description                       | Required                         |
| --------------------- | --------------------------------- | -------------------------------- |
| `DB_URI`              | MongoDB connection string         | ✅                               |
| `JWT_SECRET`          | Secret for JWT signing            | ✅                               |
| `GEMINI_API_KEY`      | Google Gemini API key (free)      | ✅ (or `OPENAI_API_KEY`)         |
| `OPENAI_API_KEY`      | OpenAI API key (paid alternative) | Optional                         |
| `OPENAI_BASE_URL`     | LLM provider endpoint URL         | Default: Gemini endpoint         |
| `CHAT_MODEL`          | Chat model name                   | Default: `gemini-flash-lite-latest` |
| `EMBEDDING_MODEL`     | Embedding model name              | Default: `gemini-embedding-001`  |
| `EMBEDDING_DIMENSION` | Embedding vector dimensions       | Default: `3072`                  |
| `CHROMA_URL`          | ChromaDB server URL               | Default: `http://localhost:8000` |
| `PORT`                | Backend port                      | Default: `5000`                  |

---

## 👤 Author

**Sahil Hirpara**

---

## 📜 License

MIT
