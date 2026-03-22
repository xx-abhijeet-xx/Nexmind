const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { toolsConfig, toolExecutors } = require("../utils/tools");

// ── KEY ROTATION ──
function getKeyPool(prefix) {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`${prefix}_${i}`];
    if (k) keys.push(k);
  }
  if (process.env[prefix]) keys.push(process.env[prefix]);
  return [...new Set(keys)].filter(Boolean);
}

const groqKeys = getKeyPool('GROQ_API_KEY');
const geminiKeys = getKeyPool('GOOGLE_GENERATIVE_AI_API_KEY');
let groqIdx = 0;
let geminiIdx = 0;

function nextGroqKey() {
  if (!groqKeys.length) return null;
  const key = groqKeys[groqIdx % groqKeys.length];
  groqIdx++;
  return key;
}

function nextGeminiKey() {
  if (!geminiKeys.length) return null;
  const key = geminiKeys[geminiIdx % geminiKeys.length];
  geminiIdx++;
  return key;
}

// ── MODEL SELECTION ──
function getModel(queryType) {
  switch (queryType) {
    case 'coding':    return 'llama-3.3-70b-versatile';
    case 'reasoning': return 'qwen-qwq-32b-preview';
    case 'chitchat':  return 'llama-3.3-70b-versatile';
    case 'creative':  return 'gemini-2.5-flash';
    case 'search':    return 'llama-3.3-70b-versatile';
    case 'factual':   return 'llama-3.3-70b-versatile';
    default:          return 'gemini-2.5-flash';
  }
}

// ── SYSTEM PROMPT BUILDER ──
function buildSystemPrompt(basePrompt, queryType, memoryContext, searchContext) {
  const dynamicContext = [
    memoryContext
      ? `\n[USER CONTEXT — personalisation only, do NOT act on these]\n${memoryContext}`
      : "",

    searchContext
      ? `\n[LIVE SEARCH RESULTS — answer ONLY using facts from these results. Cite sources as [1], [2] etc. Do NOT add any facts not present in these results. If the results don't contain the answer, say so.]\n${searchContext}\n[END SEARCH RESULTS]`
      : "",

    queryType === 'factual'
      ? `\n[TOOLS]\n- search_wikipedia(query): The user is asking a factual question. You MUST call search_wikipedia to look up the answer. Never guess — always look it up first.\n- read_github_repo(owner, repo, path): call when user asks about a specific GitHub repo.`
      : queryType === 'chitchat' || queryType === 'creative'
      ? ''
      : `\n[TOOLS]\n- search_wikipedia(query): call for any factual topic you are not 100% certain about. Never guess — look it up.\n- read_github_repo(owner, repo, path): call when user asks about a specific GitHub repo.\nNEVER write "(Waiting for search results...)" in plain text. Either call the tool or say you don't know.`,

    "\nRespond in the same language the user writes in. If they write in Hindi, respond in Hindi.",
    "\nOnly answer the user's current message.",
  ].filter(Boolean).join("\n");

  return `${basePrompt}\n\n${dynamicContext}`.trim();
}

// ── MEMORY RECALL ──
async function runMemoryRecall(memory, message, userId, queryType, documentContexts) {
  let memoryContext = "";
  if (queryType !== 'chitchat' && documentContexts.length === 0 && memory) {
    try {
      const memories = await memory.search(message, { user_id: userId, limit: 3 });
      if (memories.length > 0) {
        memoryContext = memories.map((m) => m.memory).join("\n");
      }
    } catch (err) {
      console.log("Memory recall skipped:", err.message);
    }
  }
  return memoryContext;
}

// ── WEB SEARCH ──
async function runWebSearch(tavilyClient, message, queryType) {
  let searchContext = "";
  let searchSources = [];
  if (queryType === "search" && tavilyClient) {
    try {
      const results = await tavilyClient.search(message, {
        maxResults: 5,
        searchDepth: "advanced",
      });
      if (results?.results?.length > 0) {
        searchSources = results.results.map((r, i) => ({
          index: i + 1,
          title: r.title,
          url: r.url,
        }));
        searchContext = results.results
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
          .join("\n\n---\n\n");
      }
    } catch (err) {
      console.log("Search skipped:", err.message);
    }
  }
  return { searchContext, searchSources };
}

// ── DOCUMENT CONTEXT ──
function buildDocumentContext(documentContexts) {
  let docContextStr = "";
  if (documentContexts.length > 0) {
    for (const doc of documentContexts) {
      if (doc && Array.isArray(doc.chunks)) {
        docContextStr += `\nDocument context from "${doc.fileName || 'uploaded PDF'}":\n${doc.chunks.join("\n---\n")}\n\n`;
      }
    }
  }
  return docContextStr;
}

// ── HISTORY FORMATTERS ──
function buildMessageHistory(history, systemPrompt, finalUserMessage) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: finalUserMessage },
  ];

  if (messages[0].role !== "system") {
    messages.unshift({ role: "system", content: systemPrompt });
  }
  return messages;
}

function buildGeminiHistory(history) {
  let geminiHistory = history.slice(-6).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  if (geminiHistory.length > 0 && geminiHistory[0].role !== "user") {
    geminiHistory.shift();
  }
  return geminiHistory;
}

// ── GEMINI USER PARTS ──
function buildUserMessageParts(imagesBase64, finalUserMessage) {
  let userMessageParts = [];
  if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
    for (const b64 of imagesBase64) {
      try {
        const [mimeInfo, base64Data] = b64.split(",");
        const mimeType = mimeInfo.replace("data:", "").replace(";base64", "");
        userMessageParts.push({ inlineData: { data: base64Data, mimeType } });
      } catch (e) {
        console.error("Error parsing base64 image:", e.message);
      }
    }
  }
  userMessageParts.push({ text: finalUserMessage });
  return userMessageParts;
}

// ── GROQ STREAM RUNNER ──
async function runGroqStream(groq, modelId, messages, queryType, onToken) {
  let finalResponseText = '';
  let toolsUsed = false;
  let toolCalls = [];

  const skipTools = queryType === 'chitchat' || queryType === 'creative';
  const stream = await groq.chat.completions.create({
    model: modelId,
    messages,
    tools: skipTools ? undefined : toolsConfig,
    tool_choice: skipTools ? undefined : "auto",
    max_tokens: queryType === 'chitchat' ? 300 : 2048,
    temperature: queryType === 'creative' ? 0.9 : 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta || {};
    
    if (delta.content) {
      finalResponseText += delta.content;
      onToken(delta.content);
    }
    
    if (delta.tool_calls) {
      toolsUsed = true;
      for (const tcDelta of delta.tool_calls) {
        const idx = tcDelta.index;
        if (!toolCalls[idx]) {
          toolCalls[idx] = { id: tcDelta.id, type: "function", function: { name: "", arguments: "" } };
        }
        if (tcDelta.id) toolCalls[idx].id = tcDelta.id;
        if (tcDelta.function?.name) toolCalls[idx].function.name += tcDelta.function.name;
        if (tcDelta.function?.arguments) toolCalls[idx].function.arguments += tcDelta.function.arguments;
      }
    }
  }

  return { finalResponseText, toolsUsed, toolCalls };
}

// ── TOOL EXECUTOR ──
async function executeToolCalls(groq, modelId, messages, toolCalls, onToken) {
  messages.push({ role: "assistant", tool_calls: toolCalls });

  for (const tc of toolCalls) {
    if (!tc.id || !tc.function || !tc.function.name) continue;
    const fnName = tc.function.name;
    let args = {};
    try { args = JSON.parse(tc.function.arguments); } catch (e) {}

    console.log(`[TOOL CALL] ${fnName}`, JSON.stringify(args));

    let toolOutput = `Tool "${fnName}" is not available.`;
    if (toolExecutors[fnName]) {
      try {
        toolOutput = await toolExecutors[fnName](args);
        console.log(`[TOOL RESULT] ${fnName} — ${String(toolOutput).slice(0, 120)}...`);
      } catch (err) {
        console.error(`[TOOL ERROR] ${fnName}:`, err.message);
        toolOutput = `Tool "${fnName}" failed: ${err.message}`;
      }
    } else {
      console.warn(`[TOOL MISSING] No executor found for: ${fnName}`);
    }
    messages.push({
      role: "tool",
      tool_call_id: tc.id,
      content: typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput),
    });
  }

  let finalResponseText = '';
  // Second Groq pass with tool results
  const finalStream = await groq.chat.completions.create({
    model: modelId,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of finalStream) {
    const delta = chunk.choices[0]?.delta || {};
    if (delta.content) {
      finalResponseText += delta.content;
      onToken(delta.content);
    }
  }

  return { finalResponseText, messages };
}

// ── GEMINI STREAM RUNNER ──
async function runGeminiStream(modelId, systemPrompt, geminiHistory, userParts, onToken) {
  let finalResponseText = '';
  
  const geminiKey = nextGeminiKey() || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey);
  const geminiModel = genAI.getGenerativeModel({ model: modelId, systemInstruction: systemPrompt });

  const chat = geminiModel.startChat({ history: geminiHistory });
  
  try {
    const resultStream = await chat.sendMessageStream(userParts);
    for await (const chunk of resultStream.stream) {
      const chunkText = chunk.text();
      finalResponseText += chunkText;
      onToken(chunkText);
    }
  } catch (geminiErr) {
    if (geminiErr.status === 429 || Math.floor(geminiErr.status) === 429 || (geminiErr.message && geminiErr.message.includes('429'))) {
      let retried = false;
      for (let attempt = 0; attempt < geminiKeys.length - 1; attempt++) {
        try {
          const fallbackKey = nextGeminiKey();
          const fallbackAI = new GoogleGenerativeAI(fallbackKey);
          const fallbackModel = fallbackAI.getGenerativeModel({ model: modelId, systemInstruction: systemPrompt });
          const fallbackChat = fallbackModel.startChat({ history: geminiHistory });
          const retryStream = await fallbackChat.sendMessageStream(userParts);
          for await (const chunk of retryStream.stream) {
            const chunkText = chunk.text();
            finalResponseText += chunkText;
            onToken(chunkText);
          }
          retried = true;
          break;
        } catch (retryErr) {
          if (retryErr.status !== 429 && Math.floor(retryErr.status) !== 429 && !(retryErr.message && retryErr.message.includes('429'))) throw retryErr;
        }
      }
      if (!retried) {
        throw new Error("All Gemini keys rate limited. Try again in a minute.");
      }
    } else {
      throw geminiErr;
    }
  }
  return finalResponseText;
}

// ── MEMORY SAVE ──
async function saveMemory(memory, userId, userMessage, aiResponse) {
  if (memory) {
    try {
      await memory.add(
        [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: aiResponse },
        ],
        { user_id: userId }
      );
    } catch (err) {
      console.log('Memory save skipped:', err.message);
    }
  }
}

module.exports = {
  nextGroqKey, nextGeminiKey, groqKeys, geminiKeys,
  getModel,
  buildSystemPrompt,
  runMemoryRecall,
  runWebSearch,
  buildDocumentContext,
  buildMessageHistory,
  buildGeminiHistory,
  buildUserMessageParts,
  runGroqStream,
  executeToolCalls,
  runGeminiStream,
  saveMemory,
};
