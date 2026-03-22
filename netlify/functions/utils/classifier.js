/**
 * Intent classifier for Chymera
 * Returns one of:
 *   'chitchat'  — greetings, thanks, casual conversation
 *   'coding'    — programming, debugging, technical dev questions
 *   'reasoning' — math, analysis, logic, comparisons
 *   'creative'  — writing, storytelling, brainstorming
 *   'search'    — needs live internet data (news, prices, scores)
 *   'factual'   — stable facts, definitions, explanations (Wikipedia)
 *   'general'   — everything else
 */

function classifyQuery(query) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  const len = words.length;

  // ── 1. CHITCHAT ──
  // Short conversational messages — never search, never use tools
  const chitchatPhrases = [
    'hello', 'hi', 'hey', 'hii', 'hiii', 'yo',
    'how are you', 'how r u', 'whats up', "what's up", 'sup',
    'good morning', 'good night', 'good evening', 'good afternoon',
    'thanks', 'thank you', 'thankyou', 'ty', 'thx',
    'ok', 'okay', 'got it', 'understood', 'sure', 'alright', 'noted',
    'bye', 'goodbye', 'see you', 'cya', 'later',
    'lol', 'haha', 'hehe', 'lmao', 'xd',
    'nice', 'cool', 'great', 'awesome', 'wow', 'amazing',
    'who are you', 'what are you', 'what can you do',
    'introduce yourself', 'tell me about yourself',
    'are you an ai', 'are you human', 'are you real',
    'what is your name', "what's your name",
    'can you help', 'help me',
  ];

  if (len <= 5 && chitchatPhrases.some(p => q.includes(p))) {
    return 'chitchat';
  }

  // ── 2. CODING ──
  // Programming, debugging, dev questions
  if (any(q, [
    'code', 'bug', 'error', 'function', 'debug',
    'fix this', 'fix my', 'fix the', 'implement', 'write a function',
    'write a class', 'write a script', 'write a component',
    'class', 'method', 'variable', 'array', 'object', 'loop',
    'api', 'endpoint', 'request', 'response', 'fetch',
    'react', 'node', 'express', 'javascript', 'typescript',
    'python', 'java', 'spring', 'css', 'html', 'sql',
    'database', 'query', 'schema', 'migration',
    'git', 'docker', 'deploy', 'npm', 'package', 'module',
    'syntax', 'compile', 'runtime', 'exception', 'stack trace',
    'refactor', 'undefined', 'null pointer', 'type error',
    'import', 'export', 'component', 'props', 'state', 'hook',
    'algorithm', 'data structure', 'complexity', 'big o',
    'how to build', 'how to create', 'how to implement',
    'how to use', 'how to connect', 'how to deploy',
  ])) {
    return 'coding';
  }

  // ── 3. REASONING ──
  // Math, logic, analysis, comparisons
  if (any(q, [
    'calculate', 'solve', 'math', 'equation',
    'proof', 'formula', 'compute', 'derive',
    'analyze', 'analyse', 'evaluate',
    'compare', 'difference between', 'similarities between',
    'pros and cons', 'tradeoffs', 'trade-offs', 'advantages',
    'which is better', 'which should i choose', 'which one',
    'step by step', 'explain why', 'reason for', 'why does',
    'logic', 'proof that', 'is it true that',
  ])) {
    return 'reasoning';
  }

  // ── 4. CREATIVE ──
  // Writing, storytelling, brainstorming, imagination
  if (any(q, [
    'write a poem', 'write me a poem', 'write a haiku',
    'write a story', 'write me a story', 'short story',
    'write a song', 'write lyrics', 'write a rap',
    'write an essay', 'write a blog', 'write a post',
    'draft a', 'compose a', 'create a letter',
    'brainstorm', 'give me ideas', 'ideas for', 'suggest ideas',
    'be creative', 'make it fun', 'make it rhyme',
    'in the style of', 'imagine if', 'pretend you are',
    'roleplay', 'act as', 'play the role',
  ])) {
    return 'creative';
  }

  // ── 5. REALTIME SEARCH ──
  // Needs live internet data — only trigger for genuinely time-sensitive queries
  const realtimeSignals = [
    // News
    'latest news', 'recent news', 'breaking news', 'news about', 'news today',
    'current news', 'what happened', 'what is happening', 'what happened today',
    'today in', 'this week in',
    // Live data
    'price of', 'stock price', 'share price', 'crypto price', 'bitcoin price',
    'exchange rate', 'usd to', 'inr to',
    'weather in', 'temperature in', 'forecast for',
    // Sports
    'score of', 'match score', 'who won', 'match result',
    'ipl score', 'ipl result', 'world cup', 'live score',
    // Product/tech releases
    'latest version', 'new release', 'just released', 'just launched',
    'released today', 'launched today', 'announced today',
    'latest update', 'new update',
    // Trends
    'trending', 'viral', 'right now', 'currently happening',
    // Explicit search
    'search for', 'look up', 'google', 'find me information',
    // People/events right now
    'is alive', 'still alive', 'died', 'passed away',
    'current president', 'current pm', 'current ceo',
  ];

  // Year-specific queries also need search (but require enough context)
  const hasRecentYear = /\b(2024|2025|2026)\b/.test(q);
  const hasQuestionWord = any(q, [
    'what', 'who', 'when', 'where', 'latest', 'news', 'update', 'result'
  ]);

  if (any(q, realtimeSignals)) {
    return 'search';
  }

  if (hasRecentYear && hasQuestionWord && len >= 5) {
    return 'search';
  }

  // ── 6. FACTUAL ──
  // Stable facts, definitions, history — use Wikipedia tool, not web search
  if (len >= 4 && any(q, [
    'what is', 'what are', 'what was', 'what were',
    'who is', 'who was', 'who are', 'who were',
    'tell me about', 'explain', 'definition of', 'define',
    'history of', 'origin of', 'when was invented',
    'how does', 'how do', 'how did', 'how was',
    'where is', 'where was', 'where are',
    'meaning of', 'what does mean',
    'biography', 'founded', 'created by',
  ])) {
    return 'factual';
  }

  // ── 7. GENERAL ──
  return 'general';
}

function any(text, keywords) {
  return keywords.some(k => text.includes(k));
}

module.exports = { classifyQuery };