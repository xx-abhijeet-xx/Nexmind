# Chymera â€” AI Assistant Platform

> A production-grade, browser-based AI assistant with real-time streaming, web search, persistent memory, vision understanding, and smart multi-model routing. Built from scratch with React + Node.js + Express, deployed on Railway and Vercel.

![Chymera Main UI](./src/Assets/image.png)
![Chymera Vision Example](./src/Assets/image2.png)

---

## Live Demo

- **Frontend:** [chymera.vercel.app](https://chymera.vercel.app)

---

## What is Chymera?

Chymera is a self-hosted AI assistant platform that rivals commercial tools like ChatGPT â€” built entirely with open source models and free APIs. It classifies every query automatically and routes it to the best available model, giving you the right tool for every task without switching apps.

---

## Features

- **Streaming responses** â€” words appear token by token in real time, just like ChatGPT
- **Web search** â€” automatically searches the internet for current events, news, and real-time data via Tavily API
- **Persistent memory** â€” remembers your name, projects, and preferences across sessions via Mem0
- **Image understanding** â€” upload screenshots, code photos, UI designs â€” AI analyzes them
- **Smart routing** â€” detects whether you're asking a coding, reasoning, or general question and picks the best model
- **Auto-title** â€” AI generates a descriptive title for every conversation from the first message
- **Prompt templates** â€” pre-built templates for common developer tasks (fix code, review code, design system)
- **Regenerate** â€” one click to get a fresh AI response if you're not satisfied
- **Multi-session** â€” create and switch between multiple conversations
- **Download** â€” export any conversation as a text file
- **Mobile responsive** â€” works on any screen size

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Groq API | LLM inference â€” Llama 3.3 70B, DeepSeek-R1 |
| Tavily API | Real-time web search |
| Mem0 API | Persistent memory across sessions |
| Multer | File/image upload handling |
| CORS | Cross-origin request handling |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| React Markdown | Render AI markdown responses |
| React Syntax Highlighter | Code block syntax highlighting |
| CSS Variables | Dark theme design system |
| DM Sans + JetBrains Mono | Typography |

### Infrastructure
| Technology | Purpose |
|---|---|
| Railway | Backend hosting (always-on free tier) |
| Vercel | Frontend hosting (CDN + CI/CD) |
| GitHub Actions | CI/CD pipeline |

---

## Architecture

```
Browser (React)
      |
      | HTTPS
      â†“
Express Backend (Railway)
      |
      â”œâ”€â”€ POST /chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ LiteLLM Router
      â”‚                              |
      â”‚                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
      â”‚                    â†“         â†“          â†“
      â”‚               Llama 70B  DeepSeek-R1  Search
      â”‚               (general)  (reasoning)  (Tavily)
      â”‚
      â”œâ”€â”€ POST /chat/vision â”€â”€â†’ Llama 4 Scout (vision)
      â”œâ”€â”€ POST /chat/title â”€â”€â”€â†’ Llama 70B (title gen)
      â”œâ”€â”€ Memory Layer â”€â”€â”€â”€â”€â”€â”€â”€â†’ Mem0 (recall + save)
      â””â”€â”€ GET /health â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ status check
```

### Query Routing Logic

```
User sends message
      â†“
Classifier (utils/classifier.js)
      â†“
Contains "code/bug/function/debug" â†’ DeepSeek-R1 (coding)
Contains "news/latest/today/search" â†’ Llama 70B + Tavily (search)
Contains "reason/math/solve/analyze" â†’ DeepSeek-R1 (reasoning)
Everything else â†’ Llama 3.3 70B (general)
```

---

## Project Structure

```
my-ai-assistant/               â† Backend (Node.js)
â”œâ”€â”€ server.js                  â† Express entry point
â”œâ”€â”€ routes/
â”‚   â””â”€â”€ chat.js                â† All chat endpoints
â”œâ”€â”€ utils/
â”‚   â”œâ”€â”€ classifier.js          â† Query type detection
â”‚   â”œâ”€â”€ systemPrompt.js        â† AI personality + standards
â”‚   â””â”€â”€ tools.js               â† Plugin utilities
â”œâ”€â”€ .env                       â† Environment variables (never commit)
â””â”€â”€ package.json

chymera/                        â† Frontend (React)
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ Sidebar.jsx        â† Navigation + chat history
â”‚   â”‚   â”œâ”€â”€ ChatArea.jsx       â† Main chat window
â”‚   â”‚   â”œâ”€â”€ Message.jsx        â† Individual message + markdown
â”‚   â”‚   â””â”€â”€ InputBar.jsx       â† Text input + tools
â”‚   â”œâ”€â”€ context/
â”‚   â”‚   â””â”€â”€ ChatContext.jsx    â† Global state management
â”‚   â””â”€â”€ utils/
â”‚       â””â”€â”€ api.js             â† API calls to backend
â””â”€â”€ package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Free accounts at: Groq, Tavily, Mem0

### 1. Clone the repository

```bash
git clone https://github.com/xx-abhijeet-xx/my-ai-assistant.git
cd my-ai-assistant
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your API keys:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
MEM0_API_KEY=your_mem0_api_key
PORT=8080
```

### 4. Start the backend

```bash
npm start
```

Backend runs at `http://localhost:8080`

### 5. Install frontend dependencies

```bash
cd ../chymera
npm install
```

### 6. Configure frontend environment

```bash
cp .env.example .env.local
```

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_USER_ID=your_name
```

### 7. Start the frontend

```bash
npm start
```

Frontend runs at `http://localhost:3000`

---

## API Reference

### POST /chat
Send a message and receive a streaming response.

**Request:**
```json
{
  "message": "How do I fix a memory leak in React?",
  "userId": "abhijeet",
  "history": []
}
```

**Response:** Server-Sent Events stream
```
data: {"token": "The"}
data: {"token": " issue"}
data: {"token": " is..."}
data: {"done": true, "model": "llama-3.3-70b-versatile", "queryType": "coding"}
```

---

### POST /chat/vision
Analyze an image with text prompt.

**Request:** `multipart/form-data`
- `image` â€” image file (jpg, png, webp)
- `message` â€” text prompt
- `history` â€” JSON stringified conversation history

**Response:**
```json
{
  "response": "The image shows a React component with a bug on line 23...",
  "model": "meta-llama/llama-4-scout-17b-16e-instruct"
}
```

---

### POST /chat/title
Generate a short title from a message.

**Request:**
```json
{ "message": "How do I implement JWT auth in Spring Boot?" }
```

**Response:**
```json
{ "title": "JWT Auth Spring Boot" }
```

---

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "running",
  "message": "AI Assistant API is live"
}
```

---

## Environment Variables

| Variable | Description | Required | Example |
|---|---|---|---|
| `GROQ_API_KEY` | Groq API key for LLM inference | Yes | `gsk_abc...` |
| `TAVILY_API_KEY` | Tavily search API key | Yes | `tvly-abc...` |
| `MEM0_API_KEY` | Mem0 memory API key | Yes | `m0-abc...` |
| `PORT` | Server port | No | `8080` |

---

## Deployment

### Backend â€” Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Add environment variables in Railway dashboard â†’ Variables tab.

### Frontend â€” Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd chymera
vercel
```

Add `REACT_APP_API_URL` pointing to your Railway URL in Vercel dashboard â†’ Settings â†’ Environment Variables.

---

## Models Used

| Model | Provider | Used For | Cost |
|---|---|---|---|
| Llama 3.3 70B | Groq | General chat, web search | Free |
| DeepSeek-R1 Distill | Groq | Coding, reasoning | Free |
| Llama 4 Scout 17B | Groq | Vision/image analysis | Free |

---

## What I Learned

Building Chymera taught me:

- **Streaming APIs** â€” implementing Server-Sent Events end to end from Express to React
- **LLM routing** â€” how to classify queries and route to specialized models
- **RAG concepts** â€” integrating real-time search into AI context
- **Fine-tuning** â€” creating JSONL training datasets, running QLoRA on free GPUs
- **Prompt engineering** â€” writing system prompts that shape AI personality and behavior
- **Production deployment** â€” Railway, Vercel, environment management, CI/CD

---

## Roadmap

- [ ] User authentication (JWT login/signup)
- [ ] PDF file upload and analysis
- [ ] GitHub plugin integration
- [ ] Wikipedia plugin
- [ ] Code execution sandbox
- [ ] Mobile app (React Native)
- [ ] Multiple AI model switcher in UI

---

## Author

**Abhijeet Verma** â€” Full Stack Engineer at LTIMindtree

- GitHub: [@xx-abhijeet-xx](https://github.com/xx-abhijeet-xx)
- LinkedIn: [abhijeet-verma-dev](https://linkedin.com/in/abhijeet-verma-dev)
- Portfolio: [abhijeet-verma.vercel.app](https://abhijeet-verma.vercel.app)
- Email: contact.abhijeetverma@gmail.com

---

## License

MIT â€” free to use, modify, and distribute.

---

> Built with curiosity, caffeine, and a lot of debugging. ðŸš€
