import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';
import AuthCard from '../components/landing/AuthCard';
import ChatDemo from '../components/landing/ChatDemo';
import AboutScroll from '../components/landing/AboutScroll';
import Capabilities from '../components/landing/Capabilities';
import LandingFooter from '../components/landing/LandingFooter';
import ChymeraLogo from '../Assets/chymera-logo.svg';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Already logged in — send straight to chat
  useEffect(() => {
    if (!loading && user) {
      navigate('/chat', { replace: true });
    }
  }, [user, loading, navigate]);

  // Intersection Observer for scroll reveal
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('in'), i * 100);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    const els = document.querySelectorAll('.landing-root .reveal');
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const triggerAuthTab = (e, tabName) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const authCard = document.getElementById('authSection');
      if (!authCard) return;
      const tabs = authCard.querySelectorAll('.at');
      const idx = tabName === 'reg' ? 1 : 0;
      if (tabs[idx]) tabs[idx].click();
      setTimeout(() => {
        const firstInput = authCard.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 50);
    }, 450);
  };

  // Show nothing while auth state is resolving to prevent flash
  if (loading) return null;

  return (
    <div className="landing-root">
      {/* ── NAV ── */}
      <nav>
        <a
          href="#"
          className="logo"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          aria-label="Chymera home"
        >
          <img src={ChymeraLogo} alt="" style={{ height: '32px', display: 'block' }} />
          <span style={{ marginLeft: '10px', fontFamily: "'Instrument Serif', serif", fontSize: '20px' }}>Chymera</span>
        </a>

        <div className="nav-right">
          <ul className="nav-links" style={{ marginRight: '16px' }}>
            <li><a href="#about" onClick={e => scrollTo(e, 'about')}>About</a></li>
            <li><a href="#capabilities" onClick={e => scrollTo(e, 'capabilities')}>Capabilities</a></li>
          </ul>
          <a href="#" className="nav-try" onClick={e => triggerAuthTab(e, 'login')}>
            Try Chymera ↗
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <div className="ey-line"></div>
            Multi-provider AI platform
          </div>
          <h1 className="hero-h1">
            Think faster.<br />
            <em>Do more.</em>
          </h1>
          <p className="hero-sub">
            Gemini, Groq, live web search, vision, documents and memory — one seamless interface.
          </p>
          <AuthCard />
        </div>

        <ChatDemo />
      </section>

      <AboutScroll />
      <Capabilities />
      <LandingFooter />
    </div>
  );
}
