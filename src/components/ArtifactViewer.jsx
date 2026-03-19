import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useChat } from '../context/ChatContext';
import './ArtifactViewer.css';

export default function ArtifactViewer() {
  const { artifacts, artifactViewerOpen, setArtifactViewerOpen } = useChat();
  const [activeTab, setActiveTab] = useState(0);

  if (!artifactViewerOpen) return null;

  const validArtifacts = artifacts && artifacts.length > 0 ? artifacts : [];
  const currentArtifact = validArtifacts[activeTab];

  const downloadProject = async () => {
    if (validArtifacts.length === 0) return;
    const zip = new JSZip();

    validArtifacts.forEach(file => {
      zip.file(file.path, file.content);
    });

    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'chymera-project.zip');
    } catch (err) {
      console.error('Failed to generate zip', err);
    }
  };

  return (
    <div className="artifact-viewer">
      <div className="artifact-header">
        <div className="artifact-tabs">
          {validArtifacts.length > 0 ? (
            validArtifacts.map((art, idx) => (
              <button
                key={idx}
                className={`artifact-tab ${idx === activeTab ? 'active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                {art.path.split('/').pop()}
              </button>
            ))
          ) : (
            <div className="artifact-tab active">No Files Generated</div>
          )}
        </div>
        <div className="artifact-actions">
          <button
            className="icon-btn action-btn text-brand"
            title="Download Project"
            onClick={downloadProject}
            disabled={validArtifacts.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            <span className="action-label">Download .ZIP</span>
          </button>
          <div className="divider-v"></div>
          <button className="icon-btn" onClick={() => setArtifactViewerOpen(false)} title="Close Viewer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="artifact-body">
        {currentArtifact ? (
          <pre className="artifact-code">
            <code>{currentArtifact.content}</code>
          </pre>
        ) : (
          <div className="artifact-empty">
            <svg viewBox="0 0 64 64" fill="none" stroke="var(--border-color)" strokeWidth="1" width="64" height="64" className="mb-4">
              <path d="M16 4h20l12 12v44H16z" />
              <path d="M36 4v12h12" />
            </svg>
            <p>Waiting for code generation...</p>
          </div>
        )}
      </div>
    </div>
  );
}

