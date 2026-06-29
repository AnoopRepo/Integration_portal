import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Plus, RefreshCw, BarChart2, ShieldCheck, Mail, Calendar, Search, Filter, Trash2, X, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

const Tickets = () => {
  const { user, token } = useAuth();

  // State Management
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation Tabs
  const defaultTab = user?.role === 'admin' ? 'all' : 'my-dept';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [statusTab, setStatusTab] = useState('Open'); // 'Open' or 'Closed'

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolvingTicket, setResolvingTicket] = useState(null);

  // Form Fields - Create Ticket
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDept, setTargetDept] = useState('IT Ops');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - Resolve Ticket
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingSubmit, setResolvingSubmit] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Fetch Tickets from API
  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || 'Failed to retrieve tickets.');
      }
    } catch (err) {
      setError('Network error - backend server is unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTickets();
    }
  }, [token]);

  // Handle Ticket Submission
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!title || !description) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          target_department: targetDept,
          priority
        })
      });

      if (response.ok) {
        setTitle('');
        setDescription('');
        setTargetDept('IT Ops');
        setPriority('Medium');
        setShowCreateModal(false);
        fetchTickets();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.detail || 'Could not log support ticket.');
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Ticket Resolution
  const handleResolveTicket = async (e) => {
    e.preventDefault();
    if (!resolutionNotes || !resolvingTicket) return;
    setResolvingSubmit(true);
    try {
      const response = await fetch(`${API_URL}/api/tickets/${resolvingTicket.id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resolution_notes: resolutionNotes
        })
      });

      if (response.ok) {
        setResolutionNotes('');
        setResolvingTicket(null);
        setSelectedTicket(null);
        fetchTickets();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.detail || 'Could not resolve support ticket.');
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setResolvingSubmit(false);
    }
  };

  // Handle Admin Delete Ticket
  const handleDeleteTicket = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this ticket? This action is irreversible.')) return;
    try {
      const response = await fetch(`${API_URL}/api/tickets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setSelectedTicket(null);
        fetchTickets();
      } else {
        alert('Failed to delete ticket.');
      }
    } catch (err) {
      alert('Network error occurred.');
    }
  };

  // Filtered lists
  const getFilteredTickets = () => {
    return tickets.filter(ticket => {
      const inMyDept = ticket.target_department.toLowerCase() === (user?.department || '').toLowerCase();
      const raisedByMe = ticket.user_id === user?.id;

      if (activeTab === 'my-dept' && !inMyDept) return false;
      if (activeTab === 'my-raised' && !raisedByMe) return false;

      if (statusTab === 'Open' && ticket.status !== 'Open') return false;
      if (statusTab === 'Closed' && ticket.status !== 'Closed') return false;

      if (priorityFilter !== 'All' && ticket.priority !== priorityFilter) return false;

      if (searchTerm) {
        const cleanSearch = searchTerm.toLowerCase();
        const matchesTitle = ticket.title.toLowerCase().includes(cleanSearch);
        const matchesDesc = ticket.description.toLowerCase().includes(cleanSearch);
        const matchesRaiser = ticket.user_name.toLowerCase().includes(cleanSearch);
        const matchesDept = ticket.target_department.toLowerCase().includes(cleanSearch);
        return matchesTitle || matchesDesc || matchesRaiser || matchesDept;
      }

      return true;
    });
  };

  const filteredTicketsList = getFilteredTickets();

  // Metrics Counters
  const countOpen = tickets.filter(t => t.status === 'Open').length;
  const countMyDept = tickets.filter(t => t.status === 'Open' && t.target_department.toLowerCase() === (user?.department || '').toLowerCase()).length;
  const countMyRaised = tickets.filter(t => t.status === 'Open' && t.user_id === user?.id).length;
  const countClosed = tickets.filter(t => t.status === 'Closed').length;

  // Render Priority Pill
  const renderPriorityBadge = (p) => {
    switch (p) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-error/15 text-brand-error border border-brand-error/25 shadow-sm animate-pulse flex items-center gap-1"><AlertOctagon size={8} /> Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-warning/15 text-brand-warning border border-brand-warning/20 flex items-center gap-1"><AlertTriangle size={8} /> High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center gap-1"><Info size={8} /> Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-success/15 text-brand-success border border-brand-success/20 flex items-center gap-1">🟢 Low</span>;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-primary/5 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-accent/5 rounded-full filter blur-[120px] pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <div className="relative max-w-7xl mx-auto z-10 space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary pb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1 font-mono">Workspace Helpdesk</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
              Support Tickets
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Raise operational issues or technical blockers, route them to target departments, and track resolutions.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTickets}
              className="flex items-center justify-center w-11 h-11 bg-bg-surface hover:bg-bg-surface-alt border border-border-primary rounded-xl transition-all cursor-pointer text-text-secondary shadow-sm"
              title="Refresh Queue"
            >
              <RefreshCw size={13} className="text-brand-primary" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Raise Support Ticket
            </button>
          </div>
        </div>

        {/* User Workspace Info Banner */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-primary flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-secondary shadow-sm">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-brand-success animate-ping"></span>
            <span>Employee: <strong className="text-text-primary">{user?.name}</strong></span>
            <span className="text-border-primary">|</span>
            <span>Department: <strong className="text-brand-primary">{user?.department || 'Unassigned'}</strong></span>
          </div>
          <span className="text-[10px] bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2.5 py-1 rounded-full uppercase font-bold tracking-wider self-start sm:self-auto font-mono">
            Role: {user?.role}
          </span>
        </div>

        {/* Support Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <p className="text-text-muted text-[9px] font-black uppercase tracking-widest font-mono">Active Tickets</p>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-brand-primary">{countOpen}</h3>
            <span className="text-[9px] text-text-muted">Total unresolved items</span>
            <div className="absolute right-4 bottom-4 text-2xl opacity-10">🎫</div>
          </div>
          
          <div className={`bg-bg-surface border rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all ${countMyDept > 0 ? 'border-brand-warning/30 bg-brand-warning/[0.02]' : 'border-border-primary'}`}>
            <p className="text-text-muted text-[9px] font-black uppercase tracking-widest font-mono">My Dept Queue</p>
            <h3 className={`text-2xl md:text-3xl font-extrabold mt-1 ${countMyDept > 0 ? 'text-brand-warning animate-pulse' : 'text-text-secondary'}`}>{countMyDept}</h3>
            <span className="text-[9px] text-text-muted">Assigned to your department</span>
            <div className="absolute right-4 bottom-4 text-2xl opacity-10">🏢</div>
          </div>

          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <p className="text-text-muted text-[9px] font-black uppercase tracking-widest font-mono">My Raised Tickets</p>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-brand-accent">{countMyRaised}</h3>
            <span className="text-[9px] text-text-muted">Pending issues logged by you</span>
            <div className="absolute right-4 bottom-4 text-2xl opacity-10">🙋‍♂️</div>
          </div>

          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <p className="text-text-muted text-[9px] font-black uppercase tracking-widest font-mono">Resolved Tickets</p>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-brand-success">{countClosed}</h3>
            <span className="text-[9px] text-text-muted">Issues resolved & closed</span>
            <div className="absolute right-4 bottom-4 text-2xl opacity-10">✅</div>
          </div>
        </div>

        {/* Search, Filter, Tab Navigation Row */}
        <div className="bg-bg-surface border border-border-primary rounded-3xl p-5 space-y-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Queue Categories */}
            <div className="flex flex-wrap gap-1 p-1 bg-bg-surface-alt rounded-2xl border border-border-primary self-start select-none">
              {user?.department && (
                <button
                  onClick={() => setActiveTab('my-dept')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                    activeTab === 'my-dept'
                      ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shadow-sm'
                      : 'bg-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  🏢 My Dept Queue
                </button>
              )}
              
              <button
                onClick={() => setActiveTab('my-raised')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                  activeTab === 'my-raised'
                    ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shadow-sm'
                    : 'bg-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                🙋‍♂️ Raised By Me
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                    activeTab === 'all'
                      ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shadow-sm'
                      : 'bg-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  🔑 All Corporate Queue
                </button>
              )}
            </div>

            {/* Open / Closed Status Filter */}
            <div className="flex items-center gap-1 bg-bg-surface-alt p-1 border border-border-primary rounded-xl self-start shadow-sm">
              {['Open', 'Closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusTab(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                    statusTab === s
                      ? 'bg-bg-surface text-brand-primary shadow-sm border border-border-primary/50'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {s === 'Open' ? `🟢 Open` : `✅ Closed`}
                </button>
              ))}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition shadow-sm"
                />
                <Search size={12} className="absolute left-3.5 top-2.5 text-text-muted" />
              </div>

              {/* Priority Select */}
              <div className="relative w-full sm:w-44">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none appearance-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-[8px] text-text-muted">▼</div>
              </div>
            </div>
          </div>

          {/* Ticket Listing Queue */}
          {loading ? (
            <div className="text-center py-20 bg-bg-surface-alt/25 border border-border-primary rounded-2xl shadow-sm">
              <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-secondary text-sm font-mono">Synchronizing helpdesk datastreams...</p>
            </div>
          ) : error ? (
            <div className="bg-brand-error/15 border border-brand-error/25 rounded-2xl p-8 text-center text-brand-error shadow-sm">
              <span className="text-3xl mb-3 block">⚠️</span>
              <p className="font-semibold">{error}</p>
              <button
                onClick={fetchTickets}
                className="mt-4 px-4 py-2 bg-brand-error hover:bg-brand-error/95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                Retry Stream
              </button>
            </div>
          ) : filteredTicketsList.length === 0 ? (
            <div className="text-center py-16 bg-bg-surface-alt/10 border border-border-primary rounded-2xl space-y-3 shadow-inner">
              <span className="text-3xl block">🏷️</span>
              <h4 className="font-extrabold text-sm text-text-secondary uppercase tracking-widest font-mono">No Tickets Found</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                There are no {statusTab.toLowerCase()} tickets matched inside this category. If you have an active blocker, raise a ticket to notify support staff.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTicketsList.map((ticket) => {
                const isMyDept = ticket.target_department.toLowerCase() === (user?.department || '').toLowerCase();
                const canHandle = ticket.status === 'Open' && (user?.role === 'admin' || isMyDept);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="bg-bg-surface border border-border-primary hover:border-border-hover hover:bg-bg-surface-alt p-5 rounded-2xl transition-all duration-200 relative overflow-hidden group shadow-sm cursor-pointer flex flex-col justify-between min-h-[170px]"
                  >
                    {ticket.status === 'Open' && ticket.priority === 'Critical' && (
                      <div className="absolute top-0 left-0 w-full h-[2.5px] bg-brand-error"></div>
                    )}
                    
                    <div className="space-y-3">
                      {/* Top Row: Meta info */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-md font-mono">
                          🎯 {ticket.target_department}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono">
                          {renderPriorityBadge(ticket.priority)}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1.5">
                        <h3 className="font-extrabold text-sm text-text-primary group-hover:text-brand-primary transition-colors line-clamp-1">
                          {ticket.title}
                        </h3>
                        <p className="text-text-secondary text-[11px] leading-relaxed line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Raiser Details & Actions */}
                    <div className="border-t border-border-primary/60 pt-3.5 mt-4 flex items-center justify-between text-[10px] text-text-muted font-mono">
                      <div>
                        <span>By <strong className="text-text-secondary font-semibold">{ticket.user_name}</strong></span>
                        <span className="mx-1.5">•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {canHandle ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResolvingTicket(ticket);
                          }}
                          className="px-3 py-1 bg-brand-warning/10 border border-brand-warning/20 hover:bg-brand-warning/20 hover:border-brand-warning/35 text-brand-warning rounded-lg font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer shadow-sm"
                        >
                          ⚡ Resolve
                        </button>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold border ${
                          ticket.status === 'Open' 
                            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 animate-pulse' 
                            : 'bg-brand-success/10 text-brand-success border-brand-success/20'
                        }`}>
                          {ticket.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-bg-surface border border-border-primary rounded-3xl shadow-xl overflow-hidden animate-fadeIn">
            <div className="h-1.5 bg-gradient-to-r from-brand-primary to-brand-accent"></div>
            
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-border-primary pb-3.5">
                <h3 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent">
                  Raise Support Ticket
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-lg bg-bg-surface-alt border border-border-primary hover:bg-border-primary hover:text-white flex items-center justify-center text-text-muted cursor-pointer transition text-xs"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 font-mono">Ticket Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Server down, VPN connectivity blocker..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm outline-none focus:border-brand-primary transition shadow-sm placeholder:text-text-muted"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 font-mono">Describe the Issue</label>
                  <textarea
                    required
                    rows="4"
                    placeholder="Please provide explicit details of the blocker or support request so target staff can reproduce and fix it..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-4 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm outline-none focus:border-brand-primary transition leading-relaxed placeholder:text-text-muted"
                  ></textarea>
                </div>

                {/* Grid row: Target Dept & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Target Department */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 font-mono">Target Department</label>
                    <div className="relative">
                      <select
                        value={targetDept}
                        onChange={(e) => setTargetDept(e.target.value)}
                        className="w-full pl-3 pr-8 py-3 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none appearance-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                      >
                        <option value="IT Ops">IT Ops</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Quality Assurance">Quality Assurance</option>
                        <option value="Customer Support">Customer Support</option>
                        <option value="Sales & Marketing">Sales & Marketing</option>
                        <option value="HR & Finance">HR & Finance</option>
                      </select>
                      <div className="absolute right-3 top-3.5 pointer-events-none text-[8px] text-text-muted">▼</div>
                    </div>
                  </div>

                  {/* Priority Select */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 font-mono">Severity / Priority</label>
                    <div className="relative">
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full pl-3 pr-8 py-3 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none appearance-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                      >
                        <option value="Low">Low (General Query)</option>
                        <option value="Medium">Medium (Standard Issue)</option>
                        <option value="High">High (High Blockage)</option>
                        <option value="Critical">Critical (System Blocker)</option>
                      </select>
                      <div className="absolute right-3 top-3.5 pointer-events-none text-[8px] text-text-muted">▼</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 border-t border-border-primary pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-bg-surface-alt border border-border-primary hover:bg-border-primary hover:text-white text-text-secondary hover:text-text-primary rounded-xl text-xs font-extrabold uppercase tracking-widest transition cursor-pointer shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {submitting ? 'Transmitting...' : 'Log Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TICKET DETAILS SIDE DRAWER */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-end z-40 animate-fadeIn">
          <div onClick={() => setSelectedTicket(null)} className="absolute inset-0 cursor-pointer"></div>
          
          <div className="relative w-full max-w-lg h-full bg-bg-surface border-l border-border-primary p-6 md:p-8 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl animate-slideRight">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border-primary pb-3.5">
                <div>
                  <span className="text-[8px] font-black uppercase text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 rounded-md font-mono">
                    Ticket details
                  </span>
                  <span className="text-[10px] text-text-muted ml-2 font-mono">{selectedTicket.id}</span>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 rounded-lg bg-bg-surface-alt border border-border-primary hover:bg-border-primary hover:text-white flex items-center justify-center text-text-muted cursor-pointer transition text-xs"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Status & Priority Row */}
              <div className="flex items-center gap-3 font-mono">
                <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider border ${
                  selectedTicket.status === 'Open'
                    ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 animate-pulse'
                    : 'bg-brand-success/15 text-brand-success border-brand-success/20'
                }`}>
                  {selectedTicket.status}
                </span>
                {renderPriorityBadge(selectedTicket.priority)}
                <span className="text-text-muted text-xs font-medium ml-auto">
                  Created {new Date(selectedTicket.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-3 bg-bg-surface-alt/30 border border-border-primary p-5 rounded-2xl leading-relaxed shadow-sm">
                <h2 className="text-md font-extrabold text-text-primary">{selectedTicket.title}</h2>
                <div className="text-xs text-text-secondary whitespace-pre-wrap font-medium leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Stakeholders Info Box */}
              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="p-4 rounded-xl bg-bg-surface-alt border border-border-primary space-y-1 shadow-sm">
                  <span className="text-[8px] font-black uppercase text-text-muted tracking-wider">Logged By</span>
                  <p className="font-bold text-xs text-text-primary truncate">{selectedTicket.user_name}</p>
                  <p className="text-[10px] text-text-secondary truncate">{selectedTicket.user_email}</p>
                </div>
                <div className="p-4 rounded-xl bg-bg-surface-alt border border-border-primary space-y-1 shadow-sm">
                  <span className="text-[8px] font-black uppercase text-text-muted tracking-wider">Target Dept</span>
                  <p className="font-bold text-xs text-brand-primary truncate">🏢 {selectedTicket.target_department}</p>
                  <p className="text-[9px] text-text-muted">Support Routing</p>
                </div>
              </div>

              {/* Resolution details if closed */}
              {selectedTicket.status === 'Closed' && (
                <div className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/20 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-brand-success/10 pb-2">
                    <ShieldCheck size={16} className="text-brand-success" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-brand-success font-mono">Resolution Log</h4>
                      <p className="text-[9px] text-text-muted font-mono">Resolved {new Date(selectedTicket.resolved_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div className="text-xs text-text-secondary leading-relaxed italic">
                      " {selectedTicket.resolution_notes} "
                    </div>
                    <div className="text-[10px] text-text-muted border-t border-brand-success/10 pt-2.5 font-mono">
                      Handled By: <strong className="text-text-secondary font-semibold">{selectedTicket.handled_by_name}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions for active ticket */}
            <div className="border-t border-border-primary pt-4 mt-8 flex flex-col gap-2.5">
              {selectedTicket.status === 'Open' && (selectedTicket.target_department.toLowerCase() === (user?.department || '').toLowerCase() || user?.role === 'admin') && (
                <button
                  onClick={() => setResolvingTicket(selectedTicket)}
                  className="w-full py-3.5 bg-brand-warning hover:bg-brand-warning/95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer text-center shadow-md animate-pulse"
                >
                  Handle &amp; Close Issue
                </button>
              )}

              {user?.role === 'admin' && (
                <button
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  className="w-full py-3 bg-brand-error/10 border border-brand-error/20 hover:bg-brand-error/20 text-brand-error rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-sm"
                >
                  Purge Ticket Record
                </button>
              )}

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-3.5 bg-bg-surface-alt border border-border-primary hover:bg-border-primary hover:text-white text-text-secondary hover:text-text-primary rounded-xl text-xs font-extrabold uppercase tracking-widest transition cursor-pointer shadow-sm"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE TICKET MODAL */}
      {resolvingTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-bg-surface border border-border-primary rounded-3xl shadow-xl overflow-hidden">
            <div className="h-1.5 bg-brand-warning"></div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-border-primary pb-3.5">
                <div>
                  <h3 className="text-md font-extrabold text-brand-warning">
                    Resolve Support Ticket
                  </h3>
                  <p className="text-[10px] text-text-muted mt-0.5 font-mono">Title: {resolvingTicket.title}</p>
                </div>
                <button
                  onClick={() => setResolvingTicket(null)}
                  className="w-8 h-8 rounded-lg bg-bg-surface-alt border border-border-primary hover:bg-border-primary hover:text-white flex items-center justify-center text-text-muted cursor-pointer transition text-xs"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleResolveTicket} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 font-mono">Resolution Notes</label>
                  <textarea
                    required
                    rows="4"
                    placeholder="Enter explicit remarks detailing how this issue was resolved/handled. These notes will be logged and visible to the raising employee..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full p-4 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm outline-none focus:border-brand-warning transition leading-relaxed placeholder:text-text-muted"
                  ></textarea>
                </div>

                <div className="flex gap-3 border-t border-border-primary pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setResolvingTicket(null)}
                    className="flex-1 py-3 bg-bg-surface-alt border border-border-primary hover:bg-border-primary hover:text-white text-text-secondary hover:text-text-primary rounded-xl text-xs font-extrabold uppercase tracking-widest transition cursor-pointer shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resolvingSubmit}
                    className="flex-1 py-3 bg-brand-warning hover:bg-brand-warning/95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {resolvingSubmit ? 'Filing Resolution...' : 'Resolve & Close'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
