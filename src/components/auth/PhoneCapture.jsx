import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import './Auth.css';

export default function PhoneCapture({ onComplete }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 7) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { phone: phone }
      });

      if (error) throw error;

      if (onComplete) onComplete();

    } catch (err) {
      setError(err.message || 'Failed to link phone number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <h1 className="auth-title">Wait! Just one more thing</h1>
          <p className="auth-subtitle">We need a phone number to complete your registration.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="phone-number">Phone Number</label>
            <input
              id="phone-number"
              type="tel"
              placeholder="(555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <button
            className="auth-btn"
            type="submit"
            disabled={loading}
            style={{ marginTop: '16px' }}
          >
            {loading ? <span className="auth-spinner" /> : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
