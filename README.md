# Chymera — AI Assistant Platform

> Production-grade AI assistant with real-time streaming, live web search, persistent memory, vision, and document understanding.

**Live:** https://chymera.vercel.app
**Backend:** Deployed on Railway
**Author:** Abhijeet Verma — [github.com/xx-abhijeet-xx](https://github.com/xx-abhijeet-xx)

---

## Architecture

```
┌─────────────────────────────────────┐     ┌──────────────────────────────────┐
│        Frontend (Vercel)            │     │       Backend (Railway)          │
│        Nexmind-main/                │────▶│     my-ai-assistant-main/        │
│                                     │     │                                  │
│  React 18 + React Router v7         │     │  Node.js + Express 5             │
│  Supabase Auth (JWT)                │     │  Groq SDK (Llama 3.3 / Qwen)     │
│  SSE streaming consumer             │     │  Google Generative AI (Gemini)   │
│  react-markdown + syntax highlight  │     │  Tavily web search               │
│  lucide-react icons                 │     │  Mem0 persistent memory          │
│  axios (PDF upload only)            │     │  Supabase JWT verification       │
└─────────────────────────────────────┘     └──────────────────────────────────┘
```

---

## Repository Structure

```
Nexmind-main/                          my-ai-assistant-main/
├── public/                            ├── config/
│   ├── index.html                     │   └── supabase.js
│   ├── favicon.svg                    ├── controllers/
│   ├── favicon.ico                    │   └── upload.controller.js
│   ├── robots.txt                     ├── middleware/
│   └── sitemap.xml                    │   └── auth.middleware.js
├── netlify/                           ├── routes/
│   └── functions/                     │   ├── auth.routes.js
│       ├── chat.js                    │   ├── chat.js          ← main logic
│       ├── upload.js                  │   └── upload.routes.js
│       └── utils/ (mirrors backend)   ├── utils/
├── src/                               │   ├── classifier.js
│   ├── App.jsx                        │   ├── documentProcessor.js
│   ├── index.js                       │   ├── systemPrompt.js
│   ├── index.css                      │   └── tools.js
│   ├── Assets/                        ├── server.js
│   │   └── chymera-logo.svg           ├── package.json
│   ├── components/                    └── Procfile
│   │   ├── ArtifactViewer.jsx
│   │   ├── ChatArea.jsx
│   │   ├── ChatDropdownMenu.jsx
│   │   ├── ContextualSuggestions.jsx
│   │   ├── FileGenerator.jsx
│   │   ├── InputBar.jsx
│   │   ├── Message.jsx
│   │   ├── PageLoader.jsx
│   │   ├── RecentsPage.jsx
│   │   ├── Sidebar.jsx
│   │   ├── UsageBanner.jsx
│   │   ├── WorkspaceLayout.jsx
│   │   ├── auth/
│   │   │   └── PhoneCapture.jsx
│   │   └── landing/
│   │       ├── AboutScroll.jsx
│   │       ├── AuthCard.jsx
│   │       ├── Capabilities.jsx
│   │       ├── ChatDemo.jsx
│   │       └── LandingFooter.jsx
│   ├── config/
│   │   └── supabase.js
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ChatContext.jsx
│   ├── pages/
│   │   ├── Landing.jsx
│   │   └── Landing.css
│   └── utils/
│       └── api.js
├── package.json
├── vercel.json
└── netlify.toml
```

---

## Environment Variables

### Backend (`my-ai-assistant-main/.env`)
```env
PORT=8080
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
MEM0_API_KEY=your_mem0_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Frontend (`Nexmind-main/.env`)
```env
REACT_APP_API_URL=https://your-railway-backend-url.railway.app
REACT_APP_USER_ID=default_user
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Local Development

### Backend
```bash
cd my-ai-assistant-main
npm install
npm run dev        # nodemon server.js — hot reload on port 8080
```

### Frontend
```bash
cd Nexmind-main
npm install
npm start          # react-scripts start — hot reload on port 3000
```

The frontend proxies `/chat`, `/upload`, `/auth` to `http://localhost:8080` via the `"proxy"` field in `package.json`.

---

## Core Features

### Multi-Provider AI Routing
**File:** `my-ai-assistant-main/routes/chat.js` — `getModel()` function

| Query Type | Model | Provider |
|---|---|---|
| `coding` | `llama-3.3-70b-versatile` | Groq |
| `reasoning` | `qwen-qwq-32b` | Groq |
| `search` (default) | `gemini-2.5-flash` | Google |
| User-selected | Any of the above | Depends |

Classification is in `utils/classifier.js`. All non-code, non-math queries return `'search'` by default, which routes to Gemini 2.5 Flash and triggers Tavily web search.

### SSE Streaming
Backend sets `Content-Type: text/event-stream` and writes `data: {...}\n\n` chunks. Frontend reads via `ReadableStream` in `src/utils/api.js`. Each chunk is `{ content: string }` during streaming, and a final `{ done: true, modelUsed, queryType, toolsUsed, sources }` event closes the stream.

### Live Web Search (Tavily)
When `queryType === 'search'`, the backend calls Tavily with `searchDepth: "advanced"` and `maxResults: 5`. Results are injected into the system prompt as numbered `[1]...[5]` sources. The model is instructed to cite only facts present in those results. Source URLs are returned in the `done` SSE event and stored on the message object for display.

### Persistent Memory (Mem0)
On every completed response, both the user message and AI response are saved to Mem0 under `user_id`. On subsequent requests, Mem0 is searched for relevant context (limit 3) and injected into the system prompt as `[USER CONTEXT]`. Memory is skipped when a PDF document is attached to avoid context pollution.

### Tool Calling (Groq only)
Two tools are registered in `utils/tools.js`:
- `search_wikipedia(query)` — fetches Wikipedia REST API summary
- `read_github_repo(owner, repo, path)` — fetches file content from GitHub API

Tool calls are streamed, aggregated, executed, and a second Groq pass synthesises the results. Gemini uses its own native search grounding and does not go through the tool system.

### PDF Processing
Upload flow: `FileReader` → base64 → `POST /upload` → `documentProcessor.js` (LangChain text splitter) → chunks returned to frontend → chunks injected as `[ATTACHED DOCUMENTS]` in the next user message.

### Vision (Image Analysis)
Images are sent as base64 to `POST /chat/vision` → `meta-llama/llama-4-scout-17b-16e-instruct` on Groq. The vision model specialises in code, errors, UI screenshots, and diagrams.

### Auth Flow
Supabase handles signup, login, and Google OAuth. JWT from Supabase session is attached as `Authorization: Bearer <token>` on every protected request. `middleware/auth.middleware.js` verifies the JWT server-side before any route handler runs. Google OAuth users are redirected to `/chat` and prompted for a phone number via `PhoneCapture.jsx` if not already set.

---

## Key Files Reference

### `my-ai-assistant-main/utils/systemPrompt.js`
The base system prompt injected on every request. Uses pure ASCII (no Unicode box-drawing characters — avoids UTF-8 encoding corruption). Sections: identity, tools, answer structure, formatting rules, voice, and when-unsure fallback.

**⚠️ Known issue:** This file still contains UTF-8 corrupted characters (`â"` instead of `━`, `â€"` instead of `—`). The clean version is in the output prompt file `systemPrompt.js`. Replace both:
- `my-ai-assistant-main/utils/systemPrompt.js`
- `netlify/functions/utils/systemPrompt.js`

### `my-ai-assistant-main/utils/classifier.js`
Returns `'coding'` for code-related keywords, `'reasoning'` for math keywords, and `'search'` for everything else. The `'search'` default ensures Tavily fires on all general/factual questions.

### `my-ai-assistant-main/server.js`
CORS is currently configured for:
```js
origin: ['http://localhost:3000', 'https://chymera.netlify.app']
```
**⚠️ Must add:** `'https://chymera.vercel.app'` — without this, all API calls from the Vercel deployment are rejected.

### `src/utils/api.js`
- `sendMessage()` — SSE consumer with AbortController signal support, sources extraction from done event
- `sendVisionMessage()` — multipart form POST for image analysis
- `uploadPdf()` — axios POST with progress callback and abort support
- `detectFileRequest()` — regex parser for "create a markdown file..." style requests
- `generateTitle()` — calls `/chat/title` for auto-naming sessions

### `src/context/ChatContext.jsx`
Central state for sessions, messages, streaming, artifacts. Key behaviours:
- Sessions persisted to `localStorage` under key `chymera.chat.state.v1`
- `abortRef` holds the current `AbortController` for stop-generation
- `send()` handles file generation requests (detected via `detectFileRequest`) separately from chat requests
- XML artifact parsing via state machine inside the token callback (`<file path="...">...</file>`)
- `stopGeneration()` exposed in context value

### `src/components/InputBar.jsx`
**⚠️ Default model is still `llama-3.3-70b-versatile`** — should be `gemini-2.5-flash` to match the backend routing default. Change:
```js
const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
// to:
const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
```

### `src/pages/Landing.jsx` + `Landing.css`
**⚠️ Known bug:** Sections 2 (AboutScroll) and 3 (Capabilities) may not render on first load. Root causes:
1. `AboutScroll.jsx` and `Capabilities.jsx` each define a duplicate `useReveal()` that creates conflicting IntersectionObservers
2. `position: sticky` inside `overflow: hidden` in `.about-sticky-inner` — CSS spec incompatibility causing layout collapse
3. No fallback if IntersectionObserver never fires

**Fix:** See `chymera-landing-fix-prompt.md` — centralise reveal observer in `Landing.jsx`, fix overflow CSS, add 2.5s fallback.

---

## Pending Changes (not yet in codebase)

These were specified in prompt files during our session but have NOT been applied to the actual code files. Apply them before the next deploy:

| Change | File(s) | Prompt File |
|--------|---------|-------------|
| Fix CORS — add Vercel origin | `server.js` | `chymera-fix-prompt.md` — Fix 3 |
| Fix vision route groq undefined crash | `routes/chat.js` | `chymera-fix-prompt.md` — Fix 1 |
| Fix systemPrompt.js UTF-8 corruption | `utils/systemPrompt.js` + netlify copy | `systemPrompt.js` output file |
| Change default model to Gemini Flash | `InputBar.jsx` | `chymera-full-upgrade-prompt.md` — Change 8 |
| Add SourcesPill component | `Message.jsx` + `Message.css` | `chymera-full-upgrade-prompt.md` — Changes 9-10 |
| Add slash commands | `InputBar.jsx` + `InputBar.css` | `chymera-full-upgrade-prompt.md` — Changes 11-12 |
| Add keyboard shortcuts | `InputBar.jsx` + `ChatContext.jsx` | `chymera-full-upgrade-prompt.md` — Change 13 |
| Add stop generation button | `InputBar.jsx` + `api.js` + `ChatContext.jsx` | `chymera-full-upgrade-prompt.md` — Change 14 |
| Add S/M/L response length toggle | `InputBar.jsx` + `InputBar.css` | `chymera-full-upgrade-prompt.md` — Change 15 |
| Fix landing page sections 2 & 3 | `Landing.jsx`, `Landing.css`, `AboutScroll.jsx`, `Capabilities.jsx` | `chymera-landing-fix-prompt.md` |
| Add Thinking indicator + smooth streaming | `ChatContext.jsx`, `ChatArea.jsx`, `ChatArea.css`, `Message.jsx`, `Message.css` | `chymera-thinking-streaming-prompt.md` |
| Add error enrichment in InputBar | `InputBar.jsx` | Previous session — `enrichErrorMessage` function |

---

## Deployment

### Frontend (Vercel)
```bash
cd Nexmind-main
npm run build
# Push to GitHub — Vercel auto-deploys on push to main
```
Set all `REACT_APP_*` env vars in Vercel dashboard under Settings → Environment Variables.

### Backend (Railway)
Push `my-ai-assistant-main` to its own GitHub repo. Railway auto-deploys on push.
Set all backend env vars in Railway dashboard under Variables.
The `Procfile` contains: `web: node server.js`

---

## Known Issues / Bugs

| Issue | Severity | Status | Fix Location |
|-------|----------|--------|--------------|
| Vision route crashes — `groq` undefined | Critical | Not fixed | `chymera-fix-prompt.md` Fix 1 |
| CORS blocks Vercel frontend | Critical | Not fixed | `chymera-fix-prompt.md` Fix 3 |
| systemPrompt.js UTF-8 corruption | High | Not fixed | Replace with output `systemPrompt.js` |
| Landing sections 2 & 3 blank on load | High | Not fixed | `chymera-landing-fix-prompt.md` |
| Default model is Llama not Gemini Flash | Medium | Not fixed | InputBar.jsx line 64 |
| History parse — no try/catch in vision route | Medium | Not fixed | `chymera-fix-prompt.md` Fix 2 |
| XSS risk in ChatDemo formatText | Low | Not fixed | `chymera-fix-prompt.md` Fix 4 |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18, React Router v7 |
| Styling | CSS Modules (plain CSS per component), Tailwind (available, partially used) |
| Auth | Supabase (email/password + Google OAuth) |
| AI — fast/code | Groq — Llama 3.3 70B Versatile |
| AI — reasoning | Groq — Qwen QwQ 32B |
| AI — default/search | Google Gemini 2.5 Flash |
| AI — vision | Groq — Llama 4 Scout 17B |
| Web search | Tavily (advanced depth, 5 results) |
| Memory | Mem0 |
| Document processing | LangChain text splitter + PDF extraction |
| Backend runtime | Node.js + Express 5 |
| Backend deploy | Railway |
| Frontend deploy | Vercel |
| Fonts | Instrument Serif (display), DM Sans (body), JetBrains Mono (code) — loaded via Google Fonts link tag in index.html |
