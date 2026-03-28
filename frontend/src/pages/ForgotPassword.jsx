import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email) {
      return setError('Please enter your email');
    }

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Check your inbox for further instructions');
    } catch (err) {
      console.error(err);
      setError('Failed to reset password: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="auth-title">Reset password</h2>
      <p className="auth-subtitle">We'll send you a password reset link</p>

      {error && <div className="auth-error">{error}</div>}
      {message && <div className="auth-success" style={{ 
        padding: '12px', 
        backgroundColor: 'rgba(16, 185, 129, 0.1)', 
        color: '#10b981', 
        borderRadius: '8px', 
        fontSize: '14px', 
        marginBottom: '20px',
        border: '1px solid rgba(16, 185, 129, 0.2)'
      }}>{message}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label>Email</label>
          <div className="auth-input-wrapper">
            <Mail size={16} />
            <input 
              type="email" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setMessage(''); }}
            />
          </div>
        </div>

        <button disabled={loading} type="submit" className="auth-submit-btn" style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Sending...' : <>Send Reset Link <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="auth-footer-text">
        Suddenly remembered? <Link to="/login" className="auth-link">Sign in</Link>
      </p>
    </>
  );
}
