import React, { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import Message from './Message';
import InputBar from './InputBar';
import './ChatArea.css';

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

const TEMPLATES = [
  { label: 'Fix my code', prompt: 'Fix this code and explain what was wrong:\n\n', icon: '🔧' },
  { label: 'Review my code', prompt: 'Review this code for bugs, performance, and best practices:\n\n', icon: '👁️' },
  { label: 'Write a component', prompt: 'Write a production-ready React component for: ', icon: '⚛️' },
  { label: 'Debug this error', prompt: 'Help me debug this error:\n\n', icon: '🐛' },
  { label: 'Explain a concept', prompt: 'Explain this concept clearly with examples: ', icon: '💡' },
  { label: 'Design a system', prompt: 'Design the architecture for: ', icon: '🏗️' },
  { label: 'Write a Spring Boot API', prompt: 'Write a production Spring Boot REST API for: ', icon: '☕' },
  { label: 'Latest AI news', prompt: 'What are the latest developments in AI today?', icon: '📰' },
];

function TypingIndicator() {
  return (
    <div className="message message--ai">
      <div className="msg-avatar msg-avatar--ai"><StarIcon /></div>
      <div className="typing-bub">
        <span className="td" /><span className="td" /><span className="td" />
      </div>
    </div>
  );
}

function EmptyState() {
  const { send } = useChat();
  const [inputRef, setInputRef] = React.useState(null);

  const handleTemplate = (template) => {
    const inputEl = document.querySelector('.input-textarea');
    if (inputEl) {
      inputEl.value = template.prompt;
      inputEl.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      ).set;
      nativeInputValueSetter.call(inputEl, template.prompt);
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div className="empty-state">
      <div className="empty-icon"><StarIcon /></div>
      <h2 className="empty-title">How can I help?</h2>
      <p className="empty-subtitle">Choose a template or type anything</p>
      <div className="template-grid">
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            className="template-btn"
            onClick={() => handleTemplate(t)}
          >
            <span className="template-icon">{t.icon}</span>
            <span className="template-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatArea() {
  const { activeSession, loading, error, setError, sidebarOpen, setSidebarOpen } = useChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, loading]);

  const copyConversation = () => {
    const text = activeSession.messages
      .map(m => `${m.role === 'user' ? 'You' : 'NexMind'}: ${m.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  };

  const downloadConversation = () => {
    const text = activeSession.messages
      .map(m => `${m.role === 'user' ? 'You' : 'NexMind'}: ${m.content}`)
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
    <div className="chat-area">
      <div className="chat-topbar">
        {!sidebarOpen && (
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
              <rect x="2" y="2" width="12" height="12" rx="2"/>
              <line x1="6" y1="2" x2="6" y2="14"/>
            </svg>
          </button>
        )}
        <span className="topbar-title">{activeSession.title}</span>
        <button className="icon-btn" onClick={copyConversation} title="Share">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <circle cx="12" cy="4" r="1.8"/><circle cx="4" cy="8" r="1.8"/><circle cx="12" cy="12" r="1.8"/>
            <line x1="5.8" y1="7" x2="10.2" y2="5"/><line x1="5.8" y1="9" x2="10.2" y2="11"/>
          </svg>
        </button>
        <button className="icon-btn" onClick={downloadConversation} title="Download">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <path d="M8 2v8M5 7l3 3 3-3"/><line x1="3" y1="13" x2="13" y2="13"/>
          </svg>
        </button>
      </div>

      <div className="chat-messages">
        {activeSession.messages.length === 0 ? (
          <EmptyState />
        ) : (
          activeSession.messages.map(msg => <Message key={msg.id} msg={msg} />)
        )}
        {loading && activeSession.messages[activeSession.messages.length - 1]?.role !== 'assistant' && (
          <TypingIndicator />
        )}
        {error && (
          <div className="error-banner">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
              <circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/>
            </svg>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <InputBar />
    </div>
  );
}
