import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import './InputBar.css';

export default function InputBar() {
  const { send, loading, setError } = useChat();
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [listening, setListening] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const toolsMenuRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target)) {
        setShowTools(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedImage) || loading) return;

    send(trimmed, {
      imageFile: attachedImage?.file,
      imagePreview: attachedImage?.preview,
    });
    setText('');
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openImagePicker = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const onSelectImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        file,
        name: file.name,
        preview: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTools = () => {
    if (!loading) setShowTools(prev => !prev);
  };

  const handleToolAction = (action) => {
    setShowTools(false);
    action();
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

  return (
    <div className="inputbar">
      <div className={`input-wrap ${loading ? 'input-wrap--loading' : ''}`}>
        {attachedImage && (
          <div className="input-attachment">
            <img src={attachedImage.preview} alt={attachedImage.name} className="input-attachment__thumb" />
            <span className="input-attachment__name">{attachedImage.name}</span>
            <button className="input-attachment__remove" onClick={clearImage} title="Remove image">
              ✕
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Message NexMind..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={loading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onSelectImage}
          className="visually-hidden"
        />
        <div className="input-bottom">
          <div className="input-left">
            <div className="tools-menu" ref={toolsMenuRef}>
              <button
                className="input-icon-btn tools-trigger"
                title="Tools"
                onClick={toggleTools}
                disabled={loading}
                aria-expanded={showTools}
                aria-haspopup="menu"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <line x1="8" y1="3" x2="8" y2="13"/>
                  <line x1="3" y1="8" x2="13" y2="8"/>
                </svg>
              </button>
              {showTools && (
                <div className="tools-menu__dropdown" role="menu" aria-label="Input tools">
                  <button
                    className="tools-menu__item"
                    onClick={() => handleToolAction(openImagePicker)}
                    disabled={loading}
                    role="menuitem"
                  >
                    <span className="tools-menu__icon">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                        <path d="M13 7L7.5 12.5a4 4 0 01-5.5-5.5l6-6a2.5 2.5 0 013.5 3.5L5 10a1 1 0 01-1.5-1.5L9 3"/>
                      </svg>
                    </span>
                    <span className="tools-menu__label">Attach image</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="input-right">
            <button className="model-btn">
              Llama 3.3 70B
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <polyline points="4,6 8,10 12,6"/>
              </svg>
            </button>
            <button
              className={`send-btn ${(text.trim() || attachedImage) && !loading ? 'send-btn--active' : ''}`}
              onClick={handleSend}
              disabled={(!text.trim() && !attachedImage) || loading}
              title="Send (Enter)"
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <svg viewBox="0 0 16 16" fill="white" width="13" height="13">
                  <path d="M2 8L14 2L8 14L7 9L2 8Z"/>
                </svg>
              )}
            </button>
            <button
              className={`input-icon-btn ${listening ? 'input-icon-btn--active' : ''}`}
              title={listening ? 'Listening...' : 'Voice input'}
              onClick={startVoice}
              disabled={loading}
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
      <p className="input-hint">NexMind can make mistakes. Double-check important info.</p>
    </div>
  );
}
