import React, { useState } from 'react';
import { Search, Filter, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const mockHistory = [
  { id: 1, date: '2026-03-28', model: 'loan_predictor_v3.pkl', dataset: 'adult_census.csv', fairnessScore: 92, status: 'passed', sensitive: 'Gender' },
  { id: 2, date: '2026-03-25', model: 'hiring_model.pkl', dataset: 'hr_data.csv', fairnessScore: 67, status: 'warning', sensitive: 'Age' },
  { id: 3, date: '2026-03-22', model: 'credit_scorer_v2.pkl', dataset: 'german_credit.csv', fairnessScore: 42, status: 'failed', sensitive: 'Gender' },
  { id: 4, date: '2026-03-18', model: 'insurance_model.pkl', dataset: 'insurance_data.csv', fairnessScore: 88, status: 'passed', sensitive: 'Income' },
  { id: 5, date: '2026-03-15', model: 'recidivism_v1.pkl', dataset: 'compas_data.csv', fairnessScore: 35, status: 'failed', sensitive: 'Race' },
  { id: 6, date: '2026-03-10', model: 'loan_predictor_v2.pkl', dataset: 'lending_club.csv', fairnessScore: 78, status: 'warning', sensitive: 'Gender' },
];

export default function HistoryLogs() {
  const [search, setSearch] = useState('');

  const filtered = mockHistory.filter(item =>
    item.model.toLowerCase().includes(search.toLowerCase()) ||
    item.dataset.toLowerCase().includes(search.toLowerCase()) ||
    item.sensitive.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status) => {
    if (status === 'passed') return <CheckCircle size={14} style={{color:'#10b981'}} />;
    if (status === 'warning') return <AlertTriangle size={14} style={{color:'#f59e0b'}} />;
    return <AlertTriangle size={14} style={{color:'#ef4444'}} />;
  };

  const getStatusClass = (status) => {
    if (status === 'passed') return 'status-badge green';
    if (status === 'warning') return 'status-badge orange';
    return 'status-badge red';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <h1 className="page-title">History Logs</h1>
      <p className="page-subtitle">View all past fairness audits and their results.</p>

      {/* Search & Filter */}
      <div className="history-toolbar">
        <div className="history-search">
          <Search size={15} />
          <input 
            type="text" 
            placeholder="Search by model, dataset, or attribute..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="history-filter-btn">
          <Filter size={14} />
          <span>Filter</span>
        </button>
      </div>

      {/* Table */}
      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Model</th>
              <th>Dataset</th>
              <th>Sensitive Attr</th>
              <th>Fairness Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="history-date">
                    <Clock size={12} />
                    <span>{item.date}</span>
                  </div>
                </td>
                <td>
                  <div className="history-file">
                    <FileText size={13} />
                    <span>{item.model}</span>
                  </div>
                </td>
                <td>{item.dataset}</td>
                <td><span className="history-attr">{item.sensitive}</span></td>
                <td>
                  <div className="history-score">
                    <div className="history-score-bar">
                      <div className="history-score-fill" style={{width: `${item.fairnessScore}%`, background: getScoreColor(item.fairnessScore)}}></div>
                    </div>
                    <span style={{color: getScoreColor(item.fairnessScore), fontWeight: 700}}>{item.fairnessScore}%</span>
                  </div>
                </td>
                <td>
                  <span className={getStatusClass(item.status)}>
                    {getStatusIcon(item.status)}
                    <span>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="history-empty">
            <Search size={32} style={{color:'#ccc'}} />
            <p>No results found</p>
          </div>
        )}
      </div>
    </>
  );
}
