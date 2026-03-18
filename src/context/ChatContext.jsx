import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { sendMessage, sendVisionMessage, generateTitle, generateFile, detectFileRequest, getFileMimeType, uploadPdf } from '../utils/api';

const ChatContext = createContext(null);
const STORAGE_KEY = 'paraai.chat.state.v1';

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
  const [documentContext, setDocumentContext] = useState(null);
  const [rateLimitStats, setRateLimitStats] = useState(null);
  const [artifactViewerOpen, setArtifactViewerOpen] = useState(false);
  const [artifacts, setArtifacts] = useState([]); // Array of { path, content, language }
  const clearDocumentContext = useCallback(() => setDocumentContext(null), []);
  
  // Extend activeSession with rate limit data for convenience (optional)
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
      documentName: documentContext?.fileName || null,
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

    // Check if this is a file generation request
    const fileRequest = detectFileRequest(messageText);
    if (fileRequest) {
      setLoading(true);
      try {
        // Be strict about content — no HTML, no links, just raw content
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
      let accumulatedContent = '';
      let isInsideFile = false;
      let currentFilePath = '';
      let currentFileContent = '';
      
      const metadata = await sendMessage(
        messageText,
        activeSession.messages,
        (token) => {
          accumulatedContent += token;
          let visibleContent = accumulatedContent;

          // Naive state machine for XML parsing on the fly
          // Look for <file path="...">
          const fileStartMatch = accumulatedContent.match(/<file\s+path="([^"]+)">/);
          
          if (fileStartMatch) {
            isInsideFile = true;
            currentFilePath = fileStartMatch[1];
            
            // The content BEFORE the tag is still visible chat text
            const beforeStart = accumulatedContent.substring(0, fileStartMatch.index);
            visibleContent = beforeStart;
            
            // Check if we also have the closing tag yet
            const fileEndMatch = accumulatedContent.substring(fileStartMatch.index).match(/<\/file>/);
            
            if (fileEndMatch) {
              // File is complete
              const startIdx = fileStartMatch.index + fileStartMatch[0].length;
              const endIdx = fileStartMatch.index + fileEndMatch.index;
              currentFileContent = accumulatedContent.substring(startIdx, endIdx).trim();
              
              // Push to artifacts
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
              
              // Reset state, but keep accumulating everything else
              const afterEnd = accumulatedContent.substring(fileStartMatch.index + fileEndMatch.index + fileEndMatch[0].length);
              accumulatedContent = beforeStart + afterEnd;
              isInsideFile = false;
              currentFilePath = '';
              currentFileContent = '';
              visibleContent = accumulatedContent;
            }
          }

          setSessions(prev => prev.map(s => {
            if (s.id !== activeId) return s;
            return {
              ...s,
              messages: markLastAssistant(
                s.messages.map(m =>
                  m.id === aiId
                    ? { ...m, content: visibleContent }
                    : m
                )
              )
            };
          }));
        },
        documentContext,
      );

      // Clear the document context after it has been used
      if (documentContext) clearDocumentContext();

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
      if (err.usage) setRateLimitStats(err.usage);
      setError(err.message);
      setSessions(prev => prev.map(s => ({
        ...s,
        messages: markLastAssistant(s.messages.filter(m => m.id !== aiId))
      })));
    } finally {
      setLoading(false);
    }
  }, [activeId, activeSession, loading, updateTitle, documentContext, clearDocumentContext]);

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
      documentContext, setDocumentContext,
      clearDocumentContext,
      rateLimitStats, setRateLimitStats,
      newSession, send, deleteSession, regenerate,
      updateTitle,
      uploadPdf,
      artifactViewerOpen,
      setArtifactViewerOpen,
      artifacts,
      setArtifacts,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
