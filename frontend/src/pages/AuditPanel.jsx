import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, DownloadCloud, ShieldCheck, Activity, Info, Database, Brain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import FloatingChat from '../components/FloatingChat';

const InfoTooltip = ({ title, description, position = "top" }) => (
  <div className="relative flex items-center group/tooltip ml-2" style={{ display: 'inline-flex' }}>
    <Info style={{ width: 14, height: 14, color: '#64748b', cursor: 'pointer' }} />
    <div className={`absolute ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 transform -translate-x-1/2 hidden group-hover/tooltip:block bg-[#0f172a] border border-[#334155] text-[#e2e8f0] text-xs rounded-xl shadow-2xl z-50`} style={{ padding: '12px', boxSizing: 'border-box', width: '256px' }}>
      <p className="font-bold text-[#818cf8] mb-1">{title}</p>
      <p style={{ lineHeight: 1.5 }}>{description}</p>
    </div>
  </div>
);

export default function AuditPanel() {
  const { state: navigationState } = useLocation();
  const navigate = useNavigate();

  const [localData, setLocalData] = useState(() => {
    if (navigationState?.auditResults) return navigationState;
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
  const modelUrl = localData?.modelUrl;
  const datasetUrl = localData?.datasetUrl;
  const detectedTarget = localData?.detectedTarget;
  const detectedSensitiveCols = localData?.detectedSensitiveCols || [];
  const detectedModelType = localData?.detectedModelType || 'classification';

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

  const isRegression = detectedModelType === 'regression';

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

      <h1 className="page-title" style={{marginBottom: 8}}>Fairness Audit Report</h1>
      
      <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(8px)', 
          borderRadius: '16px', padding: '24px', border: '1px solid rgba(51, 65, 85, 0.5)', 
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          marginBottom: '32px'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
          <div style={{padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px'}}>
            <Database style={{width: 32, height: 32, color: '#818cf8'}} />
          </div>
          <div>
            <h4 style={{color: '#fff', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center'}}>
              Analysis Source Data
              <span style={{
                marginLeft: '12px', fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '9999px',
                backgroundColor: isRegression ? 'rgba(245, 158, 11, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                color: isRegression ? '#fbbf24' : '#22d3ee'
              }}>
                {isRegression ? '📈 Regression' : '🏷️ Classification'}
              </span>
            </h4>
            <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>
              Validating predictive target: <span style={{color: '#818cf8', fontWeight: '600'}}>{detectedTarget}</span>
            </p>
          </div>
        </div>
        <div style={{display: 'flex', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', border: '1px solid rgba(51, 65, 85, 0.5)', padding: '12px', marginTop: '16px', gap: '24px'}}>
          <div style={{paddingRight: '24px', borderRight: '1px solid rgba(51, 65, 85, 0.5)'}}>
            <p style={{fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Model File</p>
            <p style={{fontSize: '14px', color: '#e2e8f0', fontWeight: '500'}}>{modelFileName}</p>
          </div>
          <div>
            <p style={{fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Dataset Mapping</p>
            <p style={{fontSize: '14px', color: '#e2e8f0', fontWeight: '500'}}>{datasetFileName}</p>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '48px'}}>
        {Object.entries(auditResults.individual_results || {}).map(([colName, colResult]) => {
          const baseline = colResult.baseline || {};
          const mitigated = colResult.mitigated || {};
          const isClustering = baseline.model_type === 'clustering' || detectedModelType === 'clustering';
          const colIsRegression = baseline.model_type === 'regression' || isRegression;

          const t1Value = isClustering ? (baseline.disparate_impact ?? 1.0) : colIsRegression ? (baseline.mpg_normalized ?? 1.0) : (baseline.disparate_impact ?? 1.0);
          const t1Label = isClustering ? 'Distribution Gap (TVD)' : colIsRegression ? 'Mean Prediction Gap' : 'Disparate Impact';
          const t1Tooltip = isClustering ? 'Total Variation Distance metric measuring disparity in cluster representation. Lower TVD = higher score (1.0 is perfect).' 
            : colIsRegression ? 'Compares the average predicted value between privileged and unprivileged groups. Score = 1 - |gap|/μ_privileged. Lower = more biased.'
            : 'Compares how often the AI approves people from different groups.';
          const t1IsBad = t1Value < 0.8;
          const t1Display = isClustering ? (baseline.disparate_impact ?? '1.0') : colIsRegression ? (baseline.mpg_normalized ?? '1.0') : (baseline.disparate_impact ?? '1.0');
          const t1BadLabel = isClustering ? '< 0.8 TVD parity suggests unequal clusters' : colIsRegression ? '< 0.8 indicates prediction gap' : '< 0.8 is biased';
          const t1GoodLabel = isClustering ? 'Equal cluster distribution' : colIsRegression ? 'Equitable predictions' : 'Acceptable';

          const t2Value = isClustering ? (baseline.counterfactual_flips ?? 0) : colIsRegression ? (baseline.counterfactual_pct_change ?? 0) : (baseline.counterfactual_flips ?? 0);
          const t2Label = isClustering ? 'Cluster Flip Probability' : colIsRegression ? 'Prediction Deviation' : 'Counterfactual Flips';
          const t2Tooltip = isClustering ? 'Measures how many people change clusters completely when their demographic attribute is flipped.'
            : colIsRegression ? 'Measures average % change in predicted value when the sensitive attribute is flipped. Higher = more sensitive to the attribute.'
            : 'The "What-If" test — measures how many predictions change when the sensitive attribute is flipped.';
          const t2IsBad = t2Value > 5;
          const t2Display = isClustering ? (baseline.counterfactual_flips ?? '0') : colIsRegression ? (baseline.counterfactual_pct_change ?? '0') : (baseline.counterfactual_flips ?? '0');
          const t2BadLabel = isClustering ? '> 5% suggests unstable clustering' : colIsRegression ? 'High sensitivity to attribute' : 'Highly unstable';
          const t2GoodLabel = '< 5% is robust';

          const mt1Display = isClustering ? (mitigated.disparate_impact ?? '1.0') : colIsRegression ? (mitigated.mpg_normalized ?? '1.0') : (mitigated.disparate_impact ?? '1.0');
          const mt2Display = isClustering ? (mitigated.counterfactual_flips ?? '0') : colIsRegression ? (mitigated.counterfactual_pct_change ?? '0') : (mitigated.counterfactual_flips ?? '0');

          const baselineData = baseline.shap_values || [];
          const mitigatedData = mitigated.shap_values || [];
          const baselineFairness = baseline.fairness_score || 0;
          const mitigatedFairness = mitigated.fairness_score || 0;

          return (
            <div key={colName} style={{borderBottom: '1px solid rgba(51, 65, 85, 0.5)', paddingBottom: '48px'}}>
              <h2 style={{fontSize: '30px', fontWeight: '900', color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center'}}>
                <span style={{color: '#6366f1', marginRight: '16px'}}>#</span> {colName} Audit
              </h2>

              {colIsRegression && baseline.group_means && Object.keys(baseline.group_means).length > 0 && (
                <div style={{backgroundColor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(51, 65, 85, 0.5)', marginBottom: '32px'}}>
                  <h4 style={{fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '16px', display: 'flex', alignItems: 'center'}}>
                    <Activity style={{width: 16, height: 16, marginRight: '8px', color: '#fbbf24'}} />
                    Group Mean Predictions
                    <InfoTooltip title="Group Means" description="Average predicted value for each demographic group. Large gaps indicate the model produces systematically different predictions for different groups." />
                  </h4>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px'}}>
                    {Object.entries(baseline.group_means).map(([group, mean]) => (
                      <div key={group} style={{backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '12px 20px', borderRadius: '12px', border: group === String(baseline.privileged_group) ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'}}>
                        <p style={{fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0}}>{group}</p>
                        <p style={{fontSize: '20px', fontWeight: 'bold', margin: '4px 0', color: group === String(baseline.privileged_group) ? '#34d399' : '#fbbf24'}}>
                          {typeof mean === 'number' ? mean.toLocaleString() : mean}
                        </p>
                        <p style={{fontSize: '10px', color: '#475569', margin: 0}}>
                          {group === String(baseline.privileged_group) ? 'Privileged' : 'Unprivileged'}
                        </p>
                      </div>
                    ))}
                    <div style={{backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.3)'}}>
                      <p style={{fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0}}>Absolute Gap</p>
                      <p style={{fontSize: '20px', fontWeight: 'bold', margin: '4px 0', color: '#fb7185'}}>
                        {typeof baseline.mean_prediction_gap === 'number' ? baseline.mean_prediction_gap.toLocaleString() : '0'}
                      </p>
                      <p style={{fontSize: '10px', color: '#475569', margin: 0}}>MPG</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="dashboard-grid">
                {/* Baseline Model */}
                <div className="dashboard-card">
                  <div className="dashboard-card-bar red"></div>
                  <h2 className="card-title">
                    <span className="card-dot red"></span>
                    Baseline Model <InfoTooltip position="bottom" title="Baseline Model" description={`How the original ${isClustering ? 'clustering' : colIsRegression ? 'regression' : 'classification'} model performs regarding ${colName}.`} />
                  </h2>
                  
                  <div className="score-wrapper">
                    <div className="score-circle">
                      <svg width="120" height="120" style={{transform: 'rotate(-90deg)'}}>
                        <circle cx="60" cy="60" r="50" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                        <circle cx="60" cy="60" r="50" stroke="#ef4444" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset={314 - ((314 * baselineFairness) / 100)} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1s ease-out'}} />
                      </svg>
                      <div className="score-text">
                        <span className="score-number">{baselineFairness}%</span>
                        <span className="score-label" style={{fontSize: '10px'}}>{isClustering ? 'Parity Score' : 'Fairness'}</span>
                      </div>
                    </div>
                  </div>

                  {baseline.explanation && (
                    <div style={{backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '16px', padding: '20px', marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'}}>
                      <div style={{padding: '8px', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px'}}>
                        <Info style={{width: 20, height: 20, color: '#818cf8', flexShrink: 0}} />
                      </div>
                      <p style={{fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', fontWeight: '500', margin: 0}}>
                        {baseline.explanation}
                      </p>
                    </div>
                  )}

                  <div className="metric-grid">
                    <div className={`metric-card ${t1IsBad ? 'red' : 'green'}`}>
                      <div className="metric-label" style={{display: 'flex', alignItems: 'center'}}>{t1Label} <InfoTooltip title={t1Label} description={t1Tooltip} /></div>
                      <div className="metric-value-row">
                        <span className={`metric-value ${t1IsBad ? 'red' : 'green'}`}>{t1Display}</span>
                        {t1IsBad ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <CheckCircle className="metric-icon" style={{color:'#10b981'}} />}
                      </div>
                      <div className={`metric-note ${t1IsBad ? 'red' : 'green'}`}>{t1IsBad ? t1BadLabel : t1GoodLabel}</div>
                    </div>
                    <div className={`metric-card ${t2IsBad ? 'red' : 'green'}`} style={{position: 'relative'}}>
                      <div className="metric-label" style={{display: 'flex', alignItems: 'center'}}>{t2Label} <InfoTooltip title={t2Label} description={t2Tooltip} /></div>
                      <div className="metric-value-row">
                        <span className={`metric-value ${t2IsBad ? 'red' : 'green'}`}>{t2Display}%</span>
                        {t2IsBad ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <CheckCircle className="metric-icon" style={{color:'#10b981'}} />}
                      </div>
                      <div className={`metric-note ${t2IsBad ? 'red' : 'green'}`} style={{marginTop: '8px'}}>{t2IsBad ? t2BadLabel : t2GoodLabel}</div>
                      {colIsRegression && baseline.counterfactual_avg_diff !== undefined && (
                        <div style={{marginTop: '12px'}}>
                          <p style={{fontSize: '11px', color: '#64748b', fontWeight: '500', backgroundColor: 'rgba(30, 41, 59, 0.5)', display: 'inline-block', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(51, 65, 85, 0.5)', margin: 0}}>
                            Abs diff: {typeof baseline.counterfactual_avg_diff === 'number' ? baseline.counterfactual_avg_diff.toLocaleString() : baseline.counterfactual_avg_diff}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(colIsRegression || isClustering) && (baseline.error_ratio !== undefined || baseline.worst_error_ratio !== undefined) && (
                    <div className={`metric-card ${(baseline.error_ratio || baseline.worst_error_ratio) < 0.8 ? 'red' : 'green'}`} style={{width: '100%', marginBottom: '32px'}}>
                      <div className="metric-label" style={{display: 'flex', alignItems: 'center'}}>
                        {isClustering ? 'Silhouette Parity (Fit Equity)' : 'MSE Parity (Error Fairness)'}
                        <InfoTooltip title={isClustering ? 'Silhouette Parity' : 'Error Fairness'} description={isClustering ? "Compares how well-fitted points are to their clusters across demographic groups. Lower ratio means one group forms much poorer clusters." : "Compares model prediction error (MSE) across groups. Ratio = min_MSE/max_MSE. If the model performs much worse for one group, this ratio drops below 0.8."} />
                      </div>
                      <div className="metric-value-row">
                        <span className={`metric-value ${(baseline.error_ratio || baseline.worst_error_ratio) < 0.8 ? 'red' : 'green'}`}>
                          {baseline.error_ratio ?? baseline.worst_error_ratio}
                        </span>
                        {(baseline.error_ratio || baseline.worst_error_ratio) < 0.8 ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <CheckCircle className="metric-icon" style={{color:'#10b981'}} />}
                      </div>
                    </div>
                  )}

                  <div className="chart-box">
                    <div className="chart-title">SHAP Feature Importance</div>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={baselineData} layout="vertical" margin={{ top: 0, right: 0, left: 5, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11, fontWeight: 500}} width={85} />
                        <Tooltip cursor={{fill: 'rgba(99, 102, 241, 0.08)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #6366f1', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)'}} labelStyle={{color: '#fff', fontWeight: 700, fontSize: '12px', marginBottom: '4px'}} itemStyle={{color: '#c7d2fe', fontSize: '11px', fontWeight: 500}} />
                        <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                          {baselineData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === colName ? '#ef4444' : '#6366f1'} />
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
                    Mitigated Model <InfoTooltip position="bottom" title="Mitigated Model" description={`How the de-biased ${isClustering ? 'clustering' : colIsRegression ? 'regression' : 'classification'} model performs regarding ${colName}.`} />
                  </h2>
                  
                  <div className="score-wrapper">
                    <div className="score-circle">
                      <svg width="120" height="120" style={{transform: 'rotate(-90deg)'}}>
                        <circle cx="60" cy="60" r="50" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                        <circle cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset={314 - ((314 * mitigatedFairness) / 100)} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1s ease-out'}} />
                      </svg>
                      <div className="score-text">
                        <span className="score-number">{mitigatedFairness}%</span>
                        <span className="score-label" style={{fontSize: '10px'}}>{isClustering ? 'Parity Score' : 'Fairness'}</span>
                      </div>
                    </div>
                  </div>

                  {mitigated.explanation && (
                    <div style={{backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '16px', padding: '20px', marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'}}>
                      <div style={{padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px'}}>
                        <Info style={{width: 20, height: 20, color: '#34d399', flexShrink: 0}} />
                      </div>
                      <p style={{fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', fontWeight: '500', margin: 0}}>
                        {mitigated.explanation}
                      </p>
                    </div>
                  )}

                  <div className="metric-grid">
                    <div className="metric-card green">
                      <div className="metric-label">{t1Label}</div>
                      <div className="metric-value-row">
                        <span className="metric-value green">{mt1Display}</span>
                        <CheckCircle className="metric-icon" style={{color:'#10b981'}} />
                      </div>
                      <div className="metric-note green">Optimal range</div>
                    </div>
                    <div className="metric-card green" style={{position: 'relative'}}>
                      <div className="metric-label">{t2Label}</div>
                      <div className="metric-value-row">
                        <span className="metric-value green">{mt2Display}%</span>
                        <CheckCircle className="metric-icon" style={{color:'#10b981'}} />
                      </div>
                      <div className="metric-note green" style={{marginTop: '8px'}}>Robust decisions</div>
                      {colIsRegression && mitigated.counterfactual_avg_diff !== undefined && (
                        <div style={{marginTop: '12px'}}>
                          <p style={{fontSize: '11px', color: '#64748b', fontWeight: '500', backgroundColor: 'rgba(30, 41, 59, 0.5)', display: 'inline-block', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', margin: 0}}>
                            Abs diff: {typeof mitigated.counterfactual_avg_diff === 'number' ? mitigated.counterfactual_avg_diff.toLocaleString() : mitigated.counterfactual_avg_diff}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="chart-box">
                    <div className="chart-title">SHAP Feature Importance</div>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={mitigatedData} layout="vertical" margin={{ top: 0, right: 0, left: 5, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11, fontWeight: 500}} width={85} />
                        <Tooltip cursor={{fill: 'rgba(16, 185, 129, 0.08)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #10b981', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)'}} labelStyle={{color: '#fff', fontWeight: 700, fontSize: '12px', marginBottom: '4px'}} itemStyle={{color: '#a7f3d0', fontSize: '11px', fontWeight: 500}} />
                        <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                          {mitigatedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === colName ? '#10b981' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>



                </div>
              </div>
            </div>
          );
        })}

        {/* OVERALL COMBINED REPORT */}
        <div style={{display: 'flex', justifyContent: 'center', marginTop: '32px'}}>
          <div style={{backgroundColor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(8px)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(51, 65, 85, 0.5)', width: '100%', maxWidth: '800px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
            <h3 style={{fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '32px', textAlign: 'center'}}>
              OVERALL COMBINED REPORT
            </h3>

            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '32px'}}>
              <div className="score-wrapper" style={{background: 'transparent', padding: 0}}>
                <div className="score-circle">
                  <svg width="260" height="260" style={{transform: 'rotate(-90deg)'}}>
                    <circle cx="130" cy="130" r="110" stroke="#1e293b" strokeWidth="14" fill="transparent" />
                    <circle cx="130" cy="130" r="110" stroke={(auditResults.combined_results?.overall_fairness_score || 0) < 70 ? '#ef4444' : '#6366f1'} strokeWidth="14" fill="transparent" strokeDasharray="691" strokeDashoffset={691 - ((691 * (auditResults.combined_results?.overall_fairness_score || 0)) / 100)} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1s ease-out'}} />
                  </svg>
                  <div className="score-text">
                    <span style={{fontSize: '56px', fontWeight: '900', color: '#fff'}}>{Math.round(auditResults.combined_results?.overall_fairness_score || 0)}%</span>
                    <span style={{fontSize: '15px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c7d2fe', marginTop: '4px'}}>
                      {detectedModelType === 'clustering' ? 'Overall Parity' : 'Overall Fairness'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {auditResults.combined_results?.explanation && (
              <div style={{backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', borderRadius: '16px', padding: '24px', marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'}}>
                <div style={{padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px'}}>
                  <Brain style={{width: 24, height: 24, color: '#818cf8', flexShrink: 0}} />
                </div>
                <div>
                  <h4 style={{fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.05em', marginBottom: '8px'}}>AI Executive Summary</h4>
                  <p style={{fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', fontWeight: '500', margin: 0}}>
                    {auditResults.combined_results.explanation}
                  </p>
                </div>
              </div>
            )}

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '16px'}}>
              {(() => {
                const comb = auditResults.combined_results || {};
                const cT1Val = isRegression ? (comb.worst_mpg_normalized ?? 1.0) : (comb.worst_disparate_impact ?? 1.0);
                const cT1Label = isRegression ? 'Worst MPG (Normalized)' : 'Worst Disparate Impact';
                const cT1Bad = cT1Val < 0.8;
                return (
                  <div className={`metric-card ${cT1Bad ? 'red' : 'indigo'}`}>
                    <div className="metric-label">{cT1Label}</div>
                    <div className="metric-value-row">
                      <span className={`metric-value ${cT1Bad ? 'red' : 'indigo'}`}>{cT1Val}</span>
                      {cT1Bad ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <ShieldCheck className="metric-icon" style={{color:'#6366f1'}} />}
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const comb = auditResults.combined_results || {};
                const cT2Val = isRegression ? (comb.max_counterfactual_pct_change ?? 0) : (comb.max_counterfactual_flips ?? 0);
                const cT2Label = isRegression ? 'Max Prediction Deviation' : 'Max Instability (Flips)';
                const cT2Bad = cT2Val > 5;
                return (
                  <div className={`metric-card ${cT2Bad ? 'red' : 'indigo'}`}>
                    <div className="metric-label">{cT2Label}</div>
                    <div className="metric-value-row">
                      <span className={`metric-value ${cT2Bad ? 'red' : 'indigo'}`}>{cT2Val}%</span>
                      {cT2Bad ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <ShieldCheck className="metric-icon" style={{color:'#6366f1'}} />}
                    </div>
                  </div>
                );
              })()}
            </div>

            {isRegression && auditResults.combined_results?.worst_error_ratio !== undefined && (
              <div className={`metric-card ${auditResults.combined_results.worst_error_ratio < 0.8 ? 'red' : 'indigo'}`} style={{width: '100%', marginBottom: '16px'}}>
                <div className="metric-label">Worst MSE Parity</div>
                <div className="metric-value-row">
                  <span className={`metric-value ${auditResults.combined_results.worst_error_ratio < 0.8 ? 'red' : 'indigo'}`}>
                    {auditResults.combined_results.worst_error_ratio}
                  </span>
                  {auditResults.combined_results.worst_error_ratio < 0.8 ? <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} /> : <ShieldCheck className="metric-icon" style={{color:'#6366f1'}} />}
                </div>
              </div>
            )}

            <div style={{backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '16px', textAlign: 'center'}}>
              <p style={{fontSize: '14px', color: '#94a3b8', marginBottom: '8px', margin: 0}}>Active Bias Detected?</p>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                {auditResults.combined_results?.is_any_biased ? (
                  <>
                    <AlertTriangle style={{width: 24, height: 24, color: '#ef4444', flexShrink: 0}} />
                    <span style={{fontSize: '18px', fontWeight: 'bold', color: '#ef4444'}}>YES - Mitigation Required</span>
                  </>
                ) : (
                  <>
                    <CheckCircle style={{width: 24, height: 24, color: '#10b981', flexShrink: 0}} />
                    <span style={{fontSize: '18px', fontWeight: 'bold', color: '#34d399'}}>Minor disparity observed, within acceptable range</span>
                  </>
                )}
              </div>
            </div>

            {/* Download Buttons — shown once below combined report */}
            <div style={{display: 'flex', gap: '16px', marginTop: '28px'}}>
              <button 
                onClick={() => handleSecureDownload(
                  `http://127.0.0.1:5000/api/download/data?data_file=${encodeURIComponent(datasetFileName)}&model_file=${encodeURIComponent(modelFileName)}&target_column=${encodeURIComponent(detectedTarget)}&sensitive_column=${encodeURIComponent(detectedSensitiveCols[0] || '')}&data_url=${encodeURIComponent(datasetUrl || '')}&model_url=${encodeURIComponent(modelUrl || '')}`,
                  `Mitigated_${datasetFileName}`,
                  "Exporting Mitigated Dataset...",
                  "Dataset Downloaded Successfully!"
                )}
                className="confirm-btn" 
                style={{flex: 1, backgroundColor: '#064e3b', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: '1px solid #059669', cursor: 'pointer', fontWeight: 600, fontSize: '14px'}}
              >
                <DownloadCloud size={18} />
                <span>Export Fair Dataset (.csv)</span>
              </button>
              <button 
                onClick={() => handleSecureDownload(
                  modelUrl || `http://127.0.0.1:5000/api/download/wrapper?model_file=${modelFileName}`,
                  "FairAI_Enterprise_Wrapper.zip",
                  "Packaging Enterprise Wrapper...",
                  "Wrapper Downloaded Successfully!"
                )}
                className="confirm-btn" 
                style={{flex: 1, backgroundColor: '#1e1b4b', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: '1px solid #7c3aed', cursor: 'pointer', fontWeight: 600, fontSize: '14px'}}
              >
                <DownloadCloud size={18} />
                <span>Deploy Model Wrapper (.zip)</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Floating AI Chat */}
      {(() => {
        const firstCol = detectedSensitiveCols[0];
        const firstResult = firstCol ? (auditResults.individual_results || {})[firstCol] : null;
        return (
          <FloatingChat context={{
            target: detectedTarget,
            sensitive: firstCol || 'Unknown',
            model_type: detectedModelType || 'classification',
            model_file: modelFileName || 'Unknown',
            dataset_file: datasetFileName || 'Unknown',
            baseline: firstResult?.baseline || {},
            mitigated: firstResult?.mitigated || {}
          }} />
        );
      })()}
    </>
  );
}
