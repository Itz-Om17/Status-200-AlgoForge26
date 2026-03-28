import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function HistoryLogs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchLogs() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'audits'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.timestamp ? data.timestamp.toDate().toISOString().split('T')[0] : 'Just now'
          };
        });
        setLogs(results);
      } catch (err) {
        console.error("Failed to fetch history logs", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [currentUser]);

  const cycleFilter = () => {
    const filters = ['all', 'passed', 'warning', 'failed'];
    const idx = filters.indexOf(statusFilter);
    setStatusFilter(filters[(idx + 1) % filters.length]);
  };

  const filtered = logs.filter(item => {
    const matchesSearch = 
      (item.modelName && item.modelName.toLowerCase().includes(search.toLowerCase())) ||
      (item.datasetName && item.datasetName.toLowerCase().includes(search.toLowerCase())) ||
      (item.sensitiveAttr && item.sensitiveAttr.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

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
        <button className="history-filter-btn" onClick={cycleFilter} style={{ textTransform: statusFilter !== 'all' ? 'capitalize' : 'none' }}>
          <Filter size={14} />
          <span>{statusFilter === 'all' ? 'Filter' : statusFilter}</span>
        </button>
      </div>

      {/* Table */}
      <div className="history-table-wrapper" style={{ minHeight: '300px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
            <p>Loading your audit history...</p>
          </div>
        ) : (
          <>
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
                    <span>{item.modelName}</span>
                  </div>
                </td>
                <td>{item.datasetName}</td>
                <td><span className="history-attr">{item.sensitiveAttr}</span></td>
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
            <Search size={32} style={{color:'#ccc', marginBottom: '16px'}} />
            <p>No audits found yet!</p>
          </div>
        )}
          </>
        )}
      </div>
    </>
  );
}
