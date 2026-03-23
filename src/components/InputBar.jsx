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
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const textareaRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const modelMenuRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [transcribing, setTranscribing] = useState(false);

  const MODELS = [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', icon: '🦙' },
    { id: 'gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro', icon: '✨' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', icon: '⚡' },
  ];

  useEffect(() => {
    if (!modelMenuOpen) return;
    const handleClick = (e) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modelMenuOpen]);

  useEffect(() => {
    const onEdit = (e) => {
      const { content } = e.detail;
      setText(content);
      setTimeout(() => textareaRef.current?.focus(), 50);
    };
    document.addEventListener('chymera:editMessage', onEdit);
    return () => {
      document.removeEventListener('chymera:editMessage', onEdit);
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

    send(trimmed, {
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

  const startVoice = async () => {
    if (loading || transcribing) return;

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        setTranscribing(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 500) {
          setError('Too short. Speak clearly and try again.');
          setTranscribing(false);
          return;
        }

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');

          const { data: { session } } = await supabase.auth.getSession();

          const res = await fetch(
            `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/chat/transcribe`,
            {
              method: 'POST',
              headers: {
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
              },
              body: formData,
            }
          );

          if (!res.ok) throw new Error('Transcription failed');

          const { transcript } = await res.json();

          if (transcript) {
            setText(prev =>
              prev ? `${prev} ${transcript}`.trim() : transcript
            );
            setTimeout(() => textareaRef.current?.focus(), 50);
          } else {
            setError('No speech detected. Try again.');
          }
        } catch {
          setError('Transcription failed. Check your connection.');
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setListening(true);
      setError(null);

    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Mic blocked. Allow microphone permission.'
          : 'Could not access microphone.'
      );
      setListening(false);
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
          placeholder="Message Chymera..."
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
          <div className="input-right">
            <div className="custom-model-select" ref={modelMenuRef}>
              <button 
                className="model-select-btn" 
                type="button" 
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                aria-label="Select model"
                title="Select model"
                disabled={loading}
              >
                <span className="model-select-icon">{MODELS.find(m => m.id === selectedModel)?.icon || '🤖'}</span>
                <span className="model-select-name">{MODELS.find(m => m.id === selectedModel)?.name}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" style={{marginLeft: '2px', opacity: 0.6}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {modelMenuOpen && (
                <div className="model-dropdown-menu">
                  <div className="model-dropdown-header">Select Model</div>
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      className={`model-dropdown-item ${selectedModel === m.id ? 'model-dropdown-item--active' : ''}`}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setModelMenuOpen(false);
                      }}
                      type="button"
                    >
                      <span className="model-item-icon">{m.icon}</span>
                      <span className="model-item-name">{m.name}</span>
                      {selectedModel === m.id && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" style={{marginLeft: 'auto'}}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {loading ? (
              <button
                className="stop-btn"
                type="button"
                onClick={stopGeneration}
                title="Stop generation"
                aria-label="Stop generation"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                  <rect x="3" y="3" width="10" height="10" rx="2"/>
                </svg>
              </button>
            ) : (
              <button
                className={`send-btn ${(text.trim() || attachments.length > 0) ? 'send-btn--active' : ''}`}
                type="button"
                onClick={handleSend}
                disabled={!text.trim() && attachments.length === 0}
                title="Send (Enter)"
                aria-label="Send message"
              >
                <svg viewBox="0 0 16 16" fill="black" width="13" height="13">
                  <path d="M2 8L14 2L8 14L7 9L2 8Z"/>
                </svg>
              </button>
            )}
            <button
              className={`input-icon-btn ${
                listening || transcribing ? 'input-icon-btn--active' : ''
              }`}
              title={
                transcribing ? 'Transcribing...' :
                listening    ? 'Stop recording'  :
                               'Voice input'
              }
              type="button"
              onClick={startVoice}
              disabled={transcribing || loading}
              aria-label="Voice input"
            >
              {transcribing ? (
                <div className="spinner-sm" />
              ) : listening ? (
                <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
                  <rect x="3" y="3" width="10" height="10" rx="2"/>
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
                     strokeWidth="1.8" width="14" height="14">
                  <rect x="5" y="1" width="6" height="9" rx="3"/>
                  <path d="M2 8a6 6 0 0 0 12 0"/>
                  <line x1="8" y1="14" x2="8" y2="16"/>
                </svg>
              )}
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

