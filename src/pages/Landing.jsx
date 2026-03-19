import React, { useEffect } from 'react';
import './Landing.css';
import AuthCard from '../components/landing/AuthCard';
import ChatDemo from '../components/landing/ChatDemo';
import AboutScroll from '../components/landing/AboutScroll';
import Capabilities from '../components/landing/Capabilities';
import LandingFooter from '../components/landing/LandingFooter';
import ChymeraLogo from '../Assets/chymera-logo.svg';

export default function Landing() {
  // Initialize IntersectionObserver for smooth reveal animations
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('in'), i * 100);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => io.observe(el));

    return () => {
      io.disconnect();
    };
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const triggerAuthTab = (e, idx) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const authCard = document.getElementById('authSection');
      if (authCard) {
        const tabs = authCard.querySelectorAll('.at');
        if (tabs[idx]) tabs[idx].click();
        
        // Auto-focus the first input field dynamically
        setTimeout(() => {
          const firstInput = authCard.querySelector('input');
          if (firstInput) firstInput.focus();
        }, 50);
      }
    }, 450);
  };

  return (
    <div className="landing-root">
      {/* â”€â”€ NAV â”€â”€ */}
      <nav>
        <a href="#" className="logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <img src={ChymeraLogo} alt="Chymera" style={{ height: '32px', display: 'block' }} />
        </a>
        <div className="nav-right">
          <ul className="nav-links" style={{ marginRight: '16px' }}>
            <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')}>About</a></li>
            <li><a href="#capabilities" onClick={(e) => scrollToSection(e, 'capabilities')}>Capabilities</a></li>
          </ul>
          <a href="#" className="nav-try" onClick={(e) => triggerAuthTab(e, 0)}>Try Chymera â†—</a>
        </div>
      </nav>

      {/* â”€â”€ HERO â”€â”€ */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <div className="ey-line"></div>Multi-provider AI platform
          </div>
          <h1 className="hero-h1">Think faster.<br/><em>Do more.</em></h1>
          <p className="hero-sub">Gemini, Groq, live web search, vision, documents and memory â€” one seamless interface.</p>
          
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

