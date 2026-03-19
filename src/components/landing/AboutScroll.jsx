import React, { useEffect, useRef, useState } from 'react';

export default function AboutScroll() {
  const outerRef = useRef(null);
  const trackRef = useRef(null);
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const CARD_W = 244;
    const CARDS = 5;
    let targetX = 0;

    const getMaxScroll = () => Math.max(0, (CARD_W * CARDS) - outer.offsetWidth + 104);

    const setX = (x) => {
      const max = getMaxScroll();
      targetX = Math.min(Math.max(x, 0), max);
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-targetX}px)`;
      }
      setProgress(20 + (targetX / Math.max(max, 1)) * 80);
    };

    const handleWheel = (e) => {
      // Only hijack the standard vertical scroll if the cursor is explicitly hovering the container
      if (!outer.contains(e.target)) return;
      
      const max = getMaxScroll();
      const atEnd = targetX >= max - 2;
      const atStart = targetX <= 2;
      
      if ((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atStart)) return;
      if (Math.abs(e.deltaY) < 2) return;
      
      e.preventDefault();
      setX(targetX + e.deltaY * 0.9);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    // Drag bindings
    let dragStart = null;
    let dragX = 0;

    const onMouseDown = (e) => { 
      dragStart = e.clientX; 
      dragX = targetX; 
      outer.style.cursor = 'grabbing'; 
    };
    
    const onMouseUp = () => { 
      dragStart = null; 
      if(outer) outer.style.cursor = 'grab'; 
    };
    
    const onMouseMove = (e) => {
      if (dragStart === null) return;
      setX(dragX - (e.clientX - dragStart));
    };

    const onTouchStart = (e) => { 
      dragStart = e.touches[0].clientX; 
      dragX = targetX; 
    };
    
    const onTouchMove = (e) => {
      if (dragStart === null) return;
      setX(dragX - (e.touches[0].clientX - dragStart));
    };
    
    const onTouchEnd = () => { dragStart = null; };

    outer.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    outer.addEventListener('touchstart', onTouchStart, { passive: true });
    outer.addEventListener('touchmove', onTouchMove, { passive: true });
    outer.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if(outer) {
        outer.removeEventListener('mousedown', onMouseDown);
        outer.removeEventListener('touchstart', onTouchStart);
        outer.removeEventListener('touchmove', onTouchMove);
        outer.removeEventListener('touchend', onTouchEnd);
      }
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <>
      <div className="sdiv"></div>

      <section className="about" id="about">
        <div className="about-header reveal">
          <span className="stag">About Chymera</span>
          <h2 className="sh2">Built different.<br/><em>Works better.</em></h2>
        </div>

        <div className="about-sticky-outer" id="aboutOuter" ref={outerRef}>
          <div className="about-sticky-inner">
            <div className="about-track-header">
              <div className="about-drag-hint"><span className="hint-arr">â†’</span> scroll or drag to explore</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            <div className="cards-track-wrap">
              <div className="cards-track" ref={trackRef}>
                <div className="acard">
                  <div className="ac-num">2<span className="unit">+</span></div>
                  <div className="ac-sub">AI Providers</div>
                  <div className="ac-divider"></div>
                  <div className="ac-desc">Gemini 1.5 Pro and Groq Llama 3.3 â€” route to the right engine for every task automatically.</div>
                </div>
                <div className="acard">
                  <div className="ac-num">4<span className="unit">Ã—</span></div>
                  <div className="ac-sub">Input Modes</div>
                  <div className="ac-divider"></div>
                  <div className="ac-desc">Text, voice, images, PDFs â€” send anything, get intelligent responses back in real time.</div>
                </div>
                <div className="acard">
                  <div className="ac-num">âˆž</div>
                  <div className="ac-sub">Memory</div>
                  <div className="ac-divider"></div>
                  <div className="ac-desc">Mem0-powered context that persists across every session. Chymera knows who you are.</div>
                </div>
                <div className="acard">
                  <div className="ac-num">~0<span className="unit">ms</span></div>
                  <div className="ac-sub">First Token</div>
                  <div className="ac-divider"></div>
                  <div className="ac-desc">SSE streaming means the response starts the instant the model does. No loading, no waiting.</div>
                </div>
                <div className="acard">
                  <div className="ac-num">1<span className="unit">Ã—</span></div>
                  <div className="ac-sub">Interface</div>
                  <div className="ac-divider"></div>
                  <div className="ac-desc">One clean UI for all models, all modes, and every conversation you'll ever have.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

