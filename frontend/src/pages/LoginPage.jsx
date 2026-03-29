import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await login(form.email, form.password);
      navigate('/new-analysis');
    } catch (err) {
      console.error(err);
      setError('Failed to log in: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/new-analysis');
    } catch (err) {
      console.error(err);
      setError('Failed to log in with Google: ' + err.message);
    } finally {
      setLoading(false);
    }
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <Link to="/forgot-password" style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        <button disabled={loading} type="submit" className="auth-submit-btn" style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing In...' : <>Sign In <ArrowRight size={16} /></>}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
        <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
      </div>

      <button 
        disabled={loading} 
        onClick={handleGoogleSignIn} 
        style={{ 
          width: '100%', padding: '12px', borderRadius: '8px', 
          backgroundColor: '#1e293b', border: '1px solid #334155', 
          color: '#f8fafc', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginBottom: '20px'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      <p className="auth-footer-text">
        Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
      </p>
    </>
  );
}