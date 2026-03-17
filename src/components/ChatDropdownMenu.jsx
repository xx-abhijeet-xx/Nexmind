import React, { useState, useEffect, useRef } from 'react';
import './ChatDropdownMenu.css';

export default function ChatDropdownMenu({ session, onRename, onDelete, onStar }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="chat-menu-container" ref={menuRef}>
      <button 
        className="chat-menu-trigger" 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        aria-label="Chat options"
      >
        •••
      </button>
      
      {isOpen && (
        <div className="chat-dropdown">
          <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); onStar(); setIsOpen(false); }}>
            <span className="icon">⭐</span> Star
          </button>
          <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); onRename(); setIsOpen(false); }}>
            <span className="icon">✏️</span> Rename
          </button>
          <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
            <span className="icon">📁</span> Add to Project
          </button>
          <div className="dropdown-divider"></div>
          <button className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}>
            <span className="icon">🗑️</span> Delete
          </button>
        </div>
      )}
    </div>
  );
}
