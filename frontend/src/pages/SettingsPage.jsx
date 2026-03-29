import React, { useState, useEffect } from 'react';
import { Moon, Sun, Bell, BellOff, User, Mail, Shield, Monitor, CheckCircle, Edit2, Check, X, QrCode } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, userProfile, setUserProfile, resetPassword, updateUserRole } = useAuth();
  
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  /* Role editing */
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  
  /* MFA setup */
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaData, setMfaData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleToggleNotifications = () => {
    setNotifications(!notifications);
    showToast('Notification preferences updated.');
  };

  const handleToggleEmailAlerts = () => {
    setEmailAlerts(!emailAlerts);
    showToast('Notification preferences updated.');
  };

  const handleResetPassword = async () => {
    if (currentUser?.email) {
      try {
        await resetPassword(currentUser.email);
        showToast('Password reset email sent! Check your inbox.');
      } catch (err) {
        showToast('Failed to send reset email.');
        console.error(err);
      }
    }
  };

  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const displayEmail = currentUser?.email || 'user@example.com';
  const displayRole = userProfile?.role || 'Analyst';

  const handleEditName = () => {
    setEditName(displayName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { name: editName }, { merge: true });
      await updateProfile(currentUser, { displayName: editName });
      if (setUserProfile) setUserProfile({ ...userProfile, name: editName });
      setIsEditingName(false);
      showToast('Name updated successfully.');
    } catch (e) {
      showToast('Failed to update name.');
      console.error(e);
    }
  };

  const handleEditRole = () => {
    setEditRole(displayRole);
    setIsEditingRole(true);
  };

  const handleSaveRole = async () => {
    if (!currentUser) return;
    try {
      setSavingRole(true);
      const trimmed = editRole.trim();
      await updateUserRole(trimmed);
      await setDoc(doc(db, 'users', currentUser.uid), { role: trimmed }, { merge: true });
      if (setUserProfile) setUserProfile({ ...userProfile, role: trimmed });
      setIsEditingRole(false);
      showToast('Role updated successfully.');
    } catch (e) {
      showToast('Failed to update role.');
      console.error(e);
    } finally {
      setSavingRole(false);
    }
  };

  const initiateMfaEnrollment = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      const res = await fetch('http://127.0.0.1:5000/api/mfa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: displayEmail })
      });
      const data = await res.json();
      setMfaData(data);
      setShowMfaModal(true);
    } catch (e) {
      showToast("Failed to initiate 2FA.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setMfaError('');
    setMfaLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: mfaData.secret, code: mfaCode })
      });
      const data = await res.json();
      if (data.valid) {
        await setDoc(doc(db, 'users', currentUser.uid), { mfaEnabled: true, mfaSecret: mfaData.secret }, { merge: true });
        if (setUserProfile) setUserProfile({ ...userProfile, mfaEnabled: true, mfaSecret: mfaData.secret });
        setShowMfaModal(false);
        setMfaCode('');
        showToast("2FA Enabled Successfully!");
      } else {
        setMfaError("Invalid 6-digit code");
      }
    } catch (e) {
      setMfaError("Failed to verify code");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { mfaEnabled: false, mfaSecret: '' }, { merge: true });
      if (setUserProfile) setUserProfile({ ...userProfile, mfaEnabled: false, mfaSecret: '' });
      sessionStorage.removeItem('mfa_' + currentUser.uid);
      showToast("2FA Disabled.");
    } catch(e) {
      showToast("Failed to disable 2FA.");
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', 
          backgroundColor: 'rgba(16, 185, 129, 0.9)', color: '#fff', border: '1px solid rgba(16,185,129, 0.4)',
          padding: '12px 20px', borderRadius: '8px', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <CheckCircle size={16} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{toastMsg}</span>
        </div>
      )}

      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your account preferences and application settings.</p>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-header">
            <User size={18} />
            <h3>Profile Information</h3>
          </div>
          <div className="settings-card-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Name</span>
              <span className="settings-info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditingName ? (
                  <>
                    <input autoFocus type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ background: 'transparent', border: '1px solid #334155', color: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', width: '200px' }} />
                    <button onClick={handleSaveName} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex' }}><Check size={16}/></button>
                    <button onClick={() => setIsEditingName(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><X size={16}/></button>
                  </>
                ) : (
                  <>
                    <span>{displayName}</span>
                    <button onClick={handleEditName} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }} title="Edit Name"><Edit2 size={13} /></button>
                  </>
                )}
              </span>
            </div>
            
            <div className="settings-info-row">
              <span className="settings-info-label">Email</span>
              <span className="settings-info-value">{displayEmail}</span>
            </div>

            <div className="settings-info-row">
              <span className="settings-info-label">Role</span>
              <span className="settings-info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditingRole ? (
                  <>
                    <input autoFocus type="text" value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ background: 'transparent', border: '1px solid #334155', color: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', width: '200px' }} />
                    <button onClick={handleSaveRole} disabled={savingRole} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex' }}>{savingRole ? <span style={{fontSize: '12px'}}>...</span> : <Check size={16}/>}</button>
                    <button onClick={() => setIsEditingRole(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><X size={16}/></button>
                  </>
                ) : (
                  <>
                    <span>{displayRole}</span>
                    <button onClick={handleEditRole} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }} title="Edit Role"><Edit2 size={13} /></button>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

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
                onClick={handleToggleNotifications}
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
                onClick={handleToggleEmailAlerts}
                className={`settings-toggle ${emailAlerts ? 'active' : ''}`}
              >
                <div className="settings-toggle-knob"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <Shield size={18} />
            <h3>Security</h3>
          </div>
          <div className="settings-card-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Password</span>
              <button className="settings-action-btn" onClick={handleResetPassword}>Change Password</button>
            </div>
            
            <div className="settings-info-row">
              <span className="settings-info-label">Two-Factor Auth</span>
              {userProfile?.mfaEnabled ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>Enabled</span>
                  <button className="settings-action-btn" onClick={handleDisableMfa} style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}>Disable</button>
                </div>
              ) : (
                <button className="settings-action-btn" onClick={initiateMfaEnrollment} disabled={mfaLoading}>
                  {mfaLoading ? 'Loading...' : 'Enable 2FA'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMfaModal && mfaData && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} /> Setup Two-Factor Auth
              </h3>
              <button onClick={() => setShowMfaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
              1. Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy).
            </p>
            
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <img src={mfaData.qrCodeDataUrl} alt="QR Code" style={{ width: '200px', height: '200px' }} />
            </div>
            
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
              2. Enter the 6-digit code generated by your app.
            </p>
            
            <input 
              type="text" 
              placeholder="000000" 
              maxLength="6"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '18px', letterSpacing: '2px', textAlign: 'center', marginBottom: '16px' }}
            />
            {mfaError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{mfaError}</div>}
            
            <button 
              onClick={handleVerifyMfa}
              disabled={mfaCode.length !== 6 || mfaLoading}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', background: mfaCode.length === 6 ? '#3b82f6' : '#1e293b', color: '#fff', border: 'none', fontWeight: 600, cursor: mfaCode.length === 6 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >
              {mfaLoading ? 'Verifying...' : 'Verify and Save'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}