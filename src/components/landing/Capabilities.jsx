import React, { useState, useEffect, useRef } from 'react';

const PREVIEWS = [
  {
    step: 'Step 1',
    title: 'Any input, any format',
    desc: 'Attach a PDF, speak a prompt, paste text, or drop an image — Chymera handles them all natively.',
    visual: (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ padding: '5px 10px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '6px', fontSize: '11px', color: '#f59e0b' }}>📝 Text</span>
        <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '11px', color: '#7a7a8c' }}>🎙️ Voice</span>
        <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '11px', color: '#7a7a8c' }}>🖼️ Image</span>
        <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '11px', color: '#7a7a8c' }}>📄 PDF</span>
      </div>
    ),
    badge: 'Text · Voice · Image · PDF',
    badgeStyle: { background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid var(--border)' },
  },
  {
    step: 'Step 2',
    title: 'Intelligent model routing',
    desc: 'The backend maps your request to the best engine — Gemini 1.5 Pro for multimodal tasks, Groq Llama for speed.',
    visual: (
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>Gemini 1.5 Pro</div>
          <div style={{ fontSize: '10px', color: '#50505f' }}>Vision · PDF · Complex</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.12)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#fb923c', fontWeight: 600, marginBottom: '4px' }}>Groq Llama 3.3</div>
          <div style={{ fontSize: '10px', color: '#50505f' }}>Speed · Text · Code</div>
        </div>
      </div>
    ),
    badge: 'Gemini · Groq',
    badgeStyle: { background: 'rgba(245,158,11,0.08)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.15)' },
  },
  {
    step: 'Step 3',
    title: 'Real-time web context',
    desc: 'Tavily searches the web before generating — injecting live results directly into the prompt.',
    visual: (
      <>
        <div style={{ fontSize: '11px', color: '#fb923c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fb923c', display: 'inline-block', animation: 'ppblink 1s infinite' }}></span>
          Searching: "latest AI model releases"
        </div>
        <div className="sline" style={{ width: '90%' }}></div>
        <div className="sline" style={{ width: '72%' }}></div>
        <div className="sline" style={{ width: '55%', background: 'rgba(251,146,60,0.08)' }}></div>
      </>
    ),
    badge: 'Tavily web search',
    badgeStyle: { background: 'rgba(245,158,11,0.08)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.15)' },
  },
  {
    step: 'Step 4',
    title: 'Streams token by token',
    desc: "SSE pushes each token as it's generated. You read the answer while the model is still writing.",
    visual: (
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', fontSize: '12px', color: '#f2f1ee', lineHeight: 1.7 }}>
        The latest developments in AI include
        <span style={{ color: '#7a7a8c' }}> multimodal reasoning and efficient inference</span>
        <span style={{ display: 'inline-block', width: '7px', height: '13px', background: '#f59e0b', borderRadius: '1px', marginLeft: '2px', verticalAlign: 'middle', animation: 'ppblink 0.9s infinite' }}></span>
      </div>
    ),
    badge: 'SSE · Real-time',
    badgeStyle: { background: 'rgba(245,158,11,0.08)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.15)' },
  },
  {
    step: 'Step 5',
    title: 'Memory persists forever',
    desc: 'Mem0 stores key context from every conversation. Next session, Chymera already knows your stack, preferences, and projects.',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: '7px' }}>
          <span style={{ fontSize: '14px' }}>🧠</span>
          <span style={{ fontSize: '11.5px', color: '#f59e0b' }}>Stack: React + Node.js + Supabase</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px' }}>
          <span style={{ fontSize: '14px' }}>📌</span>
          <span style={{ fontSize: '11.5px', color: '#7a7a8c' }}>Prefers concise, bullet answers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px' }}>
          <span style={{ fontSize: '14px' }}>🚀</span>
          <span style={{ fontSize: '11.5px', color: '#7a7a8c' }}>Project: Chymera landing page</span>
        </div>
      </div>
    ),
    badge: 'Persistent memory',
    badgeStyle: { background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid var(--border)' },
  },
];

const AUTO_INTERVAL = 4500;

export default function Capabilities() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fadeState, setFadeState] = useState('in');
  const timerRef = useRef(null);

  const startAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % PREVIEWS.length);
        setFadeState('in');
      }, 200);
    }, AUTO_INTERVAL);
  };

  useEffect(() => {
    startAuto();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSelect = (idx) => {
    if (idx === activeIdx) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setFadeState('out');
    setTimeout(() => {
      setActiveIdx(idx);
      setFadeState('in');
      // Resume auto after 8s of manual interaction
      setTimeout(startAuto, 8000);
    }, 200);
  };

  const p = PREVIEWS[activeIdx];

  return (
    <>
      <div className="sdiv"></div>
      <section className="capabilities" id="capabilities">
        <div className="cap-inner">
          <div className="cap-header reveal">
            <span className="stag">Capabilities</span>
            <h2 className="sh2">How Chymera works,<br /><em>step by step.</em></h2>
          </div>

          <div className="cap-body reveal">
            <div className="timeline">
              {PREVIEWS.map((preview, idx) => (
                <div
                  key={idx}
                  className={`tl-item ${activeIdx === idx ? 'active' : ''}`}
                  onClick={() => handleSelect(idx)}
                >
                  <div className="tl-left">
                    <div className="tl-num">{idx + 1}</div>
                    {idx < PREVIEWS.length - 1 && <div className="tl-connector"></div>}
                  </div>
                  <div className="tl-body">
                    <div className="tl-title">{preview.title}</div>
                    <div className="tl-desc">{preview.desc}</div>
                    <span className="tl-badge" style={preview.badgeStyle}>
                      {preview.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="preview-panel">
              <div className="pp-titlebar">
                <div className="pp-dot r"></div>
                <div className="pp-dot y"></div>
                <div className="pp-dot g"></div>
                <span className="pp-label">Chymera — live preview</span>
              </div>
              <div
                className="pp-content"
                style={{
                  opacity: fadeState === 'in' ? 1 : 0,
                  transform: fadeState === 'in' ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
              >
                <span className="pp-step-label">{p.step}</span>
                <div className="pp-title">{p.title}</div>
                <div className="pp-desc">{p.desc}</div>
                <div className="pp-visual">{p.visual}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
