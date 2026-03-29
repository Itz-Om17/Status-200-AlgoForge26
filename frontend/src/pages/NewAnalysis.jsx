import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, CheckCircle, ChevronRight,
  Upload, Activity, Play, AlertTriangle
} from 'lucide-react';

export default function NewAnalysis() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState('upload'); // 'upload', 'analyzing'
  const [modalStage, setModalStage] = useState('loading');
  
  const [modelFile, setModelFile] = useState(null); // File object
  const [datasetFile, setDatasetFile] = useState(null); // File object
  
  const [detectedTarget, setDetectedTarget] = useState('');
  const [detectedSensitiveCols, setDetectedSensitiveCols] = useState([]);
  const [detectedModelType, setDetectedModelType] = useState('classification');
  const [modelTypeInfo, setModelTypeInfo] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [auditParams, setAuditParams] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.pkl')) setModelFile(file);
      else if (file.name.endsWith('.csv')) setDatasetFile(file);
    }
  };

  const handleAnalyzeClick = async () => {
    setViewState('analyzing');
    setModalStage('loading');
    setApiError(null);

    const formData = new FormData();
    formData.append('model_file', modelFile);
    formData.append('data_file', datasetFile);

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { llm_detection, model_file, data_file, sample_data, columns_detected, model_type, model_type_info } = response.data;
      setDetectedTarget(llm_detection?.target_column || response.data.target_column || 'Unknown');
      setDetectedSensitiveCols(llm_detection?.sensitive_columns || response.data.sensitive_columns || []);
      setDetectedModelType(model_type || 'classification');
      setModelTypeInfo(model_type_info || null);
      setAuditParams({ model_file, data_file, sample_data, columns_detected, model_type_info });
      setModalStage('complete');
    } catch (err) {
      console.error('Upload/Analysis failed:', err);
      setApiError(err.response?.data?.error || err.message || 'Something went wrong');
      setModalStage('complete');
    }
  };

  const handleConfirmAudit = async () => {
    setIsAuditing(true);
    setApiError(null);
    try {
      const resp = await axios.post('http://127.0.0.1:5000/api/audit', {
        model_file: auditParams.model_file,
        data_file: auditParams.data_file,
        target_column: detectedTarget,
        sensitive_columns: detectedSensitiveCols,
        model_type_info: auditParams.model_type_info
      });
      const dashboardPayload = { 
        auditResults: resp.data.results || resp.data.audit_results, 
        modelFileName: modelFile.name, 
        datasetFileName: datasetFile.name,
        detectedTarget,
        detectedSensitiveCols,
        detectedModelType: resp.data.model_type || detectedModelType
      };
      
      // Cache results so they persist when user navigates away and comes back
      localStorage.setItem('current_audit', JSON.stringify(dashboardPayload));

      // Pass the fully computed results natively to the Dashboard routing structure
      navigate('/dashboard', { state: dashboardPayload });
    } catch (err) {
      console.error(err);
      setApiError(err.response?.data?.error || err.message || 'Audit failed');
      setModalStage('complete');
    } finally {
      setIsAuditing(false);
    }
  };

  const resetFlow = () => {
    setViewState('upload');
    setModelFile(null);
    setDatasetFile(null);
    setModalStage('loading');
    setDetectedTarget('');
    setDetectedSensitiveCols([]);
    setDetectedModelType('classification');
    setModelTypeInfo(null);
    setAuditParams(null);
    setApiError(null);
    localStorage.removeItem('current_audit');
  };

  return (
    <>
      <h1 className="page-title">Model Analysis Setup</h1>

      {viewState === 'upload' && (
        <div className="fade-in">
          <div className="upload-section-header">
            <UploadCloud />
            <span>Upload File</span>
          </div>
          <p className="upload-section-subtitle">Select And Upload The File Of Your Choices.</p>

          <div className="upload-card">
            <div 
              className={`upload-dropzone ${(modelFile && datasetFile) ? 'has-files' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {(modelFile && datasetFile) ? (
                <>
                  <CheckCircle style={{width: 40, height: 40, color: '#10b981', marginBottom: 12}} />
                  <div className="upload-main-text">Files Ready</div>
                  <div className="upload-sub-text" style={{marginBottom: 0}}>{modelFile.name} & {datasetFile.name}</div>
                </>
              ) : (
                <>
                  <div className="upload-icon-wrapper">
                    <UploadCloud />
                  </div>
                  <div className="upload-main-text">Choose A File Or Drag And Drop Your Choice</div>
                  <div className="upload-sub-text">Only Supports Uploading .pkl and .csv Files. Size Limit: 100 MB</div>
                  
                  <div className="browse-buttons">
                    <input type="file" id="model-upload" style={{display:'none'}} onChange={(e) => setModelFile(e.target.files[0] || null)} accept=".pkl" />
                    <label htmlFor="model-upload" className="browse-btn">
                      <Upload size={13} />
                      <span>Browse Model (.pkl)</span>
                    </label>
                    <input type="file" id="dataset-upload" style={{display:'none'}} onChange={(e) => setDatasetFile(e.target.files[0] || null)} accept=".csv" />
                    <label htmlFor="dataset-upload" className="browse-btn">
                      <Upload size={13} />
                      <span>Browse Dataset (.csv)</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {(modelFile || datasetFile) && (
              <div className="file-status-row">
                {modelFile && (
                  <div className="file-status-item">
                    <CheckCircle />
                    <span>{modelFile.name}</span>
                    <button className="file-remove-btn" onClick={() => setModelFile(null)}>✕</button>
                  </div>
                )}
                {datasetFile && (
                  <div className="file-status-item">
                    <CheckCircle />
                    <span>{datasetFile.name}</span>
                    <button className="file-remove-btn" onClick={() => setDatasetFile(null)}>✕</button>
                  </div>
                )}
              </div>
            )}
          </div>



          <div className="analyze-btn-wrapper">
            <button 
              onClick={handleAnalyzeClick}
              disabled={!modelFile || !datasetFile}
              className={`analyze-btn ${(!modelFile || !datasetFile) ? 'disabled' : 'enabled'}`}
            >
              <span>Analyze Dataset & Model</span>
              <ChevronRight />
            </button>
          </div>


        </div>
      )}

      {viewState === 'analyzing' && (
        <div className="modal-overlay">
          <div className="modal-card">
            {modalStage === 'loading' ? (
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 0'}}>
                <div className="spinner"></div>
                <div className="modal-title">Scanning Architecture...</div>
                <div className="modal-subtitle">Analyzing model structure and data features</div>
                <div style={{width:'100%', marginTop: 16}}>
                  <div className="modal-bar w75 pulse-1" style={{margin:'0 auto'}}></div>
                  <div className="modal-bar w50 pulse-2" style={{margin:'6px auto 0'}}></div>
                </div>
              </div>
            ) : apiError ? (
               <div style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 0'}}>
                 <div className="modal-result-icon">
                   <AlertTriangle style={{color: '#ff4d4f'}} />
                 </div>
                 <h2 className="modal-title">Analysis Failed</h2>
                 <p className="modal-subtitle" style={{color: '#ff4d4f', marginBottom: 20}}>{apiError}</p>
                 <button onClick={resetFlow} className="confirm-btn">
                   <span>Try Again</span>
                 </button>
               </div>
            ) : (
              <>
                <div className="modal-result-icon">
                  <Activity />
                </div>
                <div className="modal-title">FairAI Semantic Engine Complete</div>
                <div className="modal-subtitle" style={{marginBottom: 20}}>Structural components safely mapped.</div>
                
                <div className="modal-info-box" style={{display: 'flex', flexDirection: 'column', gap: '0'}}>
                  <div className="modal-info-row" style={{borderBottom: '1px solid #334155', paddingBottom: '12px'}}>
                    <span className="modal-info-label" style={{display: 'flex', alignItems: 'center'}}>Model Type:</span>
                    <span className={`modal-info-value ${
                      detectedModelType === 'regression' ? 'text-amber-400 border border-amber-500/30 bg-amber-500/10' :
                      detectedModelType === 'clustering' ? 'text-fuchsia-400 border border-fuchsia-500/30 bg-fuchsia-500/10' :
                      'text-cyan-400 border border-cyan-500/30 bg-cyan-500/10'
                    }`} style={{padding: '4px 10px', borderRadius: '6px', fontSize: '13px'}}>
                      {detectedModelType === 'regression' ? '📈 Regression' : 
                       detectedModelType === 'clustering' ? '🧮 Clustering' : 
                       '🏷️ Classification'}
                    </span>
                  </div>
                  {modelTypeInfo && modelTypeInfo.reason && (
                    <div className="modal-info-row" style={{display: 'block', borderBottom: '1px solid #334155', paddingBottom: '12px', paddingTop: '12px'}}>
                      <p style={{fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: 0, lineHeight: '1.4'}}>{modelTypeInfo.reason}</p>
                      {modelTypeInfo.source && (
                        <span style={{fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginTop: '6px', display: 'inline-block'}}>
                          Source: {modelTypeInfo.source} • Confidence: {Math.round((modelTypeInfo.confidence || 0) * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                  <div className="modal-info-row" style={{paddingTop: '12px'}}>
                    <span className="modal-info-label">Target Variable:</span>
                    <span className="modal-info-value neutral">
                      {detectedModelType === 'clustering' ? 'N/A (Unsupervised)' : (detectedTarget || 'N/A')}
                    </span>
                  </div>
                  <div className="modal-info-row" style={{alignItems: 'flex-start', paddingTop: '12px', paddingBottom: '0'}}>
                    <span className="modal-info-label" style={{marginTop: '4px'}}>Sensitive Attributes:</span>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', flex: 1}}>
                      {detectedSensitiveCols.length > 0 ? detectedSensitiveCols.map((col) => (
                        <span key={col} className="modal-info-value danger" style={{margin: 0, padding: '2px 8px'}}>{col}</span>
                      )) : <span style={{color: '#64748b', fontStyle: 'italic', fontSize: '13px'}}>None Result</span>}
                    </div>
                  </div>
                </div>

                <button onClick={handleConfirmAudit} disabled={isAuditing} className="confirm-btn flex items-center justify-center gap-2">
                  <span>{isAuditing ? 'Running Deep Audit...' : 'Confirm & Run Deep Audit'}</span>
                  {!isAuditing && <Play fill="currentColor" />}
                  {isAuditing && <div className="spinner" style={{width: 16, height: 16, borderWidth: 2, marginBottom: 0}}></div>}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}