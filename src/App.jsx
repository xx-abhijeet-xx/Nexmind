import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import './App.css';

function AuthGate() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  if (loading) {
    return (
      <div className="auth-page">
        <span className="auth-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user) {
    return showLogin
      ? <Login onSwitch={() => setShowLogin(false)} />
      : <Signup onSwitch={() => setShowLogin(true)} />;
  }

  return (
    <ChatProvider>
      <div className="app-shell">
        <Sidebar />
        <ChatArea />
      </div>
    </ChatProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
