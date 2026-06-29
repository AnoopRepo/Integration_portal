import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { ChevronDown, LogOut, LayoutGrid, Sparkles, FolderDot, Info, Settings } from 'lucide-react';

const Sidebar = ({ open, setOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [departmentsExpanded, setDepartmentsExpanded] = useState(false);
  const [expandedDept, setExpandedDept] = useState(null); // 'Admin', 'IT', 'HR'
  const [commonExpanded, setCommonExpanded] = useState(false);

  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || '').toLowerCase();
  const isSuper = role === 'administrator';
  const hasHR = isSuper || role === 'hr' || (role === 'admin' && dept === 'hr');
  const hasIT = isSuper || role === 'it' || (role === 'admin' && (dept === 'it' || dept === 'it ops'));
  const hasAdmin = isSuper || (role === 'admin' && dept !== 'hr' && dept !== 'it' && dept !== 'it ops');

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (setOpen) setOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Workspace Home', icon: '🏠' },
    { path: '/company-agent', label: 'AI Assistant', icon: '🤖' },
  ];

  if (hasHR) {
    menuItems.push({ path: '/hr', label: 'HR Portal', icon: '💼' });
  }

  if (hasAdmin) {
    menuItems.push({ path: '/admin/hub', label: 'Admin Hub', icon: '🔑' });
  }

  menuItems.push({ path: '/about', label: 'About', icon: 'ℹ️' });

  const renderContent = () => (
    <div className="h-full flex flex-col justify-between select-none">
      <div className="space-y-6 overflow-y-auto no-scrollbar flex-1 pb-4">
        {/* Workspace Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center font-black text-white text-lg shadow-md shadow-brand-primary/10">
            W
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-text-primary leading-none">WorkPulse</h1>
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1 block">Workspace Portal</span>
          </div>
        </div>

        {/* User Profile Block */}
        <div className="p-4 rounded-2xl bg-bg-surface-alt border border-border-primary space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent text-white font-black flex items-center justify-center uppercase shadow border border-border-primary shrink-0">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-text-primary truncate leading-tight">{user?.name ? user.name.replace(/\s*\(.*\)/, "") : ""}</p>
              <p className="text-text-muted text-[10px] truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border-primary pt-2.5">
            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm ${
              user?.role === 'admin' || user?.role === 'administrator'
                ? 'bg-brand-error/10 text-brand-error border-brand-error/20' 
                : user?.role === 'hr'
                ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                : 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
            }`}>
              {user?.role}
            </span>
            <span className="text-[9px] text-text-muted font-medium">Active</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen && setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  active
                    ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shadow-sm'
                    : 'bg-transparent border border-transparent text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_6px_rgba(99,102,241,0.5)]"></span>
                )}
              </Link>
            );
          })}

          {/* Common Workspace Collapsible Group */}
          <div className="space-y-0.5">
            <button
              onClick={() => setCommonExpanded(!commonExpanded)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                commonExpanded 
                  ? 'bg-bg-surface-alt text-text-primary' 
                  : 'bg-transparent text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary'
              }`}
            >
              <span className="text-sm">🌐</span>
              <span>Common Workspace</span>
              <ChevronDown 
                size={12} 
                className="ml-auto text-text-muted transition-transform duration-200" 
                style={{ transform: commonExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} 
              />
            </button>

            {commonExpanded && (
              <div className="pl-3.5 space-y-0.5 border-l border-border-primary ml-4 animate-fadeIn">
                {[
                  { label: 'Shift Check-In', path: '/check-in' },
                  { label: 'Submit Update', path: '/submit-update' },
                  { label: 'Daily Tasks', path: '/daily-tasks' },
                  { label: 'Work Analytics', path: '/dashboard' },
                  { label: 'Expenses & Docs', path: '/expenses' },
                  { label: 'Document Center', path: '/documents' },
                  { label: 'Support Tickets', path: '/tickets' },
                  { label: 'Leave & Time Off', path: '/leave' },
                ].map(item => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setOpen && setOpen(false)}
                    className="block text-left text-[9px] font-bold text-text-secondary hover:text-brand-primary py-2 hover:pl-1 transition-all uppercase tracking-wider cursor-pointer font-mono"
                  >
                    - {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Departments Collapsible Group */}
          {(hasHR || hasIT || hasAdmin) && (
            <div className="space-y-0.5">
              <button
                onClick={() => setDepartmentsExpanded(!departmentsExpanded)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  departmentsExpanded 
                    ? 'bg-bg-surface-alt text-text-primary' 
                    : 'bg-transparent text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary'
                }`}
              >
                <span className="text-sm">🏢</span>
                <span>Departments</span>
                <ChevronDown 
                  size={12} 
                  className="ml-auto text-text-muted transition-transform duration-200" 
                  style={{ transform: departmentsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} 
                />
              </button>

              {departmentsExpanded && (
                <div className="pl-3.5 space-y-0.5 border-l border-border-primary ml-4 animate-fadeIn">
                  {[
                    { 
                      key: 'Admin', 
                      label: 'Admin', 
                      color: 'text-brand-primary',
                      roles: ['admin', 'administrator'],
                      tasks: [
                        'Admin Hub & Keys',
                        'Asset Management',
                        'Office Inventory Tracking',
                        'Vendor Coordination',
                        'Reminders & Escalations',
                        'Meeting Scheduling',
                        'Expense Auditing Console',
                        'Document Organization',
                      ]
                    },
                    { 
                      key: 'IT', 
                      label: 'IT Systems', 
                      color: 'text-brand-accent',
                      roles: ['it', 'administrator'],
                      tasks: [
                        'Email/Admin Account Management',
                        'DNS/Server Monitoring',
                        'Ticket Handling',
                        'Software/License Tracking',
                        'Backup Monitoring',
                        'Dashboard/Reporting',
                        'Cloud/Admin Console Activities',
                        'System Health Alerts',
                      ]
                    },
                    { 
                      key: 'HR', 
                      label: 'HR Operations', 
                      color: 'text-brand-success',
                      roles: ['hr', 'administrator'],
                      tasks: [
                        'Resume Screening',
                        'Interview Scheduling',
                        'Onboarding Workflows',
                        'Attendance Tracking',
                        'Leave Management',
                        'Employee Documentation',
                        'Policy Acknowledgement Tracking',
                        'Training/Task Tracking',
                        'Performance Review Summaries',
                        'Employee Engagement Feedback',
                      ]
                    }
                  ].filter(d => {
                    if (d.key === 'Admin') return hasAdmin;
                    if (d.key === 'IT') return hasIT;
                    if (d.key === 'HR') return hasHR;
                    return false;
                  }).map(dept => (
                    <div key={dept.key} className="space-y-0.5">
                      <button
                        onClick={() => setExpandedDept(expandedDept === dept.key ? null : dept.key)}
                        className={`w-full flex items-center justify-between py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-left transition-colors cursor-pointer ${
                          expandedDept === dept.key ? dept.color : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        <span>• {dept.label}</span>
                        <ChevronDown size={10} className="transition-transform duration-200" style={{ transform: expandedDept === dept.key ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </button>

                      {expandedDept === dept.key && (
                        <div className="pl-2 space-y-0.5 animate-fadeIn max-h-48 overflow-y-auto no-scrollbar border-l border-border-primary ml-1">
                          {dept.tasks.map(task => {
                            let path = `/tasks/${dept.key}/${encodeURIComponent(task)}`;
                            if (task === 'Admin Hub & Keys') {
                              path = '/admin/hub';
                            } else if (task === 'Reminders & Escalations') {
                              path = `/tasks/Admin/${encodeURIComponent('Reminders/Escalations')}`;
                            } else if (task === 'Expense Auditing Console') {
                              path = `/tasks/Admin/${encodeURIComponent('Expense Tracking')}`;
                            } else if (task === 'Document Organization') {
                              path = '/admin/downloads';
                            }

                            return (
                              <Link
                                key={task}
                                to={path}
                                onClick={() => setOpen && setOpen(false)}
                                className="block text-left text-[9px] font-bold text-text-secondary hover:text-text-primary py-1 hover:pl-1 transition-all uppercase tracking-wider cursor-pointer font-mono"
                              >
                                - {task}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Logout / Footer Section */}
      <div className="border-t border-border-primary pt-4 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-error/10 border border-brand-error/20 hover:bg-brand-error/20 text-brand-error rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-sm"
        >
          🚪 Sign Out
        </button>
        <p className="text-[8px] text-center text-text-muted font-semibold tracking-wider mt-3 uppercase">WorkPulse Terminal v1.2.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop overlay */}
      {open && (
        <div 
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-all duration-300 animate-fadeIn"
        />
      )}

      {/* Dynamic Slide-over Sidebar Drawer */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 border-r border-border-primary bg-bg-surface flex flex-col p-6 z-50 transition-transform duration-300 ease-out shadow-xl ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderContent()}
      </aside>
    </>
  );
};

export default Sidebar;
