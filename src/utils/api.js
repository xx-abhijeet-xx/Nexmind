import { supabase } from '../config/supabase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const USER_ID = process.env.REACT_APP_USER_ID || 'Guest';

/**
 * Returns an Authorization header with the current Supabase JWT.
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function sendMessage(message, history = [], onToken, documentContext = null) {
  const auth = await getAuthHeaders();
  const body = { message, userId: USER_ID, history };
  if (documentContext) {
    body.documentContext = documentContext;
  }
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let metadata = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));

        if (data.error) throw new Error(data.error);

        if (data.token) {
          if (onToken) onToken(data.token);
        }

        if (data.done) {
          metadata = {
            model: data.model,
            queryType: data.queryType,
            searchUsed: data.searchUsed,
          };
        }
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') throw e;
      }
    }
  }

  return metadata;
}

export async function sendVisionMessage(message, imageFile, history = []) {
  const auth = await getAuthHeaders();
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('message', message || '');
  formData.append('history', JSON.stringify(history));

  const res = await fetch(`${API_URL}/chat/vision`, {
    method: 'POST',
    headers: { ...auth },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Vision request failed');
  }

  const data = await res.json();
  return {
    content: data.response,
    model: data.model,
    queryType: data.queryType,
    searchUsed: data.searchUsed,
  };
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_URL}/`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateTitle(message) {
  try {
    const auth = await getAuthHeaders();
    const res = await fetch(`${API_URL}/chat/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    return data.title || 'New conversation';
  } catch {
    return 'New conversation';
  }
}

export async function generateFile(prompt, fileType, fileName) {
  const auth = await getAuthHeaders();
  const res = await fetch(`${API_URL}/chat/generate-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ prompt, fileType, fileName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'File generation failed');
  }

  return res.json();
}

export function downloadFile(content, fileName, mimeType) {
  const name = (fileName || 'output').trim() || 'output';
  const extMap = {
    'text/markdown': 'md',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/json': 'json',
    'application/pdf': 'pdf',
  };
  const ext = extMap[mimeType] || '';
  const safeName = ext && !name.toLowerCase().endsWith(`.${ext}`)
    ? `${name}.${ext}`
    : name;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Detect and parse file generation requests
export function detectFileRequest(message) {
  const text = message.toLowerCase().trim();
  
  // File type patterns with aliases
  const fileTypePatterns = [
    { patterns: ['md', 'markdown'], ext: 'md' },
    { patterns: ['txt', 'text'], ext: 'txt' },
    { patterns: ['javascript', 'js'], ext: 'js' },
    { patterns: ['jsx', 'react jsx'], ext: 'jsx' },
    { patterns: ['html'], ext: 'html' },
    { patterns: ['css'], ext: 'css' },
    { patterns: ['json'], ext: 'json' },
    { patterns: ['jsonl'], ext: 'jsonl' },
    { patterns: ['pdf'], ext: 'pdf' },
  ];

  // Build alternation pattern: md|markdown|txt|text|...
  const allPatterns = fileTypePatterns.flatMap(ft => ft.patterns).join('|');
  
  // Match: (create|generate|write|make) + optional (a|an) + optional (downloadable) + file type + optional (file) + optional (with|containing|etc)
  const pattern = new RegExp(
    `(create|generate|write|make)\\s+(?:a\\s+|an\\s+)?(?:downloadable\\s+)?(?:\\b(?:${allPatterns})\\b)(?:\\s+file)?(?:\\s+(?:with|containing|from|called))?\\s*(.*)`,
    'i'
  );
  
  const match = text.match(pattern);
  if (!match) return null;

  // Extract file type from the message
  let detectedExt = null;
  for (const ft of fileTypePatterns) {
    for (const pat of ft.patterns) {
      if (text.includes(pat)) {
        detectedExt = ft.ext;
        break;
      }
    }
    if (detectedExt) break;
  }

  if (!detectedExt) return null;

  // Extract prompt (everything after the pattern match)
  const prompt = (match[2] || '').trim();

  // Generate filename
  const fileName = `generated.${detectedExt}`;

  return { 
    fileType: detectedExt, 
    prompt: prompt || 'Generate appropriate content', 
    fileName 
  };
}

const FILE_TYPE_MIMES = {
  'md': 'text/markdown',
  'txt': 'text/plain',
  'html': 'text/html',
  'js': 'text/javascript',
  'jsx': 'text/javascript',
  'css': 'text/css',
  'json': 'application/json',
  'jsonl': 'application/jsonl',
  'pdf': 'application/pdf',
};

export function getFileMimeType(fileType) {
  return FILE_TYPE_MIMES[fileType] || 'text/plain';
}

/**
 * Upload a PDF and receive chunked text back from the backend.
 * @param {File} file - The PDF File object
 * @returns {Promise<{ fileName: string, pageCount: number, chunkCount: number, chunks: string[] }>}
 */
export async function uploadPdf(file) {
  const auth = await getAuthHeaders();
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { ...auth },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'PDF upload failed');
  }

  return res.json();
}
