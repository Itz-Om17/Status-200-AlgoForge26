import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, DownloadCloud, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import FloatingChat from '../components/FloatingChat';
import { useTheme } from '../context/ThemeContext';

export default function AuditPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const aiBoxBg = isDark ? '#1e293b' : '#f8fafc';
  const aiBoxBorder = isDark ? '#334155' : '#e2e8f0';
  const aiTextColor = isDark ? '#cbd5e1' : '#334155';
  const { state: navigationState } = useLocation();
  const navigate = useNavigate();

  const [localData, setLocalData] = useState(() => {
    // 1. Prioritize new data passed explicitly via React Router navigation
    if (navigationState?.auditResults) return navigationState;
    // 2. Fallback to localStorage rehydration for page refreshes / tab switches
    try {
      const cached = localStorage.getItem('current_audit');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Failed to parse cached audit', e);
    }
    return null;
  });

  const auditResults = localData?.auditResults;
  const modelFileName = localData?.modelFileName;
  const datasetFileName = localData?.datasetFileName;
  const detectedTarget = localData?.detectedTarget;
  const detectedSensitive = localData?.detectedSensitive;

  // Toast State
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);
  
  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSecureDownload = async (url, filename, startMsg, endMsg) => {
    try {
      showToast(startMsg);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      
      showToast(endMsg);
    } catch (err) {
      console.error(err);
      showToast("Download Failed - See Console");
    }
  };

  if (!auditResults) {
    return (
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:'40px'}}>
        <AlertTriangle style={{width: 48, height: 48, color: '#eab308', marginBottom: 20}} />
        <h2 style={{color: '#f8fafc', fontSize: 24, marginBottom: 16}}>No Analysis Data Found</h2>
        <p style={{color: '#94a3b8', marginBottom: 24}}>Please run a new analysis first to view the dashboard.</p>
        <button onClick={() => navigate('/new-analysis')} className="confirm-btn" style={{maxWidth: 250}}>
          <span>Go to Setup</span>
        </button>
      </div>
    );
  }

  const baselineData = auditResults?.baseline?.shap_values || [];
  const mitigatedData = auditResults?.mitigated?.shap_values || [];

  // Computed visual calculations exactly like old logic
  const baselineFairness = auditResults?.baseline?.fairness_score || 0;
  const mitigatedFairness = auditResults?.mitigated?.fairness_score || 0;
  
  const b_di = auditResults?.baseline?.disparate_impact || 1.0;
  const m_di = auditResults?.mitigated?.disparate_impact || 1.0;
  
  const b_flips = auditResults?.baseline?.counterfactual_flips || 0;
  const m_flips = auditResults?.mitigated?.counterfactual_flips || 0;

  // Animation states for the circle progress drawing effect
  const [animatedBDash, setAnimatedBDash] = useState(314);
  const [animatedMDash, setAnimatedMDash] = useState(314);

  useEffect(() => {
    // Small delay so the browser registers the starting state before transitioning
    const timer = setTimeout(() => {
      setAnimatedBDash(314 - ((314 * baselineFairness) / 100));
      setAnimatedMDash(314 - ((314 * mitigatedFairness) / 100));
    }, 150);
    return () => clearTimeout(timer);
  }, [baselineFairness, mitigatedFairness]);

  return (
    <>
      {toastMessage && (
        <div style={{
          position: 'fixed', top: 32, right: 32, backgroundColor: '#1e293b', 
          borderLeft: '4px solid #10b981', color: '#fff', padding: '16px 24px', 
          borderRadius: 12, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600
        }}>
            <CheckCircle style={{width: 20, height: 20, color: '#34d399'}} />
            <span>{toastMessage}</span>
        </div>
      )}

      <h1 className="page-title">Fairness Audit Report</h1>
      
      <div className="dashboard-grid">
        {/* Baseline Model */}
        <div className="dashboard-card">
          <div className="dashboard-card-bar red"></div>
          <h2 className="card-title">
            <span className="card-dot red"></span>
            Baseline Model
          </h2>
          
          <div className="score-wrapper">
            <div className="score-circle">
              <svg width="120" height="120" style={{transform: 'rotate(-90deg)'}}>
                <circle cx="60" cy="60" r="50" stroke="#f3f4f6" strokeWidth="8" fill="transparent" opacity={isDark ? 0.05 : 0.5} />
                <circle cx="60" cy="60" r="50" stroke="#ef4444" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset={animatedBDash} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)'}} />
              </svg>
              <div className="score-text">
                <span className="score-number">{baselineFairness}%</span>
                <span className="score-label">Fairness</span>
              </div>
            </div>
          </div>

          <div className="metric-grid">
            <div className={`metric-card ${b_di < 0.8 ? 'red' : 'green'}`}>
              <div className="metric-label">Disparate Impact</div>
              <div className="metric-value-row">
                <span className={`metric-value ${b_di < 0.8 ? 'red' : 'green'}`}>{b_di}</span>
                {b_di < 0.8 ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <CheckCircle className="metric-icon" style={{color:'#10b981'}} />}
              </div>
              <div className={`metric-note ${b_di < 0.8 ? 'red' : 'green'}`}>{b_di < 0.8 ? '< 0.8 is biased' : 'Acceptable'}</div>
            </div>
            <div className={`metric-card ${b_flips > 5 ? 'red' : 'green'}`}>
              <div className="metric-label">Counterfactual Flips</div>
              <div className="metric-value-row">
                <span className={`metric-value ${b_flips > 5 ? 'red' : 'green'}`}>{b_flips}%</span>
                {b_flips > 5 ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <CheckCircle className="metric-icon" style={{color:'#10b981'}} />}
              </div>
              <div className={`metric-note ${b_flips > 5 ? 'red' : 'green'}`}>{b_flips > 5 ? 'Highly unstable' : '< 5% is robust'}</div>
            </div>
          </div>

          {/* AI Insight Box (Baseline) */}
          {auditResults?.baseline?.explanation && (
            <div style={{
              background: aiBoxBg,
              border: `1px solid ${aiBoxBorder}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '18px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              transition: 'background 0.3s'
            }}>
              <Sparkles style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} size={18} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Analysis</div>
                <div style={{ fontSize: '13px', color: aiTextColor, lineHeight: 1.6, fontWeight: 500, transition: 'color 0.3s' }}>
                  {auditResults.baseline.explanation}
                </div>
              </div>
            </div>
          )}

          <div className="chart-box">
            <div className="chart-title">SHAP Feature Importance</div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={baselineData} layout="vertical" margin={{ top: 0, right: 0, left: 5, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10, fontWeight: 500}} width={85} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111', fontSize: '11px'}} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {baselineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === detectedSensitive ? '#ef4444' : '#1f2937'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mitigated Model */}
        <div className="dashboard-card border-green">
          <div className="dashboard-card-bar green"></div>
          <h2 className="card-title">
            <span className="card-dot green"></span>
            Mitigated Model
          </h2>
          
          <div className="score-wrapper">
            <div className="score-circle">
              <svg width="120" height="120" style={{transform: 'rotate(-90deg)'}}>
                <circle cx="60" cy="60" r="50" stroke="#f3f4f6" strokeWidth="8" fill="transparent" opacity={isDark ? 0.05 : 0.5} />
                <circle cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset={animatedMDash} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)'}} />
              </svg>
              <div className="score-text">
                <span className="score-number">{mitigatedFairness}%</span>
                <span className="score-label">Fairness</span>
              </div>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card green">
              <div className="metric-label">Disparate Impact</div>
              <div className="metric-value-row">
                <span className="metric-value green">{m_di}</span>
                <CheckCircle className="metric-icon" style={{color:'#10b981'}} />
              </div>
              <div className="metric-note green">Optimal range</div>
            </div>
            <div className="metric-card green">
              <div className="metric-label">Counterfactual Flips</div>
              <div className="metric-value-row">
                <span className="metric-value green">{m_flips}%</span>
                <CheckCircle className="metric-icon" style={{color:'#10b981'}} />
              </div>
              <div className="metric-note green">Robust decisions</div>
            </div>
          </div>

          {/* AI Insight Box (Mitigated) */}
          {auditResults?.mitigated?.explanation && (
            <div style={{
              background: aiBoxBg,
              border: `1px solid ${aiBoxBorder}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '18px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              transition: 'background 0.3s'
            }}>
              <Sparkles style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} size={18} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Verification</div>
                <div style={{ fontSize: '13px', color: aiTextColor, lineHeight: 1.6, fontWeight: 500, transition: 'color 0.3s' }}>
                  {auditResults.mitigated.explanation}
                </div>
              </div>
            </div>
          )}

          <div className="chart-box">
            <div className="chart-title">SHAP Feature Importance</div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={mitigatedData} layout="vertical" margin={{ top: 0, right: 0, left: 5, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10, fontWeight: 500}} width={85} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111', fontSize: '11px'}} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {mitigatedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === detectedSensitive ? '#10b981' : '#1f2937'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <FloatingChat context={{
        target: detectedTarget,
        sensitive: detectedSensitive,
        baseline: auditResults?.baseline,
        mitigated: auditResults?.mitigated
      }} />
    </>
  );
}
