import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import './Sidebar.css';

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function Sidebar() {
  const { sessions, activeId, setActiveId, newSession, deleteSession, setSidebarOpen, sidebarOpen } = useChat();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar--closed'}`}>
      <div className="sb-topbar">
        <div className="sb-brand">
          <span className="sb-star"><StarIcon /></span>
          <span className="sb-name">ParaAI</span>
        </div>
        <button className="icon-btn" type="button" onClick={() => setSidebarOpen(false)} title="Close sidebar" aria-label="Close sidebar">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <line x1="6" y1="2" x2="6" y2="14"/>
          </svg>
        </button>
      </div>

      <div className="sb-nav">
        <button className="nav-btn nav-btn--primary" type="button" onClick={newSession}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>
          </svg>
          New chat
        </button>

        {searching ? (
          <div className="search-wrap">
            <input
              className="search-input"
              autoFocus
              placeholder="Search chats..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onBlur={() => { if (!search) setSearching(false); }}
            />
            {search && (
              <button className="icon-btn search-clear" type="button" onClick={() => { setSearch(''); setSearching(false); }} aria-label="Clear search">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
                </svg>
              </button>
            )}
          </div>
        ) : (
          <button className="nav-btn" type="button" onClick={() => setSearching(true)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
              <circle cx="6" cy="6" r="4"/><line x1="10" y1="10" x2="14" y2="14"/>
            </svg>
            Search
          </button>
        )}

        <button className="nav-btn" type="button">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <circle cx="8" cy="8" r="5"/><path d="M8 5v3l2 1.5"/>
          </svg>
          Customize
        </button>
      </div>

      <div className="sb-divider" />

      <div className="sb-nav">
        <button className="nav-btn" type="button">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <path d="M2 4h12M2 8h8M2 12h10"/>
          </svg>
          Chats
        </button>
        <button className="nav-btn" type="button">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
            <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
          </svg>
          Artifacts
        </button>
      </div>

      <div className="sb-divider" />

      <div className="sb-label">Recents</div>

      <div className="sb-list">
        {filtered.length === 0 && (
          <p className="sb-empty">No chats found</p>
        )}
        {filtered.map(s => (
          <div
            key={s.id}
            className={`chat-row ${s.id === activeId ? 'chat-row--active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => setActiveId(s.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveId(s.id);
              }
            }}
            aria-label={`Open chat ${s.title}`}
          >
            <span className="chat-row__title">{s.title}</span>
            <button
              className="chat-row__del"
              type="button"
              onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
              title="Delete"
              aria-label={`Delete chat ${s.title}`}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="sb-footer">
        <div className="user-row">
          <div className="user-av">A</div>
          <div>
            <div className="user-name">Guest</div>
            <div className="user-plan">Free plan</div>
          </div>
        </div>
        <div className="footer-btns">
          <button className="icon-btn" type="button" title="Download conversation" aria-label="Download conversation">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
              <path d="M8 2v8M5 7l3 3 3-3"/><line x1="3" y1="13" x2="13" y2="13"/>
            </svg>
          </button>
          <button className="icon-btn" type="button" title="Settings" aria-label="Settings">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
              <circle cx="8" cy="8" r="2.5"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
