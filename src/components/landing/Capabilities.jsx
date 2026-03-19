import React, { useState, useEffect } from 'react';

const PREVIEWS = [
  { 
    step:'Step 1', title:'Any input, any format', desc:'Attach a PDF, speak a prompt, paste text, or drop an image â€” Chymera handles them all natively.',
    visual: (
      <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
        <span style={{padding:'5px 10px', background:'rgba(79,255,176,0.07)', border:'1px solid rgba(79,255,176,0.15)', borderRadius:'6px', fontSize:'11px', color:'#4fffb0'}}>ðŸ“ Text</span>
        <span style={{padding:'5px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', fontSize:'11px', color:'#7a7a8c'}}>ðŸŽ™ï¸ Voice</span>
        <span style={{padding:'5px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', fontSize:'11px', color:'#7a7a8c'}}>ðŸ–¼ï¸ Image</span>
        <span style={{padding:'5px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', fontSize:'11px', color:'#7a7a8c'}}>ðŸ“„ PDF</span>
      </div>
    )
  },
  { 
    step:'Step 2', title:'Intelligent model routing', desc:'The backend maps your request to the best engine â€” Gemini 1.5 Pro for multimodal tasks, Groq Llama for speed.',
    visual: (
      <div style={{display:'flex', gap:'10px'}}>
        <div style={{flex:1, background:'rgba(79,255,176,0.06)', border:'1px solid rgba(79,255,176,0.15)', borderRadius:'8px', padding:'12px', textAlign:'center'}}>
          <div style={{fontSize:'11px', color:'#4fffb0', fontWeight:600, marginBottom:'4px'}}>Gemini 1.5 Pro</div>
          <div style={{fontSize:'10px', color:'#50505f'}}>Vision Â· PDF Â· Complex</div>
        </div>
        <div style={{flex:1, background:'rgba(0,200,255,0.05)', border:'1px solid rgba(0,200,255,0.12)', borderRadius:'8px', padding:'12px', textAlign:'center'}}>
          <div style={{fontSize:'11px', color:'#00c8ff', fontWeight:600, marginBottom:'4px'}}>Groq Llama 3.3</div>
          <div style={{fontSize:'10px', color:'#50505f'}}>Speed Â· Text Â· Code</div>
        </div>
      </div>
    )
  },
  { 
    step:'Step 3', title:'Real-time web context', desc:'Tavily searches the web before generating â€” injecting live results directly into the prompt.',
    visual: (
      <>
        <div style={{fontSize:'11px', color:'#00c8ff', marginBottom:'10px', display:'flex', alignItems:'center', gap:'6px'}}>
          <span style={{width:'6px', height:'6px', borderRadius:'50%', background:'#00c8ff', display:'inline-block', animation:'ppblink 1s infinite'}}></span>Searching: "latest AI model releases"
        </div>
        <div className="sline" style={{width:'90%'}}></div>
        <div className="sline" style={{width:'72%'}}></div>
        <div className="sline" style={{width:'55%', background:'rgba(0,200,255,0.08)'}}></div>
      </>
    )
  },
  { 
    step:'Step 4', title:'Streams token by token', desc:"SSE pushes each token as it's generated. You read the answer while the model is still writing.",
    visual: (
      <div style={{background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.05)', padding:'12px', fontSize:'12px', color:'#f2f1ee', lineHeight:1.7}}>
        The latest developments in AI include<span style={{color:'#7a7a8c'}}> multimodal reasoning and efficient inference</span><span style={{display:'inline-block', width:'7px', height:'13px', background:'#4fffb0', borderRadius:'1px', marginLeft:'2px', verticalAlign:'middle', animation:'ppblink 0.9s infinite'}}></span>
      </div>
    )
  },
  { 
    step:'Step 5', title:'Memory persists forever', desc:'Mem0 stores key context from every conversation. Next session, Chymera already knows your stack, preferences, and projects.',
    visual: (
      <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', background:'rgba(79,255,176,0.06)', border:'1px solid rgba(79,255,176,0.12)', borderRadius:'7px'}}>
          <span style={{fontSize:'14px'}}>ðŸ§ </span><span style={{fontSize:'11.5px', color:'#4fffb0'}}>Stack: React + Node.js + Supabase</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'7px'}}>
          <span style={{fontSize:'14px'}}>ðŸ“Œ</span><span style={{fontSize:'11.5px', color:'#7a7a8c'}}>Prefers concise, bullet answers</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'7px'}}>
          <span style={{fontSize:'14px'}}>ðŸš€</span><span style={{fontSize:'11.5px', color:'#7a7a8c'}}>Project: Chymera landing page</span>
        </div>
      </div>
    )
  }
];

export default function Capabilities() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fadeState, setFadeState] = useState('in'); // 'in' or 'out'

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % PREVIEWS.length);
        setFadeState('in');
      }, 200); // Wait for transition out
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSelect = (idx) => {
    if (idx === activeIdx) return;
    setFadeState('out');
    setTimeout(() => {
      setActiveIdx(idx);
      setFadeState('in');
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
            <h2 className="sh2">How Chymera works,<br/><em>step by step.</em></h2>
          </div>
          
          <div className="cap-body reveal">
            <div className="timeline">
              {[0, 1, 2, 3, 4].map(idx => (
                <div 
                  key={idx} 
                  className={`tl-item ${activeIdx === idx ? 'active' : ''}`}
                  onClick={() => handleSelect(idx)}
                >
                  <div className="tl-left">
                    <div className="tl-num">{idx + 1}</div>
                    {idx < 4 && <div className="tl-connector"></div>}
                  </div>
                  <div className="tl-body">
                    <div className="tl-title">{PREVIEWS[idx].title}</div>
                    <div className="tl-desc">{PREVIEWS[idx].desc}</div>
                    <span className="tl-badge" style={{
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(79,255,176,0.08)',
                      color: idx % 2 === 0 ? 'var(--muted)' : 'var(--accent)',
                      border: `1px solid ${idx % 2 === 0 ? 'var(--border)' : 'rgba(79,255,176,0.15)'}`
                    }}>
                      {idx === 0 ? 'Text Â· Voice Â· Image Â· PDF' : 
                       idx === 1 ? 'Gemini Â· Groq' : 
                       idx === 2 ? 'Tavily web search' : 
                       idx === 3 ? 'SSE Â· Real-time' : 'Persistent memory'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="preview-panel">
              <div className="pp-titlebar">
                <div className="pp-dot r"></div><div className="pp-dot y"></div><div className="pp-dot g"></div>
                <span className="pp-label">Chymera â€” live preview</span>
              </div>
              <div className="pp-content" style={{
                opacity: fadeState === 'in' ? 1 : 0,
                transform: fadeState === 'in' ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.2s, transform 0.2s'
              }}>
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

