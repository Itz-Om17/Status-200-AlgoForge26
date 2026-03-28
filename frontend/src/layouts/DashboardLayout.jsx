import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, History, Settings,
  ShieldCheck, LogOut, User
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Audit Panel' },
    { to: '/new-analysis', icon: Upload, label: 'New Analysis' },
    { to: '/history', icon: History, label: 'History Logs' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleSignOut = () => {
    localStorage.removeItem('fairai-user');
    navigate('/login');
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
            <div className="user-avatar">
              <User size={14} />
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
