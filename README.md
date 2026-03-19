# Chymera — AI Assistant Platform

> Production-grade, browser-based AI assistant with real-time streaming, multi-provider routing, live web search, persistent memory, vision understanding, PDF analysis, voice input, and artifact generation. Built with React + Node.js + Express, deployed on Netlify (frontend) and Railway (backend).

---

## Live Demo

| Environment | URL |
|---|---|
| Frontend | [chymera.netlify.app](https://chymera.netlify.app) |
| Backend API | Railway (always-on) |

---

## What is Chymera?

Chymera is a self-hosted AI assistant platform that rivals commercial tools like ChatGPT and Claude — built entirely with open-source models and free-tier APIs. It classifies every query automatically and routes it to the best available model, giving you the right intelligence for every task without switching apps.

The name comes from the Chimera — the mythological beast fused from multiple creatures. Chymera is the same concept applied to AI: multiple models, search engines, memory systems, and document processors fused into one seamless interface.

---

## Features

| Feature | Description |
|---|---|
| **Streaming responses** | Token-by-token SSE delivery — words appear as the model thinks them |
| **Multi-model routing** | Automatically routes to Gemini 1.5 Pro, Groq Llama 3.3, or Gemini 2.5 Flash based on query type |
| **Live web search** | Tavily API injects real-time internet results before generation |
| **Persistent memory** | Mem0 remembers your preferences, stack, and projects across sessions |
| **Image vision** | Upload JPG/PNG/WebP — Gemini analyzes screenshots, UI designs, code photos |
| **PDF analysis** | Upload documents — chunked via LangChain, deep Q&A via Gemini |
| **Voice input** | Native Web Speech API — dictate prompts directly |
| **Artifact viewer** | AI-generated files (code, markdown, HTML) open in a side panel |
| **File generation** | Generate and download .md, .txt, .js, .jsx, .html, .css, .json files |
| **Smart routing** | Query classifier detects coding / reasoning / search / general intent |
| **Auto-title** | AI generates a descriptive conversation title from the first message |
| **Regenerate** | One click to get a fresh response |
| **Multi-session** | Create and switch between unlimited conversations |
| **Conversation export** | Download any conversation as a .txt file |
| **Usage tracking** | Per-user rate limiting and tier system via Supabase |
| **Auth** | Email/password + Google OAuth via Supabase |
| **Mobile responsive** | Full functionality on any screen size |

---

## Architecture

```
Browser (React — Netlify)
         │
         │ HTTPS + Supabase JWT
         ▼
┌─────────────────────────────────────────────┐
│         Express Backend (Railway)            │
│                                             │
│  POST /chat ──────────────► Model Router    │
│                                │            │
│                    ┌───────────┼──────────┐ │
│                    ▼           ▼          ▼ │
│             Gemini 1.5    Groq Llama   Gemini│
│             Pro (vision   3.3 70B      2.5   │
│             + docs)       (general)   Flash  │
│                                             │
│  POST /chat + imagesBase64 ──► Gemini Vision│
│  POST /upload ──────────────► PDF Processor │
│  POST /chat/title ──────────► Title Gen     │
│  POST /chat/generate-file ──► File Gen      │
│                                             │
│  Cross-cutting:                             │
│    Tavily ──── web search injection         │
│    Mem0 ─────  memory recall + save         │
│    Supabase ── JWT auth + user profiles     │
└─────────────────────────────────────────────┘

Netlify Functions (Production — mirrors Express routes):
  /.netlify/functions/chat    → chat.js
  /.netlify/functions/upload  → upload.js
```

### Query Routing Logic

```
User sends message
        │
        ▼
  classifyQuery() — utils/classifier.js
        │
        ├─ "code/bug/function/debug/fix/implement" ──► Groq Llama 3.3
        ├─ "news/latest/today/current/2025/2026" ────► Groq + Tavily
        ├─ "calculate/solve/math/formula/compute" ───► Groq Llama (qwen fallback)
        └─ everything else ──────────────────────────► Groq Llama 3.3

  modelId override from frontend:
        ├─ "gemini-1.5-pro" ──────────────────────────► Google Gemini
        ├─ "gemini-2.5-flash" ────────────────────────► Google Gemini
        └─ "llama-3.3-70b-versatile" ────────────────► Groq
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express | 5.x | REST API + SSE streaming |
| Groq SDK | 0.3.x | Llama 3.3 70B inference |
| Google Generative AI | 0.24.x | Gemini 1.5 Pro + 2.5 Flash |
| Tavily Core | 0.7.x | Real-time web search |
| Mem0 AI | 2.4.x | Persistent cross-session memory |
| LangChain TextSplitters | 1.0.x | PDF chunking for RAG |
| Supabase JS | 2.x | JWT auth verification |
| Multer | 2.x | File upload handling |
| pdf-extraction | 1.0.x | PDF text extraction |
| CORS | 2.8.x | Cross-origin headers |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| React Router DOM | 7.x | Client-side routing |
| React Markdown | 9.x | Render AI markdown |
| React Syntax Highlighter | 15.x | Code block highlighting |
| Lucide React | 0.577.x | Icon system |
| Supabase JS | 2.x | Auth + session management |
| Axios | 1.x | HTTP client + upload progress |
| UUID | 9.x | Session/message IDs |
| JSZip + file-saver | - | File downloads |

### Infrastructure
| Technology | Purpose |
|---|---|
| Railway | Backend hosting (always-on) |
| Netlify | Frontend hosting + serverless functions |
| Supabase | Auth, user profiles, usage tracking |
| GitHub | Source control + CI/CD |

---

## Project Structure

```
my-ai-assistant/                ← Express Backend (Railway)
├── server.js                   ← Entry point, CORS, route mounting
├── routes/
│   ├── chat.js                 ← All AI endpoints (main, title, vision, file gen)
│   ├── auth.routes.js          ← Supabase auth wrappers
│   └── upload.routes.js        ← PDF upload endpoint
├── controllers/
│   └── upload.controller.js    ← PDF processing logic
├── middleware/
│   └── auth.middleware.js      ← Supabase JWT verification
├── utils/
│   ├── classifier.js           ← Query intent detection
│   ├── systemPrompt.js         ← AI personality + coding standards
│   ├── tools.js                ← Wikipedia + GitHub tool definitions
│   └── documentProcessor.js   ← LangChain PDF chunker
├── config/
│   └── supabase.js             ← Supabase admin client
├── Procfile                    ← Railway start command
└── package.json

nexmind/ (Chymera Frontend)     ← React App (Netlify)
├── netlify.toml                ← Build config + function bundling
├── netlify/
│   └── functions/
│       ├── chat.js             ← Serverless mirror of Express /chat
│       └── upload.js           ← Serverless mirror of Express /upload
└── src/
    ├── App.jsx                 ← Routing + auth protection
    ├── App.css
    ├── index.js
    ├── index.css               ← Global dark theme variables
    ├── Assets/
    │   ├── chymera-logo.svg    ← Demon eye logo
    │   ├── image.png
    │   └── image2.png
    ├── config/
    │   └── supabase.js         ← Supabase client init
    ├── context/
    │   ├── AuthContext.jsx     ← Auth state + signIn/signUp/Google OAuth
    │   └── ChatContext.jsx     ← Sessions, messages, streaming, artifacts
    ├── pages/
    │   ├── Landing.jsx         ← Landing page with auth card
    │   └── Landing.css
    ├── components/
    │   ├── WorkspaceLayout.jsx ← Main app shell
    │   ├── Sidebar.jsx         ← Session history + navigation
    │   ├── ChatArea.jsx        ← Message list + topbar
    │   ├── Message.jsx         ← Individual message with markdown
    │   ├── InputBar.jsx        ← Text/voice/file input + model picker
    │   ├── ArtifactViewer.jsx  ← Side panel for generated files
    │   ├── FileGenerator.jsx   ← Downloadable file generation
    │   ├── ContextualSuggestions.jsx
    │   ├── RecentsPage.jsx
    │   ├── UsageBanner.jsx
    │   └── ChatDropdownMenu.jsx
    │   └── landing/
    │       ├── AuthCard.jsx    ← Login/Register/Username flow
    │       ├── ChatDemo.jsx    ← Animated chat preview
    │       ├── AboutScroll.jsx ← Horizontal scroll cards
    │       ├── Capabilities.jsx← Timeline + preview panel
    │       └── LandingFooter.jsx
    │   └── auth/
    │       ├── PhoneCapture.jsx← Google OAuth phone fallback
    │       └── Auth.css
    └── utils/
        └── api.js              ← All API calls + SSE parser
```

---

## API Reference

### POST /chat

Send a message and receive a streaming SSE response.

**Headers:**
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request:**
```json
{
  "message": "How do I fix a memory leak in React?",
  "history": [
    { "role": "user", "content": "previous message" },
    { "role": "assistant", "content": "previous response" }
  ],
  "modelId": "llama-3.3-70b-versatile",
  "documentContexts": [
    {
      "fileName": "docs.pdf",
      "chunks": ["chunk 1 text...", "chunk 2 text..."]
    }
  ],
  "imagesBase64": ["data:image/png;base64,..."]
}
```

**Response:** `text/event-stream`
```
data: {"content": "The"}
data: {"content": " issue"}
data: {"content": " is caused by..."}
data: {"done": true, "modelUsed": "llama-3.3-70b-versatile", "queryType": "coding", "toolsUsed": false}
```

---

### POST /upload

Upload a PDF and receive extracted text chunks for RAG.

**Headers:**
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request:**
```json
{
  "pdfBase64": "<base64 encoded PDF>",
  "fileName": "document.pdf"
}
```

**Response:**
```json
{
  "fileName": "document.pdf",
  "pageCount": 42,
  "chunkCount": 87,
  "chunks": ["chunk 1...", "chunk 2...", "..."]
}
```

---

### POST /chat/title

Generate a short title from the first message of a conversation.

**Request:**
```json
{ "message": "How do I implement JWT auth in Spring Boot?" }
```

**Response:**
```json
{ "title": "JWT Auth Spring Boot" }
```

---

### POST /chat/generate-file

Generate a downloadable file from a prompt.

**Request:**
```json
{
  "prompt": "A React component for a login form with validation",
  "fileType": "jsx",
  "fileName": "LoginForm.jsx"
}
```

**Response:**
```json
{
  "content": "import React...",
  "fileName": "LoginForm.jsx",
  "fileType": "jsx"
}
```

Supported file types: `md`, `txt`, `js`, `jsx`, `html`, `css`, `json`, `jsonl`

---

### GET /

Health check.

**Response:**
```json
{
  "status": "running",
  "message": "AI Assistant API is live"
}
```

---

## Environment Variables

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key — [console.groq.com](https://console.groq.com) |
| `GEMINI_API_KEY` | Yes | Google AI Studio key — [aistudio.google.com](https://aistudio.google.com) |
| `TAVILY_API_KEY` | Yes | Tavily search key — [tavily.com](https://tavily.com) |
| `MEM0_API_KEY` | Yes | Mem0 memory key — [mem0.ai](https://mem0.ai) |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `PORT` | No | Server port (default: 8080) |

### Frontend (Netlify)

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | Yes | Your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `REACT_APP_API_URL` | Dev only | Backend URL for local dev (e.g. `http://localhost:8080`) |

> In production, the frontend calls `/.netlify/functions/chat` and `/.netlify/functions/upload` directly. The Express backend is only used in local development.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Free accounts: [Groq](https://console.groq.com) · [Google AI Studio](https://aistudio.google.com) · [Tavily](https://tavily.com) · [Mem0](https://mem0.ai) · [Supabase](https://supabase.com)

### 1. Clone

```bash
git clone https://github.com/xx-abhijeet-xx/my-ai-assistant.git
```

### 2. Backend setup

```bash
cd my-ai-assistant
npm install
cp .env.example .env
# Fill in all API keys in .env
npm start
# Runs at http://localhost:8080
```

### 3. Frontend setup

```bash
cd nexmind
npm install
# Create .env.local with your Supabase credentials
# Set REACT_APP_API_URL=http://localhost:8080 for local dev
npm start
# Runs at http://localhost:3000
```

---

## Deployment

### Backend — Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Set all environment variables in Railway dashboard → Variables tab.

### Frontend — Netlify

Connect your GitHub repo in Netlify dashboard.

Set build settings:
- Build command: `npm run build`
- Publish directory: `build`
- Functions directory: `netlify/functions`

Set all `REACT_APP_*` environment variables in Netlify → Site settings → Environment variables.

> The Netlify functions (`netlify/functions/chat.js` and `upload.js`) are self-contained — they include all AI provider logic and don't call the Express backend in production.

---

## n8n Automation Workflows

n8n is a self-hostable workflow automation tool (like Zapier, but open source and free). You can connect Chymera to dozens of services without writing extra backend code.

### Setup

```bash
# Run n8n locally with Docker
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Open http://localhost:5678
```

Or use [n8n Cloud](https://n8n.io) free tier (no Docker needed).

---

### Workflow 1 — Daily Briefing Email

Every morning at 8am, n8n calls your Chymera backend and emails you a summary of today's news, weather, and your calendar.

```
Schedule Trigger (8:00 AM daily)
    │
    ▼
HTTP Request → POST http://your-railway-url/chat
    Body: {
      "message": "Give me a morning briefing: top 5 tech news today,
                  weather in Mumbai, and 3 motivational tips",
      "modelId": "llama-3.3-70b-versatile"
    }
    Headers: { Authorization: Bearer <your_jwt> }
    │
    ▼
Parse SSE Response (Code node)
    │
    ▼
Gmail / SMTP → Send to you@email.com
```

**n8n nodes needed:** Schedule Trigger → HTTP Request → Code → Gmail

---

### Workflow 2 — Slack Bot

Ask Chymera questions directly from Slack using a slash command `/ask`.

```
Webhook Trigger (receives Slack slash command)
    │
    ▼
HTTP Request → POST /chat
    Body: { "message": "{{ $json.text }}", "userId": "{{ $json.user_id }}" }
    │
    ▼
Code node (extract text from SSE stream)
    │
    ▼
HTTP Request → POST https://slack.com/api/chat.postMessage
    Body: { "channel": "{{ $json.channel_id }}", "text": "{{ $json.answer }}" }
```

**n8n nodes needed:** Webhook → HTTP Request → Code → HTTP Request (Slack)

---

### Workflow 3 — GitHub PR Review Bot

When a PR is opened, Chymera reviews the diff and posts a comment automatically.

```
GitHub Trigger (pull_request opened)
    │
    ▼
HTTP Request → GitHub API (get PR diff)
    │
    ▼
HTTP Request → POST /chat
    Body: {
      "message": "Review this code diff and identify bugs,
                  security issues, and improvements:\n{{ $json.diff }}",
      "modelId": "gemini-1.5-pro"
    }
    │
    ▼
HTTP Request → GitHub API (post PR comment)
```

**n8n nodes needed:** GitHub Trigger → HTTP Request (diff) → HTTP Request (Chymera) → Code → GitHub (comment)

---

### Workflow 4 — PDF Inbox Processor

When a PDF arrives in your Gmail, automatically upload it to Chymera, extract insights, and save to Notion.

```
Gmail Trigger (new email with PDF attachment)
    │
    ▼
Code node (extract attachment, convert to base64)
    │
    ▼
HTTP Request → POST /upload
    Body: { "pdfBase64": "...", "fileName": "{{ $json.filename }}" }
    │
    ▼
HTTP Request → POST /chat
    Body: {
      "message": "Summarize this document and extract all action items",
      "documentContexts": [{ "fileName": "...", "chunks": {{ $json.chunks }} }]
    }
    │
    ▼
Notion → Create page with summary + action items
```

**n8n nodes needed:** Gmail Trigger → Code → HTTP Request (upload) → HTTP Request (chat) → Notion

---

### Workflow 5 — Twitter/X Thread Generator

Turn a topic into a ready-to-post Twitter thread on a schedule or on demand.

```
Manual Trigger or Schedule
    │
    ▼
HTTP Request → POST /chat
    Body: {
      "message": "Write a 7-tweet thread about {{ $json.topic }}.
                  Each tweet max 280 chars. Number them 1/7, 2/7 etc.",
      "modelId": "llama-3.3-70b-versatile"
    }
    │
    ▼
Code node (split response into individual tweets)
    │
    ▼
Twitter / X node (post thread)
    — OR —
Google Sheets (save drafts for review)
```

---

### Connecting n8n to Chymera — SSE Response Parser

Since Chymera streams SSE responses, use this Code node to parse them in n8n:

```javascript
// n8n Code node — parse Chymera SSE response
const raw = $input.item.json.data || '';
const lines = raw.split('\n');
let fullText = '';

for (const line of lines) {
  if (!line.startsWith('data: ')) continue;
  try {
    const parsed = JSON.parse(line.slice(6));
    if (parsed.content) fullText += parsed.content;
    if (parsed.done) break;
  } catch (e) {
    // skip malformed lines
  }
}

return [{ json: { answer: fullText } }];
```

> **Tip:** Set the HTTP Request node to "Response Format: Text" to get the raw SSE stream, then parse it with the Code node above.

---

## Models Used

| Model | Provider | Used For |
|---|---|---|
| `llama-3.3-70b-versatile` | Groq | General chat, web search, coding, titles |
| `gemini-1.5-pro` | Google | Vision, PDF analysis, complex reasoning |
| `gemini-2.5-flash` | Google | Fast general responses |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Groq | Legacy vision (multipart image_url) |

---

## Supabase Schema

Chymera uses Supabase for auth and user management. Create these tables in your Supabase project:

```sql
-- User profiles (auto-created on signup)
create table profiles (
  id uuid references auth.users on delete cascade,
  name text,
  phone text,
  username text unique,
  plan text default 'free',
  usage_count integer default 0,
  primary key (id)
);

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

Enable **Google OAuth** in Supabase → Authentication → Providers → Google.
Set redirect URL to `https://your-netlify-app.netlify.app/chat`.

---

## Roadmap

- [x] Real-time SSE streaming
- [x] Multi-model routing (Groq + Gemini)
- [x] Web search via Tavily
- [x] Persistent memory via Mem0
- [x] Image vision (Gemini)
- [x] PDF upload + RAG analysis
- [x] Voice input (Web Speech API)
- [x] File generation + artifact viewer
- [x] Supabase auth (Email + Google OAuth)
- [x] Landing page with animated chat demo
- [ ] n8n workflow automation integrations
- [ ] Mobile app (React Native)
- [ ] Conversation search
- [ ] Shared conversation links
- [ ] Custom system prompt per conversation
- [ ] Plugin marketplace

---

## Author

**Abhijeet Verma** — Full Stack Engineer at LTIMindtree

- GitHub: [@xx-abhijeet-xx](https://github.com/xx-abhijeet-xx)
- LinkedIn: [abhijeet-verma-dev](https://linkedin.com/in/abhijeet-verma-dev)
- Portfolio: [abhijeet-verma.vercel.app](https://abhijeet-verma.vercel.app)
- Email: contact.abhijeetverma@gmail.com

---

## License

MIT — free to use, modify, and distribute.

---

> Built with curiosity, caffeine, and a lot of debugging. 🚀
