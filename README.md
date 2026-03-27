# Chymera — AI Assistant Platform

> A production-grade, full-stack AI assistant with real-time streaming, live web search, persistent memory, vision, document understanding, voice input, and smart multi-model routing. Built with React + Node.js, deployed on Railway and Vercel.

**Frontend:** [chymera.netlify.app](https://chymera.netlify.app)
**Backend:** Deployed on Railway
**Author:** Abhijeet Verma — [github.com/abhijeet-builds](https://github.com/abhijeet-builds) · [linkedin.com/in/abhijeet-verma-dev](https://linkedin.com/in/abhijeet-verma-dev)

---

## What is Chymera?

Chymera is a self-hosted AI assistant platform that rivals commercial tools like ChatGPT — built entirely with open source models and free APIs. Every query is automatically classified and routed to the best available model. It remembers your context across sessions, searches the web in real time, reads documents, analyzes images, and transcribes voice — all running free on Groq and Google's APIs.

---

## Features

| Feature | Description |
|---|---|
| **Smart query routing** | Classifies every message into 7 types and routes to the best model automatically |
| **Streaming responses** | Token-by-token rendering via SSE — words appear as they generate |
| **Background streaming** | Web Worker keeps generation running even when tab is hidden or minimized |
| **Live web search** | Automatically searches the internet for real-time data via Tavily |
| **Persistent memory** | Remembers your name, projects, and preferences across sessions via Mem0 |
| **Image understanding** | Upload screenshots, code photos, UI designs — AI analyzes them with Llama 4 Scout |
| **PDF reading** | Upload PDFs — text is extracted, chunked, and injected into context |
| **Voice input** | Record audio → transcribed by Groq Whisper in ~1-2 seconds |
| **Wikipedia tool** | AI automatically calls Wikipedia for factual questions |
| **GitHub tool** | AI reads README and files from any public GitHub repo |
| **File generation** | Generate .md, .txt, .html, .js, .css, .json files and download them |
| **Auto-title** | AI generates a descriptive chat title from the first message |
| **Regenerate** | Retry any AI response from any point in the conversation |
| **Edit messages** | Edit any sent message — removes subsequent messages and re-sends |
| **Stop generation** | Cancel mid-stream with a dedicated stop button |
| **Scroll to bottom** | Floating button appears when scrolled up, generation doesn't force-scroll |
| **Prompt templates** | Pre-built developer templates on the empty state |
| **Instant chitchat** | Single-word reactions get instant replies with zero API calls |
| **Multi-session** | Create, switch, search, and delete multiple conversations |
| **Export conversation** | Download any chat as a .txt file |
| **Auth** | Email/password + Google OAuth via Supabase |
| **Key rotation** | Automatic API key rotation with exponential backoff across up to 10 keys per provider |
| **Auto-recovery** | Safely intercepts blank/failed API streams and automatically retries before showing a graceful fallback |
| **Mobile responsive** | Full sidebar overlay, touch-friendly layout |

---

## Architecture

```
Browser (React 18)
      │
      │ HTTPS + SSE
      ▼
Express Backend (Railway)
      │
      ├── POST /chat ──────────► Query Classifier
      │                               │
      │              ┌────────────────┼─────────────────┐
      │              ▼                ▼                  ▼
      │         Groq API         Google Gemini      Tavily Search
      │     (Llama / Qwen)      (2.5 Flash)        (web results)
      │
      ├── POST /chat/vision ───► Groq Llama 4 Scout (image analysis)
      ├── POST /chat/title ────► Groq Llama 3.3 70B (title generation)
      ├── POST /chat/transcribe► Groq Whisper (voice → text)
      ├── POST /upload ────────► LangChain PDF processor
      ├── POST /auth/signup ───► Supabase Auth
      ├── POST /auth/login ────► Supabase Auth
      └── GET  /health/keys ───► Key pool status
```

### Query Routing

```
User sends message
      │
      ▼
classifier.js
      │
      ├── chitchat   → Llama 3.3 70B  (no tools, short response)
      ├── coding     → Llama 3.3 70B  (code-focused)
      ├── reasoning  → Qwen QwQ 32B   (math, logic, comparisons)
      ├── creative   → Gemini 2.5 Flash (writing, stories, poems)
      ├── search     → Llama 3.3 70B + Tavily (real-time web)
      ├── factual    → Llama 3.3 70B + Wikipedia tool
      └── general    → Llama 3.3 70B
```

### Key Rotation System

Production-grade `KeyPool` class manages all API keys:

```
KeyPool tracks per-key state:
  failures, cooldownUntil, totalRequests, totalFailures

On 429 error:
  markFailed(key) → exponential backoff
    1st failure → 60s cooldown
    2nd failure → 120s cooldown
    3rd+ failure → 300s cooldown

nextKey() skips all keys in cooldown
  → if all exhausted, throws clean error with wait time

GET /health/keys shows real-time status of all keys
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| Groq SDK | LLM inference — Llama 3.3 70B, Qwen QwQ 32B, Whisper, Llama 4 Scout |
| Google Generative AI | Gemini 2.5 Flash for creative queries |
| Tavily API | Real-time web search |
| Mem0 API | Persistent memory across sessions |
| Supabase | JWT verification middleware |
| LangChain | PDF text splitting and chunking |
| Multer | File and audio upload handling |

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| React Router v7 | Client-side routing |
| React ErrorBoundary | Component crash isolation |
| Supabase JS | Auth — email, password, Google OAuth |
| React Markdown + remark-gfm | Render AI markdown responses |
| React Syntax Highlighter | Code block syntax highlighting |
| Lucide React | Icon library |
| Web Worker | Background streaming (tab-hidden generation) |
| MediaRecorder API | Voice recording before Whisper transcription |

### Testing

| Technology | Purpose |
|---|---|
| Jest | Backend unit and integration tests |
| Supertest | HTTP endpoint testing |
| Nock | HTTP request mocking for external APIs |
| React Testing Library | Frontend component tests |

```bash
# Backend tests with coverage
cd my-ai-assistant && npm test

# Frontend tests
cd chymera && npm test
```

Coverage threshold enforced at 70% branches, 80% functions and lines.

### Infrastructure

| Technology | Purpose |
|---|---|
| Railway | Backend hosting, auto-deploy on push |
| Vercel | Frontend hosting, CDN, CI/CD |
| Supabase | Auth + PostgreSQL database |
| GitHub | Version control, CI/CD trigger |

---

## Project Structure

```
my-ai-assistant/                     Chymera/
├── lib/
│   └── aiCore.js          ← KeyPool, model routing, streaming logic
├── middleware/
│   └── auth.middleware.js ← Supabase JWT verification
├── routes/
│   ├── auth.routes.js     ← signup, login, /me
│   ├── chat.js            ← chat, vision, title, transcribe, generate-file
│   └── upload.routes.js   ← PDF upload
├── utils/
│   ├── classifier.js      ← 7-type query classifier
│   ├── documentProcessor.js
│   ├── systemPrompt.js    ← AI identity, rules, few-shot examples
│   └── tools.js           ← Wikipedia + GitHub tool definitions
└── server.js

                             ├── public/
                             │   └── streamWorker.js  ← Web Worker for background streaming
                             ├── src/
                             │   ├── components/
                             │   │   ├── ChatArea.jsx     ← smart scroll, scroll-to-bottom btn
                             │   │   ├── InputBar.jsx     ← voice, stop btn, file gen, slash cmds
                             │   │   ├── Message.jsx      ← regenerate, edit, copy, sources
                             │   │   ├── Sidebar.jsx      ← collapsible, search, key rotation UI
                             │   │   ├── ArtifactViewer.jsx
                             │   │   ├── FileGenerator.jsx
                             │   │   └── landing/         ← AuthCard, ChatDemo, Capabilities
                             │   ├── context/
                             │   │   ├── AuthContext.jsx  ← Supabase session management
                             │   │   └── ChatContext.jsx  ← sessions, streaming, retry, edit
                             │   └── utils/
                             │       └── api.js
                             └── vercel.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Free accounts: Groq, Tavily, Mem0, Supabase, Google AI Studio

### 1. Clone and install

```bash
# Backend
git clone https://github.com/abhijeet-builds/my-ai-assistant.git
cd my-ai-assistant && npm install

# Frontend
git clone https://github.com/abhijeet-builds/chymera.git
cd chymera && npm install
```

### 2. Configure environment variables

**Backend `.env`:**
```env
PORT=8080

# Groq — supports up to 10 keys for rotation
GROQ_API_KEY=gsk_your_primary_key
GROQ_API_KEY_1=gsk_your_second_key

# Google Gemini — supports up to 10 keys
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key

# Other services
TAVILY_API_KEY=tvly_your_key
MEM0_API_KEY=m0_your_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

**Frontend `.env.local` (see `.env.example`):**
```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run locally

```bash
# Backend (port 8080)
npm run dev

# Backend tests
npm test

# Frontend (port 3000)
npm start

# Frontend tests
npm test
```

---

## API Reference

### POST /chat
Stream an AI response via SSE.

```json
{
  "message": "fix this bug: users.map is not a function",
  "history": [],
  "modelId": "llama-3.3-70b-versatile",
  "documentContexts": [],
  "imagesBase64": []
}
```

SSE events:
```
data: {"content": "users"}
data: {"content": " is undefined"}
data: {"done": true, "modelUsed": "llama-3.3-70b-versatile", "queryType": "coding", "sources": []}
```

### POST /chat/vision
Analyze an image with a text prompt. `multipart/form-data` with `image` file field.

### POST /chat/transcribe
Transcribe audio via Groq Whisper. `multipart/form-data` with `audio` file field.
Returns `{ transcript: "transcribed text" }`.

### POST /chat/title
Generate a 5-word chat title from a message.
Returns `{ title: "Fix Users Map Error" }`.

### POST /chat/generate-file
Generate file content and return it for download.
Returns `{ content: "...", fileName: "output.md", fileType: "md" }`.

### POST /upload
Process a PDF and return text chunks for context injection.
Returns `{ fileName, pageCount, chunkCount, chunks }`.

### GET /health/keys
Returns real-time status of all API key pools.

```json
{
  "groq": [
    { "key": "key_1", "available": true, "failures": 0, "totalRequests": 142, "cooldownRemainingSeconds": 0 }
  ],
  "gemini": [
    { "key": "key_1", "available": false, "failures": 2, "cooldownRemainingSeconds": 47 }
  ]
}
```

---

## System Prompt Design

The AI personality is defined in `utils/systemPrompt.js` using a rules + few-shot examples approach. Rules alone achieve ~60% compliance. Rules + examples achieve ~90% compliance.

Key sections:
- **Identity** — name, user context, tech stack awareness
- **Tone** — explicit examples for every chitchat message type
- **Banned phrases** — 15 specific phrases the model must never use
- **Answer structure** — per-query-type response patterns
- **Code quality standards** — DTOs, no null returns, @Valid, proper deps
- **Follow-up question rule** — explicitly banned
- **Examples** — 15 concrete before/after pairs covering every query type

---

## What I Learned

- **SSE streaming** end to end from Express to React with Web Worker background execution
- **LLM query classification** — 7-type classifier with priority ordering to prevent misrouting
- **Production key rotation** — KeyPool class with exponential backoff, per-key health tracking
- **Prompt engineering** — rules + few-shot examples vs rules alone, compliance rates
- **Fine-tuning pipeline** — JSONL dataset creation, QLoRA training on Kaggle free GPU, overfitting detection
- **Multi-model orchestration** — routing between Groq, Gemini, Whisper based on query type
- **Tool calling** — Wikipedia and GitHub as native AI capabilities via function calling
- **Auth architecture** — Supabase JWT, middleware verification, Google OAuth flow
- **PDF RAG** — LangChain chunking, context injection into prompts

---

## Roadmap

- [ ] User authentication dashboard (usage stats, API key management)
- [ ] Conversation sharing via public link
- [ ] Chat folders and organization
- [ ] Code execution sandbox (run JS/Python inline)
- [ ] Mobile app (React Native)
- [ ] Custom instructions per conversation
- [ ] Plugin marketplace (user-enabled tools)

---

## Author

**Abhijeet Verma** — Full Stack Engineer at LTIMindtree

[GitHub](https://github.com/abhijeet-builds) · [LinkedIn](https://linkedin.com/in/abhijeet-verma-dev) · [Portfolio](https://abhijeetbuilds.netlify.app/) · contact.abhijeetverma@gmail.com

---

> Built from scratch. Every feature shipped, debugged, and deployed. 🚀
