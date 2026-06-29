import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';

const DailyTasks = () => {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Pending');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Filters State
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing Task State
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editStatus, setEditStatus] = useState('Pending');

  // Role details
  const role = (user?.role || '').toLowerCase();
  const isPrivileged = role === 'administrator' || role === 'admin' || role === 'hr' || user?.is_super_admin;

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      // Build request query URL with date filter
      let url = `${API_URL}/api/daily-tasks`;
      const params = [];
      if (filterDate) {
        params.push(`date=${filterDate}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve daily tasks');
      }

      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to sync daily tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token, filterDate]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitLoading(true);
    const taskPayload = {
      title,
      description,
      date,
      priority,
      status
    };

    try {
      const response = await fetch(`${API_URL}/api/daily-tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskPayload)
      });

      if (response.ok) {
        setTitle('');
        setDescription('');
        setStatus('Pending');
        setPriority('Medium');
        // If the date matches filterDate, refresh
        if (date === filterDate) {
          fetchTasks();
        } else {
          // Change filter to show the created task
          setFilterDate(date);
        }
        alert('✅ Task created successfully!');
      } else {
        alert('❌ Failed to create task.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusChange = async (taskId, nextStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/daily-tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (response.ok) {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
      } else {
        alert('❌ Failed to update task status.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleStartEdit = (task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditStatus(task.status);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/daily-tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          status: editStatus
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updated } : t));
        setEditingTask(null);
        alert('✅ Task details saved!');
      } else {
        alert('❌ Failed to update task.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_URL}/api/daily-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== taskId));
      } else {
        alert('❌ Failed to delete task.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Get unique list of employees who have logged tasks today (for filter dropdown)
  const uniqueEmployees = Array.from(
    new Set(tasks.map(t => JSON.stringify({ id: t.employee_id, name: t.employee_name, email: t.employee_email })))
  ).map(str => JSON.parse(str));

  // Filter tasks locally based on search, employee, and priority filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesEmployee = employeeFilter === 'All' || task.employee_id === employeeFilter;
    const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;

    return matchesSearch && matchesEmployee && matchesPriority;
  });

  // Calculate swimlane metrics
  const totalTasksCount = filteredTasks.length;
  const pendingCount = filteredTasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = filteredTasks.filter(t => t.status === 'In Progress').length;
  const completedCount = filteredTasks.filter(t => t.status === 'Completed').length;
  const blockedCount = filteredTasks.filter(t => t.status === 'Blocked').length;

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'High': return 'bg-brand-error/10 text-brand-error border-brand-error/20';
      case 'Medium': return 'bg-brand-warning/10 text-brand-warning border-brand-warning/20';
      case 'Low': return 'bg-brand-accent/10 text-brand-accent border-brand-accent/20';
      default: return 'bg-bg-surface-alt text-text-muted border-border-primary';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Completed': return 'border-brand-success/30 text-brand-success bg-brand-success/5';
      case 'In Progress': return 'border-brand-accent/30 text-brand-accent bg-brand-accent/5';
      case 'Blocked': return 'border-brand-error/30 text-brand-error bg-brand-error/5';
      default: return 'border-border-primary text-text-secondary bg-bg-surface-alt';
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      {/* Background Blurs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-brand-primary/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-brand-accent/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto z-10 space-y-10">
        
        {/* Header */}
        <div className="border-b border-border-primary pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1 font-mono">
              {isPrivileged ? 'Managerial Task Ledger' : 'Employee Checklist Console'}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
              Daily Task Updates
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {isPrivileged 
                ? "Reviewing and auditing daily checklists submitted by users under your post's authority."
                : "Manage your daily work checklists, track active tasks, and log blocker escalations."}
            </p>
          </div>
          <button 
            onClick={fetchTasks}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-bg-surface-alt border border-border-primary hover:bg-bg-surface-alt/80 text-text-secondary hover:text-text-primary rounded-xl transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            🔄 Sync Ledger
          </button>
        </div>

        {/* Aggregate Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm">
            <span className="text-text-muted text-[9px] font-black uppercase tracking-widest block font-mono">Total Logged</span>
            <h3 className="text-2xl font-extrabold mt-1 text-text-primary">{totalTasksCount} Tasks</h3>
          </div>
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm">
            <span className="text-brand-success text-[9px] font-black uppercase tracking-widest block font-mono">Completed</span>
            <h3 className="text-2xl font-extrabold mt-1 text-brand-success">{completedCount}</h3>
          </div>
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm">
            <span className="text-brand-accent text-[9px] font-black uppercase tracking-widest block font-mono">In Progress</span>
            <h3 className="text-2xl font-extrabold mt-1 text-brand-accent">{inProgressCount}</h3>
          </div>
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm">
            <span className="text-brand-error text-[9px] font-black uppercase tracking-widest block font-mono">Blocked</span>
            <h3 className="text-2xl font-extrabold mt-1 text-brand-error">{blockedCount}</h3>
          </div>
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
            <span className="text-brand-warning text-[9px] font-black uppercase tracking-widest block font-mono">Pending</span>
            <h3 className="text-2xl font-extrabold mt-1 text-brand-warning">{pendingCount}</h3>
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Add Daily Task Form */}
          <div className="lg:col-span-1 space-y-6">
            <form 
              onSubmit={handleCreateTask}
              className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-5 shadow-sm"
            >
              <h3 className="text-lg font-extrabold tracking-tight text-text-primary border-b border-border-primary pb-3">Create Daily Task</h3>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Implement API route endpoint"
                  className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary outline-none focus:border-brand-primary transition text-sm placeholder:text-text-muted"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Date of Task</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary outline-none focus:border-brand-primary transition text-sm cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary focus:border-brand-primary cursor-pointer outline-none transition"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary focus:border-brand-primary cursor-pointer outline-none transition"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Description / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize objectives, blockers, or requirements..."
                  rows="3"
                  className="w-full px-4 py-3 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary outline-none focus:border-brand-primary transition text-sm resize-none placeholder:text-text-muted"
                />
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold py-3.5 rounded-xl shadow-sm transition-all uppercase tracking-wider text-xs cursor-pointer text-center"
              >
                {submitLoading ? 'Deploying task...' : 'Deploy Daily Task'}
              </button>
            </form>
          </div>

          {/* Columns 2-3: Filter & Task Timeline Checklist */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter Panel */}
            <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
              
              {/* Date Filter */}
              <div className="md:col-span-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1.5 font-mono">Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none focus:border-brand-primary cursor-pointer transition"
                />
              </div>

              {/* Employee Filter */}
              {isPrivileged && (
                <div className="md:col-span-1">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1.5 font-mono">Employee</label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary focus:border-brand-primary outline-none cursor-pointer transition"
                  >
                    <option value="All">All Staff</option>
                    {uniqueEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority Filter */}
              <div className={isPrivileged ? "md:col-span-1" : "md:col-span-1.5"}>
                <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1.5 font-mono">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary focus:border-brand-primary outline-none cursor-pointer transition"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🔵 Low</option>
                </select>
              </div>

              {/* Keyword Search */}
              <div className={isPrivileged ? "md:col-span-1" : "md:col-span-1.5"}>
                <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1.5 font-mono">Search Keywords</label>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition"
                />
              </div>
            </div>

            {/* Task Checklist Ledger */}
            <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 space-y-5 shadow-sm">
              <h3 className="text-lg font-bold text-text-primary">Checked Timeline Tasks</h3>

              {loading ? (
                <div className="text-center py-12 text-text-muted text-xs">
                  <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-3"></div>
                  Loading checklist updates...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-text-muted border border-dashed border-border-primary rounded-xl space-y-2">
                  <span className="text-2xl block">📅</span>
                  <p className="font-bold text-sm text-text-primary">No tasks recorded on this timeline</p>
                  <p className="text-xs text-text-muted">Add tasks using the form on the left to initialize.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map(task => {
                    const isSelf = task.employee_id === user?.id;
                    const canEdit = isSelf || isPrivileged;

                    return (
                      <div 
                        key={task.id} 
                        className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                          task.status === 'Completed' 
                            ? 'bg-brand-success/5 border-brand-success/20 hover:border-brand-success/30' 
                            : 'bg-bg-surface-alt/40 border-border-primary hover:border-border-hover'
                        }`}
                      >
                        {/* Task Information */}
                        <div className="space-y-1.5 max-w-md">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Complete checkbox */}
                            {canEdit && (
                              <input 
                                type="checkbox" 
                                checked={task.status === 'Completed'}
                                onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'Completed' : 'Pending')}
                                className="w-4 h-4 rounded border-border-primary text-brand-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-brand-primary bg-bg-surface"
                              />
                            )}
                            <span className={`font-bold text-xs ${task.status === 'Completed' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                              {task.title}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border font-mono ${getPriorityStyle(task.priority)}`}>
                              {task.priority}
                            </span>
                            {isPrivileged && (
                              <span className="text-[8px] font-bold bg-bg-surface-alt text-brand-primary border border-border-primary px-1.5 py-0.5 rounded font-mono">
                                👤 {task.employee_name} ({task.department})
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className={`text-[11px] leading-relaxed pl-6 ${task.status === 'Completed' ? 'text-text-muted line-through opacity-50' : 'text-text-secondary'}`}>
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Status Select & Actions */}
                        <div className="flex items-center gap-3 self-end md:self-auto pl-6 md:pl-0">
                          {canEdit ? (
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border focus:outline-none cursor-pointer transition ${getStatusColor(task.status)}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Blocked">Blocked</option>
                              <option value="Completed">Completed</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          )}

                          {canEdit && (
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => handleStartEdit(task)}
                                className="p-1 bg-bg-surface border border-border-primary hover:bg-bg-surface-alt text-text-secondary hover:text-text-primary rounded text-[9px] uppercase tracking-wider font-extrabold cursor-pointer transition"
                                title="Edit details"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 bg-brand-error/10 border border-brand-error/20 hover:bg-brand-error/20 rounded text-[9px] text-brand-error font-extrabold cursor-pointer transition"
                                title="Delete task"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Edit Modal Dialog */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5 text-text-primary">
            <div className="flex justify-between items-center border-b border-border-primary pb-2">
              <h4 className="text-sm font-extrabold text-text-primary uppercase tracking-wider font-mono">Edit Task Specifications</h4>
              <button onClick={() => setEditingTask(null)} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-1 font-mono">Task Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none focus:border-brand-primary transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-1 font-mono">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-1.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none cursor-pointer transition focus:border-brand-primary"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-1 font-mono">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none cursor-pointer transition focus:border-brand-primary"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-1 font-mono">Notes / Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none resize-none focus:border-brand-primary transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-xs font-bold uppercase text-text-secondary hover:bg-bg-surface-alt/80 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-primary hover:bg-brand-primary/95 rounded-xl text-xs font-bold uppercase text-white cursor-pointer transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTasks;
