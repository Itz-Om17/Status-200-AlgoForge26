import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, CheckCircle, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function HistoryLogs() {
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
                <Search size={32} style={{color:'#ccc', marginBottom: '16px'}} />
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
          <div className="modal-card" style={{ maxWidth: '450px', padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                 <h2 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>Audit Details</h2>
                 <p style={{ color: '#94a3b8', fontSize: '13px' }}>Saved on {selectedAudit.date}</p>
              </div>
              <button onClick={() => setSelectedAudit(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
               <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Model & Data</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}>
                    <FileText size={14} color="#818cf8" /> {selectedAudit.modelName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
                    <Clock size={14} /> {selectedAudit.datasetName}
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                     <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Fairness</div>
                     <div style={{ fontSize: '24px', fontWeight: 'bold', color: getScoreColor(selectedAudit.fairnessScore) }}>
                       {selectedAudit.fairnessScore}%
                     </div>
                  </div>
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                     <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Status</div>
                     <span className={getStatusClass(selectedAudit.status)} style={{ display: 'inline-flex', marginTop: '4px' }}>
                        {selectedAudit.status.toUpperCase()}
                     </span>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setSelectedAudit(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
              {selectedAudit.auditResults ? (
                <button 
                  onClick={() => handleRestore(selectedAudit)}
                  className="confirm-btn"
                  style={{ flex: 2, padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reload Full Audit
                </button>
              ) : (
                <div style={{ flex: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} color="#ef4444" />
                  <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 500, lineHeight: 1.2 }}>
                    Full audit data unavailable for this legacy record.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}