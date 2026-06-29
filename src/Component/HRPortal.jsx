import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Upload, Search, Mail, FileText, Check, Trash2, Calendar, Clipboard, User, Phone, CheckCircle, Clock } from 'lucide-react';

const HRPortal = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Manager tracking states
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [todayRollcall, setTodayRollcall] = useState(null);
  const [activeTab, setActiveTab] = useState('recruitment'); // 'recruitment', 'leave', or 'rollcall'
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRejectId, setSelectedRejectId] = useState(null);

  // Resume Scanner states
  const [scanFile, setScanFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');

  // Candidates list states
  const [candidates, setCandidates] = useState([]);
  const [searchCand, setSearchCand] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingCandId, setInvitingCandId] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null); // For transcript modal view
  const [copylinkIndex, setCopylinkIndex] = useState(null);
  const [customQuestions, setCustomQuestions] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { 'Authorization': `Bearer ${token}` };

      const requests = [
        fetch(`${API_URL}/api/leaves/pending`, { headers }),
        fetch(`${API_URL}/api/attendance/today`, { headers }),
        fetch(`${API_URL}/api/hr/candidates`, { headers })
      ];

      const [pendingRes, rollcallRes, candidatesRes] = await Promise.all(requests);

      if (pendingRes.ok) setPendingLeaves(await pendingRes.json());
      if (rollcallRes.ok) setTodayRollcall(await rollcallRes.json());
      if (candidatesRes.ok) setCandidates(await candidatesRes.json());

    } catch (err) {
      console.error(err);
      setError('Unable to synchronize HR management systems.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleApproveLeave = async (id) => {
    if (!window.confirm('Approve this leave request?')) return;
    try {
      const res = await fetch(`${API_URL}/api/leaves/${id}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('✅ Leave request approved.');
        fetchData();
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail}`);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRejectLeave = async (e) => {
    e.preventDefault();
    if (!rejectionReason) return;
    try {
      const res = await fetch(`${API_URL}/api/leaves/${selectedRejectId}/reject`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Rejected',
          rejection_reason: rejectionReason
        })
      });
      if (res.ok) {
        alert('❌ Leave request rejected.');
        setSelectedRejectId(null);
        setRejectionReason('');
        fetchData();
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail}`);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleScanResume = async (e) => {
    e.preventDefault();
    if (!scanFile) {
      setScanError('Please select a resume file first.');
      return;
    }

    setScanning(true);
    setScanResult(null);
    setScanError('');

    const steps = [
      'Extracting files and metadata structure...',
      'Running AI-based entity recognition parser...',
      'Mapping core skills and language structures...',
      'Synthesizing personalized diagnostic interview questions...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setScanStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const formData = new FormData();
    formData.append('file', scanFile);

    try {
      const res = await fetch(`${API_URL}/api/hr/scan-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setScanResult(data);
        // Save applicant to database
        const saveRes = await fetch(`${API_URL}/api/hr/candidates`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: data.candidate_name,
            email: data.email || 'candidate@domain.com',
            phone: data.phone || '+1-555-0100',
            experience_years: data.experience_years,
            role_applied: 'Software Engineer',
            skills: data.skills,
            questions: data.questions,
            questions_by_agent: data.questions_by_agent,
            resume_url: `https://workpulse.com/resumes/${data.filename}`,
            notes: `AI Parsed Resume. Skills: ${data.skills.join(', ')}`
          })
        });
        if (saveRes.ok) {
          const savedCandidate = await saveRes.json();
          setScanResult(prev => ({ ...prev, dbId: savedCandidate.id }));
          fetchData();
        }
      } else {
        setScanError(data.detail || 'Failed to scan resume.');
      }
    } catch (err) {
      setScanError('An unexpected server error occurred during scan.');
    } finally {
      setScanning(false);
    }
  };

  const handleInviteAI = async (e, candId, candEmail, candQuestions) => {
    e.preventDefault();
    if (!candEmail) {
      alert("Please specify a valid candidate email.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/hr/candidates/${candId}/invite-ai-interview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: candEmail,
          questions: candQuestions
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`🚀 AI Interview scheduled successfully!\nSimulated invitation email dispatched to ${candEmail}.\n\nCandidate Room Link: http://localhost:5173${data.meeting_link}`);
        setInvitingCandId(null);
        setInviteEmail('');
        setScanResult(null);
        setScanFile(null);
        fetchData();
      } else {
        alert(`Failed to schedule interview: ${data.detail}`);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCandidate = async (candId) => {
    if (!window.confirm("Are you sure you want to permanently delete this candidate dossier from the ledger?")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/hr/candidates/${candId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("🗑️ Candidate dossier successfully removed.");
        fetchData();
      } else {
        const data = await res.json();
        alert(`Failed to delete candidate: ${data.detail}`);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const copyRoomLink = (meetingLink, idx) => {
    const fullLink = `${window.location.origin}${meetingLink}`;
    navigator.clipboard.writeText(fullLink);
    setCopylinkIndex(idx);
    setTimeout(() => setCopylinkIndex(null), 2000);
  };

  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(searchCand.toLowerCase()) ||
    c.role_applied.toLowerCase().includes(searchCand.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      {/* Background blurs */}
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-brand-primary/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-brand-accent/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto z-10 space-y-10">
        
        {/* Header Block */}
        <div className="border-b border-border-primary pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1 font-mono">Human Resources Hub</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
              WorkPulse HR Portal
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Audit corporate recruitment pipelines, dispatch automated AI interview links, and manage rollcall parameters.
            </p>
          </div>
          
          <div className="bg-bg-surface-alt border border-border-primary rounded-2xl p-1 flex shrink-0 shadow-sm">
            {['recruitment', 'leave', 'rollcall'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === tab ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {tab === 'recruitment' ? 'Recruitment & AI' : tab === 'leave' ? `Approvals (${pendingLeaves.length})` : 'Live Rollcall'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-bg-surface border border-border-primary rounded-2xl shadow-sm">
            <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary text-sm">Syncing Portal Matrix...</p>
          </div>
        ) : error ? (
          <div className="bg-brand-error/10 border border-brand-error/20 rounded-2xl p-8 text-center text-brand-error shadow-sm animate-fadeIn">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-brand-error/25 border border-brand-error/35 rounded-xl text-sm font-medium hover:bg-brand-error/20 transition-all cursor-pointer">Retry Connection</button>
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* TAB 1: RECRUITMENT & AI INTERVIEW SYSTEMS */}
            {activeTab === 'recruitment' && (
              <div className="space-y-10">
                {/* Resume Scanner and AI invitation */}
                <div className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-primary/5 to-transparent rounded-full filter blur-3xl"></div>
                  
                  <div className="border-b border-border-primary pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary font-mono">AI Recruitment Suite</span>
                    <h2 className="text-xl font-extrabold text-text-primary mt-1">Smart Resume AI Scanner</h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Upload Resume form */}
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted font-mono">Upload Candidate Resume</label>
                      <form onSubmit={handleScanResume} className="space-y-4">
                        <div className="border-2 border-dashed border-border-primary hover:border-brand-primary/50 rounded-2xl p-8 text-center transition-all bg-bg-surface-alt/40 hover:bg-brand-primary/[0.01] flex flex-col items-center justify-center min-h-[220px] relative group cursor-pointer">
                          <input 
                            type="file" 
                            id="resume-file"
                            accept=".pdf,.docx,.txt"
                            onChange={(e) => setScanFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="w-14 h-14 rounded-full bg-bg-surface-alt group-hover:bg-brand-primary/10 flex items-center justify-center text-2xl mb-4 transition-all border border-border-primary group-hover:border-brand-primary/20 text-brand-primary shadow-sm">
                            <Upload size={20} />
                          </div>
                          <p className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                            {scanFile ? scanFile.name : 'Select or drag & drop resume file'}
                          </p>
                          <p className="text-[10px] text-text-muted mt-1 font-mono">Accepts PDF, DOCX, or TXT formats (Max 5MB)</p>
                        </div>

                        <button
                          type="submit"
                          disabled={scanning || !scanFile}
                          className="w-full bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-30 disabled:pointer-events-none text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                        >
                          {scanning ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              AI Processing: "{scanStep}"
                            </span>
                          ) : 'Scan Resume & Extract'}
                        </button>
                      </form>

                      {scanError && (
                        <div className="p-3 bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs rounded-xl text-center">
                          ⚠️ {scanError}
                        </div>
                      )}
                    </div>

                    {/* Right AI Questions and Invitation Suite */}
                    <div className="bg-bg-surface-alt/30 border border-border-primary rounded-2xl p-6 min-h-[300px] flex flex-col justify-center shadow-sm">
                      {!scanResult && !scanning && (
                        <div className="text-center py-10 space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary text-xl mx-auto"><FileText size={20} /></div>
                          <h4 className="font-bold text-text-primary">Candidate AI Scanner Ready</h4>
                          <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                            Upload an applicant's resume. The system will auto-parse skills, generate 5 tailored technical questions, and enable one-click automated AI Interview scheduling.
                          </p>
                        </div>
                      )}

                      {scanning && (
                        <div className="text-center py-10 space-y-4">
                          <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto"></div>
                          <p className="text-xs text-text-muted font-mono">Processing neural networks weights for candidate diagnostics...</p>
                        </div>
                      )}

                      {scanResult && !scanning && (
                        <div className="space-y-6">
                          <div className="border-b border-border-primary pb-4 flex justify-between items-start gap-4">
                            <div>
                              <h3 className="text-md font-bold text-text-primary leading-tight">{scanResult.candidate_name}</h3>
                              <p className="text-[10px] text-text-muted mt-0.5 font-mono">Parsed from: {scanResult.filename}</p>
                            </div>
                            <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full font-mono">
                              Exp: {scanResult.experience_years} Years
                            </span>
                          </div>

                          <div className="space-y-2">
                            <span className="block text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Extracted Skills Found</span>
                            <div className="flex flex-wrap gap-2">
                              {scanResult.skills.map((s, idx) => (
                                <span key={idx} className="px-2.5 py-0.5 bg-bg-surface-alt border border-border-primary rounded text-[10px] font-bold text-text-secondary uppercase">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* AI Interview invitation scheduler panel */}
                          <div className="p-4 bg-brand-primary/5 border border-brand-primary/15 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-brand-primary" />
                              <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary font-mono">Invite Candidate to AI Interview</h4>
                            </div>
                            <p className="text-[10px] text-text-secondary">An automated email will be sent to the candidate with their private interview link.</p>
                            
                            <form onSubmit={(e) => handleInviteAI(e, scanResult.dbId, inviteEmail, scanResult.questions)} className="space-y-3">
                              <div className="flex gap-2">
                                <input
                                  type="email"
                                  required
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                  placeholder="candidate.email@example.com"
                                  className="flex-1 px-3 py-2 bg-bg-surface border border-border-primary rounded-xl text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition shadow-sm"
                                />
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer shadow-sm"
                                >
                                  Invite
                                </button>
                              </div>
                            </form>
                          </div>

                          <div className="space-y-3">
                            <span className="block text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Tailored Questions (Synthesized)</span>
                            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                              {scanResult.questions.map((q, idx) => (
                                <div key={idx} className="p-2.5 bg-bg-surface border border-border-primary rounded-xl flex gap-2 items-start text-xs shadow-sm">
                                  <span className="w-4 h-4 bg-brand-primary/10 text-brand-primary text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 font-mono">{idx+1}</span>
                                  <p className="text-text-secondary leading-relaxed text-[11px]">{q}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Candidates Registry & Monitor Dashboard */}
                <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent font-mono">Recruitment Ledger</span>
                      <h2 className="text-xl font-bold text-text-primary mt-1">AI Interview Monitor &amp; Log</h2>
                    </div>
                    <div className="relative max-w-xs w-full">
                      <input
                        type="text"
                        placeholder="Search candidates..."
                        value={searchCand}
                        onChange={(e) => setSearchCand(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-bg-surface-alt border border-border-primary rounded-full text-xs text-text-primary placeholder-text-text-muted outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition shadow-sm"
                      />
                      <Search size={12} className="absolute left-3.5 top-2.5 text-text-muted" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-primary">
                          <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Candidate Name</th>
                          <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Skills Found</th>
                          <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Status</th>
                          <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">AI Score</th>
                          <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-primary/50">
                        {filteredCandidates.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-10 text-text-muted text-xs font-mono">No candidate dossiers found.</td>
                          </tr>
                        ) : (
                          filteredCandidates.map((c, idx) => (
                            <tr key={c.id || idx} className="hover:bg-bg-surface-alt/45 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-extrabold text-sm text-text-primary block">{c.name}</span>
                                <span className="text-[10px] text-text-muted font-mono block mt-0.5">{c.email || '—'} • Exp: {c.experience_years} Years</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {(c.skills || []).map((s, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-bg-surface-alt rounded text-[9px] font-semibold text-text-secondary uppercase border border-border-primary">{s}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                  c.status === "AI Completed" ? "bg-brand-success/10 text-brand-success border-brand-success/20" :
                                  c.status === "AI Invited" ? "bg-brand-warning/10 text-brand-warning border-brand-warning/20" :
                                  c.status === "Shortlisted" ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" :
                                  "bg-bg-surface-alt text-text-secondary border-border-primary"
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent">
                                  {c.score ? `${c.score}/100` : '—'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex justify-end gap-2 items-center">
                                  {c.status === 'Screened' && (
                                    <button 
                                      onClick={() => {
                                        setInvitingCandId(c.id);
                                        setInviteEmail(c.email || '');
                                        setCustomQuestions(c.questions || [
                                          "Explain your experience with standard software development tools.",
                                          "How do you ensure task completion under tight constraints?",
                                          "Discuss your background in modular application layouts.",
                                          "Explain how you handle error boundary cases in logic.",
                                          "What strategies do you use to ensure code quality?"
                                        ]);
                                      }}
                                      className="px-2.5 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 hover:border-brand-primary/30 text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-sm"
                                    >
                                      Invite AI
                                    </button>
                                  )}
                                  
                                  {c.status === 'AI Invited' && (
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => copyRoomLink(c.meeting_link, idx)}
                                        className="px-2.5 py-1.5 bg-brand-warning/10 hover:bg-brand-warning/20 text-brand-warning border border-brand-warning/20 hover:border-brand-warning/30 text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-sm"
                                      >
                                        {copylinkIndex === idx ? 'Copied! ✓' : 'Copy link'}
                                      </button>
                                      <a 
                                        href={c.meeting_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white border border-brand-primary/10 text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all inline-block no-underline shadow-sm"
                                      >
                                        Take Interview ➔
                                      </a>
                                    </div>
                                  )}

                                  {c.status === 'AI Completed' && (
                                    <button 
                                      onClick={() => setSelectedCandidate(c)}
                                      className="px-2.5 py-1.5 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/20 hover:border-brand-success/30 text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-sm"
                                    >
                                      Transcript
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteCandidate(c.id)}
                                    className="px-2.5 py-1.5 bg-brand-error/10 hover:bg-brand-error/20 text-brand-error border border-brand-error/20 hover:border-brand-error/30 text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all ml-2 shadow-sm"
                                    title="Permanently delete candidate log dossier"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Invite modal form */}
                  {invitingCandId && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                      <div className="relative w-full max-w-md bg-bg-surface border border-border-primary rounded-3xl p-6 space-y-5 shadow-xl">
                        <h3 className="text-md font-extrabold text-text-primary border-b border-border-primary pb-2.5">AI Interview Invitation Details</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Dispatch Candidate Email</label>
                            <input 
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <span className="block text-[9px] font-black uppercase tracking-widest text-text-secondary font-mono">Questions to ask (5 Selected)</span>
                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                              {customQuestions.map((q, i) => (
                                <div key={i} className="p-2.5 bg-bg-surface-alt rounded-xl text-[10px] text-text-secondary leading-relaxed border border-border-primary shadow-sm">
                                  {q}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end border-t border-border-primary pt-4">
                          <button onClick={() => setInvitingCandId(null)} className="px-3.5 py-2 bg-bg-surface-alt border border-border-primary text-text-secondary hover:text-text-primary rounded-xl text-[10px] font-bold uppercase transition shadow-sm">Cancel</button>
                          <button onClick={(e) => handleInviteAI(e, invitingCandId, inviteEmail, customQuestions)} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-[10px] font-bold uppercase transition shadow-md">Dispatch Link</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transcript Viewer Modal popup */}
                  {selectedCandidate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                      <div onClick={() => setSelectedCandidate(null)} className="absolute inset-0" />
                      <div className="relative w-full max-w-3xl bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
                        <div className="border-b border-border-primary pb-4 flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-brand-success font-mono">AI Grading &amp; Dialog Transcript</span>
                            <h2 className="text-2xl font-black text-text-primary mt-1">{selectedCandidate.name}</h2>
                            <p className="text-xs text-text-secondary font-mono mt-0.5">{selectedCandidate.email} • Role: {selectedCandidate.role_applied || 'Software Engineer'}</p>
                          </div>
                          <div className="text-center bg-brand-success/15 border border-brand-success/20 px-4 py-2.5 rounded-2xl shrink-0">
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block font-mono">Fit Score</span>
                            <span className="text-xl font-mono font-black text-brand-success block">{selectedCandidate.score}/100</span>
                          </div>
                        </div>

                        {/* AI Feedback notes */}
                        <div className="p-4 bg-bg-surface-alt border border-border-primary rounded-2xl space-y-2 shadow-sm">
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary font-mono">AI Assessment Summary</span>
                          <p className="text-xs text-text-primary leading-relaxed font-semibold">"{selectedCandidate.notes}"</p>
                        </div>

                        {/* Transcript stream */}
                        <div className="space-y-4">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-text-secondary font-mono">Dialogue Transcript Log</span>
                          
                          <div className="space-y-4">
                            {(selectedCandidate.ai_transcript || []).length === 0 ? (
                              <p className="text-text-muted text-xs italic font-mono">No dialogue logs available. Interactive room bypass occurred.</p>
                            ) : (
                              (selectedCandidate.ai_transcript || []).map((t, i) => (
                                <div key={i} className="space-y-2 border-b border-border-primary pb-4 last:border-0 last:pb-0">
                                  <div className="flex gap-2.5 items-start">
                                    <span className="w-5 h-5 bg-brand-primary/15 text-brand-primary text-[10px] font-black rounded-full flex items-center justify-center shrink-0 font-mono">Q</span>
                                    <p className="text-xs text-text-primary font-bold leading-relaxed">{t.question}</p>
                                  </div>
                                  <div className="flex gap-2.5 items-start pl-6">
                                    <span className="w-5 h-5 bg-brand-success/15 text-brand-success text-[10px] font-black rounded-full flex items-center justify-center shrink-0 font-mono">A</span>
                                    <div className="flex-1 space-y-3 bg-bg-surface-alt border border-border-primary rounded-xl p-3 shadow-sm">
                                      <p className="text-xs text-text-secondary leading-relaxed italic">"{t.answer}"</p>
                                      {t.audio_url && (
                                        <div className="pt-2 border-t border-border-primary flex items-center gap-2">
                                          <span className="text-[9px] text-text-muted uppercase font-black tracking-wider font-mono">Voice note:</span>
                                          <audio controls src={`${API_URL}${t.audio_url}`} className="h-7 w-full max-w-xs scale-90 origin-left opacity-80" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="border-t border-border-primary pt-4 text-right">
                          <button 
                            onClick={() => setSelectedCandidate(null)}
                            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition cursor-pointer shadow-md"
                          >
                            Close Dossier
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB 2: MANAGER LEAVE APPROVALS */}
            {activeTab === 'leave' && (
              <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="border-b border-border-primary pb-4 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary font-mono">Manager Console</span>
                    <h2 className="text-xl font-bold text-text-primary mt-1">Outstanding Leave Approvals</h2>
                  </div>
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest font-mono">{pendingLeaves.length} Pending</span>
                </div>

                <div className="space-y-4">
                  {pendingLeaves.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border-primary rounded-2xl bg-bg-surface-alt/30">
                      <p className="text-text-secondary text-xs font-mono">All outstanding team leave requests have been successfully audited.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingLeaves.map(p => (
                        <div key={p.id} className="p-5 bg-bg-surface border border-border-primary hover:border-border-hover rounded-2xl flex flex-col justify-between space-y-3 transition duration-200 shadow-sm">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[8px] font-black uppercase rounded border border-brand-primary/10 font-mono">{p.leave_type} Request</span>
                              <h4 className="font-bold text-sm text-text-primary mt-2">{p.employee_name}</h4>
                              <span className="text-[9px] font-bold text-text-muted block mt-0.5 font-mono">{p.employee_email} • {p.department}</span>
                            </div>
                            <span className="text-[10px] font-mono text-brand-primary font-bold bg-brand-primary/5 px-2.5 py-0.5 rounded border border-brand-primary/20">{p.duration_days} days</span>
                          </div>

                          <p className="text-[11px] text-text-secondary bg-bg-surface-alt/75 border border-border-primary rounded-xl p-3 italic leading-relaxed">
                            "{p.reason}"
                          </p>

                          <div className="text-[10px] text-text-muted flex justify-between items-center font-mono">
                            <span>Schedule: {new Date(p.start_date).toISOString().split('T')[0]} to {new Date(p.end_date).toISOString().split('T')[0]}</span>
                          </div>

                          <div className="border-t border-border-primary pt-3 flex justify-end gap-3">
                            {selectedRejectId === p.id ? (
                              <form onSubmit={handleRejectLeave} className="w-full flex gap-2">
                                <input 
                                  type="text" 
                                  required 
                                  placeholder="Specify rejection remarks..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-bg-surface border border-border-primary rounded-lg text-[10px] text-text-primary outline-none focus:border-brand-error focus:ring-1 focus:ring-brand-error/20 transition shadow-sm"
                                />
                                <button type="submit" className="px-3 py-1.5 bg-brand-error hover:bg-brand-error/95 text-white rounded-lg text-[10px] font-bold shadow-sm">Decline</button>
                                <button type="button" onClick={() => setSelectedRejectId(null)} className="px-2.5 py-1.5 bg-bg-surface-alt border border-border-primary text-text-secondary rounded-lg text-[10px] hover:text-text-primary transition">Cancel</button>
                              </form>
                            ) : (
                              <>
                                <button 
                                  onClick={() => { setSelectedRejectId(p.id); setRejectionReason(''); }}
                                  className="px-3 py-1.5 bg-brand-error/10 hover:bg-brand-error/20 text-brand-error border border-brand-error/10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                                >
                                  Decline
                                </button>
                                <button 
                                  onClick={() => handleApproveLeave(p.id)}
                                  className="px-3 py-1.5 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                                >
                                  Approve
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: LIVE TEAM ROLLCALL */}
            {activeTab === 'rollcall' && (
              <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="border-b border-border-primary pb-4 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary font-mono">Operations Console</span>
                    <h2 className="text-xl font-bold text-text-primary mt-1">Live Team Rollcall Registry</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-mono">Active Roster</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-primary">
                        <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Employee Details</th>
                        <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Department</th>
                        <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Check In</th>
                        <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Check Out</th>
                        <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Network Host</th>
                        <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/50">
                      {!todayRollcall?.records || todayRollcall.records.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-10 text-text-muted text-xs font-mono">No rollcall logs logged for today's shift roster.</td>
                        </tr>
                      ) : (
                        todayRollcall.records.map((r, idx) => {
                          const isLate = r.status?.toLowerCase() === 'late';
                          const isOut = r.checkout_time;
                          return (
                            <tr key={idx} className="hover:bg-bg-surface-alt/45 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-extrabold text-sm text-text-primary block">{r.employee_name}</span>
                                <span className="text-[10px] text-text-muted font-mono block mt-0.5">{r.employee_email}</span>
                              </td>
                              <td className="py-3 px-4 text-xs font-bold text-text-secondary uppercase">{r.department}</td>
                              <td className="py-3 px-4 text-xs font-mono font-bold text-text-secondary">{r.checkin_time}</td>
                              <td className="py-3 px-4 text-xs font-mono font-bold text-text-secondary">{r.checkout_time || '—'}</td>
                              <td className="py-3 px-4 text-[10px] text-text-muted font-mono">{r.ip_address}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                  isOut ? 'bg-bg-surface-alt text-text-secondary border-border-primary' :
                                  isLate ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20' : 
                                  'bg-brand-success/10 text-brand-success border-brand-success/20'
                                }`}>
                                  {isOut ? 'Checked Out' : r.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default HRPortal;
