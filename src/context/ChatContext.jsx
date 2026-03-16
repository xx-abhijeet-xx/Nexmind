import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { sendMessage, sendVisionMessage, generateTitle } from '../utils/api';

const ChatContext = createContext(null);
const STORAGE_KEY = 'nexmind.chat.state.v1';

function createDefaultSession() {
  return { id: 'default', title: 'New conversation', messages: [], createdAt: Date.now() };
}

function markLastAssistant(messages) {
  const lastAiIndex = messages.map(m => m.role).lastIndexOf('assistant');
  return messages.map((m, i) => ({
    ...m,
    isLast: i === lastAiIndex && m.role === 'assistant',
  }));
}

function loadStoredState() {
  if (typeof window === 'undefined') {
    return {
      sessions: [createDefaultSession()],
      activeId: 'default',
      sidebarOpen: true,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        sessions: [createDefaultSession()],
        activeId: 'default',
        sidebarOpen: true,
      };
    }

    const parsed = JSON.parse(raw);
    const sessions = Array.isArray(parsed.sessions) && parsed.sessions.length > 0
      ? parsed.sessions
      : [createDefaultSession()];

    return {
      sessions,
      activeId: parsed.activeId || sessions[0].id,
      sidebarOpen: typeof parsed.sidebarOpen === 'boolean' ? parsed.sidebarOpen : true,
    };
  } catch {
    return {
      sessions: [createDefaultSession()],
      activeId: 'default',
      sidebarOpen: true,
    };
  }
}

export function ChatProvider({ children }) {
  const initialState = loadStoredState();
  const [sessions, setSessions] = useState(initialState.sessions);
  const [activeId, setActiveId] = useState(initialState.activeId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(initialState.sidebarOpen);

  const activeSession = sessions.find(s => s.id === activeId) || sessions[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessions, activeId, sidebarOpen })
    );
  }, [sessions, activeId, sidebarOpen]);

  useEffect(() => {
    if (sessions.length === 0) return;
    if (!sessions.some(s => s.id === activeId)) {
      setActiveId(sessions[0].id);
    }
  }, [sessions, activeId]);

  const newSession = useCallback(() => {
    const id = uuid();
    setSessions(prev => [
      { id, title: 'New conversation', messages: [], createdAt: Date.now() },
      ...prev,
    ]);
    setActiveId(id);
  }, []);

  const updateTitle = useCallback((id, title) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  }, []);

  const send = useCallback(async (text, options = {}) => {
    const messageText = (text || '').trim();
    const imageFile = options.imageFile || null;
    const imagePreview = options.imagePreview || null;

    if ((!messageText && !imageFile) || loading) return;
    setError(null);

    const userMsg = {
      id: uuid(),
      role: 'user',
      content: messageText,
      imagePreview,
      imageName: imageFile?.name,
      ts: Date.now(),
    };

    setSessions(prev => prev.map(s =>
      s.id === activeId
        ? { ...s, messages: markLastAssistant([...s.messages, userMsg]) }
        : s
    ));

    if (activeSession.messages.length === 0) {
      generateTitle(messageText || 'Image analysis').then(title => {
        updateTitle(activeId, title);
      });
    }

    if (imageFile) {
      setLoading(true);
      try {
        const result = await sendVisionMessage(messageText, imageFile, activeSession.messages);
        const aiMsg = {
          id: uuid(),
          role: 'assistant',
          content: result.content,
          model: result.model,
          queryType: result.queryType,
          searchUsed: result.searchUsed,
          ts: Date.now(),
        };

        setSessions(prev => prev.map(s =>
          s.id === activeId
            ? { ...s, messages: markLastAssistant([...s.messages, aiMsg]) }
            : s
        ));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const aiId = uuid();
    const aiMsg = {
      id: aiId,
      role: 'assistant',
      content: '',
      model: '',
      queryType: '',
      searchUsed: false,
      ts: Date.now(),
      streaming: true,
    };

    await new Promise(r => setTimeout(r, 100));

    setSessions(prev => prev.map(s =>
      s.id === activeId
        ? { ...s, messages: markLastAssistant([...s.messages, aiMsg]) }
        : s
    ));

    setLoading(true);
    try {
      const metadata = await sendMessage(
        messageText,
        activeSession.messages,
        (token) => {
          setSessions(prev => prev.map(s => {
            if (s.id !== activeId) return s;
            return {
              ...s,
              messages: markLastAssistant(
                s.messages.map(m =>
                  m.id === aiId
                    ? { ...m, content: m.content + token }
                    : m
                )
              )
            };
          }));
        }
      );

      setSessions(prev => prev.map(s => {
        if (s.id !== activeId) return s;
        return {
          ...s,
          messages: markLastAssistant(
            s.messages.map(m =>
              m.id === aiId
                ? { ...m, streaming: false, ...metadata }
                : m
            )
          )
        };
      }));
    } catch (err) {
      setError(err.message);
      setSessions(prev => prev.map(s => ({
        ...s,
        messages: markLastAssistant(s.messages.filter(m => m.id !== aiId))
      })));
    } finally {
      setLoading(false);
    }
  }, [activeId, activeSession, loading, updateTitle]);

  const regenerate = useCallback(async () => {
    if (loading) return;

    const messages = activeSession.messages;

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    const lastAssistantIndex = messages.map(m => m.role).lastIndexOf('assistant');

    if (lastAssistantIndex !== -1) {
      setSessions(prev => prev.map(s => {
        if (s.id !== activeId) return s;
        return {
          ...s,
          messages: s.messages.slice(0, lastAssistantIndex)
        };
      }));
    }

    await new Promise(r => setTimeout(r, 100));

    await send(lastUserMsg.content);
  }, [activeId, activeSession, loading, send]);

  const deleteSession = useCallback((id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        const fresh = { id: uuid(), title: 'New conversation', messages: [], createdAt: Date.now() };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }, [activeId]);

  return (
    <ChatContext.Provider value={{
      sessions, activeId, setActiveId,
      activeSession, loading, error, setError,
      sidebarOpen, setSidebarOpen,
      newSession, send, deleteSession, regenerate,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
