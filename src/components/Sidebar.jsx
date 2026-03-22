import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function Sidebar() {
  const { sessions, activeId, setActiveId, newSession, deleteSession, setSidebarOpen, sidebarOpen, dbLoading } = useChat();
  const { user, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try { await signOut(); } catch (err) { console.error('Sign out error:', err); }
  };

  const handleNewSession = () => {
    newSession();
    navigate('/chat/');
  };

  const handleSelectSession = (id) => {
    setActiveId(id);
    navigate('/chat/');
  };

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar--closed'}`}>
      <div className="sb-topbar">
        <div className="sb-brand">
          <span className="sb-name">Chymera</span>
        </div>
        <button className="icon-btn" type="button" onClick={() => setSidebarOpen(false)} title="Close sidebar" aria-label="Close sidebar">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <line x1="6" y1="2" x2="6" y2="14"/>
          </svg>
        </button>
      </div>

      <div className="sb-nav">
        <button className="nav-btn nav-btn--primary" type="button" onClick={handleNewSession} title="New chat">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>
          </svg>
          <span className="nav-btn-text">New chat</span>
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
          <button className="nav-btn" type="button" onClick={() => setSearching(true)} title="Search">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
              <circle cx="6" cy="6" r="4"/><line x1="10" y1="10" x2="14" y2="14"/>
            </svg>
            <span className="nav-btn-text">Search</span>
          </button>
        )}

        <button className="nav-btn" type="button" title="Customize">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <circle cx="8" cy="8" r="5"/><path d="M8 5v3l2 1.5"/>
          </svg>
          <span className="nav-btn-text">Customize</span>
        </button>
      </div>

      <div className="sb-divider" />

      <div className="sb-nav">
        <button className="nav-btn" type="button" title="Chats">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <path d="M2 4h12M2 8h8M2 12h10"/>
          </svg>
          <span className="nav-btn-text">Chats</span>
        </button>
        <button className="nav-btn" type="button" title="Artifacts">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
            <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
          </svg>
          <span className="nav-btn-text">Artifacts</span>
        </button>
      </div>

      <div className="sb-divider" />

      <div className="sb-label">Recents</div>

      <div className="sb-list">
        {dbLoading ? (
          <div className="sidebar-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="sidebar-skeleton" />
            ))}
          </div>
        ) : !sidebarOpen ? (
          <button 
            className="nav-btn" 
            type="button" 
            title="Chat History"
            onClick={() => navigate('/chat/recents')}
            style={{ justifyContent: 'center', padding: '10px 0' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <circle cx="8" cy="8" r="6"/>
              <polyline points="8,4 8,8 11,10"/>
            </svg>
          </button>
        ) : (
          <>
            {filtered.length === 0 && (
              <p className="sb-empty">No chats found</p>
            )}
            {filtered.map(s => (
            <div
              key={s.id}
              className={`chat-row ${s.id === activeId ? 'chat-row--active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectSession(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectSession(s.id);
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
          </>
        )}
      </div>

      <div className="sb-footer">
        <div className="user-row" title={user?.user_metadata?.full_name || user?.email || 'User'}>
          <div className="user-av">{(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.username || user?.email || 'U')[0]?.toUpperCase()}</div>
          <div className="footer-info">
            <div className="user-name">{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'}</div>
            <div className="user-plan">Free plan</div>
          </div>
        </div>
        <div className="footer-btns">
          <button className="icon-btn" type="button" title="Sign out" aria-label="Sign out" onClick={handleSignOut}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
              <path d="M6 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M10 12l4-4-4-4M14 8H6"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

