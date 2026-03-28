import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    // Mock register — store user
    localStorage.setItem('fairai-user', JSON.stringify({ email: form.email, name: form.name }));
    navigate('/new-analysis');
  };

  return (
    <>
      <h2 className="auth-title">Create account</h2>
      <p className="auth-subtitle">Start analyzing AI fairness today</p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label>Full Name</label>
          <div className="auth-input-wrapper">
            <User size={16} />
            <input 
              type="text" 
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => { setForm({...form, name: e.target.value}); setError(''); }}
            />
          </div>
        </div>

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
          <label>Role</label>
          <div className="auth-input-wrapper">
            <User size={16} />
            <input 
              type="text" 
              placeholder="e.g. ML Engineer / Data Scientist"
              value={form.role || ''}
              onChange={(e) => { setForm({...form, role: e.target.value}); setError(''); }}
            />
          </div>
        </div>

        <div className="auth-field">
          <label>Password</label>
          <div className="auth-input-wrapper">
            <Lock size={16} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => { setForm({...form, password: e.target.value}); setError(''); }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: 'none', border: 'none', padding: '0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.7 }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label>Confirm Password</label>
          <div className="auth-input-wrapper">
            <Lock size={16} />
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => { setForm({...form, confirmPassword: e.target.value}); setError(''); }}
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ background: 'none', border: 'none', padding: '0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.7 }}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="auth-submit-btn">
          Create Account <ArrowRight size={16} />
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
      </p>
    </>
  );
}
