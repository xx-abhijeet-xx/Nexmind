import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import ContextualSuggestions from './ContextualSuggestions';
import UsageBanner from './UsageBanner';
import './InputBar.css';

export default function InputBar({ isNewChat }) {
  const { send, loading, setError, documentContext, setDocumentContext, clearDocumentContext, uploadPdf } = useChat();
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [listening, setListening] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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

  const openPdfPicker = () => {
    if (!loading && !pdfUploading) pdfInputRef.current?.click();
  };

  const onSelectPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }

    setPdfUploading(true);
    setError(null);
    try {
      const result = await uploadPdf(file);
      setDocumentContext(result);
    } catch (err) {
      setError(err.message || 'PDF upload failed');
    } finally {
      setPdfUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
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
      <UsageBanner />
      <div className={`input-wrap ${loading ? 'input-wrap--loading' : ''}`}>
        {attachedImage && (
          <div className="input-attachment">
            <img src={attachedImage.preview} alt={attachedImage.name} className="input-attachment__thumb" loading="lazy" decoding="async" />
            <span className="input-attachment__name">{attachedImage.name}</span>
            <button className="input-attachment__remove" type="button" onClick={clearImage} title="Remove image" aria-label="Remove attached image">
              ✕
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Message ParaAI..."
          aria-label="Message input"
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
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
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={onSelectPdf}
          className="visually-hidden"
        />
        <div className="input-bottom">
          <div className="input-left">
            <button
              className="input-icon-btn"
              type="button"
              title="Attach image"
              onClick={openImagePicker}
              disabled={loading}
              aria-label="Attach image"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                <path d="M13 7L7.5 12.5a4 4 0 01-5.5-5.5l6-6a2.5 2.5 0 013.5 3.5L5 10a1 1 0 01-1.5-1.5L9 3"/>
              </svg>
            </button>
            <button
              className={`input-icon-btn ${documentContext ? 'input-icon-btn--active' : ''}`}
              type="button"
              title="Upload PDF"
              onClick={openPdfPicker}
              disabled={loading || pdfUploading}
              aria-label="Upload PDF"
            >
              {pdfUploading ? (
                <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                  <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2z"/>
                  <polyline points="9,2 9,6 13,6"/>
                  <line x1="5" y1="9" x2="11" y2="9"/>
                  <line x1="5" y1="11.5" x2="9" y2="11.5"/>
                </svg>
              )}
            </button>
            {documentContext && (
              <div className="pdf-indicator">
                <span className="pdf-indicator__name">{documentContext.fileName}</span>
                <button
                  className="pdf-indicator__clear"
                  type="button"
                  onClick={clearDocumentContext}
                  title="Remove document"
                  aria-label="Remove uploaded document"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <div className="input-right">
            <button className="model-btn" type="button" aria-label="Selected model" style={{padding:'0.2vw', fontSize:'0.8vw', fontWeight:'bold', borderRadius:'5px', border:'none', backgroundColor:'transparent', color:'white'}}>
              Llama 3.3 70B
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <polyline points="4,6 8,10 12,6"/>
              </svg>
            </button>
            <button
              className={`send-btn ${(text.trim() || attachedImage) && !loading ? 'send-btn--active' : ''}`}
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && !attachedImage) || loading}
              title="Send (Enter)"
              aria-label="Send message"
            >
              {loading ? (
                <div className="spinner" />
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
              disabled={loading}
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
