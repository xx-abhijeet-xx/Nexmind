import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChat } from '../context/ChatContext';
import { downloadFile } from '../utils/api';
import './Message.css';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button className="copy-btn" type="button" onClick={copy} aria-label={copied ? 'Copied' : 'Copy code'}>
      {copied ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <polyline points="2,8 6,12 14,4"/>
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
          <rect x="5" y="5" width="9" height="9" rx="1"/>
          <path d="M11 5V3H2v9h2"/>
        </svg>
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function DownloadBtn({ onClick, label = 'Download' }) {
  return (
    <button className="copy-btn" type="button" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
        <path d="M8 2v8M5 7l3 3 3-3"/>
        <line x1="3" y1="13" x2="13" y2="13"/>
      </svg>
      {label}
    </button>
  );
}

const LANGUAGE_EXTENSIONS = {
  markdown: 'md',
  md: 'md',
  text: 'txt',
  txt: 'txt',
  html: 'html',
  js: 'js',
  javascript: 'js',
  jsx: 'jsx',
  css: 'css',
  json: 'json',
};

const EXT_MIME = {
  md: 'text/markdown',
  txt: 'text/plain',
  html: 'text/html',
  js: 'text/javascript',
  jsx: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
};

function CodeBlock({ language, value }) {
  const ext = LANGUAGE_EXTENSIONS[(language || '').toLowerCase()] || 'txt';

  const handleDownload = () => {
    downloadFile(value, `generated.${ext}`, EXT_MIME[ext] || 'text/plain');
  };

  return (
    <div className="code-block">
      <div className="code-block__head">
        <span className="code-block__lang">{language || 'code'}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <DownloadBtn onClick={handleDownload} />
          <CopyBtn text={value} />
        </div>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '12px 14px',
          background: 'transparent',
          fontSize: '12px',
          lineHeight: '1.8',
          fontFamily: 'var(--mono)',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

const components = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const value = String(children).replace(/\n$/, '');
    if (!inline && match) {
      return <CodeBlock language={match[1]} value={value} />;
    }
    return <code className="inline-code" {...props}>{children}</code>;
  },
  p: ({ children }) => <p className="md-p">{children}</p>,
  ul: ({ children }) => <ul className="md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="md-ol">{children}</ol>,
  li: ({ children }) => <li className="md-li">{children}</li>,
  strong: ({ children }) => <strong className="md-strong">{children}</strong>,
  h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
  blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
};

function parseDownloadable(content) {
  const text = String(content || '');
  const uriMatch = text.match(/data:([^;]+);base64,([A-Za-z0-9+/=]+)/);
  if (!uriMatch) return null;

  const mimeType = uriMatch[1] || 'application/octet-stream';
  const base64 = uriMatch[2];

  let decoded = '';
  try {
    decoded = atob(base64);
  } catch {
    return null;
  }

  const fileNameMatch = text.match(/download=["']([^"']+)["']/i);
  const fileName = fileNameMatch?.[1] || 'generated.txt';

  return {
    fileName,
    content: decoded,
    mimeType,
  };
}

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function Message({ msg }) {
  const { regenerate } = useChat();
  const isUser = msg.role === 'user';
  const [liked, setLiked] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const downloadable = useMemo(() => parseDownloadable(msg.content), [msg.content]);

  const handleFileDownload = () => {
    if (msg.fileContent && msg.fileName && msg.mimeType) {
      downloadFile(msg.fileContent, msg.fileName, msg.mimeType);
    }
  };

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewOpen]);

  return (
    <div className={`message ${isUser ? 'message--user' : 'message--ai'}`}>
      {!isUser && (
        <div className="msg-avatar msg-avatar--ai">
          <StarIcon />
        </div>
      )}

      <div className="msg-body">
        {!isUser && (msg.searchUsed || msg.queryType) && (
          <div className="msg-tags">
            {msg.searchUsed && (
              <span className="msg-tag msg-tag--search">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                  <circle cx="6" cy="6" r="4"/><line x1="10" y1="10" x2="14" y2="14"/>
                </svg>
                Searched the web
              </span>
            )}
            {msg.queryType && msg.queryType !== 'general' && (
              <span className="msg-tag msg-tag--type">
                {msg.queryType}
              </span>
            )}
          </div>
        )}

        <div className={`msg-bubble ${isUser ? 'msg-bubble--user' : 'msg-bubble--ai'}`}>
          {isUser ? (
            <>
              {msg.imagesBase64 && msg.imagesBase64.map((b64, idx) => (
                <img
                  key={idx}
                  src={b64}
                  alt={`Uploaded image ${idx + 1}`}
                  className="msg-image"
                  loading="lazy"
                  decoding="async"
                  onClick={() => setPreviewOpen(true)}
                />
              ))}
              {msg.documentNames && msg.documentNames.map((name, idx) => (
                <div key={idx} className="msg-doc-chip">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                    <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2z"/>
                    <polyline points="9,2 9,6 13,6"/>
                  </svg>
                  <span>{name}</span>
                </div>
              ))}
              {msg.content && <p>{msg.content}</p>}
            </>
          ) : msg.isFileGeneration ? (
            <div className="file-generation-card">
              <div className="file-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <path d="M4 2h8l6 6v12H4z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/>
                </svg>
              </div>
              <div className="file-card-info">
                <p className="file-card-ready">{msg.content}</p>
                <p className="file-card-name">{msg.fileName}</p>
              </div>
              <button className="file-card-download" type="button" onClick={handleFileDownload} title="Download file" aria-label="Download file">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M8 2v8M5 7l3 3 3-3"/><line x1="3" y1="13" x2="13" y2="13"/>
                </svg>
              </button>
            </div>
          ) : (
            <>
              <ReactMarkdown components={components}>
                {msg.content}
              </ReactMarkdown>
              {msg.streaming && <span className="cursor" />}
            </>
          )}
        </div>

        {!isUser && !msg.isFileGeneration && (
          <div className="msg-actions">
            <button
              className="action-icon"
              type="button"
              onClick={() => navigator.clipboard.writeText(msg.content)}
              title="Copy"
              aria-label="Copy response"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V3H2v9h2"/>
              </svg>
            </button>
            <button
              className={`action-icon ${liked === true ? 'action-icon--active' : ''}`}
              type="button"
              onClick={() => setLiked(liked === true ? null : true)}
              title="Good response"
              aria-label="Mark response as good"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <path d="M5 9V6l3-4 1 1-1 3h4l-1 6H5V9z"/><line x1="3" y1="9" x2="3" y2="15"/>
              </svg>
            </button>
            <button
              className={`action-icon ${liked === false ? 'action-icon--active' : ''}`}
              type="button"
              onClick={() => setLiked(liked === false ? null : false)}
              title="Bad response"
              aria-label="Mark response as bad"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <path d="M11 7v3l-3 4-1-1 1-3H4l1-6h6v3z"/><line x1="13" y1="7" x2="13" y2="1"/>
              </svg>
            </button>
            {msg.isLast && (
              <button
                className="action-icon"
                type="button"
                onClick={regenerate}
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                  <path d="M2 8a6 6 0 016-6 6 6 0 014.5 2"/>
                  <path d="M14 8a6 6 0 01-6 6 6 6 0 01-4.5-2"/>
                  <polyline points="10,2 14,2 14,6"/>
                  <polyline points="6,14 2,14 2,10"/>
                </svg>
              </button>
            )}
            {downloadable && (
              <button
                className="action-icon"
                type="button"
                onClick={() => downloadFile(downloadable.content, downloadable.fileName, downloadable.mimeType)}
                title="Download generated file"
                aria-label="Download generated file"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                  <path d="M8 2v8M5 7l3 3 3-3"/>
                  <line x1="3" y1="13" x2="13" y2="13"/>
                </svg>
              </button>
            )}
            {msg.model && (
              <span className="msg-model">{msg.model}</span>
            )}
          </div>
        )}

        {isUser && (
          <div className="msg-actions">
            <button
              className="action-icon"
              type="button"
              onClick={() => navigator.clipboard.writeText(msg.content || '')}
              title="Copy prompt"
              aria-label="Copy prompt"
              disabled={!msg.content}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V3H2v9h2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {previewOpen && msg.imagePreview && (
        <div className="image-preview" onClick={() => setPreviewOpen(false)}>
          <div className="image-preview__content" onClick={(e) => e.stopPropagation()}>
            <div className="image-preview__topbar">
              <a
                href={msg.imagePreview}
                download={msg.imageName || 'uploaded-image'}
                className="image-preview__download"
                title="Download image"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                  <path d="M8 2v8M5 7l3 3 3-3"/>
                  <line x1="3" y1="13" x2="13" y2="13"/>
                </svg>
                Download
              </a>
              <button
                className="image-preview__close"
                type="button"
                onClick={() => setPreviewOpen(false)}
                title="Close preview"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <img
              src={msg.imagePreview}
              alt={msg.imageName || 'Uploaded image preview'}
              className="image-preview__img"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      )}
    </div>
  );
}
