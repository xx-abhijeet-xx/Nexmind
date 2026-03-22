const { classifyQuery } = require('./utils/classifier');
const baseSystemPrompt = require('./utils/systemPrompt');
const {
  nextGroqKey, nextGeminiKey,
  getModel, buildSystemPrompt,
  runMemoryRecall, runWebSearch,
  buildDocumentContext, buildMessageHistory,
  buildGeminiHistory, buildUserMessageParts,
  runGroqStream, executeToolCalls,
  runGeminiStream, saveMemory,
} = require('./lib/aiCore');

const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { tavily } = require("@tavily/core");
const { MemoryClient } = require("mem0ai");

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

  const { message, documentContexts = [], imagesBase64 = [] } = bodyData;
  
  // Extract userId from Supabase JWT in Authorization header
  let userId = 'guest';
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub || payload.email || 'guest';
    }
  } catch (e) {}

  const history = Array.isArray(bodyData.history) ? bodyData.history : [];

  if (!message) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Message required" }) };
  }

  let sseBuffer = "";
  const mockWrite = (str) => { sseBuffer += str; };

  try {
    const queryType = classifyQuery(message || '');
    const modelId = bodyData.modelId || getModel(queryType);

    let authObj = {};
    if (process.env.TAVILY_API_KEY) authObj.tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
    if (process.env.MEM0_API_KEY) authObj.memory = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });

    const memoryContext = await runMemoryRecall(authObj.memory, message, userId, queryType, documentContexts);
    const { searchContext, searchSources } = await runWebSearch(authObj.tavilyClient, message, queryType);
    
    const docContextStr = buildDocumentContext(documentContexts);
    const finalUserMessage = docContextStr 
      ? `[ATTACHED DOCUMENTS]\n${docContextStr}\n\nUser Question: ${message}`
      : message;

    const systemPrompt = buildSystemPrompt(baseSystemPrompt, queryType, memoryContext, searchContext);
    const messages = buildMessageHistory(history, systemPrompt, finalUserMessage);

    const onToken = (chunk) => mockWrite(`data: ${JSON.stringify({ content: chunk })}\n\n`);

    let finalResponseText = '';
    let toolsUsed = false;

    if (modelId.startsWith("gemini")) {
      const geminiHistory = buildGeminiHistory(history);
      const userParts = buildUserMessageParts(imagesBase64, finalUserMessage);
      finalResponseText = await runGeminiStream(modelId, systemPrompt, geminiHistory, userParts, onToken);
    } else {
      const result = await runGroqStream(new Groq({ apiKey: nextGroqKey() }), modelId, messages, queryType, onToken);
      finalResponseText = result.finalResponseText;
      toolsUsed = result.toolsUsed;
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolResult = await executeToolCalls(new Groq({ apiKey: nextGroqKey() }), modelId, messages, result.toolCalls, onToken);
        finalResponseText += toolResult.finalResponseText;
      }
    }

    mockWrite(`data: ${JSON.stringify({ done: true, modelUsed: modelId, queryType, toolsUsed, sources: searchSources })}\n\n`);
    
    await saveMemory(authObj.memory, userId, finalUserMessage, finalResponseText);

    return { statusCode: 200, headers: CORS_HEADERS, body: sseBuffer };

  } catch (error) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
