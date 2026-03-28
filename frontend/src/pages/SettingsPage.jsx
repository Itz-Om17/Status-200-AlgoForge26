import React, { useState, useEffect } from 'react';
import { Moon, Sun, Bell, BellOff, User as UserIcon, Mail, Shield, Monitor, Pencil, Check, X, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

/* ─── Toast Notification ──────────────────────────────────────────── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: '#0f372a', border: '#10b981', icon: '✓', text: '#10b981' },
    error:   { bg: '#3b1219', border: '#ef4444', icon: '✕', text: '#ef4444' },
    info:    { bg: '#0f1f37', border: '#3b82f6', icon: 'ℹ', text: '#3b82f6' },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '14px 18px', borderRadius: '12px',
      background: c.bg, border: `1px solid ${c.border}`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${c.border}22`,
      maxWidth: '360px', animation: 'slideInRight 0.3s ease',
    }}>
      <span style={{ color: c.text, fontWeight: 700, fontSize: '16px', marginTop: '1px' }}>{c.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{message}</p>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 0 0 8px', fontSize: '16px', lineHeight: 1 }}>×</button>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, userRole, resetPassword, logout, updateUserRole } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts]     = useState(false);

  /* Role editing */
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editedRole,    setEditedRole]    = useState('');
  const [savingRole,    setSavingRole]    = useState(false);

  /* Password reset */
  const [sendingReset,  setSendingReset]  = useState(false);

  /* Toast */
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);

  /* Sync edit field when role loads from Firestore */
  useEffect(() => { setEditedRole(userRole); }, [userRole]);

  /* ── Role handlers ── */
  const handleRoleEdit = () => {
    setEditedRole(userRole);
    setIsEditingRole(true);
  };

  const handleRoleSave = async () => {
    const trimmed = editedRole.trim();
    if (!trimmed) { showToast('Role cannot be empty.', 'error'); return; }
    if (trimmed === userRole) { setIsEditingRole(false); return; }
    try {
      setSavingRole(true);
      await updateUserRole(trimmed);
      setIsEditingRole(false);
      showToast('Role updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update role: ' + err.message, 'error');
    } finally {
      setSavingRole(false);
    }
  };

  const handleRoleCancel = () => {
    setEditedRole(userRole);
    setIsEditingRole(false);
  };

  /* ── Password reset handler ── */
  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      setSendingReset(true);
      await resetPassword(currentUser.email);
      showToast(
        `A password reset link has been sent to ${currentUser.email}. You will be signed out now.`,
        'info'
      );
      // Give user 3 s to read the toast, then logout
      setTimeout(async () => {
        await logout();
      }, 3000);
    } catch (err) {
      showToast('Failed to send reset email: ' + err.message, 'error');
    } finally {
      setSendingReset(false);
    }
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#d1d5db'}`,
    background: theme === 'dark' ? '#1e293b' : '#f8fafc',
    color: 'inherit',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 500,
    flex: 1,
    minWidth: 0,
  };

  const iconBtn = (onClick, title, children, color) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: color || '#64748b', padding: '4px', borderRadius: '6px',
        display: 'flex', alignItems: 'center',
        transition: 'color 0.2s',
      }}
    >{children}</button>
  );

  return (
    <>
      {/* Animation keyframe injected once */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your account preferences and application settings.</p>

      <div className="settings-grid">

        {/* ── Profile Information ── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <UserIcon size={18} />
            <h3>Profile Information</h3>
          </div>
          <div className="settings-card-body">

            {/* Name — read-only */}
            <div className="settings-info-row">
              <span className="settings-info-label">Name</span>
              <span className="settings-info-value">
                {currentUser?.displayName && currentUser.displayName !== 'undefined' && currentUser.displayName !== 'null'
                  ? currentUser.displayName
                  : currentUser?.email || 'User'}
              </span>
            </div>

            {/* Email — read-only */}
            <div className="settings-info-row">
              <span className="settings-info-label">Email</span>
              <span className="settings-info-value">{currentUser?.email || 'N/A'}</span>
            </div>

            {/* Role — editable */}
            <div className="settings-info-row">
              <span className="settings-info-label">Role</span>
              {isEditingRole ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                  <input
                    style={inputStyle}
                    value={editedRole}
                    onChange={(e) => setEditedRole(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRoleSave(); if (e.key === 'Escape') handleRoleCancel(); }}
                    autoFocus
                    maxLength={50}
                  />
                  {iconBtn(handleRoleSave,   'Save',   savingRole ? '…' : <Check size={15} />, '#10b981')}
                  {iconBtn(handleRoleCancel, 'Cancel', <X size={15} />, '#ef4444')}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="settings-info-value">{userRole || '—'}</span>
                  {iconBtn(handleRoleEdit, 'Edit role', <Pencil size={14} />)}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Appearance ── */}
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
              <button onClick={toggleTheme} className={`settings-toggle ${theme === 'dark' ? 'active' : ''}`}>
                <div className="settings-toggle-knob"></div>
              </button>
            </div>
          </div>
        </div>

        {/* ── Notifications ── */}
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
              <button onClick={() => setNotifications(!notifications)} className={`settings-toggle ${notifications ? 'active' : ''}`}>
                <div className="settings-toggle-knob"></div>
              </button>
            </div>
            <div className="settings-toggle-row" style={{ marginTop: 16 }}>
              <div className="settings-toggle-info">
                <Mail size={18} />
                <div>
                  <div className="settings-toggle-title">Email Alerts</div>
                  <div className="settings-toggle-desc">Receive audit reports via email</div>
                </div>
              </div>
              <button onClick={() => setEmailAlerts(!emailAlerts)} className={`settings-toggle ${emailAlerts ? 'active' : ''}`}>
                <div className="settings-toggle-knob"></div>
              </button>
            </div>
          </div>
        </div>

        {/* ── Security ── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Shield size={18} />
            <h3>Security</h3>
          </div>
          <div className="settings-card-body">

            {/* Password reset via email */}
            <div className="settings-info-row">
              <div>
                <span className="settings-info-label">Password</span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  A reset link will be emailed to you. You'll be signed out automatically.
                </p>
              </div>
              <button
                className="settings-action-btn"
                onClick={handlePasswordReset}
                disabled={sendingReset}
                style={{ opacity: sendingReset ? 0.7 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Mail size={14} />
                {sendingReset ? 'Sending…' : 'Send Reset Email'}
              </button>
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
