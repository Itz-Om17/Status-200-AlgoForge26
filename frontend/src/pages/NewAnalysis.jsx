import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud, FileText, CheckCircle, ChevronRight,
  Upload, Activity, Play, AlertTriangle
} from 'lucide-react';

export default function NewAnalysis() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [viewState, setViewState] = useState('upload'); // 'upload', 'analyzing'
  const [modalStage, setModalStage] = useState('loading');
  
  const [modelFile, setModelFile] = useState(null); // File object
  const [datasetFile, setDatasetFile] = useState(null); // File object
  
  const [detectedTarget, setDetectedTarget] = useState('');
  const [detectedSensitive, setDetectedSensitive] = useState('');
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
      const { llm_detection, model_file, data_file } = response.data;
      setDetectedTarget(llm_detection?.target_column || response.data.target_column || 'Unknown');
      setDetectedSensitive(llm_detection?.sensitive_column || response.data.sensitive_column || 'Unknown');
      setAuditParams({ model_file, data_file });
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
        sensitive_column: detectedSensitive
      });
      const dashboardPayload = { 
        auditResults: resp.data.audit_results, 
        modelFileName: modelFile.name, 
        datasetFileName: datasetFile.name,
        detectedTarget,
        detectedSensitive
      };

      // Ensure history logging if currentUser exists
      if (currentUser) {
        try {
          const score = resp.data.audit_results.baseline.fairness_score;
          const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';
          await addDoc(collection(db, 'audits'), {
            userId: currentUser.uid,
            modelName: modelFile.name,
            datasetName: datasetFile.name,
            sensitiveAttr: detectedSensitive,
            fairnessScore: score,
            status: status,
            timestamp: serverTimestamp()
          });
        } catch (fbErr) {
          console.error("Failed to save audit history:", fbErr);
        }
      }
      
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
    setDetectedSensitive('');
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
                <>
                  <div className="upload-icon-wrapper">
                    <UploadCloud />
                  </div>
                  <div className="upload-main-text">Choose A File Or Drag And Drop Your Choice</div>
                  <div className="upload-sub-text">Only Supports Uploading .pkl and .csv Files. Size Limit: 100 MB</div>
                  
                  <div className="browse-buttons" style={{marginTop: (modelFile && datasetFile) ? '20px' : '0'}}>
                    <input type="file" id="model-upload" style={{display:'none'}} onChange={(e) => setModelFile(e.target.files[0] || null)} accept=".pkl" />
                    <label htmlFor="model-upload" className={`browse-btn ${modelFile ? 'uploaded' : ''}`}>
                      <div className="icon-box">
                        {modelFile ? <CheckCircle size={14} strokeWidth={3} /> : <Upload size={14} />}
                      </div>
                      <span>{modelFile ? "Model Selected (.pkl)" : "Browse Model (.pkl)"}</span>
                    </label>

                    <input type="file" id="dataset-upload" style={{display:'none'}} onChange={(e) => setDatasetFile(e.target.files[0] || null)} accept=".csv" />
                    <label htmlFor="dataset-upload" className={`browse-btn ${datasetFile ? 'uploaded' : ''}`}>
                      <div className="icon-box">
                        {datasetFile ? <CheckCircle size={14} strokeWidth={3} /> : <Upload size={14} />}
                      </div>
                      <span>{datasetFile ? "Dataset Selected (.csv)" : "Browse Dataset (.csv)"}</span>
                    </label>
                  </div>
                </>
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
                
                <div className="modal-info-box">
                  <div className="modal-info-row">
                    <span className="modal-info-label">Target Variable:</span>
                    <span className="modal-info-value neutral">{detectedTarget}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="modal-info-label">Sensitive Attribute:</span>
                    <span className="modal-info-value danger">{detectedSensitive}</span>
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
