import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthCard() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  const loginRef = useRef(null);
  const regRef = useRef(null);
  const userRef = useRef(null);
  const [wrapperHeight, setWrapperHeight] = useState('auto');

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate('/chat', { replace: true });
  }, [user, navigate]);

  // Animate card height on tab change
  useEffect(() => {
    const map = { login: loginRef, reg: regRef, username: userRef };
    const ref = map[tab];
    if (ref?.current) {
      // Use rAF so DOM has painted before measuring
      requestAnimationFrame(() => {
        setWrapperHeight(ref.current.offsetHeight);
      });
    }
  }, [tab, error]);

  const clearError = () => setError('');

  const switchTab = (newTab) => {
    if (tab === newTab) return;
    clearError();
    setTab(newTab);
  };

  // ── LOGIN ──
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    clearError();
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to sign in. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── REGISTER STEP 1 — field validation before going to username ──
  const handleRegContinue = (e) => {
    e.preventDefault();
    clearError();
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim()) return setError('Please enter your email.');
    if (!phone.trim()) return setError('Please enter your phone number.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    switchTab('username');
  };

  // ── REGISTER STEP 2 — actual account creation ──
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    clearError();
    const trimmedUser = username.trim();
    if (!trimmedUser || trimmedUser.length < 3) {
      return setError('Username must be at least 3 characters.');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUser)) {
      return setError('Username can only contain letters, numbers, and underscores.');
    }
    setSubmitting(true);
    try {
      await signUp(email, password);
      // Attach profile metadata after signup
      await supabase.auth.updateUser({
        data: { name: fullName, phone, username: trimmedUser },
      });
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── GOOGLE ──
  const handleGoogle = async () => {
    clearError();
    try {
      await signInWithGoogle();
      // Navigation handled by auth state listener in AuthContext + App.jsx redirect
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  const GoogleBtn = ({ label }) => (
    <button type="button" className="google-btn" onClick={handleGoogle} disabled={submitting}>
      <GoogleIcon />
      {label}
    </button>
  );

  return (
    <div className="auth-card" id="authSection">
      {/* Tab bar — hidden on username step */}
      <div className="auth-tabs" style={{ display: tab === 'username' ? 'none' : 'flex' }}>
        <button
          type="button"
          className={`at ${tab === 'login' ? 'on' : ''}`}
          onClick={() => switchTab('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`at ${tab === 'reg' ? 'on' : ''}`}
          onClick={() => switchTab('reg')}
        >
          Register
        </button>
      </div>

      {/* Animated height wrapper */}
      <div style={{
        position: 'relative',
        height: wrapperHeight,
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>

        {/* ── LOGIN ── */}
        <div
          ref={loginRef}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            opacity: tab === 'login' ? 1 : 0,
            pointerEvents: tab === 'login' ? 'auto' : 'none',
            transform: tab === 'login' ? 'translateX(0)' : 'translateX(-20px)',
            transition: 'opacity 0.3s, transform 0.3s',
          }}
        >
          <form onSubmit={handleLoginSubmit} noValidate>
            <div className="field">
              <label>Email address</label>
              <input
                type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete="current-password"
              />
            </div>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Continue to Chymera →'}
            </button>
            <div className="divider">or</div>
            <GoogleBtn label="Continue with Google" />
          </form>
        </div>

        {/* ── REGISTER ── */}
        <div
          ref={regRef}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            opacity: tab === 'reg' ? 1 : 0,
            pointerEvents: tab === 'reg' ? 'auto' : 'none',
            transform: tab === 'reg' ? 'translateX(0)' : (tab === 'login' ? 'translateX(20px)' : 'translateX(-20px)'),
            transition: 'opacity 0.3s, transform 0.3s',
          }}
        >
          <form onSubmit={handleRegContinue} noValidate>
            <div className="field">
              <label>Full name</label>
              <input
                type="text" placeholder="Ada Lovelace"
                value={fullName} onChange={e => setFullName(e.target.value)} required
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label>Email address</label>
              <input
                type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input
                type="tel" placeholder="+91 00000 00000"
                value={phone} onChange={e => setPhone(e.target.value)} required
                autoComplete="tel"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password" placeholder="Create a strong password"
                value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete="new-password"
              />
            </div>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button type="submit" className="submit-btn" disabled={submitting}>
              Create account →
            </button>
            <div className="divider">or</div>
            <GoogleBtn label="Continue with Google" />
          </form>
        </div>

        {/* ── USERNAME ── */}
        <div
          ref={userRef}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            opacity: tab === 'username' ? 1 : 0,
            pointerEvents: tab === 'username' ? 'auto' : 'none',
            transform: tab === 'username' ? 'translateX(0)' : 'translateX(20px)',
            transition: 'opacity 0.3s, transform 0.3s',
          }}
        >
          <form onSubmit={handleRegisterSubmit} noValidate>
            <button type="button" className="back-btn" onClick={() => switchTab('reg')}>
              ← back
            </button>
            <p className="username-intro">
              Almost there. Pick a <strong>username</strong> for your Chymera account.
            </p>
            <div className="field">
              <label>Username</label>
              <input
                type="text" placeholder="e.g. adalovelace"
                value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="off" required
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '14px' }}>
              Letters, numbers, underscores only. Min 3 chars.
            </div>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Launch Chymera →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
