let abortController = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'START') {
    abortController = new AbortController();

    const { url, body, headers } = payload;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        self.postMessage({ type: 'ERROR', error: err.error || `HTTP ${response.status}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);

            if (parsed.content) {
              self.postMessage({ type: 'TOKEN', token: parsed.content });
            }

            if (parsed.done) {
              self.postMessage({ 
                type: 'DONE', 
                metadata: {
                  modelUsed: parsed.modelUsed,
                  queryType: parsed.queryType,
                  toolsUsed: parsed.toolsUsed,
                  sources: parsed.sources,
                }
              });
              return;
            }

            if (parsed.error) {
              self.postMessage({ type: 'ERROR', error: parsed.error });
              return;
            }
          } catch {
            // non-JSON line, skip
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        self.postMessage({ type: 'ABORTED' });
      } else {
        self.postMessage({ type: 'ERROR', error: err.message });
      }
    }
  }

  if (type === 'STOP') {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }
};
