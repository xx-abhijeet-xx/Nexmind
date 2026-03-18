import React from 'react';
import { useChat } from '../context/ChatContext';
import './UsageBanner.css';

export default function UsageBanner() {
  const { rateLimitStats, activeSession } = useChat();

  if (!rateLimitStats || !rateLimitStats.remainingRequests) return null;

  const remaining = parseInt(rateLimitStats.remainingRequests, 10);
  
  // Only show if < 5 messages left or exhausted
  if (remaining >= 5 && !isNaN(remaining)) return null;
  // If no chat history is active, wait until they start one
  if (activeSession.messages.length === 0) return null;

  const isExhausted = remaining <= 0;
  
  // Format reset time parsing Groq's "try again in XmYs" string
  let resetText = "soon";
  if (rateLimitStats.resetRequests) {
    resetText = `in ${rateLimitStats.resetRequests}`;
  }

  return (
    <div className="usage-banner-attached">
      <span className="usage-banner-text">
        {isExhausted 
          ? <>You are out of free <span style={{textDecoration: 'underline'}}>messages</span> {resetText !== 'soon' && `until ${resetText}`}</>
          : <>You have {remaining} free messages left {resetText !== 'soon' && `until ${resetText}`}</>}
      </span>
      <a href="https://console.groq.com/settings/billing" target="_blank" rel="noopener noreferrer" className="usage-banner-upgrade-link">
        Upgrade
      </a>
    </div>
  );
}
