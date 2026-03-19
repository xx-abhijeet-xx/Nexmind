import React, { useEffect, useRef, useState } from 'react';
import './PageLoader.css';

const LEFT_DATA  = ['Gemini 1.5 Pro', 'Groq Llama 3.3', 'Tavily Search', 'Mem0 Memory'];
const RIGHT_DATA = ['Vision', 'Documents', 'Voice', 'Streaming'];
const WORD       = 'CHYMERA';

export default function PageLoader({ onComplete, minMs = 2800 }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const rafRef    = useRef(null);
  const [hiding, setHiding] = useState(false);

  /* ── particle field ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    };
    resize();

    const particles = Array.from({ length: 60 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      vx:    (Math.random() - 0.5) * 0.3,
      vy:    (Math.random() - 0.5) * 0.3,
      r:     Math.random() * 1.2 + 0.2,
      a:     Math.random() * 0.35 + 0.05,
      amber: Math.random() > 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.amber
          ? `rgba(245,158,11,${p.a})`
          : `rgba(220,38,38,${p.a * 0.6})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245,158,11,${(1 - d / 90) * 0.06})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  /* ── hide / done timers ── */
  useEffect(() => {
    const hideT = setTimeout(() => setHiding(true), minMs);
    const doneT = setTimeout(() => { if (onComplete) onComplete(); }, minMs + 350);
    return () => { clearTimeout(hideT); clearTimeout(doneT); };
  }, [onComplete, minMs]);

  return (
    <div ref={wrapRef} className={`pl${hiding ? ' pl--out' : ''}`}>
      <canvas ref={canvasRef} className="pl__canvas" />

      <div className="pl__glow" />
      <div className="pl__orbit pl__orbit--outer" />
      <div className="pl__orbit pl__orbit--inner" />
      <div className="pl__sweep" />

      {/* corner brackets */}
      <div className="pl__br pl__br--tl" />
      <div className="pl__br pl__br--tr" />
      <div className="pl__br pl__br--bl" />
      <div className="pl__br pl__br--br" />

      {/* side data labels */}
      <ul className="pl__data pl__data--left" aria-hidden="true">
        {LEFT_DATA.map((t, i) => (
          <li key={t} className="pl__data-line" style={{ animationDelay: `${0.8 + i * 0.15}s` }}>
            <span className="pl__data-dot" />{t}
          </li>
        ))}
      </ul>
      <ul className="pl__data pl__data--right" aria-hidden="true">
        {RIGHT_DATA.map((t, i) => (
          <li key={t} className="pl__data-line" style={{ animationDelay: `${0.8 + i * 0.15}s` }}>
            {t}<span className="pl__data-dot" />
          </li>
        ))}
      </ul>

      {/* center */}
      <div className="pl__center">
        <div className="pl__diamond-wrap">
          <div className="pl__diamond" />
        </div>

        <div className="pl__word-wrap">
          <div className="pl__word" aria-label="Chymera">
            {WORD.split('').map((ch, i) => (
              <span
                key={i}
                className="pl__ch"
                data-accent={ch === 'A' ? 'true' : undefined}
                style={{ animationDelay: `${0.15 + i * 0.1}s` }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="pl__underline" />
          <div className="pl__tagline">Intelligence · Amplified</div>
        </div>

        <div className="pl__prog-wrap">
          <div className="pl__prog-track">
            <div className="pl__prog-fill" />
          </div>
          <div className="pl__prog-labels">
            <span>Initializing</span>
            <span className="pl__prog-pct">Loading…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
