import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import WorkspaceLayout from './components/WorkspaceLayout';
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
    <BrowserRouter>
      <ChatProvider>
        <WorkspaceLayout />
      </ChatProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
