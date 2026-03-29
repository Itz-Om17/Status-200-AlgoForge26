import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, FileText, CheckCircle, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function HistoryLogs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchLogs() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        console.log("[History] Fetching logs for user:", currentUser.uid);
        // Removing orderBy to prevent query failure if index is missing in new Firebase project
        const q = query(
          collection(db, 'audits'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        console.log("[History] Snapshot size:", snapshot.size);

        const results = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firestore timestamp to Date string
            date: data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now',
            // Store raw numeric timestamp for sorting
            _ts: data.timestamp ? data.timestamp.toMillis() : 0
          };
        });

        // Sort by timestamp descending in frontend
        results.sort((a, b) => b._ts - a._ts);

        setLogs(results);
      } catch (err) {
        console.error("[History] Failed to fetch history logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [currentUser]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const logToDelete = logs.find(l => l.id === deleteId);
      await deleteDoc(doc(db, 'audits', deleteId));

      // Optional: Cleanup Firebase Storage if URIs are present
      // if (logToDelete?.modelUrl) { /* deleteObject calls... */ }

      setLogs(prev => prev.filter(log => log.id !== deleteId));
      console.log("[History] Document deleted:", deleteId);
      setDeleteId(null);
    } catch (err) {
      console.error("[History] Failed to delete document:", err);
      alert("Failed to delete record: " + err.message);
    }
  };

  const handleRestore = (audit) => {
    if (!audit.auditResults) return;

    // If data is missing, the Modal's button is already disabled or hidden via conditional rendering
    const dashboardPayload = {
      auditResults: audit.auditResults,
      modelFileName: audit.modelName,
      datasetFileName: audit.datasetName,
      modelUrl: audit.modelUrl,
      datasetUrl: audit.datasetUrl,
      detectedTarget: audit.detectedTarget,
      detectedSensitiveCols: audit.detectedSensitiveCols,
      detectedModelType: audit.detectedModelType
    };

    // Update localStorage so refresh works
    localStorage.setItem('current_audit', JSON.stringify(dashboardPayload));

    // Navigate to dashboard with state
    navigate('/dashboard', { state: dashboardPayload });
  };

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
    if (status === 'passed') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
    if (status === 'warning') return <AlertTriangle size={14} style={{ color: '#f59e0b' }} />;
    return <AlertTriangle size={14} style={{ color: '#ef4444' }} />;
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
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedAudit(item)}
                    style={{ cursor: 'pointer' }}
                    className="history-row-hover"
                  >
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
                          <div className="history-score-fill" style={{ width: `${item.fairnessScore}%`, background: getScoreColor(item.fairnessScore) }}></div>
                        </div>
                        <span style={{ color: getScoreColor(item.fairnessScore), fontWeight: 700 }}>{item.fairnessScore}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={getStatusClass(item.status)}>
                        {getStatusIcon(item.status)}
                        <span>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(item.id);
                        }}
                        className="history-delete-btn"
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}
                        title="Delete log"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="history-empty">
                <Search size={32} style={{ color: '#ccc', marginBottom: '16px' }} />
                <p>No audits found yet!</p>
              </div>
            )}
          </>
        )}
      </div>

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
            <div style={{ color: '#ef4444', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <Trash2 size={48} />
            </div>
            <h2 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Delete Audit Log?</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
              Are you sure you want to delete this audit from your history? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAudit && (
        <div className="modal-overlay" onClick={() => setSelectedAudit(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#111',
            border: '1px solid #2a2a2a',
            borderRadius: '20px',
            padding: '0',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            animation: 'scaleIn 0.3s ease-out',
          }}>
            {/* Accent bar */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #fff, #999, #fff)' }} />

            <div style={{ padding: '28px 28px 24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                  <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.3px' }}>Audit Details</h2>
                  <p style={{ color: '#666', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} /> Saved on {selectedAudit.date}
                  </p>
                </div>
                <button onClick={() => setSelectedAudit(null)} style={{
                  background: '#1a1a1a', border: '1px solid #333', color: '#888', cursor: 'pointer',
                  fontSize: '14px', width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                }}>✕</button>
              </div>

              {/* Score + Status row */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                {/* Fairness donut */}
                <div style={{
                  flex: 1, background: '#161616', border: '1px solid #2a2a2a',
                  borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600 }}>Fairness Score</div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="40" cy="40" r="32" stroke="#222" strokeWidth="7" fill="transparent" />
                      <circle cx="40" cy="40" r="32" stroke={getScoreColor(selectedAudit.fairnessScore)} strokeWidth="7" fill="transparent"
                        strokeDasharray="201" strokeDashoffset={201 - ((201 * (selectedAudit.fairnessScore || 0)) / 100)} strokeLinecap="round" />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '20px', fontWeight: 800, color: getScoreColor(selectedAudit.fairnessScore) }}>
                      {selectedAudit.fairnessScore}%
                    </span>
                  </div>
                </div>

                {/* Status + Sensitive Attr */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    flex: 1, background: '#161616', border: '1px solid #2a2a2a',
                    borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                  }}>
                    <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>Status</div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700,
                      padding: '4px 10px', borderRadius: '6px', width: 'fit-content',
                      background: selectedAudit.status === 'passed' ? 'rgba(16, 185, 129, 0.15)' : selectedAudit.status === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: selectedAudit.status === 'passed' ? '#34d399' : selectedAudit.status === 'warning' ? '#fbbf24' : '#f87171',
                      border: `1px solid ${selectedAudit.status === 'passed' ? 'rgba(16, 185, 129, 0.3)' : selectedAudit.status === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}>
                      {getStatusIcon(selectedAudit.status)}
                      {selectedAudit.status.charAt(0).toUpperCase() + selectedAudit.status.slice(1)}
                    </span>
                  </div>
                  {selectedAudit.sensitiveAttr && (
                    <div style={{
                      flex: 1, background: '#161616', border: '1px solid #2a2a2a',
                      borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                    }}>
                      <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontWeight: 600 }}>Sensitive Attr</div>
                      <span style={{ color: '#eee', fontSize: '14px', fontWeight: 600 }}>{selectedAudit.sensitiveAttr}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Model & Data card */}
              <div style={{
                background: '#161616', border: '1px solid #2a2a2a',
                borderRadius: '16px', padding: '16px', marginBottom: '24px'
              }}>
                <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600 }}>Model & Dataset</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#eee', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  <div style={{ padding: '6px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', display: 'flex' }}>
                    <FileText size={14} color="#ccc" />
                  </div>
                  {selectedAudit.modelName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#999', fontSize: '13px' }}>
                  <div style={{ padding: '6px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', display: 'flex' }}>
                    <FileText size={14} color="#999" />
                  </div>
                  {selectedAudit.datasetName}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedAudit(null)}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '10px', background: '#1a1a1a',
                    color: '#ccc', border: '1px solid #333', fontWeight: 600, cursor: 'pointer',
                    fontSize: '14px', transition: 'all 0.2s'
                  }}
                >
                  Close
                </button>
                {selectedAudit.auditResults ? (
                  <button
                    onClick={() => handleRestore(selectedAudit)}
                    style={{
                      flex: 2, padding: '13px', borderRadius: '10px',
                      background: '#fff',
                      color: '#111', border: 'none', fontWeight: 600, cursor: 'pointer',
                      fontSize: '14px', boxShadow: '0 4px 15px rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <CheckCircle size={16} /> Reload Full Audit
                  </button>
                ) : (
                  <div style={{
                    flex: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 500, lineHeight: 1.3 }}>
                      Full audit data unavailable for this legacy record.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}