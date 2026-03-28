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
  const { currentUser, userProfile, logout } = useAuth();

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
