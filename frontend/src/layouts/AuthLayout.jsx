import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function AuthLayout() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className={`auth-layout ${isDarkMode ? 'dark-theme' : ''}`}>
      
      {/* Background Ambience */}
      {isDarkMode ? (
        <>
          <div style={{ position: 'fixed', top: '-10%', left: '0%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 60%)', zIndex: 0, pointerEvents: 'none' }}></div>
          <div style={{ position: 'fixed', bottom: '-20%', right: '0%', width: '800px', height: '800px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 60%)', zIndex: 0, pointerEvents: 'none' }}></div>
        </>
      ) : (
        <>
          <div style={{ position: 'fixed', top: '-10%', left: '0%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 60%)', zIndex: 0, pointerEvents: 'none' }}></div>
        </>
      )}

      {/* Floating Action Bar */}
      <div style={{ position: 'absolute', top: '32px', left: '48px', right: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <Link to="/" className="auth-back-btn">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>

      <div style={{ position: 'relative', zIndex: 5, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(59,130,246,0.4)', marginBottom: '16px' }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: isDarkMode ? '#fff' : '#111' }}>FairAI</span>
        </div>
        <div className="auth-card" style={{ backdropFilter: 'blur(24px)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
