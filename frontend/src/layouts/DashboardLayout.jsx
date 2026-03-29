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
  const { currentUser, logout } = useAuth();

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
      console.error('Sign out failed:', err);
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
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                borderRadius: '50%', 
                width: '32px', 
                height: '32px', 
                fontSize: '14px', 
                fontWeight: '600' 
              }}
              title={displayName}
            >
              {getInitials()}
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