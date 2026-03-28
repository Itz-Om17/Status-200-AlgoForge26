import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, DownloadCloud } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AuditPanel() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const auditResults = state?.auditResults;
  const modelFileName = state?.modelFileName;
  const datasetFileName = state?.datasetFileName;
  const detectedTarget = state?.detectedTarget;
  const detectedSensitive = state?.detectedSensitive;

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
                <circle cx="60" cy="60" r="50" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                <circle cx="60" cy="60" r="50" stroke="#ef4444" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset={314 - ((314 * baselineFairness) / 100)} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1s ease-out'}} />
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
        <div className="dashboard-card">
          <div className="dashboard-card-bar green"></div>
          <h2 className="card-title">
            <span className="card-dot green"></span>
            Mitigated Model
          </h2>
          
          <div className="score-wrapper">
            <div className="score-circle">
              <svg width="120" height="120" style={{transform: 'rotate(-90deg)'}}>
                <circle cx="60" cy="60" r="50" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                <circle cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset={314 - ((314 * mitigatedFairness) / 100)} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1s ease-out'}} />
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

          <div style={{display: 'flex', gap: '16px', marginTop: '24px'}}>
            <button 
              onClick={() => handleSecureDownload(
                `http://127.0.0.1:5000/api/download/data?data_file=${datasetFileName}&target_column=${detectedTarget}`,
                `Mitigated_${datasetFileName}`,
                "Exporting Mitigated Dataset...",
                "Dataset Downloaded Successfully!"
              )}
              className="confirm-btn" 
              style={{flex: 1, backgroundColor: '#064e3b', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: '1px solid #059669', cursor: 'pointer', fontWeight: 600}}
            >
              <DownloadCloud size={18} />
              <span>Export Fair Dataset (.csv)</span>
            </button>
            <button 
              onClick={() => handleSecureDownload(
                `http://127.0.0.1:5000/api/download/wrapper?model_file=${modelFileName}`,
                "FairAI_Enterprise_Wrapper.zip",
                "Packaging Enterprise Wrapper...",
                "Wrapper Downloaded Successfully!"
              )}
              className="confirm-btn" 
              style={{flex: 1, backgroundColor: '#1e1b4b', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: '1px solid #7c3aed', cursor: 'pointer', fontWeight: 600}}
            >
              <DownloadCloud size={18} />
              <span>Deploy Model Wrapper (.zip)</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
