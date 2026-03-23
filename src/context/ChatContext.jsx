import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { sendMessage, sendVisionMessage, generateTitle, generateFile, detectFileRequest, getFileMimeType, uploadPdf } from '../utils/api';
import { supabase } from '../config/supabase';

const ChatContext = createContext(null);
const STORAGE_KEY = 'chymera.chat.state.v1';

function createDefaultSession() {
  return { id: 'default', title: 'New conversation', messages: [], createdAt: Date.now() };
}

function markLastAssistant(messages) {
  return messages;
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
  const [rateLimitStats, setRateLimitStats] = useState(null);
  const [artifactViewerOpen, setArtifactViewerOpen] = useState(false);
  const [artifacts, setArtifacts] = useState([]); // Array of { path, content, language }
  const abortRef = useRef(null);
  const [dbLoading, setDbLoading] = useState(true);
  const userHasSelectedRef = useRef(false);
  
  // Extend activeSession with rate limit data for convenience (optional)
  const activeSession = sessions.find(s => s.id === activeId) || sessions[0];

  // ── SUPABASE DB HELPERS ──
  const saveConversationToDB = async (sessionId, title, userId) => {
    try {
      await supabase.from('conversations').upsert({
        id: sessionId,
        user_id: userId,
        title: title,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {}
  };

  const saveMessageToDB = async (message, conversationId, userId) => {
    try {
      await supabase.from('messages').upsert({
        id: message.id,
        conversation_id: conversationId,
        user_id: userId,
        role: message.role,
        content: message.content || '',
        model_used: message.model || null,
        query_type: message.queryType || null,
        tools_used: message.toolsUsed || false,
        is_file_gen: message.isFileGeneration || false,
        file_content: message.fileContent || null,
        file_name: message.fileName || null,
        file_type: message.fileType || null,
        created_at: new Date(message.ts || Date.now()).toISOString()
      }, { onConflict: 'id' });
    } catch (e) {}
  };

  const updateConversationTitle = async (sessionId, title) => {
    try {
      await supabase.from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (e) {}
  };

  const incrementUsage = async (userId) => {
    try {
      const { data: existing } = await supabase
        .from('usage').select('message_count').eq('user_id', userId).single();
      await supabase.from('usage').upsert({
        user_id: userId,
        message_count: (existing?.message_count || 0) + 1,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (e) {}
  };

  // ── ON MOUNT: LOAD CONVERSATIONS FROM SUPABASE ──
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setDbLoading(false);
          return;
        }
        
        const { data: convos } = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(50);
          
        if (convos && convos.length > 0 && isMounted) {
          const finalSessions = [];
          for (const convo of convos) {
            const { data: msgs } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: true });
              
            finalSessions.push({
              id: convo.id,
              title: convo.title,
              createdAt: new Date(convo.created_at).getTime(),
              messages: (msgs || []).map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                model: m.model_used,
                queryType: m.query_type,
                toolsUsed: m.tools_used,
                ts: new Date(m.created_at).getTime(),
                isFileGeneration: m.is_file_gen,
                fileContent: m.file_content,
                fileName: m.file_name,
                fileType: m.file_type,
              }))
            });
          }
          setSessions(finalSessions);
          // Only auto-select the first session if the user hasn't manually
          // chosen a different one while we were loading from DB.
          if (!userHasSelectedRef.current) {
            setActiveId(finalSessions[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load DB state:', err.message);
      } finally {
        if (isMounted) setDbLoading(false);
      }
    }
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        userHasSelectedRef.current = false;
        const defaultSession = createDefaultSession();
        setSessions([defaultSession]);
        setActiveId(defaultSession.id);
        window.localStorage.removeItem(STORAGE_KEY);
      } else if (event === 'SIGNED_IN') {
        // Only reload if sessions are still in default/empty state
        // (i.e. this is a fresh login, not a token refresh on an active session)
        setSessions(prev => {
          const hasRealSessions = prev.some(s => s.id !== 'default' && s.messages.length >= 0);
          if (!hasRealSessions) {
            setDbLoading(true);
            loadData();
          }
          return prev;
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const newSession = useCallback(() => {
    const id = uuid();
    setSessions(prev => [
      { id, title: 'New conversation', messages: [], createdAt: Date.now() },
      ...prev,
    ]);
    setActiveId(id);
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) saveConversationToDB(id, 'New conversation', user.id);
    });
  }, []);

  useEffect(() => {
    const handler = () => newSession();
    document.addEventListener('chymera:newchat', handler);
    return () => document.removeEventListener('chymera:newchat', handler);
  }, [newSession]);

  const updateTitle = useCallback((id, title) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
    updateConversationTitle(id, title);
  }, []);

  const send = useCallback(async (text, options = {}) => {
    const messageText = (text || '').trim();
    const imagesBase64 = options.imagesBase64 || [];
    const documentContexts = options.documentContexts || [];

    if ((!messageText && imagesBase64.length === 0 && documentContexts.length === 0) || loading) return;
    setError(null);

    const userMsg = {
      id: uuid(),
      role: 'user',
      content: messageText,
      imagesBase64,
      documentNames: documentContexts.map(d => d.fileName),
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

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        saveConversationToDB(activeId, activeSession.title, user.id);
        saveMessageToDB(userMsg, activeId, user.id);
        incrementUsage(user.id);
      }
    });

    // Check if this is a file generation request
    const fileRequest = detectFileRequest(messageText);
    if (fileRequest) {
      setLoading(true);
      try {
        // Be strict about content â€” no HTML, no links, just raw content
        const strictPrompt = `Return ONLY the raw ${fileRequest.fileType} file content. Do not include explanations, markdown code fences, HTML anchor tags, download instructions, or any preamble.\n\n${fileRequest.prompt}`;
        
        const fileData = await generateFile(
          strictPrompt,
          fileRequest.fileType,
          fileRequest.fileName
        );

        // Extract raw content (handle various response formats)
        let content = fileData.content || fileData.response || '';
        
        // Remove markdown fences if present
        const fencedMatch = content.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
        if (fencedMatch) {
          content = fencedMatch[1].trim();
        }
        
        // Remove HTML anchor tags if present
        const htmlMatch = content.match(/<a[^>]*href="[^"]*"[^>]*>([^<]*)<\/a>/i);
        if (htmlMatch) {
          content = htmlMatch[1];
        }

        if (!content || !content.trim()) {
          throw new Error('File generation returned empty content');
        }

        const mimeType = getFileMimeType(fileRequest.fileType);
        const aiMsg = {
          id: uuid(),
          role: 'assistant',
          content: 'Your file is ready.',
          fileContent: content.trim(),
          fileName: fileData.fileName || fileRequest.fileName,
          fileType: fileRequest.fileType,
          mimeType,
          ts: Date.now(),
          isFileGeneration: true,
        };

        setSessions(prev => prev.map(s =>
          s.id === activeId
            ? { ...s, messages: markLastAssistant([...s.messages, aiMsg]) }
            : s
        ));

        // DB sync AI file generation msg
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) saveMessageToDB(aiMsg, activeId, user.id);
        });
      } catch (err) {
        if (err.usage) setRateLimitStats(err.usage);
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
      sources: [],
      ts: Date.now(),
      streaming: true,
      isThinking: true,   // NEW — thinking phase active
    };

    await new Promise(r => setTimeout(r, 80));

    setSessions(prev => prev.map(s =>
      s.id === activeId
        ? { ...s, messages: markLastAssistant([...s.messages, aiMsg]) }
        : s
    ));

    abortRef.current = new AbortController();
    setLoading(true);
    try {
      let accumulatedContent = '';
      let isInsideFile = false;
      let currentFilePath = '';
      let currentFileContent = '';

      // ── Smooth streaming buffer ──
      // Tokens come in bursts from SSE. We buffer them and drain
      // at a controlled word-by-word pace using rAF so it feels smooth.
      const tokenBuffer = [];
      let displayedContent = '';
      let drainActive = false;
      let firstTokenReceived = false;

      const drainBuffer = () => {
        if (tokenBuffer.length === 0) {
          drainActive = false;
          return;
        }
        drainActive = true;
        const word = tokenBuffer.shift();
        displayedContent += word;

        setSessions(prev => prev.map(s => {
          if (s.id !== activeId) return s;
          return {
            ...s,
            messages: markLastAssistant(
              s.messages.map(m =>
                m.id === aiId
                  ? { ...m, content: displayedContent, isThinking: false }
                  : m
              )
            )
          };
        }));

        setTimeout(drainBuffer, 18);
      };

      const metadata = await sendMessage(
        messageText,
        activeSession.messages,
        (token) => {
          // On first token: mark thinking as done
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            setSessions(prev => prev.map(s => {
              if (s.id !== activeId) return s;
              return {
                ...s,
                messages: markLastAssistant(
                  s.messages.map(m =>
                    m.id === aiId ? { ...m, isThinking: false } : m
                  )
                )
              };
            }));
          }

          accumulatedContent += token;

          // Split token into words and buffer them
          // (tokens can be multiple chars; split on spaces to animate word-by-word)
          const words = token.split(/(\s+)/);
          words.forEach(w => { if (w) tokenBuffer.push(w); });

          if (!drainActive) drainBuffer();

          // Also track full content for artifact XML parsing
          let visibleContent = accumulatedContent;
          const fileStartMatch = accumulatedContent.match(/<file\s+path="([^"]+)">/);
          if (fileStartMatch) {
            isInsideFile = true;
            currentFilePath = fileStartMatch[1];
            const beforeStart = accumulatedContent.substring(0, fileStartMatch.index);
            visibleContent = beforeStart;
            const fileEndMatch = accumulatedContent.substring(fileStartMatch.index).match(/<\/file>/);
            if (fileEndMatch) {
              const startIdx = fileStartMatch.index + fileStartMatch[0].length;
              const endIdx = fileStartMatch.index + fileEndMatch.index;
              currentFileContent = accumulatedContent.substring(startIdx, endIdx).trim();
              setArtifacts(prev => {
                const existing = prev.findIndex(a => a.path === currentFilePath);
                if (existing >= 0) {
                  const copy = [...prev];
                  copy[existing].content = currentFileContent;
                  return copy;
                }
                return [...prev, { path: currentFilePath, content: currentFileContent }];
              });
              setArtifactViewerOpen(true);
              const afterEnd = accumulatedContent.substring(fileStartMatch.index + fileEndMatch.index + fileEndMatch[0].length);
              accumulatedContent = beforeStart + afterEnd;
              isInsideFile = false;
              currentFilePath = '';
              currentFileContent = '';
            }
          }
        },
        options.documentContexts || [],
        options.modelId || 'llama-3.3-70b-versatile',
        options.imagesBase64 || [],
        abortRef.current?.signal
      );

      setSessions(prev => prev.map(s => {
        if (s.id !== activeId) return s;
        return {
          ...s,
          messages: markLastAssistant(
            s.messages.map(m =>
              m.id === aiId
                ? { ...m, streaming: false, isThinking: false, ...metadata }
                : m
            )
          )
        };
      }));

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const finalAiMsg = {
            ...aiMsg,
            content: accumulatedContent,
            model: metadata.modelUsed,
            queryType: metadata.queryType,
            toolsUsed: metadata.toolsUsed
          };
          saveMessageToDB(finalAiMsg, activeId, user.id);
        }
      });
    } catch (err) {
      if (err.usage) setRateLimitStats(err.usage);
      setError(err.message);
      setSessions(prev => prev.map(s => ({
        ...s,
        messages: markLastAssistant(s.messages.filter(m => m.id !== aiId))
      })));
    } finally {
      setLoading(false);
    }
  }, [activeId, activeSession, loading, updateTitle]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  }, []);

  const regenerate = useCallback(async (messageId) => {
    if (loading) return;

    const messages = activeSession.messages;
    
    const aiMsgIndex = messageId 
      ? messages.findIndex(m => m.id === messageId)
      : messages.map(m => m.role).lastIndexOf('assistant');
    
    if (aiMsgIndex === -1) return;
    
    const precedingUserMsg = [...messages]
      .slice(0, aiMsgIndex)
      .reverse()
      .find(m => m.role === 'user');
    
    if (!precedingUserMsg) return;
    
    setSessions(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      return { ...s, messages: s.messages.slice(0, aiMsgIndex) };
    }));

    await new Promise(r => setTimeout(r, 100));
    await send(precedingUserMsg.content);

  }, [activeId, activeSession, loading, send]);

  const editMessage = useCallback((messageId) => {
    const messages = activeSession.messages;
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const msg = messages[msgIndex];
    if (msg.role !== 'user') return;

    document.dispatchEvent(new CustomEvent('chymera:editMessage', {
      detail: { content: msg.content }
    }));

    setSessions(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      return { ...s, messages: s.messages.slice(0, msgIndex) };
    }));
  }, [activeId, activeSession]);

  const handleSetActiveId = useCallback((id) => {
    userHasSelectedRef.current = true;
    setActiveId(id);
  }, []);

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('conversations').delete().eq('id', id).eq('user_id', user.id).then();
    });
  }, [activeId]);

  return (
    <ChatContext.Provider value={{
      sessions, activeId, setActiveId: handleSetActiveId,
      activeSession, loading, error, setError,
      sidebarOpen, setSidebarOpen,
      rateLimitStats, setRateLimitStats,
      newSession, send, deleteSession, regenerate, stopGeneration, editMessage,
      updateTitle,
      uploadPdf,
      artifactViewerOpen,
      dbLoading,
      setArtifactViewerOpen,
      artifacts,
      setArtifacts,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);

