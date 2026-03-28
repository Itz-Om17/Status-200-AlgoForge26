import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UploadCloud,
  FileText,
  LayoutDashboard,
  History,
  Settings,
  CheckCircle,
  AlertTriangle,
  Play,
  ChevronRight,
  ShieldCheck,
  Activity,
  LogOut,
  RefreshCcw,
  Upload,
  Info,
  X,
  Database,
  Box
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const InfoTooltip = ({ title, description, position = "top" }) => (
  <div className="relative flex items-center group/tooltip ml-2">
    <Info className="w-5 h-5 text-slate-400 hover:text-indigo-400 cursor-help transition-colors z-10" />
    <div className={`absolute ${position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} left-1/2 -translate-x-1/2 w-[320px] p-5 bg-slate-800 text-sm text-slate-300 rounded-2xl border border-slate-600 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] pointer-events-none`}>
      <p className="font-bold text-white mb-2 text-base leading-tight">{title}</p>
      <p className="leading-relaxed opacity-90">{description}</p>
      {position === 'top' ? (
        <>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-[8px] border-t-slate-600 border-x-transparent border-b-transparent"></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-[7px] border-t-slate-800 border-x-transparent border-b-transparent"></div>
        </>
      ) : (
        <>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-[8px] border-b-slate-600 border-x-transparent border-t-transparent"></div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[2px] border-[7px] border-b-slate-800 border-x-transparent border-t-transparent"></div>
        </>
      )}
    </div>
  </div>
);

export default function App() {
  const [viewState, setViewState] = useState('upload'); // 'upload', 'analyzing', 'dashboard'
  const [modalStage, setModalStage] = useState('loading'); // 'loading', 'complete'
  const [modelFile, setModelFile] = useState(null);       // actual File object
  const [datasetFile, setDatasetFile] = useState(null);   // actual File object
  const [detectedTarget, setDetectedTarget] = useState('');
  const [detectedSensitiveCols, setDetectedSensitiveCols] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [auditParams, setAuditParams] = useState(null); // to hold model_file & data_file names
  const [auditResults, setAuditResults] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Recharts Data mockups
  const mitigatedData = [
    { name: 'Income', importance: 0.85 },
    { name: 'Credit_History', importance: 0.92 },
    { name: 'Target_Sensitive_Trait', importance: 0.05 },
    { name: 'Other_Trait', importance: 0.35 },
  ];

  // Helper function to handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropModel = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setModelFile(e.dataTransfer.files[0]);
    }
  };

  const handleDropDataset = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDatasetFile(e.dataTransfer.files[0]);
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
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { llm_detection, model_file, data_file, sample_data, columns_detected } = response.data;
      setDetectedTarget(llm_detection?.target_column || response.data.target_column || 'Unknown');
      setDetectedSensitiveCols(llm_detection?.sensitive_columns || response.data.sensitive_columns || []);
      setAuditParams({ model_file, data_file, sample_data, columns_detected });
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
      const resp = await axios.post('http://localhost:5000/api/audit', {
        model_file: auditParams.model_file,
        data_file: auditParams.data_file,
        target_column: detectedTarget,
        sensitive_columns: detectedSensitiveCols
      });
      setAuditResults(resp.data.results);
      setViewState('dashboard');
    } catch (err) {
      console.error(err);
      setApiError(err.response?.data?.error || err.message || 'Audit failed');
      setModalStage('complete'); // Ensure we stay in the modal to show the error
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
    setAuditParams(null);
    setAuditResults(null);
    setApiError(null);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FairAI</span>
          </div>
          
          <nav className="mt-6 px-4 space-y-2">
            <a href="#" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${viewState === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}>
              <LayoutDashboard size={20} />
              <span className="font-medium">Audit Panel</span>
            </a>
            <a href="#" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${viewState === 'upload' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Upload size={20} />
              <span className="font-medium">New Analysis</span>
            </a>
            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
              <History size={20} />
              <span className="font-medium">History Logs</span>
            </a>
            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </a>
          </nav>
        </div>
        
        <div className="p-6 border-t border-slate-800">
           <button className="flex items-center space-x-3 text-slate-400 hover:text-white transition-colors">
             <LogOut size={20} />
             <span className="font-medium">Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start overflow-y-auto relative p-8">
        
        {/* Header */}
        <header className="w-full max-w-6xl flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {viewState === 'upload' && "Model Analysis Setup"}
              {viewState === 'analyzing' && "Diagnostic Processing"}
              {viewState === 'dashboard' && "Fairness Audit Report"}
            </h1>
            <p className="text-slate-400 mt-1">
              Ensure equitable and unbiased AI decision making.
            </p>
          </div>
          {viewState === 'dashboard' && (
            <button onClick={resetFlow} className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700">
              <RefreshCcw size={16} />
              <span>New Audit</span>
            </button>
          )}
        </header>

        <div className="w-full max-w-6xl">
          {/* STATE 1: UPLOAD ZONE */}
          {viewState === 'upload' && (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-3xl p-10 mt-4 shadow-xl flex flex-col items-center">
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                  {/* Model Upload */}
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDropModel}
                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${modelFile ? 'border-emerald-500 bg-emerald-500/10 relative' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-800/80 cursor-pointer'}`}
                  >
                    {modelFile ? (
                       <>
                         <button onClick={(e) => { e.stopPropagation(); setModelFile(null); document.getElementById('model-upload').value = ''; }} className="absolute top-4 right-4 bg-slate-800/50  border border-slate-600 rounded-full p-2 hover:bg-rose-500/20 hover:border-rose-500 transition-colors z-50 group/btn">
                           <X className="w-5 h-5 text-slate-400 group-hover/btn:text-rose-400" />
                         </button>
                         <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                         <span className="text-lg font-medium text-emerald-400">{modelFile.name}</span>
                         <span className="text-sm text-slate-400 mt-2">Ready for analysis</span>
                       </>
                    ) : (
                       <>
                         <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
                         <span className="text-lg font-medium text-white">Upload Model</span>
                         <span className="text-sm text-slate-400 mt-2">Drag & drop your .pkl file</span>
                         <input type="file" className="hidden" id="model-upload" onChange={(e) => setModelFile(e.target.files[0] || null)} accept=".pkl" />
                         <label htmlFor="model-upload" className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white cursor-pointer transition-colors">
                           Browse Files
                         </label>
                       </>
                    )}
                  </div>

                  {/* Dataset Upload */}
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDropDataset}
                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${datasetFile ? 'border-emerald-500 bg-emerald-500/10 relative' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-800/80 cursor-pointer'}`}
                  >
                     {datasetFile ? (
                       <>
                         <button onClick={(e) => { e.stopPropagation(); setDatasetFile(null); document.getElementById('dataset-upload').value = ''; }} className="absolute top-4 right-4 bg-slate-800/50 border border-slate-600 rounded-full p-2 hover:bg-rose-500/20 hover:border-rose-500 transition-colors z-50 group/btn">
                           <X className="w-5 h-5 text-slate-400 group-hover/btn:text-rose-400" />
                         </button>
                         <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                         <span className="text-lg font-medium text-emerald-400">{datasetFile.name}</span>
                         <span className="text-sm text-slate-400 mt-2">Data mapped successfully</span>
                       </>
                    ) : (
                       <>
                         <FileText className="w-12 h-12 text-slate-400 mb-4" />
                         <span className="text-lg font-medium text-white">Upload Dataset</span>
                         <span className="text-sm text-slate-400 mt-2">Drag & drop your .csv file</span>
                         <input type="file" className="hidden" id="dataset-upload" onChange={(e) => setDatasetFile(e.target.files[0] || null)} accept=".csv" />
                         <label htmlFor="dataset-upload" className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white cursor-pointer transition-colors">
                           Browse Files
                         </label>
                       </>
                    )}
                  </div>
               </div>

               <button 
                 onClick={handleAnalyzeClick}
                 disabled={!modelFile || !datasetFile}
                 className={`mt-12 group flex items-center space-x-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all ${(!modelFile || !datasetFile) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'}`}
               >
                 <span>Analyze Dataset & Model</span>
                 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          )}

          {/* STATE 2: SMART DETECTION MODAL (Simulated analyzing state) */}
          {viewState === 'analyzing' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
               <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 w-[500px] flex flex-col items-center transform transition-all animate-in zoom-in-95 duration-300">
                 
                 {modalStage === 'loading' ? (
                   <div className="flex flex-col items-center py-10">
                     <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                     <h2 className="text-xl font-bold text-white tracking-wide">Scanning Architecture...</h2>
                     <div className="mt-4 space-y-2 w-full text-center">
                       <div className="h-2 bg-slate-700 rounded w-3/4 mx-auto animate-pulse"></div>
                       <div className="h-2 bg-slate-700 rounded w-1/2 mx-auto animate-pulse delay-75"></div>
                     </div>
                   </div>
                 ) : apiError ? (
                   <div className="flex flex-col items-center w-full">
                     <div className="bg-rose-600/20 p-4 rounded-full mb-4">
                       <AlertTriangle className="w-10 h-10 text-rose-400" />
                     </div>
                     <h2 className="text-2xl font-bold text-white mb-2">Analysis Failed</h2>
                     <p className="text-rose-400 text-center mb-8">{apiError}</p>
                     <button 
                       onClick={resetFlow}
                       className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                     >
                       Try Again
                     </button>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center w-full">
                     <div className="bg-indigo-600/20 p-4 rounded-full mb-4">
                       <Activity className="w-10 h-10 text-indigo-400" />
                     </div>
                     <h2 className="text-2xl font-bold text-white mb-2">FairAI Semantic Engine Complete</h2>
                     <p className="text-slate-400 text-center mb-8">Structural components safely mapped.</p>
                     
                     <div className="bg-slate-900 rounded-xl w-full p-6 space-y-4 mb-8 border border-slate-700">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                           <span className="text-slate-400">Target Variable Detected:</span>
                           <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-md">{detectedTarget}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3">
                           <span className="text-slate-400 whitespace-nowrap mr-4">Sensitive Attributes:</span>
                           <div className="flex flex-wrap gap-2 justify-end">
                             {detectedSensitiveCols.length > 0 ? detectedSensitiveCols.map((col) => (
                               <span key={col} className="font-semibold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-md text-sm">{col}</span>
                             )) : <span className="text-slate-500 italic">None Output</span>}
                           </div>
                        </div>
                     </div>

                     <button 
                       onClick={handleConfirmAudit}
                       disabled={isAuditing}
                       className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-colors ${isAuditing ? 'bg-indigo-400/80 cursor-not-allowed text-white/80' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                     >
                       <span>{isAuditing ? 'Running Deep Audit...' : 'Confirm & Run Deep Audit'}</span>
                       {!isAuditing && <Play className="w-5 h-5" fill="currentColor" />}
                       {isAuditing && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                     </button>
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* STATE 3: AUDIT DASHBOARD */}
          {viewState === 'dashboard' && auditResults && (
            <div className="w-full flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* NEW: Uploaded Files Preview Banner */}
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50 flex flex-col md:flex-row justify-between items-center shadow-lg mt-4">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <Database className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Analysis Source Data</h4>
                    <p className="text-slate-400 text-sm">Validating predictive target: <span className="text-indigo-400 font-semibold">{detectedTarget}</span></p>
                  </div>
                </div>
                
                <div className="flex bg-slate-900/50 rounded-xl border border-slate-700/50 p-3 divide-x divide-slate-700/50">
                  <div className="px-6 flex flex-col">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Model Container</span>
                    <span className="text-sm font-medium text-slate-300 flex items-center">
                      <Box className="w-4 h-4 mr-2 text-slate-400"/> {auditParams?.model_file || 'Unknown.pkl'}
                    </span>
                  </div>
                  <div className="px-6 flex flex-col">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Dataset Reference</span>
                    <span className="text-sm font-medium text-slate-300 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-slate-400"/> {auditParams?.data_file || 'Unknown.csv'}
                    </span>
                  </div>
                </div>
              </div>

              {/* NEW: Dataset Preview Table */}
              {auditParams?.sample_data && auditParams?.columns_detected && (
                <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg mt-4">
                   <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 mb-0 flex items-center justify-between">
                     <h4 className="text-slate-300 font-semibold text-sm flex items-center">
                       <FileText className="w-4 h-4 mr-2 text-slate-400" /> Dataset Sample (First 5 Rows)
                     </h4>
                     <span className="text-xs font-mono text-slate-500">{auditParams.columns_detected.length} columns total (Scroll to view all)</span>
                   </div>
                   <div className="overflow-x-auto custom-scrollbar pb-2">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-slate-900/40 text-slate-400 font-medium border-b border-slate-700/50">
                         <tr>
                           {auditParams.columns_detected.map(col => (
                             <th key={col} className={`px-6 py-3 font-semibold ${col === detectedTarget ? 'text-indigo-400' : ''} ${detectedSensitiveCols.includes(col) ? 'text-rose-400' : ''}`}>
                               {col}
                             </th>
                           ))}
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-700/50 text-slate-300">
                         {auditParams.sample_data.map((row, idx) => (
                           <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                             {auditParams.columns_detected.map(col => (
                               <td key={col} className={`px-6 py-3 ${col === detectedTarget ? 'bg-indigo-500/10 font-medium text-indigo-300' : ''} ${detectedSensitiveCols.includes(col) ? 'bg-rose-500/10 font-medium text-rose-300' : ''}`}>
                                 {String(row[col] ?? '')}
                               </td>
                             ))}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}

              {/* Loop over each sensitive column */}
              {Object.entries(auditResults.individual_results || {}).map(([colName, colResult]) => (
                <div key={colName} className="flex flex-col space-y-6 pb-12 border-b border-slate-700/50">
                  <h2 className="text-3xl font-black text-white px-2 mb-2 flex items-center">
                    <span className="text-indigo-500 mr-3">#</span> {colName} Audit
                  </h2>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
                    
                    {/* BASELINE MODEL FOR THIS COLUMN */}
                    <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 border border-slate-700 relative">
                      <div className="absolute top-0 left-0 w-full h-1 rounded-t-3xl bg-gradient-to-r from-rose-500 to-rose-600"></div>
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center relative z-50">
                        <span className="text-rose-400 mr-3">●</span> Baseline Model
                        <InfoTooltip position="bottom" title="Baseline Model" description={`How the original model performs regarding ${colName}.`} />
                      </h3>

                      {/* Fairness Circle */}
                      <div className="flex justify-center mb-10">
                        <div className="relative flex items-center justify-center">
                          <svg className="w-40 h-40 transform -rotate-90">
                            <circle cx="80" cy="80" r="70" className="stroke-current text-slate-700" strokeWidth="12" fill="transparent" />
                            <circle cx="80" cy="80" r="70" className="stroke-current text-rose-500 transition-all duration-1000 ease-out" strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset={440 - ((440 * (colResult?.fairness_score || 0)) / 100)} strokeLinecap="round" />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-white">{colResult.baseline?.fairness_score || 0}%</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fairness</span>
                          </div>
                        </div>
                      </div>

                      {/* NEW: AI Insight Box */}
                      {colResult.baseline?.explanation && (
                        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5 mb-8 flex items-start space-x-4 shadow-inner">
                          <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Info className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            {colResult.baseline.explanation}
                          </p>
                        </div>
                      )}

                      {/* Stat Cards */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className={`bg-slate-900/50 p-5 rounded-xl border ${(colResult.baseline?.disparate_impact || 1) < 0.8 ? 'border-rose-500/20' : 'border-emerald-500/20'}`}>
                          <p className="text-sm text-slate-400 mb-1">Disparate Impact <InfoTooltip title="Disparate Impact" description="Compares how often the AI approves people from different groups." /></p>
                          <div className="flex items-center space-x-2">
                            <h4 className={`text-2xl font-bold ${(colResult.baseline?.disparate_impact || 1) < 0.8 ? 'text-rose-400' : 'text-emerald-400'}`}>{colResult.baseline?.disparate_impact || '1.0'}</h4>
                            {(colResult.baseline?.disparate_impact || 1) < 0.8 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                          </div>
                          <p className={`text-xs mt-2 ${(colResult.baseline?.disparate_impact || 1) < 0.8 ? 'text-rose-400/70' : 'text-emerald-400/70'}`}>
                            {(colResult.baseline?.disparate_impact || 1) < 0.8 ? '< 0.8 is biased' : 'Acceptable'}
                          </p>
                        </div>
                        <div className={`bg-slate-900/50 p-5 rounded-xl border ${(colResult.baseline?.counterfactual_flips || 0) > 5 ? 'border-rose-500/20' : 'border-emerald-500/20'}`}>
                          <p className="text-sm text-slate-400 mb-1">Counterfactual Flips <InfoTooltip title="Counterfactual Flips" description='The "What-If" test.' /></p>
                          <div className="flex items-center space-x-2">
                             <h4 className={`text-2xl font-bold ${(colResult.baseline?.counterfactual_flips || 0) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{colResult.baseline?.counterfactual_flips || '0'}%</h4>
                             {(colResult.baseline?.counterfactual_flips || 0) > 5 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                          </div>
                          <p className={`text-xs mt-2 ${(colResult.baseline?.counterfactual_flips || 0) > 5 ? 'text-rose-400/70' : 'text-emerald-400/70'}`}>
                             {(colResult.baseline?.counterfactual_flips || 0) > 5 ? 'Highly unstable' : '< 5% is robust'}
                          </p>
                        </div>
                      </div>

                      {/* SHAP */}
                      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 h-64">
                         <p className="text-sm font-medium text-slate-300 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">SHAP Extracted Importance</p>
                         <ResponsiveContainer width="100%" height="80%">
                           <BarChart data={colResult.baseline?.shap_values || []} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 20 }}>
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} width={100} />
                             <Tooltip cursor={{fill: '#334155'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#cbd5e1'}} />
                             <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                               {
                                 (colResult.baseline?.shap_values || []).map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.name === colName ? '#ef4444' : '#6366f1'} />
                                 ))
                               }
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                      </div>
                    </div>

                    {/* MITIGATED MODEL FOR THIS COLUMN */}
                    <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 border border-slate-700 relative">
                      <div className="absolute top-0 left-0 w-full h-1 rounded-t-3xl bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center relative z-50">
                        <span className="text-emerald-400 mr-3">●</span> Mitigated Model
                        <InfoTooltip position="bottom" title="Mitigated Model" description={`How the mitigated model performs regarding ${colName}.`} />
                      </h3>
                      <div className="flex justify-center mb-10">
                        <div className="relative flex items-center justify-center">
                          <svg className="w-40 h-40 transform -rotate-90">
                            <circle cx="80" cy="80" r="70" className="stroke-current text-slate-700" strokeWidth="12" fill="transparent" />
                            <circle cx="80" cy="80" r="70" className="stroke-current text-emerald-500" strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset={440 - ((440 * 95) / 100)} strokeLinecap="round" />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-white">{colResult.mitigated?.fairness_score || 0}%</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fairness</span>
                          </div>
                        </div>
                      </div>

                      {/* NEW: AI Insight Box */}
                      {colResult.mitigated?.explanation && (
                        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5 mb-8 flex items-start space-x-4 shadow-inner">
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Info className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            {colResult.mitigated.explanation}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-900/50 p-5 rounded-xl border border-emerald-500/20">
                          <p className="text-sm text-slate-400 mb-1">Disparate Impact</p>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-2xl font-bold text-emerald-400">{colResult.mitigated?.disparate_impact || '1.0'}</h4>
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          </div>
                          <p className="text-xs text-emerald-400/70 mt-2">Optimal range</p>
                        </div>
                        <div className="bg-slate-900/50 p-5 rounded-xl border border-emerald-500/20">
                          <p className="text-sm text-slate-400 mb-1">Counterfactual Flips</p>
                          <div className="flex items-center space-x-2">
                             <h4 className="text-2xl font-bold text-emerald-400">{colResult.mitigated?.counterfactual_flips || '0'}%</h4>
                             <CheckCircle className="w-5 h-5 text-emerald-500" />
                          </div>
                          <p className="text-xs text-emerald-400/70 mt-2">Robust decisions</p>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 h-64">
                         <p className="text-sm font-medium text-slate-300 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">SHAP Extracted Importance</p>
                         <ResponsiveContainer width="100%" height="80%">
                           <BarChart data={colResult.mitigated?.shap_values || []} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 20 }}>
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} width={100} />
                             <Tooltip cursor={{fill: '#334155'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#cbd5e1'}} />
                             <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                               {
                                 (colResult.mitigated?.shap_values || []).map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={'#6366f1'} />
                                 ))
                               }
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                </div>
              ))}

              {/* OVERALL COMBINED REPORT */}
              <div className="flex justify-center mt-8">
                <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 border border-slate-700 relative w-full xl:w-1/2">
                  <div className="absolute top-0 left-0 w-full h-1 rounded-t-3xl bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center relative z-50">
                    <span className="text-indigo-400 mr-3">●</span> Final Combined Report
                    <InfoTooltip position="bottom" title="Overall Summary" description={`Maximum identified bias risks spanning: ${detectedSensitiveCols.join(', ')}.`} />
                  </h3>

                  <div className="flex justify-center mb-10">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-40 h-40 transform -rotate-90">
                        <circle cx="80" cy="80" r="70" className="stroke-current text-slate-700" strokeWidth="12" fill="transparent" />
                        <circle cx="80" cy="80" r="70" className={`stroke-current ${auditResults.combined_results?.overall_fairness_score < 70 ? 'text-rose-500' : 'text-indigo-500'} transition-all duration-1000 ease-out`} strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset={440 - ((440 * (auditResults.combined_results?.overall_fairness_score || 0)) / 100)} strokeLinecap="round" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-4xl font-black text-white">{auditResults.combined_results?.overall_fairness_score || 0}%</span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fairness</span>
                      </div>
                    </div>
                  </div>

                  {/* NEW: AI Executive Summary Box */}
                  {auditResults.combined_results?.explanation && (
                    <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 mb-8 flex items-start space-x-4 shadow-inner">
                      <div className="p-3 bg-indigo-500/10 rounded-xl">
                        <Activity className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-indigo-400 font-bold text-sm uppercase tracking-widest mb-1">AI Executive Summary</h5>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {auditResults.combined_results.explanation}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className={`bg-slate-900/50 p-5 rounded-xl border ${(auditResults.combined_results?.worst_disparate_impact || 1) < 0.8 ? 'border-rose-500/20' : 'border-indigo-500/20'}`}>
                      <p className="text-sm text-slate-400 mb-1">Worst Disparate Impact</p>
                      <div className="flex items-center space-x-2">
                         <h4 className={`text-2xl font-bold ${(auditResults.combined_results?.worst_disparate_impact || 1) < 0.8 ? 'text-rose-400' : 'text-indigo-400'}`}>{auditResults.combined_results?.worst_disparate_impact || '1.0'}</h4>
                         {(auditResults.combined_results?.worst_disparate_impact || 1) < 0.8 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <ShieldCheck className="w-5 h-5 text-indigo-500" />}
                      </div>
                    </div>
                    <div className={`bg-slate-900/50 p-5 rounded-xl border ${(auditResults.combined_results?.max_counterfactual_flips || 0) > 5 ? 'border-rose-500/20' : 'border-indigo-500/20'}`}>
                      <p className="text-sm text-slate-400 mb-1">Max Instability (Flips)</p>
                      <div className="flex items-center space-x-2">
                         <h4 className={`text-2xl font-bold ${(auditResults.combined_results?.max_counterfactual_flips || 0) > 5 ? 'text-rose-400' : 'text-indigo-400'}`}>{auditResults.combined_results?.max_counterfactual_flips || '0'}%</h4>
                         {(auditResults.combined_results?.max_counterfactual_flips || 0) > 5 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <ShieldCheck className="w-5 h-5 text-indigo-500" />}
                      </div>
                    </div>
                  </div>

                  <div className={`bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center w-full mt-4`}>
                    <p className="text-sm text-slate-400 mb-2">Active Bias Detected?</p>
                    <div className="flex items-center space-x-2">
                      {auditResults.combined_results?.is_any_biased ? (
                        <>
                          <AlertTriangle className="w-6 h-6 text-rose-500" />
                          <span className="text-xl font-bold text-rose-400">YES</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                          <span className="text-xl font-bold text-emerald-400">NO</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
