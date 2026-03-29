import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, History, Settings,
  ShieldCheck, LogOut, User
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { currentUser, userProfile, logout, is2faVerified, verifyMfa } = useAuth();
  
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Audit Panel' },
    { to: '/new-analysis', icon: Upload, label: 'New Analysis' },
    { to: '/history', icon: History, label: 'History Logs' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to sign out', err);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setMfaError('');
    setMfaLoading(true);
    try {
      await verifyMfa(mfaCode);
    } catch (err) {
      setMfaError(err.message || 'Invalid code');
    } finally {
      setMfaLoading(false);
    }
  };

  const getInitials = () => {
    const name = currentUser?.displayName;
    // Guard against literal string "undefined" or "null"
    if (name && name !== 'undefined' && name !== 'null') {
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (currentUser?.email) return currentUser.email[0].toUpperCase();
    return 'U';
  };

  const displayName = (() => {
    const name = currentUser?.displayName;
    if (name && name !== 'undefined' && name !== 'null') return name;
    return currentUser?.email || 'User';
  })();

  if (currentUser && !is2faVerified) {
    return (
      <div className={`app-layout ${theme === 'dark' ? 'dark-theme' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <ShieldCheck size={48} style={{ color: '#3b82f6' }} />
          </div>
          <h2 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '8px' }}>Two-Factor Auth</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
            Please enter your 6-digit authenticator code to continue.
          </p>
          
          <form onSubmit={handleVerifySubmit}>
            <input 
              autoFocus
              type="text" 
              placeholder="000000" 
              maxLength="6"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '24px', letterSpacing: '8px', textAlign: 'center', marginBottom: '16px' }}
            />
            {mfaError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{mfaError}</div>}
            
            <button 
              type="submit"
              disabled={mfaCode.length !== 6 || mfaLoading}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', background: mfaCode.length === 6 ? '#3b82f6' : '#1e293b', color: '#fff', border: 'none', fontWeight: 600, cursor: mfaCode.length === 6 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', marginBottom: '16px' }}
            >
              {mfaLoading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              Cancel and sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-layout ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <ShieldCheck />
            </div>
            <span className="sidebar-logo-text">FairAI</span>
          </div>
          
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <div className="top-bar">
          <div className="breadcrumbs">
          </div>
          <div className="top-bar-actions">
            <button onClick={handleSignOut} className="icon-btn" title="Sign Out">
              <LogOut size={15} />
            </button>
            <div 
              className="user-avatar" 
              onClick={() => navigate('/settings')}
              style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', fontWeight: '600' }}
              title="Go to Settings"
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  {userProfile?.name?.charAt(0)?.toUpperCase() || currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}