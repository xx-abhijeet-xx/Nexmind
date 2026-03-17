import React, { useState } from 'react';
import './ContextualSuggestions.css';

export default function ContextualSuggestions({ onSelect }) {
  const suggestions = [
    { id: 'explain', icon: '💡', text: 'Explain Code' },
    { id: 'write', icon: '📝', text: 'Write Code' },
    { id: 'debug', icon: '🐛', text: 'Debug Error' },
    { id: 'improve', icon: '✨', text: 'Improve Writing' }
  ];

  return (
    <div className="contextual-suggestions">
      {suggestions.map(s => (
        <button 
          key={s.id}
          className="suggest-chip"
          onClick={() => onSelect(s.text)}
        >
          <span className="suggest-icon">{s.icon}</span>
          {s.text}
        </button>
      ))}
    </div>
  );
}
