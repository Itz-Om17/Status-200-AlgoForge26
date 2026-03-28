import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AuditPanel() {
  const baselineData = [
    { name: 'Income', importance: 0.8 },
    { name: 'Credit_History', importance: 0.9 },
    { name: 'Gender', importance: 0.75 },
    { name: 'Age', importance: 0.4 },
  ];

  const mitigatedData = [
    { name: 'Income', importance: 0.85 },
    { name: 'Credit_History', importance: 0.92 },
    { name: 'Gender', importance: 0.05 },
    { name: 'Age', importance: 0.35 },
  ];

  return (
    <>
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
                <circle cx="60" cy="60" r="50" stroke="#ef4444" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset="182" strokeLinecap="round" />
              </svg>
              <div className="score-text">
                <span className="score-number">42%</span>
                <span className="score-label">Fairness</span>
              </div>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card red">
              <div className="metric-label">Disparate Impact</div>
              <div className="metric-value-row">
                <span className="metric-value red">0.57</span>
                <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} />
              </div>
              <div className="metric-note red">&lt; 0.8 is biased</div>
            </div>
            <div className="metric-card red">
              <div className="metric-label">Counterfactual Flips</div>
              <div className="metric-value-row">
                <span className="metric-value red">15%</span>
                <AlertTriangle className="metric-icon" style={{color:'#ef4444'}} />
              </div>
              <div className="metric-note red">Highly unstable</div>
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
                    <Cell key={`cell-${index}`} fill={entry.name === 'Gender' ? '#ef4444' : '#1f2937'} />
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
                <circle cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="314" strokeDashoffset="25" strokeLinecap="round" />
              </svg>
              <div className="score-text">
                <span className="score-number">92%</span>
                <span className="score-label">Fairness</span>
              </div>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card green">
              <div className="metric-label">Disparate Impact</div>
              <div className="metric-value-row">
                <span className="metric-value green">0.95</span>
                <CheckCircle className="metric-icon" style={{color:'#10b981'}} />
              </div>
              <div className="metric-note green">Optimal range</div>
            </div>
            <div className="metric-card green">
              <div className="metric-label">Counterfactual Flips</div>
              <div className="metric-value-row">
                <span className="metric-value green">1%</span>
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
                    <Cell key={`cell-${index}`} fill={entry.name === 'Gender' ? '#10b981' : '#1f2937'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
