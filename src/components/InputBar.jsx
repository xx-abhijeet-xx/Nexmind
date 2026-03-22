import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { X, FileText, Image as ImageIcon, File as GenericFile } from 'lucide-react';
import ContextualSuggestions from './ContextualSuggestions';
import UsageBanner from './UsageBanner';
import './InputBar.css';

import { v4 as uuid } from 'uuid';

const SLASH_COMMANDS = [
  { cmd: '/debug',    label: 'Debug this error',        template: 'Debug this error and explain the root cause:\n\n' },
  { cmd: '/explain',  label: 'Explain this code',       template: 'Explain what this code does, step by step:\n\n' },
  { cmd: '/improve',  label: 'Improve this code',       template: 'Improve this code for readability, performance, and best practices:\n\n' },
  { cmd: '/test',     label: 'Write unit tests',        template: 'Write comprehensive unit tests for this code:\n\n' },
  { cmd: '/review',   label: 'Code review',             template: 'Do a thorough code review. Find bugs, security issues, and improvements:\n\n' },
  { cmd: '/docs',     label: 'Write documentation',     template: 'Write clear documentation for this code:\n\n' },
  { cmd: '/translate',label: 'Translate to Hindi',      template: 'Translate the following to Hindi:\n\n' },
  { cmd: '/eli5',     label: 'Explain simply',          template: 'Explain this in simple terms, like I\'m new to programming:\n\n' },
];

const getFileIcon = (type) => {
  if (type.startsWith('image/')) return <ImageIcon size={20} color="#a0a0a8" />;
  if (type === 'application/pdf') return <FileText size={20} color="#ff4d4f" />;
  return <GenericFile size={20} color="#a0a0a8" />;
};

const AttachmentPreview = ({ name, type, previewUrl, progress, onRemove }) => {
  const isImage = type.startsWith('image/');
  
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="attachment-preview group" aria-label={name}>
      <div className="attachment-preview__content">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt={name} className="attachment-preview__thumb" />
        ) : (
          <div className="attachment-preview__iconBox">
            {getFileIcon(type)}
          </div>
        )}
        <div className="attachment-preview__details">
          <span className="attachment-preview__name">{name}</span>
          <span className="attachment-preview__type">{isImage ? 'IMAGE' : type === 'application/pdf' ? 'PDF' : 'FILE'}</span>
        </div>
      </div>
      
      {progress !== undefined && progress < 100 && (
        <div className="attachment-preview__progress-container">
          <div className="attachment-preview__progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <button className="attachment-preview__remove" onClick={onRemove} title="Remove or Cancel">
        <X size={14} />
      </button>
      
      <div className="attachment-preview__tooltip">
        {name}
      </div>
    </div>
  );
};

export default function InputBar({ isNewChat }) {
  const { send, loading, setError, uploadPdf, stopGeneration } = useChat();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]); // [{ id, type, file, name, previewUrl, progress, cancelSource, documentContext }]
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [listening, setListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [responseLength, setResponseLength] = useState('normal');
  const textareaRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K — new chat
      if (modKey && e.key === 'k') {
        e.preventDefault();
        // Access newSession from context — need to get it
        document.dispatchEvent(new CustomEvent('chymera:newchat'));
      }

      // Cmd/Ctrl + / — focus input
      if (modKey && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }

      // Esc — close slash menu if open, else blur
      if (e.key === 'Escape') {
        if (slashOpen) {
          setSlashOpen(false);
        } else {
          textareaRef.current?.blur();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [slashOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    // Check if any attachments are still uploading
    if (attachments.some(a => a.type === 'application/pdf' && a.progress < 100 && !a.documentContext)) {
      setError('Please wait for uploads to finish.');
      return;
    }

    const lengthSuffix = {
      concise: '\n\n[Keep your response concise — 2 to 3 sentences max unless code is required.]',
      normal: '',
      detailed: '\n\n[Be thorough. Cover edge cases, tradeoffs, and give examples.]',
    }[responseLength];

    send((trimmed + lengthSuffix).trim(), {
      imagesBase64: attachments.filter(a => a.type.startsWith('image/')).map(a => a.previewUrl),
      documentContexts: attachments.filter(a => a.documentContext).map(a => a.documentContext),
      modelId: selectedModel
    });
    setText('');
    setAttachments([]);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const handleSuggestionSelect = (suggestion) => {
    setText(suggestion + ': ');
    textareaRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openAttachmentPicker = () => {
    if (!loading) attachmentInputRef.current?.click();
  };

  const onSelectAttachment = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const id = uuid();
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(prev => [...prev, { id, type: file.type, file, name: file.name, previewUrl: reader.result, progress: 100 }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        const cancelSource = new AbortController();
        const previewUrl = URL.createObjectURL(file);
        
        setAttachments(prev => [...prev, { id, type: file.type, file, name: file.name, previewUrl, progress: 0, cancelSource }]);
        setError(null);
        
        uploadPdf(file, (prog) => {
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress: prog } : a));
        }, cancelSource.signal)
          .then(result => {
            setAttachments(prev => prev.map(a => a.id === id ? { ...a, documentContext: result, progress: 100 } : a));
          })
          .catch(err => {
            if (err.message !== 'canceled') {
              setError(err.message || 'PDF upload failed');
            }
            setAttachments(prev => prev.filter(a => a.id !== id));
          });
      } else {
        setError(`Unsupported file type: ${file.name}`);
      }
    });

    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.cancelSource) {
        attachment.cancelSource.abort();
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {
        // Ignore stop failures and reset local listening state.
      }
      setListening(false);
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (loading) return;

    if (recognitionRef.current || listening) {
      stopVoice();
      return;
    }

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError('Voice input requires HTTPS (or localhost).');
      return;
    }

    setError(null);
    setListening(true);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results || [])
        .slice(e.resultIndex || 0)
        .map(result => result?.[0]?.transcript || '')
        .join(' ')
        .trim();

      if (transcript) {
        setText(prev => (prev ? `${prev} ${transcript}`.trim() : transcript));
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted') {
        setListening(false);
        return;
      }

      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was blocked. Allow mic permission and try again.'
        : event.error === 'audio-capture'
          ? 'No microphone was found. Check your audio input device.'
          : event.error === 'network'
            ? (navigator.onLine
                ? 'Speech service is unreachable on this network/browser. Try Chrome/Edge, VPN off, or another network.'
                : 'You appear to be offline. Reconnect and try voice input again.')
            : event.error === 'no-speech'
              ? 'No speech detected. Try again and speak clearly.'
              : event.error === 'language-not-supported'
                ? 'Selected speech language is not supported by this browser.'
                : 'Voice input failed. Please try again.';

      setError(message);
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (err) {
      setListening(false);
      recognitionRef.current = null;
      const message = err?.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow mic permission and try again.'
        : err?.name === 'InvalidStateError'
          ? 'Voice input is already starting. Wait a moment and try again.'
          : 'Voice input could not start. Please try again.';
      setError(message);
    }
  };

  const handlePaste = (e) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    // Check if any clipboard item is an image
    const imageItems = Array.from(clipboardItems).filter(
      item => item.type.startsWith('image/')
    );

    if (imageItems.length === 0) return;

    // Prevent default paste behaviour for image pastes
    // (so the image data doesn't get pasted as text)
    e.preventDefault();

    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (!file) return;

      const id = uuid();
      const reader = new FileReader();

      reader.onload = () => {
        // Generate a readable name with timestamp
        const ext = file.type.split('/')[1] || 'png';
        const name = `pasted-image-${Date.now()}.${ext}`;

        setAttachments(prev => [
          ...prev,
          {
            id,
            type: file.type,
            file,
            name,
            previewUrl: reader.result,
            progress: 100,
          }
        ]);
      };

      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="inputbar">
      <UsageBanner />
      <div className={`input-wrap ${loading ? 'input-wrap--loading' : ''}`}>
        {attachments.length > 0 && (
          <div className="attachments-row">
            {attachments.map(att => (
              <AttachmentPreview 
                key={att.id}
                type={att.type} 
                name={att.name} 
                previewUrl={att.previewUrl} 
                progress={att.progress} 
                onRemove={() => removeAttachment(att.id)} 
              />
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Message Chymera... (Ctrl+V to paste image)"
          aria-label="Message input"
          value={text}
          onChange={e => {
            const val = e.target.value;
            setText(val);
            if (val.startsWith('/') && !val.includes(' ')) {
              setSlashFilter(val.slice(1).toLowerCase());
              setSlashOpen(true);
            } else {
              setSlashOpen(false);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          rows={1}
          disabled={false}
        />
        {slashOpen && (() => {
          const filtered = SLASH_COMMANDS.filter(c =>
            c.cmd.slice(1).startsWith(slashFilter) || c.label.toLowerCase().includes(slashFilter)
          );
          if (!filtered.length) return null;
          return (
            <div className="slash-menu">
              {filtered.map(c => (
                <button
                  key={c.cmd}
                  className="slash-item"
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    setText(c.template);
                    setSlashOpen(false);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                >
                  <span className="slash-cmd">{c.cmd}</span>
                  <span className="slash-label">{c.label}</span>
                </button>
              ))}
            </div>
          );
        })()}
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={onSelectAttachment}
            className="visually-hidden"
          />
          <div className="input-bottom">
            <div className="input-left">
              <button
                className={`input-icon-btn ${attachments.length > 0 ? 'input-icon-btn--active' : ''}`}
                type="button"
                title="Attach Files (Images/PDFs)"
                onClick={openAttachmentPicker}
                disabled={false}
                aria-label="Attach Files"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                  <line x1="8" y1="2" x2="8" y2="14"/>
                  <line x1="2" y1="8" x2="14" y2="8"/>
                </svg>
              </button>
            </div>
            <div className="length-toggle">
              {['concise', 'normal', 'detailed'].map(l => (
                <button
                  key={l}
                  type="button"
                  className={`length-btn ${responseLength === l ? 'length-btn--active' : ''}`}
                  onClick={() => setResponseLength(l)}
                  title={l.charAt(0).toUpperCase() + l.slice(1)}
                  disabled={loading}
                >
                  {l === 'concise' ? 'S' : l === 'normal' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          <div className="input-right">
            <select
              className="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="Selected model"
              disabled={false}
              style={{ paddingLeft: '8px', paddingRight: '24px', fontSize: '12px', fontWeight: '500', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'var(--text-secondary)', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'rgba(255,255,255,0.5)\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")' }}
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="gemini-2.5-pro-preview-03-25">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
            <button
              className={`send-btn ${(text.trim() || attachments.length > 0) && !loading ? 'send-btn--active' : ''}`}
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && attachments.length === 0) || loading}
              title="Send (Enter)"
              aria-label="Send message"
            >
              {loading ? (
                <div className="spinner" onClick={stopGeneration} style={{cursor:'pointer'}} title="Stop generation" />
              ) : (
                <svg viewBox="0 0 16 16" fill="black" width="13" height="13">
                  <path d="M2 8L14 2L8 14L7 9L2 8Z"/>
                </svg>
              )}
            </button>
            <button
              className={`input-icon-btn ${listening ? 'input-icon-btn--active' : ''}`}
              title={listening ? 'Listening...' : 'Voice input'}
              type="button"
              onClick={startVoice}
              disabled={false}
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                <rect x="6" y="2" width="4" height="7" rx="2"/>
                <path d="M4 7a4 4 0 008 0"/>
                <line x1="8" y1="11" x2="8" y2="14"/>
                <line x1="5.5" y1="14" x2="10.5" y2="14"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {isNewChat && (
        <div className="input-suggestions-wrapper">
          <ContextualSuggestions onSelect={handleSuggestionSelect} />
        </div>
      )}
    </div>
  );
}

