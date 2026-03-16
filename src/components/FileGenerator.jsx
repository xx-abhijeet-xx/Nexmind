import React, { useState } from 'react';
import { generateFile, downloadFile } from '../utils/api';

const FILE_TYPES = [
  { ext: 'md', label: 'Markdown', mime: 'text/markdown' },
  { ext: 'txt', label: 'Text', mime: 'text/plain' },
  { ext: 'html', label: 'HTML', mime: 'text/html' },
  { ext: 'js', label: 'JavaScript', mime: 'text/javascript' },
  { ext: 'jsx', label: 'React JSX', mime: 'text/javascript' },
  { ext: 'css', label: 'CSS', mime: 'text/css' },
  { ext: 'json', label: 'JSON', mime: 'application/json' },
  { ext: 'pdf', label: 'PDF', mime: 'application/pdf' },
];

function ensureExtension(name, ext) {
  const trimmed = (name || '').trim();
  const fallback = `output.${ext}`;
  if (!trimmed) return fallback;
  return trimmed.toLowerCase().endsWith(`.${ext}`) ? trimmed : `${trimmed}.${ext}`;
}

function decodeDataUri(text) {
  const dataUriMatch = text.match(/data:[^;]+;base64,([A-Za-z0-9+/=]+)/);
  if (!dataUriMatch) return null;

  try {
    return atob(dataUriMatch[1]);
  } catch {
    return null;
  }
}

function extractContent(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';

  const decodedFromLink = decodeDataUri(text);
  if (decodedFromLink) return decodedFromLink;

  const fenced = text.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  return text;
}

export default function FileGenerator({ onClose }) {
  const [prompt, setPrompt] = useState('');
  const [fileType, setFileType] = useState('md');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);

    const targetFileName = ensureExtension(fileName || `output.${fileType}`, fileType);
    const strictPrompt = `Return only raw file content for a ${fileType} file. Do not include explanations, markdown fences, HTML links, or download instructions.\n\n${prompt}`;

    try {
      const data = await generateFile(strictPrompt, fileType, targetFileName);
      const rawContent = data?.content ?? data?.response ?? data?.fileContent ?? '';
      const normalizedContent = extractContent(rawContent);
      const normalizedName = ensureExtension(data?.fileName || targetFileName, fileType);

      if (!normalizedContent) {
        throw new Error('Generator returned empty content');
      }

      setResult({
        ...data,
        fileName: normalizedName,
        content: normalizedContent,
      });
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const mime = FILE_TYPES.find(f => f.ext === fileType)?.mime || 'text/plain';
    downloadFile(result.content, result.fileName, mime);
  };

  return (
    <div className="fg-overlay" onClick={onClose}>
      <div className="fg-modal" onClick={e => e.stopPropagation()}>
        <div className="fg-header">
          <span className="fg-title">Generate File</span>
          <button className="fg-close" onClick={onClose}>✕</button>
        </div>

        <div className="fg-body">
          <div className="fg-row">
            <label>File type</label>
            <select
              value={fileType}
              onChange={e => setFileType(e.target.value)}
            >
              {FILE_TYPES.map(f => (
                <option key={f.ext} value={f.ext}>{f.label} (.{f.ext})</option>
              ))}
            </select>
          </div>

          <div className="fg-row">
            <label>File name</label>
            <input
              type="text"
              placeholder={`output.${fileType}`}
              value={fileName}
              onChange={e => setFileName(e.target.value)}
            />
          </div>

          <div className="fg-row">
            <label>What to generate</label>
            <textarea
              placeholder="e.g. Write a README for a React AI assistant app called ParaAI..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <button
            className="fg-generate-btn"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>

          {result && (
            <div className="fg-result">
              <div className="fg-result-head">
                <span>{result.fileName}</span>
                <button className="fg-download-btn" onClick={handleDownload}>
                  ↓ Download
                </button>
              </div>
              <pre className="fg-preview">{result.content.slice(0, 500)}{result.content.length > 500 ? '\n...' : ''}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
