import React, { useState } from 'react';
import {
  UploadCloud, FileText, CheckCircle, ChevronRight,
  Upload, Activity, Play
} from 'lucide-react';

export default function NewAnalysis() {
  const [viewState, setViewState] = useState('upload'); // 'upload', 'analyzing'
  const [modalStage, setModalStage] = useState('loading');
  const [modelFile, setModelFile] = useState(null);
  const [datasetFile, setDatasetFile] = useState(null);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const name = e.dataTransfer.files[0].name;
      if (name.endsWith('.pkl')) setModelFile(name);
      else if (name.endsWith('.csv')) setDatasetFile(name);
    }
  };

  const handleAnalyzeClick = () => {
    setViewState('analyzing');
    setModalStage('loading');
    setTimeout(() => setModalStage('complete'), 2000);
  };

  const handleConfirmAudit = () => {
    // Navigate would go to /dashboard, but for now just reset
    window.location.href = '/dashboard';
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
                  <div className="upload-sub-text" style={{marginBottom: 0}}>{modelFile} & {datasetFile}</div>
                </>
              ) : (
                <>
                  <div className="upload-icon-wrapper">
                    <UploadCloud />
                  </div>
                  <div className="upload-main-text">Choose A File Or Drag And Drop Your Choice</div>
                  <div className="upload-sub-text">Only Supports Uploading .pkl and .csv Files. Size Limit: 100 MB</div>
                  
                  <div className="browse-buttons">
                    <input type="file" id="model-upload" style={{display:'none'}} onChange={(e) => setModelFile(e.target.files[0]?.name)} accept=".pkl" />
                    <label htmlFor="model-upload" className="browse-btn">
                      <Upload size={13} />
                      <span>Browse Model (.pkl)</span>
                    </label>
                    <input type="file" id="dataset-upload" style={{display:'none'}} onChange={(e) => setDatasetFile(e.target.files[0]?.name)} accept=".csv" />
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
                    <span>{modelFile}</span>
                    <button className="file-remove-btn" onClick={() => setModelFile(null)}>✕</button>
                  </div>
                )}
                {datasetFile && (
                  <div className="file-status-item">
                    <CheckCircle />
                    <span>{datasetFile}</span>
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
            ) : (
              <>
                <div className="modal-result-icon">
                  <Activity />
                </div>
                <div className="modal-title">Semantic Engine Complete</div>
                <div className="modal-subtitle" style={{marginBottom: 20}}>Structural components safely mapped.</div>
                
                <div className="modal-info-box">
                  <div className="modal-info-row">
                    <span className="modal-info-label">Target Variable:</span>
                    <span className="modal-info-value neutral">Loan_Status</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="modal-info-label">Sensitive Attribute:</span>
                    <span className="modal-info-value danger">Gender</span>
                  </div>
                </div>

                <button onClick={handleConfirmAudit} className="confirm-btn">
                  <span>Confirm & Run Deep Audit</span>
                  <Play fill="currentColor" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
