import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import WorkspaceLayout from './components/WorkspaceLayout';
import PhoneCapture from './components/auth/PhoneCapture';
import Landing from './pages/Landing';
import PageLoader from './components/PageLoader';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <span className="auth-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Google OAuth users who haven't supplied a phone yet
  const hasPhone = user.phone || user.user_metadata?.phone;
  if (!hasPhone) {
    return <PhoneCapture onComplete={() => window.location.reload()} />;
  }

  return (
    <ChatProvider>
      {children}
    </ChatProvider>
  );
}

export default function App() {
  const [showLoader, setShowLoader] = useState(true);

  return (
    <AuthProvider>
      {showLoader && <PageLoader onComplete={() => setShowLoader(false)} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/chat/*"
            element={
              <ProtectedRoute>
                <WorkspaceLayout />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
