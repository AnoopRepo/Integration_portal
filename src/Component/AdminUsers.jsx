import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';

const AdminUsers = () => {
  const { token, user: loggedInUser } = useAuth();
  const isSuperAdmin = loggedInUser?.is_super_admin || loggedInUser?.role === 'administrator';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('general');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  // Delete State
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Add Employee State
  const [addingUser, setAddingUser] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState('general');
  const [addDepartment, setAddDepartment] = useState('Engineering');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  // Edit Employee Department State
  const [editDepartment, setEditDepartment] = useState('Engineering');

  useEffect(() => {
    if (loggedInUser?.department) {
      setAddDepartment(loggedInUser.department);
    }
  }, [loggedInUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve user accounts');
      const data = await response.json();
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load workspace directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditDepartment(u.department || 'Engineering');
    setEditError('');
    setEditSuccess(false);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    setEditName('');
    setEditEmail('');
    setEditRole('general');
    setEditDepartment('Engineering');
    setEditError('');
    setEditSuccess(false);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess(false);
    setEditSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole, department: editDepartment })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to update user profile');
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, name: editName, email: editEmail, role: editRole, department: editDepartment } : u));
      setEditSuccess(true);
      setTimeout(() => handleCloseEdit(), 1200);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess(false);
    setAddSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          name: addName, 
          email: addEmail, 
          password: addPassword,
          role: addRole,
          department: addDepartment
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to create new account');
      setUsers([data, ...users]);
      setAddSuccess(true);
      setTimeout(() => {
        setAddingUser(false);
        setAddName('');
        setAddEmail('');
        setAddPassword('');
        setAddRole('general');
        setAddDepartment('Engineering');
        setAddSuccess(false);
        setAddError('');
      }, 1200);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete user account');
      setUsers(users.filter(u => u.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const staffCount = users.filter(u => u.role === 'general' || u.role === 'user').length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'administrator').length;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-brand-primary/5 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-brand-accent/5 rounded-full filter blur-[120px] pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto z-10 space-y-10">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-primary pb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1 font-mono">Admin Console</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
              User Directory
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Manage all registered accounts, assign privilege roles, and control workspace access.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 self-start md:self-auto">
            <button
              onClick={() => setAddingUser(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm"
            >
              ➕ Add Employee
            </button>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 bg-bg-surface-alt border border-border-primary hover:bg-bg-surface-alt/80 text-text-secondary hover:text-text-primary rounded-xl transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
              </svg>
              Sync Roster
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              label: 'Total Registered',
              value: `${totalUsers}`,
              sub: 'Active accounts',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              iconBg: 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary',
            },
            {
              label: 'General Staff',
              value: `${staffCount}`,
              sub: 'Department members',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
              iconBg: 'bg-brand-success/10 border-brand-success/20 text-brand-success',
            },
            {
              label: 'Administrators',
              value: `${adminCount}`,
              sub: 'Elevated privileges',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              iconBg: 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent',
            },
          ].map((card) => (
            <div key={card.label} className="bg-bg-surface border border-border-primary rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-border-hover transition-all">
              <div>
                <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase font-mono">{card.label}</p>
                <h3 className="text-3xl font-extrabold mt-0.5 text-text-primary">{card.value}</h3>
                <p className="text-text-muted text-[10px] mt-0.5">{card.sub}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Controls ── */}
        <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-5 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 font-mono">Search Directory</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm transition-all placeholder:text-text-muted text-text-primary"
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 font-mono">Filter by Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm text-text-primary appearance-none cursor-pointer outline-none transition"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%23888888\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
            >
              <option value="All">All Roles</option>
              <option value="general">general</option>
              <option value="it">it</option>
              <option value="hr">hr</option>
              <option value="admin">admin</option>
              <option value="administrator">administrator</option>
            </select>
          </div>
        </div>

        {/* ── Directory Table ── */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-3 text-text-primary">
            <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Credentials Registry
            {!loading && (
              <span className="ml-auto text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">
                {filteredUsers.length} of {totalUsers} accounts
              </span>
            )}
          </h2>

          {loading ? (
            <div className="text-center py-20 bg-bg-surface border border-border-primary rounded-2xl">
              <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-secondary text-sm">Synchronising user registry…</p>
            </div>
          ) : error ? (
            <div className="bg-brand-error/10 border border-brand-error/20 rounded-2xl p-8 text-center text-brand-error">
              <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold text-sm">{error}</p>
              <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-brand-error/25 border border-brand-error/35 rounded-xl text-xs font-semibold hover:bg-brand-error/20 transition-all cursor-pointer">
                Retry
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-bg-surface border border-border-primary rounded-2xl py-20 text-center text-text-muted">
              <svg className="w-12 h-12 mx-auto mb-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="font-semibold">No accounts match your filters</p>
            </div>
          ) : (
            <div className="bg-bg-surface border border-border-primary rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-primary text-text-muted bg-bg-surface-alt/20">
                      <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest font-mono">Profile</th>
                      <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest font-mono">Email</th>
                      <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest font-mono">Role</th>
                      <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest font-mono hidden lg:table-cell">Account ID</th>
                      <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest font-mono text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-primary/50 text-text-secondary">
                    {filteredUsers.map((u) => {
                       const isMe = u.id === loggedInUser?.id;
                       return (
                         <tr key={u.id} className="hover:bg-bg-surface-alt/45 transition-colors group">
                           <td className="py-4 px-6">
                             <div className="flex items-center gap-3">
                               <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-brand-primary/70 to-brand-accent/70 flex items-center justify-center font-extrabold text-white uppercase text-xs border border-border-primary shadow-sm">
                                 {u.name.charAt(0)}
                               </div>
                               <div>
                                 <span className="font-bold text-sm text-text-primary block leading-tight">{u.name}</span>
                                 {isMe && (
                                   <span className="inline-block mt-0.5 text-[8px] bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                                     You
                                   </span>
                                 )}
                               </div>
                             </div>
                           </td>
                           <td className="py-4 px-6 font-mono text-xs text-text-secondary">{u.email}</td>
                           <td className="py-4 px-6">
                             {u.role === 'administrator' ? (
                               <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-brand-primary/10 text-brand-primary border-brand-primary/20">
                                 administrator
                               </span>
                             ) : u.role === 'admin' ? (
                               <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-brand-error/10 text-brand-error border-brand-error/20">
                                 admin
                               </span>
                             ) : u.role === 'hr' ? (
                               <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-brand-success/10 text-brand-success border-brand-success/20">
                                 hr
                               </span>
                             ) : u.role === 'it' ? (
                               <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-brand-accent/10 text-brand-accent border-brand-accent/20">
                                 it
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-bg-surface border-border-primary text-text-muted">
                                 general
                               </span>
                             )}
                           </td>
                           <td className="py-4 px-6 hidden lg:table-cell">
                             <span className="font-mono text-[9px] text-text-muted uppercase">{u.id}</span>
                           </td>
                           <td className="py-4 px-6 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <button
                                 onClick={() => handleOpenEdit(u)}
                                 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface-alt border border-border-primary hover:bg-bg-surface-alt/80 hover:text-text-primary rounded-lg text-xs font-semibold text-text-secondary transition-all cursor-pointer"
                               >
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                 </svg>
                                 Edit
                               </button>
                               <button
                                 onClick={() => setDeletingUser(u)}
                                 disabled={isMe}
                                 className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all ${
                                   isMe
                                     ? 'bg-bg-surface-alt/40 border-border-primary text-text-muted cursor-not-allowed'
                                     : 'bg-brand-error/10 border-brand-error/25 hover:bg-brand-error/20 hover:border-brand-error/30 text-brand-error cursor-pointer'
                                 }`}
                               >
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                 </svg>
                                 {isMe ? 'Protected' : 'Delete'}
                               </button>
                             </div>
                           </td>
                         </tr>
                       );
                     })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Employee Modal ── */}
      {addingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-bg-surface border border-border-primary rounded-2xl shadow-xl overflow-hidden text-text-primary">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary"></div>

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-border-primary">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-primary/10 border border-brand-primary/20 rounded-lg flex items-center justify-center text-brand-primary">➕</div>
                <div>
                  <h3 className="text-sm font-black text-text-primary">Add New Employee</h3>
                  <p className="text-[10px] text-text-muted">Register a new profile in WorkPulse</p>
                </div>
              </div>
              <button onClick={() => setAddingUser(false)} className="w-7 h-7 rounded-lg bg-bg-surface-alt border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-surface-alt/80 flex items-center justify-center transition-all cursor-pointer font-bold">
                ✕
              </button>
            </div>

            <div className="p-6">
              {addError && (
                <div className="mb-4 p-3 rounded-xl bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {addError}
                </div>
              )}
              {addSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-brand-success/10 border border-brand-success/20 text-brand-success text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  New employee account successfully generated!
                </div>
              )}

              <form onSubmit={handleSaveAdd} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1 font-mono">Full Name</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    required
                    placeholder="e.g. Ellen Ripley"
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder:text-text-muted transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1 font-mono">Email Address</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder:text-text-muted transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1 font-mono">Default Password</label>
                  <input
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder:text-text-muted transition"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1 font-mono">Department</label>
                    {isSuperAdmin ? (
                      <select
                        value={addDepartment}
                        onChange={(e) => setAddDepartment(e.target.value)}
                        className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary transition cursor-pointer"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="IT Ops">IT Ops</option>
                        <option value="Quality Assurance">Quality Assurance</option>
                        <option value="Sales & Marketing">Sales & Marketing</option>
                        <option value="Customer Support">Customer Support</option>
                        <option value="HR">HR</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>
                      </select>
                    ) : (
                      <div className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-muted flex items-center gap-2">
                        🔒 <span>{addDepartment}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1 font-mono">Privilege Role</label>
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value)}
                      className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary transition cursor-pointer font-bold"
                    >
                      <option value="general">general</option>
                      <option value="it">it</option>
                      <option value="hr">hr</option>
                      {isSuperAdmin && <option value="admin">admin</option>}
                      {isSuperAdmin && <option value="administrator">administrator</option>}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-border-primary">
                  <button
                    type="button"
                    onClick={() => setAddingUser(false)}
                    className="flex-1 py-2.5 bg-bg-surface-alt border border-border-primary text-text-secondary hover:bg-bg-surface-alt/80 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/95 rounded-xl text-xs font-black uppercase tracking-wider text-white disabled:opacity-50 transition-all shadow-sm"
                  >
                    {addSubmitting ? 'Creating…' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-bg-surface border border-border-primary rounded-2xl shadow-xl overflow-hidden text-text-primary">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary"></div>

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-border-primary">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-primary/10 border border-brand-primary/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary">Edit Account</h3>
                  <p className="text-[10px] text-text-muted">Modifying: {editingUser.email}</p>
                </div>
              </div>
              <button onClick={handleCloseEdit} className="w-7 h-7 rounded-lg bg-bg-surface-alt border border-border-primary hover:bg-bg-surface-alt/80 text-text-secondary hover:text-text-primary flex items-center justify-center transition-all cursor-pointer font-bold">
                ✕
              </button>
            </div>

            <div className="p-6">
              {editError && (
                <div className="mb-4 p-3 rounded-xl bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-brand-success/10 border border-brand-success/20 text-brand-success text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Profile updated successfully!
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 font-mono">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 font-mono">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                  />
                </div>

                {/* Role selector */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Privilege Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary transition cursor-pointer font-bold"
                  >
                    <option value="general">general</option>
                    <option value="it">it</option>
                    <option value="hr">hr</option>
                    {isSuperAdmin && <option value="admin">admin</option>}
                    {isSuperAdmin && <option value="administrator">administrator</option>}
                  </select>
                </div>

                <div className="flex gap-3 pt-2 border-t border-border-primary">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="flex-1 py-2.5 bg-bg-surface-alt border border-border-primary text-text-secondary hover:bg-bg-surface-alt/80 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/95 rounded-xl text-xs font-black uppercase tracking-wider text-white disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                  >
                    {editSubmitting ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-bg-surface border border-border-primary rounded-2xl shadow-xl overflow-hidden text-text-primary">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-brand-error"></div>
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-brand-error/10 border border-brand-error/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-black text-text-primary mb-2">Delete Account?</h3>
              <p className="text-text-secondary text-sm mb-4 leading-relaxed">
                This will permanently remove <strong className="text-text-primary">{deletingUser.name}</strong> and all of their submitted daily work reports.
              </p>
              <div className="bg-brand-error/5 border border-brand-error/10 rounded-xl p-3 text-brand-error/80 text-[10px] text-left mb-5 leading-relaxed">
                ⚠️ This action is irreversible. All report logs will be cascade-deleted.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  disabled={deleteSubmitting}
                  className="flex-1 py-2.5 bg-bg-surface-alt border border-border-primary text-text-secondary hover:bg-bg-surface-alt/80 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteSubmitting}
                  className="flex-1 py-2.5 bg-brand-error hover:bg-brand-error/95 rounded-xl text-xs font-black uppercase tracking-wider text-white disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                >
                  {deleteSubmitting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
