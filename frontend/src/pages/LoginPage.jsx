import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    // Mock login — store user
    localStorage.setItem('fairai-user', JSON.stringify({ email: form.email, name: form.email.split('@')[0] }));
    navigate('/new-analysis');
  };

  return (
    <>
      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-subtitle">Sign in to your FairAI account</p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label>Email</label>
          <div className="auth-input-wrapper">
            <Mail size={16} />
            <input 
              type="email" 
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => { setForm({...form, email: e.target.value}); setError(''); }}
            />
          </div>
        </div>

        <div className="auth-field">
          <label>Password</label>
          <div className="auth-input-wrapper">
            <Lock size={16} />
            <input 
              type="password" 
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => { setForm({...form, password: e.target.value}); setError(''); }}
            />
          </div>
        </div>

        <button type="submit" className="auth-submit-btn">
          Sign In <ArrowRight size={16} />
        </button>
      </form>

      <p className="auth-footer-text">
        Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
      </p>
    </>
  );
}
