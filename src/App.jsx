import React from 'react';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import './App.css';

export default function App() {
  return (
    <ChatProvider>
      <div className="app-shell">
        <Sidebar />
        <ChatArea />
      </div>
    </ChatProvider>
  );
}
