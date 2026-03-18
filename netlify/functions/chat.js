const baseSystemPrompt = require('./utils/systemPrompt');
const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { tavily } = require("@tavily/core");
const { MemoryClient } = require("mem0ai");
const { classifyQuery } = require("./utils/classifier");
const { toolsConfig, toolExecutors } = require("./utils/tools");

// Model selection based on task
function getModel(type) {
  switch (type) {
    case "coding": return "llama-3.3-70b-versatile";
    case "reasoning": return "qwen-qwq-32b";
    default: return "llama-3.3-70b-versatile";
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let bodyData;
  try {
    bodyData = JSON.parse(event.body || "{}");
  } catch (e) {
    bodyData = {};
  }

  const { message, userId = "abhijeet", documentContexts = [], modelId = 'llama-3.3-70b-versatile', imagesBase64 = [] } = bodyData;
  const history = Array.isArray(bodyData.history) ? bodyData.history : [];

  if (!message) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Message required" }) };
  }

  // To maintain compatibility with our frontend SSE parser without locking up Netlify free tier connections,
  // we stream to a local buffer and fire the entire SSE payload array in a single fast block.
  let sseBuffer = "";
  const mockWrite = (str) => { sseBuffer += str; };

  try {
    // ── Pre-generation Setup ──
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let authObj = {};
    if (process.env.TAVILY_API_KEY) authObj.tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
    if (process.env.MEM0_API_KEY) authObj.memory = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });

    const queryType = classifyQuery(message);

    let memoryContext = "";
    if (documentContexts.length === 0 && authObj.memory) {
      try {
        const memories = await authObj.memory.search(message, { user_id: userId, limit: 3 });
        if (memories.length > 0) memoryContext = memories.map((m) => m.memory).join("\n");
      } catch (err) {}
    }

    let searchContext = "";
    if (queryType === "search" && authObj.tavilyClient) {
      try {
        const results = await authObj.tavilyClient.search(message, { maxResults: 3 });
        searchContext = results.results.map((r) => `${r.title}: ${r.content}`).join("\n\n");
      } catch (err) {}
    }

    let docContextStr = "";
    if (documentContexts.length > 0) {
      for (const doc of documentContexts) {
        if (doc && Array.isArray(doc.chunks)) {
          docContextStr += `\nDocument context from "${doc.fileName || 'uploaded PDF'}":\n${doc.chunks.join("\n---\n")}\n\n`;
        }
      }
    }

    const dynamicContext = [
      memoryContext ? `\nBackground context about this user:\n${memoryContext}` : "",
      searchContext ? `\nCurrent web search results:\n${searchContext}` : "",
      "\nYou have access to the following tools:",
      "- search_wikipedia: Use this when the user asks about ANY topic, concept, person, technology, or event that would benefit from a factual lookup.",
      "- read_github_repo: Use this when the user mentions a GitHub repository.",
      "IMPORTANT: When a tool can provide better information than your training data, you MUST call it.",
    ].filter(Boolean).join("\n");

    const systemPrompt = `${baseSystemPrompt}\n\n${dynamicContext}`.trim();
    
    const finalUserMessage = docContextStr 
      ? `[ATTACHED DOCUMENTS]\n${docContextStr}\n\nUser Question: ${message}`
      : message;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }))
    ];
    
    // Attach latest message
    messages.push({ role: "user", content: finalUserMessage });

    let finalResponseText = "";
    let toolsUsed = false;

    if (modelId.startsWith("gemini")) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model: modelId, systemInstruction: systemPrompt });

      const geminiHistory = history.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const chat = geminiModel.startChat({ history: geminiHistory });
      
      let userMessageParts = [];
      for (const b64 of imagesBase64) {
        try {
          const [mimeInfo, base64Data] = b64.split(",");
          const mimeType = mimeInfo.replace("data:", "").replace(";base64", "");
          userMessageParts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
        } catch (e) {}
      }
      userMessageParts.push({ text: finalUserMessage });

      try {
        const resultStream = await chat.sendMessageStream(userMessageParts);
        for await (const chunk of resultStream.stream) {
          const chunkText = chunk.text();
          finalResponseText += chunkText;
          mockWrite(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
        }
      } catch (geminiErr) {
        if (geminiErr.status === 429 || Math.floor(geminiErr.status) === 429) {
          mockWrite(`data: ${JSON.stringify({ error: "Rate limit reached for " + modelId, done: true })}\n\n`);
          return { statusCode: 200, headers: CORS_HEADERS, body: sseBuffer };
        }
        throw geminiErr;
      }
    } else {
      // ── Groq Flow ──
      try {
        const stream = await groq.chat.completions.create({
          model: modelId,
          messages,
          tools: toolsConfig,
          tool_choice: "auto",
          max_tokens: 2048,
          temperature: 0.7,
          stream: true,
        });
        
        let toolCalls = [];

        for await (const chunk of stream) {
          let delta = chunk.choices[0]?.delta || {};
          if (delta.content) {
            finalResponseText += delta.content;
            mockWrite(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
          }
          if (delta.tool_calls) {
            toolsUsed = true;
            for (const tcDelta of delta.tool_calls) {
              const idx = tcDelta.index;
              if (!toolCalls[idx]) toolCalls[idx] = { id: tcDelta.id, type: "function", function: { name: "", arguments: "" } };
              if (tcDelta.id) toolCalls[idx].id = tcDelta.id;
              if (tcDelta.function?.name) toolCalls[idx].function.name += tcDelta.function.name;
              if (tcDelta.function?.arguments) toolCalls[idx].function.arguments += tcDelta.function.arguments;
            }
          }
        }

        if (toolCalls.length > 0) {
          messages.push({ role: "assistant", tool_calls: toolCalls });

          for (const tc of toolCalls) {
            if (!tc.id || !tc.function || !tc.function.name) continue;
            const fnName = tc.function.name;
            let args = {};
            try { args = JSON.parse(tc.function.arguments); } catch (e) {}

            let toolOutput = `Tool "${fnName}" is not available.`;
            if (toolExecutors[fnName]) {
              try { toolOutput = await toolExecutors[fnName](args); } 
              catch (err) { toolOutput = `Tool "${fnName}" failed: ${err.message}`; }
            }
            messages.push({ role: "tool", tool_call_id: tc.id, content: (typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput)) });
          }

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
              mockWrite(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
            }
          }
        }
      } catch (groqErr) {
        mockWrite(`data: ${JSON.stringify({ error: "Rate limit reached for " + modelId, done: true })}\n\n`);
        return { statusCode: 200, headers: CORS_HEADERS, body: sseBuffer };
      }
    }

    mockWrite(`data: ${JSON.stringify({ done: true, modelUsed: modelId, queryType, toolsUsed })}\n\n`);
    
    // Save memory gracefully
    if (authObj.memory) {
      try {
        await authObj.memory.add([{ role: "user", content: finalUserMessage }, { role: "assistant", content: finalResponseText }], { user_id: userId });
      } catch (err) {}
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: sseBuffer };

  } catch (error) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
