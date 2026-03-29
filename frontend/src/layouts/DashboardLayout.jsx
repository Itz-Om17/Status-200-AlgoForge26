import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, History, Settings,
  ShieldCheck, LogOut, User, Menu
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { currentUser, userProfile, logout, is2faVerified, verifyMfa } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setMfaError('');
    setMfaLoading(true);
    try {
      await verifyMfa(mfaCode);
      // is2faVerified becomes true automatically in context
    } catch (err) {
      setMfaError(err.message || 'Invalid code');
    } finally {
      setMfaLoading(false);
    }
  };

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
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div>
          <div style={{ 
            display: 'flex', 
            flexDirection: isCollapsed ? 'column' : 'row', 
            alignItems: 'center', 
            justifyContent: isCollapsed ? 'center' : 'space-between', 
            gap: isCollapsed ? '20px' : '10px', 
            padding: isCollapsed ? '0 0 24px 0' : '0 16px 32px 16px',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: isCollapsed ? 'none' : 'block' }}>
                <rect width="32" height="32" rx="8" fill="url(#dashLogoGrad)" />
                {/* Brain left */}
                <path d="M8 18c0 2.2 1.5 4 3.5 4 .3 0 .5 0 .8-.1V13c-.3-.1-.5-.1-.8-.1C9.5 13 8 15 8 18z" fill="white" opacity="0.9" />
                <path d="M12.3 12.5c.3-.7.9-1 1.5-1 .4 0 .7.1 1 .3V22c-.3.1-.6.2-1 .2-.6 0-1.2-.3-1.5-1V12.5z" fill="white" opacity="0.9" />
                {/* Magnifying glass */}
                <circle cx="15" cy="17" r="3.5" stroke="white" strokeWidth="1.5" fill="none" opacity="0.85" />
                <line x1="17.5" y1="19.5" x2="20" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                {/* Scale */}
                <line x1="20" y1="11" x2="26" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                <line x1="23" y1="11" x2="23" y2="21" stroke="white" strokeWidth="1.2" opacity="0.9" />
                <path d="M20 11 L18.5 14.5 H21.5 Z" fill="white" opacity="0.75" />
                <path d="M26 11 L24.5 14.5 H27.5 Z" fill="white" opacity="0.75" />
                <defs>
                  <linearGradient id="dashLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1e3a5f" />
                    <stop offset="100%" stopColor="#0d0d17" />
                  </linearGradient>
                </defs>
              </svg>
              {!isCollapsed && <span className="sidebar-logo-text" style={{ fontSize: '18px', margin: 0 }}>FairAI</span>}
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.color = '#111'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666'; }}
            >
              <Menu size={22} />
            </button>
          </div>
          
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
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
            <button 
              onClick={handleSignOut} 
              className="icon-btn signout-hover" 
              title="Sign Out"
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.background = ''; }}
              style={{ transition: 'all 0.2s' }}
            >
              <LogOut size={15} />
            </button>
            <div 
              className="user-avatar" 
              onClick={() => navigate('/settings')}
              style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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
