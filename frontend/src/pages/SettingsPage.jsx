import React, { useState } from 'react';
import { Moon, Sun, Bell, BellOff, User, Mail, Shield, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);

  const user = JSON.parse(localStorage.getItem('fairai-user') || '{"name":"User","email":"user@example.com"}');

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your account preferences and application settings.</p>

      <div className="settings-grid">
        {/* Profile */}
        <div className="settings-card">
          <div className="settings-card-header">
            <User size={18} />
            <h3>Profile Information</h3>
          </div>
          <div className="settings-card-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Name</span>
              <span className="settings-info-value">{user.name}</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Email</span>
              <span className="settings-info-value">{user.email}</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Role</span>
              <span className="settings-info-value">Analyst</span>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Monitor size={18} />
            <h3>Appearance</h3>
          </div>
          <div className="settings-card-body">
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                <div>
                  <div className="settings-toggle-title">Dark Mode</div>
                  <div className="settings-toggle-desc">Switch between light and dark theme</div>
                </div>
              </div>
              <button 
                onClick={toggleTheme}
                className={`settings-toggle ${theme === 'dark' ? 'active' : ''}`}
              >
                <div className="settings-toggle-knob"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Bell size={18} />
            <h3>Notifications</h3>
          </div>
          <div className="settings-card-body">
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                {notifications ? <Bell size={18} /> : <BellOff size={18} />}
                <div>
                  <div className="settings-toggle-title">Push Notifications</div>
                  <div className="settings-toggle-desc">Get notified when audits complete</div>
                </div>
              </div>
              <button 
                onClick={() => setNotifications(!notifications)}
                className={`settings-toggle ${notifications ? 'active' : ''}`}
              >
                <div className="settings-toggle-knob"></div>
              </button>
            </div>
            <div className="settings-toggle-row" style={{marginTop: 16}}>
              <div className="settings-toggle-info">
                <Mail size={18} />
                <div>
                  <div className="settings-toggle-title">Email Alerts</div>
                  <div className="settings-toggle-desc">Receive audit reports via email</div>
                </div>
              </div>
              <button 
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`settings-toggle ${emailAlerts ? 'active' : ''}`}
              >
                <div className="settings-toggle-knob"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Shield size={18} />
            <h3>Security</h3>
          </div>
          <div className="settings-card-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Password</span>
              <button className="settings-action-btn">Change Password</button>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Two-Factor Auth</span>
              <button className="settings-action-btn">Enable</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
