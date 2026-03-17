import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import ArtifactViewer from './ArtifactViewer';
import RecentsPage from './RecentsPage';
import { useChat } from '../context/ChatContext';
import './WorkspaceLayout.css';

export default function WorkspaceLayout() {
  const { sidebarOpen, artifactViewerOpen } = useChat();

  return (
    <div className={`workspace 
      ${sidebarOpen ? 'workspace--sidebar-open' : 'workspace--sidebar-closed'}
      ${artifactViewerOpen ? 'workspace--artifact-open' : 'workspace--artifact-closed'}
    `}>
      <Sidebar />
      <main className="workspace-main" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<ChatArea />} />
            <Route path="/recents" element={<RecentsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {artifactViewerOpen && <ArtifactViewer />}
        </div>
        
        {/* Global Footer */}
        <div className="global-footer" style={{ textAlign: 'center', color: 'gray', fontSize: '0.8rem', marginTop: '1rem' }}>
          ParaAI can make mistakes. Double-check important info.
        </div>
      </main>
    </div>
  );
}
