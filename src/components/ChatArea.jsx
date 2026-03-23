import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import Message from './Message';
import InputBar from './InputBar';
import './ChatArea.css';

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

function ThinkingIndicator() {
  return (
    <div className="message message--ai thinking-message">
      <div className="msg-avatar msg-avatar--ai"><StarIcon /></div>
      <div className="thinking-bubble">
        <div className="thinking-dots">
          <span className="td" /><span className="td" /><span className="td" />
        </div>
        <span className="thinking-label">Thinking</span>
      </div>
    </div>
  );
}

export default function ChatArea() {
  const { activeSession, loading, error, setError, sidebarOpen, setSidebarOpen } = useChat();
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);
  const prevLoadingRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isNewChat = activeSession.messages.length === 0;

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      isUserScrolledUpRef.current = distanceFromBottom > 150;
      setShowScrollBtn(distanceFromBottom > 200);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const justFinishedLoading = prevLoadingRef.current && !loading;
    prevLoadingRef.current = loading;

    if (!isUserScrolledUpRef.current || justFinishedLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (justFinishedLoading) {
        isUserScrolledUpRef.current = false;
      }
    }
  }, [activeSession.messages, loading]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    isUserScrolledUpRef.current = false;
    setShowScrollBtn(false);
  };

  const copyConversation = () => {
    const text = activeSession.messages
      .map(m => `${m.role === 'user' ? 'You' : 'Chymera'}: ${m.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  };

  const downloadConversation = () => {
    const text = activeSession.messages
      .map(m => `${m.role === 'user' ? 'You' : 'Chymera'}: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`chat-area max-w-full overflow-x-hidden ${isNewChat ? 'chat-area--empty' : ''}`}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      {!isNewChat && (
        <div className="chat-topbar">
          <button className="icon-btn mobile-only-btn" type="button" onClick={() => setSidebarOpen(true)} title="Open sidebar" aria-label="Open sidebar">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <line x1="6" y1="2" x2="6" y2="14" />
            </svg>
          </button>
          <span className="topbar-title">{activeSession.title}</span>
          <button className="icon-btn" type="button" onClick={copyConversation} title="Copy conversation" aria-label="Copy conversation">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
              <circle cx="12" cy="4" r="1.8" /><circle cx="4" cy="8" r="1.8" /><circle cx="12" cy="12" r="1.8" />
              <line x1="5.8" y1="7" x2="10.2" y2="5" /><line x1="5.8" y1="9" x2="10.2" y2="11" />
            </svg>
          </button>
          <button className="icon-btn" type="button" onClick={downloadConversation} title="Download conversation" aria-label="Download conversation">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
              <path d="M8 2v8M5 7l3 3 3-3" /><line x1="3" y1="13" x2="13" y2="13" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><circle cx="8" cy="11" r="0.5" fill="currentColor" />
          </svg>
          {error}
        </div>
      )}

      {showScrollBtn && (
        <button
          className="scroll-to-bottom-btn"
          type="button"
          onClick={scrollToBottom}
          title="Scroll to latest"
          aria-label="Scroll to latest message"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="8" y1="2" x2="8" y2="12"/>
            <polyline points="4,8 8,13 12,8"/>
          </svg>
          Latest
        </button>
      )}

      <div 
        className="chat-messages max-w-full overflow-x-hidden" 
        ref={messagesContainerRef}
      >
        {!isNewChat && activeSession.messages.map(msg => {
          if (msg.role === 'assistant' && msg.isThinking) {
            return <ThinkingIndicator key={msg.id} />;
          }
          return <Message key={msg.id} msg={msg} />;
        })}
        {loading && activeSession.messages[activeSession.messages.length - 1]?.role !== 'assistant' && (
          <ThinkingIndicator />
        )}
        <div ref={bottomRef} />
      </div>

      <InputBar isNewChat={isNewChat} />
    </div>
  );
}

