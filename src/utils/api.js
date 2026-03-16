const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const USER_ID = process.env.REACT_APP_USER_ID || 'Guest';

export async function sendMessage(message, history = [], onToken) {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, userId: USER_ID, history }),
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
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('message', message || '');
  formData.append('history', JSON.stringify(history));

  const res = await fetch(`${API_URL}/chat/vision`, {
    method: 'POST',
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
    const res = await fetch(`${API_URL}/chat/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    return data.title || 'New conversation';
  } catch {
    return 'New conversation';
  }
}
