import React, { useState, useEffect } from 'react';
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
  Upload
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function App() {
  const [viewState, setViewState] = useState('upload'); // 'upload', 'analyzing', 'dashboard'
  const [modalStage, setModalStage] = useState('loading'); // 'loading', 'complete'
  const [modelFile, setModelFile] = useState(null);
  const [datasetFile, setDatasetFile] = useState(null);

  // Recharts Data mockups
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

  // Helper function to handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropModel = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setModelFile(e.dataTransfer.files[0].name);
    }
  };

  const handleDropDataset = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDatasetFile(e.dataTransfer.files[0].name);
    }
  };

  const handleAnalyzeClick = () => {
    setViewState('analyzing');
    setModalStage('loading');
    
    // Simulate 2-second processing
    setTimeout(() => {
      setModalStage('complete');
    }, 2000);
  };

  const handleConfirmAudit = () => {
    setViewState('dashboard');
  };

  const resetFlow = () => {
    setViewState('upload');
    setModelFile(null);
    setDatasetFile(null);
    setModalStage('loading');
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
                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${modelFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-800/80 cursor-pointer'}`}
                  >
                    {modelFile ? (
                       <>
                         <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                         <span className="text-lg font-medium text-emerald-400">{modelFile}</span>
                         <span className="text-sm text-slate-400 mt-2">Ready for analysis</span>
                       </>
                    ) : (
                       <>
                         <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
                         <span className="text-lg font-medium text-white">Upload Model</span>
                         <span className="text-sm text-slate-400 mt-2">Drag & drop your .pkl file</span>
                         <input type="file" className="hidden" id="model-upload" onChange={(e) => setModelFile(e.target.files[0]?.name)} accept=".pkl" />
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
                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${datasetFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-800/80 cursor-pointer'}`}
                  >
                     {datasetFile ? (
                       <>
                         <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                         <span className="text-lg font-medium text-emerald-400">{datasetFile}</span>
                         <span className="text-sm text-slate-400 mt-2">Data mapped successfully</span>
                       </>
                    ) : (
                       <>
                         <FileText className="w-12 h-12 text-slate-400 mb-4" />
                         <span className="text-lg font-medium text-white">Upload Dataset</span>
                         <span className="text-sm text-slate-400 mt-2">Drag & drop your .csv file</span>
                         <input type="file" className="hidden" id="dataset-upload" onChange={(e) => setDatasetFile(e.target.files[0]?.name)} accept=".csv" />
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
                           <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-md">Loan_Status</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                           <span className="text-slate-400">Sensitive Attribute Detected:</span>
                           <span className="font-semibold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-md">Gender</span>
                        </div>
                     </div>

                     <button 
                       onClick={handleConfirmAudit}
                       className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-colors"
                     >
                       <span>Confirm & Run Deep Audit</span>
                       <Play className="w-5 h-5" fill="currentColor" />
                     </button>
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* STATE 3: AUDIT DASHBOARD */}
          {viewState === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* ------------ BASELINE MODEL ------------ */}
              <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-600"></div>
                
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <span className="text-rose-400 mr-3">●</span> 
                  Baseline Model
                </h2>
                
                {/* Fairness Score Circle */}
                <div className="flex justify-center mb-10">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="70" className="stroke-current text-slate-700" strokeWidth="12" fill="transparent" />
                      <circle cx="80" cy="80" r="70" className="stroke-current text-rose-500" strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset="255" strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-black text-white">42%</span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fairness</span>
                    </div>
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-900/50 p-5 rounded-xl border border-rose-500/20">
                    <p className="text-sm text-slate-400 mb-1">Disparate Impact</p>
                    <div className="flex items-center space-x-2">
                       <h3 className="text-2xl font-bold text-rose-400">0.57</h3>
                       <AlertTriangle className="w-5 h-5 text-rose-500" />
                    </div>
                    <p className="text-xs text-rose-400/70 mt-2">&lt; 0.8 is biased</p>
                  </div>
                  <div className="bg-slate-900/50 p-5 rounded-xl border border-rose-500/20">
                    <p className="text-sm text-slate-400 mb-1">Counterfactual Flips</p>
                    <div className="flex items-center space-x-2">
                       <h3 className="text-2xl font-bold text-rose-400">15%</h3>
                       <AlertTriangle className="w-5 h-5 text-rose-500" />
                    </div>
                    <p className="text-xs text-rose-400/70 mt-2">Highly unstable</p>
                  </div>
                </div>

                {/* Explainability Chart */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 h-64">
                   <h3 className="text-sm font-medium text-slate-300 mb-4">SHAP Feature Importance</h3>
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={baselineData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 20 }}>
                       <XAxis type="number" hide />
                       <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} width={100} />
                       <Tooltip cursor={{fill: '#334155'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} />
                       <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                         {
                           baselineData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.name === 'Gender' ? '#ef4444' : '#6366f1'} />
                           ))
                         }
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>

              {/* ------------ MITIGATED MODEL ------------ */}
              <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <span className="text-emerald-400 mr-3">●</span> 
                  Mitigated Model
                </h2>
                
                {/* Fairness Score Circle */}
                <div className="flex justify-center mb-10">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="70" className="stroke-current text-slate-700" strokeWidth="12" fill="transparent" />
                      <circle cx="80" cy="80" r="70" className="stroke-current text-emerald-500" strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset="35" strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-black text-white">92%</span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fairness</span>
                    </div>
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-900/50 p-5 rounded-xl border border-emerald-500/20">
                    <p className="text-sm text-slate-400 mb-1">Disparate Impact</p>
                    <div className="flex items-center space-x-2">
                       <h3 className="text-2xl font-bold text-emerald-400">0.95</h3>
                       <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-emerald-400/70 mt-2">Optimal range</p>
                  </div>
                  <div className="bg-slate-900/50 p-5 rounded-xl border border-emerald-500/20">
                    <p className="text-sm text-slate-400 mb-1">Counterfactual Flips</p>
                    <div className="flex items-center space-x-2">
                       <h3 className="text-2xl font-bold text-emerald-400">1%</h3>
                       <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-emerald-400/70 mt-2">Robust decisions</p>
                  </div>
                </div>

                {/* Explainability Chart */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 h-64">
                   <h3 className="text-sm font-medium text-slate-300 mb-4">SHAP Feature Importance</h3>
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={mitigatedData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 20 }}>
                       <XAxis type="number" hide />
                       <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} width={100} />
                       <Tooltip cursor={{fill: '#334155'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} />
                       <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                         {
                           mitigatedData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.name === 'Gender' ? '#10b981' : '#6366f1'} />
                           ))
                         }
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
