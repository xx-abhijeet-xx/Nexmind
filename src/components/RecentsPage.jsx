import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import './RecentsPage.css';

export default function RecentsPage() {
  const { sessions, setActiveId, newSession } = useChat();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const openSession = (id) => {
    setActiveId(id);
    navigate('/');
  };

  const handleNewSession = () => {
    newSession();
    navigate('/');
  };

  return (
    <div className="recents-page">
      <div className="recents-header">
        <h1 className="recents-title">Chat History</h1>
        <button className="recents-new-btn" type="button" onClick={handleNewSession}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>
          </svg>
          New chat
        </button>
      </div>

      <div className="recents-search-wrap">
        <svg className="recents-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <circle cx="6" cy="6" r="4"/><line x1="10" y1="10" x2="14" y2="14"/>
        </svg>
        <input 
          className="recents-search-input"
          placeholder="Search your chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="recents-list">
        {filtered.length === 0 ? (
          <div className="recents-empty">No chats found.</div>
        ) : (
          filtered.map(s => {
            let timeInfo = 'recently';
            if (s.messages && s.messages.length > 0) {
              const lastMsg = s.messages[s.messages.length - 1];
              if (lastMsg.timestamp) {
                timeInfo = new Date(lastMsg.timestamp).toLocaleDateString();
              }
            } else if (s.created_at) {
              timeInfo = new Date(s.created_at).toLocaleDateString();
            }

            return (
              <div key={s.id} className="recents-item" onClick={() => openSession(s.id)}>
                <div className="recents-item-main">
                  <div className="recents-item-title">{s.title}</div>
                  <div className="recents-item-meta">Last message {timeInfo}</div>
                </div>
                <div className="recents-item-arrow">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="6,4 10,8 6,12"/>
                  </svg>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
