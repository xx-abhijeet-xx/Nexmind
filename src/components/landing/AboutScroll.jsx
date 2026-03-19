import React, { useEffect, useRef, useState } from 'react';

const CARDS = [
  {
    num: '2', unit: '+', sub: 'AI Providers',
    desc: 'Gemini 1.5 Pro and Groq Llama 3.3 — route to the right engine for every task automatically.'
  },
  {
    num: '4', unit: '×', sub: 'Input Modes',
    desc: 'Text, voice, images, PDFs — send anything, get intelligent responses back in real time.'
  },
  {
    num: '∞', unit: '', sub: 'Memory',
    desc: 'Mem0-powered context that persists across every session. Chymera knows who you are.'
  },
  {
    num: '~0', unit: 'ms', sub: 'First Token',
    desc: 'SSE streaming means the response starts the instant the model does. No loading, no waiting.'
  },
  {
    num: '1', unit: '×', sub: 'Interface',
    desc: "One clean UI for all models, all modes, and every conversation you'll ever have."
  },
];

export default function AboutScroll() {
  const outerRef = useRef(null);
  const trackRef = useRef(null);
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const CARD_W = 244;
    let targetX = 0;

    const getMaxScroll = () =>
      Math.max(0, CARD_W * CARDS.length - outer.offsetWidth + 104);

    const setX = (x) => {
      const max = getMaxScroll();
      targetX = Math.min(Math.max(x, 0), max);
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-targetX}px)`;
      }
      setProgress(20 + (targetX / Math.max(max, 1)) * 80);
    };

    const handleWheel = (e) => {
      if (!outer.contains(e.target)) return;
      const max = getMaxScroll();
      const atEnd = targetX >= max - 2;
      const atStart = targetX <= 2;
      if ((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atStart)) return;
      if (Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      setX(targetX + e.deltaY * 0.9);
    };

    let dragStart = null;
    let dragX = 0;

    const onMouseDown = (e) => {
      dragStart = e.clientX;
      dragX = targetX;
      outer.style.cursor = 'grabbing';
    };
    const onMouseUp = () => {
      dragStart = null;
      if (outer) outer.style.cursor = 'grab';
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

    window.addEventListener('wheel', handleWheel, { passive: false });
    outer.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    outer.addEventListener('touchstart', onTouchStart, { passive: true });
    outer.addEventListener('touchmove', onTouchMove, { passive: true });
    outer.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (outer) {
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
          <h2 className="sh2">Built different.<br /><em>Works better.</em></h2>
        </div>

        <div className="about-sticky-outer" id="aboutOuter" ref={outerRef} style={{ cursor: 'grab' }}>
          <div className="about-sticky-inner">
            <div className="about-track-header">
              <div className="about-drag-hint">
                <span className="hint-arr">→</span> scroll or drag to explore
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            <div className="cards-track-wrap">
              <div className="cards-track" ref={trackRef}>
                {CARDS.map((card, i) => (
                  <div className="acard" key={i}>
                    <div className="ac-num">
                      {card.num}
                      {card.unit && <span className="unit">{card.unit}</span>}
                    </div>
                    <div className="ac-sub">{card.sub}</div>
                    <div className="ac-divider"></div>
                    <div className="ac-desc">{card.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
