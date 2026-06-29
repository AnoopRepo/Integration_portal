import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { RefreshCw, BarChart2, Clock, CheckCircle, AlertTriangle, Search, Filter, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { token, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // Accordion active state
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Fetch reports from backend
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to retrieve reports');
      }
      const data = await response.json();
      setReports(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load report metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token]);

  // Handle report deletion (Admin only)
  const handleDeleteReport = async (reportId, e) => {
    e.stopPropagation(); // Prevent accordion toggle
    if (!window.confirm('Are you sure you want to delete this status report? This action is irreversible.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      // Update state
      setReports(reports.filter(r => r.id !== reportId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleAccordion = (id) => {
    setExpandedReportId(expandedReportId === id ? null : id);
  };

  // Filtered reports calculation
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.today_task.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.problems && report.problems.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'All' || 
      report.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesDate = !dateFilter || report.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate Metrics
  const totalReports = filteredReports.length;
  const totalHours = filteredReports.reduce((acc, r) => acc + r.hours, 0);
  const avgCompletion = totalReports > 0 
    ? Math.round(filteredReports.reduce((acc, r) => acc + r.completion, 0) / totalReports) 
    : 0;
  const activeBlockers = filteredReports.filter(r => r.status.toLowerCase() === 'blocked' || r.status.toLowerCase().includes('block')).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      {/* Background Blurs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-primary/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-accent/5 rounded-full filter blur-[100px] pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <div className="relative max-w-7xl mx-auto z-10 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
              Work Analytics Dashboard
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {user?.role === 'admin' 
                ? 'Reviewing all workspace reports logged across the entire developer team.' 
                : 'Tracking your personal daily task submissions and progress logs.'}
            </p>
          </div>
          <button 
            onClick={fetchReports}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-bg-surface hover:bg-bg-surface-alt border border-border-primary rounded-xl transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer text-text-primary shadow-sm"
          >
            <RefreshCw size={13} className="text-brand-primary" />
            Refresh Logs
          </button>
        </div>

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Reports */}
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:border-border-hover transition-all">
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Total Reports</p>
              <h3 className="text-3xl font-extrabold mt-1">{totalReports} Logs</h3>
            </div>
            <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center border border-brand-accent/20 text-brand-accent">
              <BarChart2 size={24} />
            </div>
          </div>

          {/* Card 2: Total Hours */}
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:border-border-hover transition-all">
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Tracked Hours</p>
              <h3 className="text-3xl font-extrabold mt-1">{totalHours} Hrs</h3>
            </div>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center border border-brand-primary/20 text-brand-primary">
              <Clock size={24} />
            </div>
          </div>

          {/* Card 3: Avg Completion Rate */}
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-border-hover transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Avg Completion</p>
                <h3 className="text-3xl font-extrabold mt-1">{avgCompletion}%</h3>
              </div>
              <div className="w-12 h-12 bg-brand-success/10 rounded-xl flex items-center justify-center border border-brand-success/20 text-brand-success">
                <CheckCircle size={24} />
              </div>
            </div>
            <div className="w-full bg-bg-surface-alt rounded-full h-1 mt-4 border border-border-primary overflow-hidden">
              <div className="bg-gradient-to-r from-brand-primary to-brand-accent h-1 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${avgCompletion}%` }}></div>
            </div>
          </div>

          {/* Card 4: Active Blockers */}
          <div className={`bg-bg-surface border rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all hover:border-border-hover ${activeBlockers > 0 ? 'border-brand-error/30 bg-brand-error/[0.02]' : 'border-border-primary'}`}>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Active Blockers</p>
              <h3 className={`text-3xl font-extrabold mt-1 ${activeBlockers > 0 ? 'text-brand-error' : 'text-text-primary'}`}>{activeBlockers}</h3>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${activeBlockers > 0 ? 'bg-brand-error/10 border-brand-error/30 text-brand-error animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-brand-success/10 border-brand-success/20 text-brand-success'}`}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        {/* Analytics Trend Chart */}
        {filteredReports.length > 0 && (
          <div className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-6 shadow-sm hover:shadow-md transition-all animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-text-primary">Productivity Trend Analysis</h3>
                <p className="text-xs text-text-secondary mt-1">Comparing tracked hours and checklist completion percentages over your recent updates.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold select-none">
                <span className="flex items-center gap-1.5 text-brand-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
                  Completion %
                </span>
                <span className="flex items-center gap-1.5 text-brand-accent">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-accent"></span>
                  Tracked Hours
                </span>
              </div>
            </div>
            
            {/* SVG Trend Line Chart using Theme Custom Properties */}
            <div className="relative w-full h-64 md:h-80 select-none">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  {/* Gradients mapped to CSS variables */}
                  <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-primary-val)" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="var(--brand-primary-val)" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-accent-val)" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="var(--brand-accent-val)" stopOpacity="0"/>
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border-primary-val)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="var(--border-primary-val)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="500" y2="160" stroke="var(--border-primary-val)" strokeWidth="1" strokeDasharray="4 4" />

                {/* Render SVG Paths and areas */}
                {(() => {
                  const chartData = [...filteredReports].reverse().slice(-7);
                  if (chartData.length === 0) return null;

                  const widthStep = 500 / Math.max(chartData.length - 1, 1);
                  
                  // Map values to coordinates
                  const compPoints = chartData.map((d, idx) => ({
                    x: idx * widthStep,
                    y: 180 - (d.completion / 100) * 160
                  }));

                  const hoursPoints = chartData.map((d, idx) => ({
                    x: idx * widthStep,
                    y: 180 - (Math.min(d.hours, 12) / 12) * 160
                  }));

                  const compPath = compPoints.map(p => `${p.x},${p.y}`).join(" L ");
                  const hoursPath = hoursPoints.map(p => `${p.x},${p.y}`).join(" L ");

                  const compArea = `${compPoints[0].x},180 L ${compPath} L ${compPoints[compPoints.length - 1].x},180 Z`;
                  const hoursArea = `${hoursPoints[0].x},180 L ${hoursPath} L ${hoursPoints[hoursPoints.length - 1].x},180 Z`;

                  return (
                    <>
                      {/* Areas */}
                      <path d={`M ${compArea}`} fill="url(#compGradient)" />
                      <path d={`M ${hoursArea}`} fill="url(#hoursGradient)" />

                      {/* Lines */}
                      <path d={`M ${compPath}`} fill="none" stroke="var(--brand-primary-val)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d={`M ${hoursPath}`} fill="none" stroke="var(--brand-accent-val)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Points / Circles */}
                      {compPoints.map((p, i) => (
                        <g key={`c-${i}`} className="group cursor-pointer">
                          <circle cx={p.x} cy={p.y} r="4" fill="var(--brand-primary-val)" stroke="var(--bg-surface-val)" strokeWidth="2" />
                          <title>{`Completion: ${chartData[i].completion}% on ${chartData[i].date}`}</title>
                        </g>
                      ))}
                      {hoursPoints.map((p, i) => (
                        <g key={`h-${i}`} className="group cursor-pointer">
                          <circle cx={p.x} cy={p.y} r="4" fill="var(--brand-accent-val)" stroke="var(--bg-surface-val)" strokeWidth="2" />
                          <title>{`Tracked Time: ${chartData[i].hours} Hrs on ${chartData[i].date}`}</title>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
            
            {/* X-axis labels */}
            <div className="flex justify-between px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider select-none border-t border-border-primary pt-3">
              {(() => {
                const chartData = [...filteredReports].reverse().slice(-7);
                return chartData.map((d, i) => (
                  <span key={`lbl-${i}`} className="truncate max-w-[60px] md:max-w-[100px]">{d.date.slice(5)}</span>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Dashboard Filters Row */}
        <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
          {/* Search bar */}
          <div className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">Search Timeline</label>
            <div className="relative">
              <input
                type="text"
                placeholder={user?.role === 'admin' ? "Search developer, tasks..." : "Search completed tasks..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl focus:outline-none focus:border-brand-primary text-text-primary text-sm transition-all placeholder:text-text-muted"
              />
              <Search size={14} className="absolute left-3.5 top-3.5 text-text-muted" />
            </div>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">Filter by Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl focus:outline-none focus:border-brand-primary text-text-primary text-sm transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="On Track">🟢 On Track</option>
                <option value="Blocked">🔴 Blocked</option>
                <option value="Completed">🔵 Completed</option>
              </select>
              <Filter size={12} className="absolute right-3.5 top-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">Filter by Date</label>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-bg-surface-alt border border-border-primary rounded-xl focus:outline-none focus:border-brand-primary text-text-primary text-sm transition-all [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Timeline Reports Segment */}
        <div className="space-y-6">
          <h2 className="text-xl font-extrabold tracking-tight text-text-primary">Timeline Logs</h2>
          
          {loading ? (
            <div className="text-center py-20 bg-bg-surface border border-border-primary rounded-2xl shadow-sm">
              <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-secondary text-sm">Retrieving database metrics...</p>
            </div>
          ) : error ? (
            <div className="bg-brand-error/10 border border-brand-error/20 rounded-2xl p-8 text-center text-brand-error shadow-sm">
              <span className="text-3xl mb-4 block">❌</span>
              <p className="font-semibold">{error}</p>
              <button onClick={fetchReports} className="mt-4 px-4 py-2 bg-brand-error/25 border border-brand-error/35 rounded-xl text-sm font-medium hover:bg-brand-error/20 transition-all cursor-pointer">Try Again</button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-bg-surface border border-border-primary rounded-3xl py-20 px-8 text-center text-text-secondary shadow-sm relative overflow-hidden animate-fadeIn group">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 via-transparent to-brand-accent/5 pointer-events-none"></div>
              <div className="relative w-20 h-20 bg-bg-surface-alt rounded-2xl flex items-center justify-center border border-border-primary text-text-muted mx-auto mb-6 group-hover:scale-105 transition-transform duration-500">
                <BarChart2 size={36} className="text-brand-primary" />
              </div>
              <p className="font-extrabold text-xl text-text-primary tracking-tight">No status logs found</p>
              <p className="text-sm text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">No reports match your active filters or no daily logs have been submitted to the workspace repository.</p>
              <div className="mt-8">
                <Link 
                  to="/" 
                  className="inline-flex px-5 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-brand-primary/10 cursor-pointer"
                >
                  📝 Submit First Log
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const isExpanded = expandedReportId === report.id;
                const statusStyle = 
                  report.status.toLowerCase() === 'blocked' || report.status.toLowerCase().includes('block')
                    ? 'bg-brand-error/10 text-brand-error border-brand-error/20 shadow-sm'
                    : report.status.toLowerCase() === 'completed'
                      ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 shadow-sm'
                      : 'bg-brand-success/10 text-brand-success border-brand-success/20 shadow-sm';
                
                return (
                  <div 
                    key={report.id}
                    onClick={() => toggleAccordion(report.id)}
                    className={`border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shadow-sm ${
                      isExpanded 
                        ? 'bg-bg-surface border-brand-primary/45 scale-[1.002] shadow-md' 
                        : 'bg-bg-surface border-border-primary hover:bg-bg-surface-alt hover:border-border-hover'
                    }`}
                  >
                    {/* Collapsed Header Summary */}
                    <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center font-extrabold text-white uppercase border border-border-primary shadow-sm shrink-0">
                          {report.user_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-text-primary leading-tight">{report.user_name}</h4>
                            {user?.role === 'admin' && (
                              <span className="text-[9px] bg-bg-surface-alt text-text-secondary px-2 py-0.5 rounded border border-border-primary uppercase tracking-widest font-black">Staff</span>
                            )}
                          </div>
                          <p className="text-text-secondary text-xs mt-0.5 flex items-center gap-1.5">
                            <Calendar size={12} className="text-text-muted" />
                            {report.date}
                          </p>
                        </div>
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-3 gap-6 lg:gap-12 flex-1 lg:max-w-xl">
                        {/* Tracked Shift */}
                        <div>
                          <span className="text-text-secondary text-[9px] uppercase font-bold tracking-widest block">Hours Logged</span>
                          <span className="font-bold text-text-primary mt-1 text-sm block flex items-center gap-1">
                            ⏱️ {report.hours} Hrs
                          </span>
                        </div>

                        {/* Completion rate bar */}
                        <div>
                          <span className="text-text-secondary text-[9px] uppercase font-bold tracking-widest block">Completion</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-text-primary text-sm">{report.completion}%</span>
                            <div className="w-16 bg-bg-surface-alt h-1 border border-border-primary rounded-full overflow-hidden hidden sm:block">
                              <div className="bg-brand-primary h-1 rounded-full" style={{ width: `${report.completion}%` }}></div>
                            </div>
                          </div>
                        </div>

                        {/* Custom Status badge */}
                        <div className="self-center lg:self-auto">
                          <span className="text-text-secondary text-[9px] uppercase font-bold tracking-widest block mb-1">Status</span>
                          <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                            {report.status}
                          </span>
                        </div>
                      </div>

                      {/* Operations / Actions */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-border-primary pt-4 lg:pt-0">
                        {user?.role === 'admin' && (
                          <button
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            className="px-3 py-1.5 bg-brand-error/10 border border-brand-error/20 hover:bg-brand-error/20 rounded-xl text-brand-error transition-colors shadow-sm flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                            title="Purge record"
                          >
                            🗑️ Delete
                          </button>
                        )}
                        <span className={`w-8 h-8 rounded-full bg-bg-surface-alt border border-border-primary flex items-center justify-center transition-transform duration-200 text-xs ${isExpanded ? 'rotate-180 text-brand-primary border-brand-primary/20' : 'text-text-muted'}`}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Detailed Accordion slide-down */}
                    {isExpanded && (
                      <div className="border-t border-border-primary p-6 bg-bg-surface-alt/20 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        
                        {/* Tasks Completed Today */}
                        <div className="border-l-2 border-brand-success/50 pl-4 py-0.5 space-y-1">
                          <h5 className="font-black text-brand-success text-[10px] uppercase tracking-widest">Tasks Completed Today</h5>
                          <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">{report.today_task}</p>
                        </div>

                        {/* Plan for Tomorrow */}
                        <div className="border-l-2 border-brand-accent/50 pl-4 py-0.5 space-y-1">
                          <h5 className="font-black text-brand-accent text-[10px] uppercase tracking-widest">Plan for Tomorrow</h5>
                          <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">{report.next_day_task}</p>
                        </div>

                        {/* Challenges / Blockers */}
                        {report.problems && (
                          <div className="border-l-2 border-brand-error/50 pl-4 py-0.5 space-y-1">
                            <h5 className="font-black text-brand-error text-[10px] uppercase tracking-widest">Challenges & Blockers</h5>
                            <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">{report.problems}</p>
                          </div>
                        )}

                        {/* Achievements */}
                        {report.achievements && (
                          <div className="border-l-2 border-brand-warning/50 pl-4 py-0.5 space-y-1 md:col-span-2">
                            <h5 className="font-black text-brand-warning text-[10px] uppercase tracking-widest">Key Achievements</h5>
                            <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">{report.achievements}</p>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
