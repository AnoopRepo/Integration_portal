import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, User, Cpu } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [openDropdown, setOpenDropdown] = useState(null); // 'Admin' | 'IT' | 'HR' | 'Common' | null

  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || '').toLowerCase();
  const isSuper = role === 'administrator';
  const hasHR = isSuper || role === 'hr' || (role === 'admin' && dept === 'hr');
  const hasIT = isSuper || role === 'it' || (role === 'admin' && (dept === 'it' || dept === 'it ops'));
  const hasAdmin = isSuper || (role === 'admin' && dept !== 'hr' && dept !== 'it' && dept !== 'it ops');

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <nav className="w-full h-16 flex items-center justify-between pl-[72px] pr-6 md:pr-12 border-b border-border-primary backdrop-blur-md bg-bg-surface/75 sticky top-0 z-50 shadow-sm transition-all duration-200">
      <h1 className="text-xl md:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary hover:opacity-90 transition-all shrink-0">
        <Link to="/">WorkPulse</Link>
      </h1>

      <div className="flex items-center gap-6 md:gap-8 text-sm overflow-visible">
         <div className="flex gap-4 md:gap-6 items-center overflow-visible">
            {user ? (
              // Authenticated portal routes
              <>
                <Link 
                  to="/" 
                  className={`relative py-1.5 transition-all text-xs font-bold uppercase tracking-wider shrink-0 ${
                    isActive('/') ? 'text-brand-primary font-extrabold' : 'text-text-secondary hover:text-brand-primary'
                  }`}
                >
                  Home
                  {isActive('/') && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  )}
                </Link>

                <Link 
                  to="/company-agent" 
                  className={`relative py-1.5 transition-all text-xs font-bold uppercase tracking-wider shrink-0 ${
                    isActive('/company-agent') ? 'text-brand-primary font-extrabold' : 'text-text-secondary hover:text-brand-primary'
                  }`}
                >
                  AI Assistant
                  {isActive('/company-agent') && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  )}
                </Link>

                {/* Common Workspace Dropdown */}
                <div 
                  className="relative shrink-0 py-1.5"
                  onMouseEnter={() => setOpenDropdown('Common')}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button 
                    onClick={() => toggleDropdown('Common')}
                    className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      openDropdown === 'Common' ? 'text-brand-primary' : 'text-text-secondary hover:text-brand-primary'
                    }`}
                  >
                    Common Workspace <span className={`text-[8px] transition-transform duration-300 ${openDropdown === 'Common' ? 'rotate-180 text-brand-primary' : ''}`}>▼</span>
                  </button>
                  
                  <div className={`absolute top-full left-0 mt-1 w-56 bg-bg-surface border border-border-primary p-2 rounded-2xl shadow-xl transition-all duration-200 z-50 space-y-0.5 ${
                    openDropdown === 'Common' 
                      ? 'opacity-100 translate-y-0 pointer-events-auto' 
                      : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}>
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
                        onClick={() => setOpenDropdown(null)}
                        className="block text-left text-[9px] font-bold text-text-secondary hover:text-brand-primary py-1.5 px-2.5 hover:bg-brand-primary/5 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                      >
                        • {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Admin Department Dropdown */}
                {hasAdmin && (
                  <div 
                    className="relative shrink-0 py-1.5"
                    onMouseEnter={() => setOpenDropdown('Admin')}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button 
                      onClick={() => toggleDropdown('Admin')}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        openDropdown === 'Admin' ? 'text-brand-primary' : 'text-text-secondary hover:text-brand-primary'
                      }`}
                    >
                      Admin <span className={`text-[8px] transition-transform duration-300 ${openDropdown === 'Admin' ? 'rotate-180 text-brand-primary' : ''}`}>▼</span>
                    </button>
                    
                    <div className={`absolute top-full left-0 mt-1 w-56 bg-bg-surface border border-border-primary p-2 rounded-2xl shadow-xl transition-all duration-200 z-50 space-y-0.5 ${
                      openDropdown === 'Admin' 
                        ? 'opacity-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}>
                      {[
                        'Admin Hub & Keys',
                        'Asset Management',
                        'Office Inventory Tracking',
                        'Vendor Coordination',
                        'Reminders & Escalations',
                        'Meeting Scheduling',
                        'Expense Auditing Console',
                        'Document Organization',
                      ].map(task => {
                        let path = `/tasks/Admin/${encodeURIComponent(task)}`;
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
                            onClick={() => setOpenDropdown(null)}
                            className="block text-left text-[9px] font-bold text-text-secondary hover:text-brand-primary py-1.5 px-2.5 hover:bg-brand-primary/5 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                          >
                            • {task}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* IT Department Dropdown */}
                {hasIT && (
                  <div 
                    className="relative shrink-0 py-1.5"
                    onMouseEnter={() => setOpenDropdown('IT')}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button 
                      onClick={() => toggleDropdown('IT')}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        openDropdown === 'IT' ? 'text-brand-accent' : 'text-text-secondary hover:text-brand-accent'
                      }`}
                    >
                      IT <span className={`text-[8px] transition-transform duration-300 ${openDropdown === 'IT' ? 'rotate-180 text-brand-accent' : ''}`}>▼</span>
                    </button>
                    
                    <div className={`absolute top-full left-0 mt-1 w-60 bg-bg-surface border border-border-primary p-2 rounded-2xl shadow-xl transition-all duration-200 z-50 space-y-0.5 ${
                      openDropdown === 'IT' 
                        ? 'opacity-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}>
                      {[
                        'Email/Admin Account Management',
                        'DNS/Server Monitoring',
                        'Ticket Handling',
                        'Software/License Tracking',
                        'Backup Monitoring',
                        'Dashboard/Reporting',
                        'Cloud/Admin Console Activities',
                        'System Health Alerts',
                      ].map(task => (
                        <Link 
                          key={task}
                          to={`/tasks/IT/${encodeURIComponent(task)}`}
                          onClick={() => setOpenDropdown(null)}
                          className="block text-left text-[9px] font-bold text-text-secondary hover:text-brand-accent py-1.5 px-2.5 hover:bg-brand-accent/5 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                        >
                          • {task}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* HR Department Dropdown */}
                {hasHR && (
                  <div 
                    className="relative shrink-0 py-1.5"
                    onMouseEnter={() => setOpenDropdown('HR')}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button 
                      onClick={() => toggleDropdown('HR')}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        openDropdown === 'HR' ? 'text-brand-success' : 'text-text-secondary hover:text-brand-success'
                      }`}
                    >
                      HR <span className={`text-[8px] transition-transform duration-300 ${openDropdown === 'HR' ? 'rotate-180 text-brand-success' : ''}`}>▼</span>
                    </button>
                    
                    <div className={`absolute top-full left-0 mt-1 w-64 bg-bg-surface border border-border-primary p-2 rounded-2xl shadow-xl transition-all duration-200 z-50 space-y-0.5 max-h-80 overflow-y-auto no-scrollbar ${
                      openDropdown === 'HR' 
                        ? 'opacity-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}>
                      {[
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
                      ].map(task => (
                        <Link 
                          key={task}
                          to={`/tasks/HR/${encodeURIComponent(task)}`}
                          onClick={() => setOpenDropdown(null)}
                          className="block text-left text-[9px] font-bold text-text-secondary hover:text-brand-success py-1.5 px-2.5 hover:bg-brand-success/5 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                        >
                          • {task}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Public routes
              <>
                <Link 
                  to="/" 
                  className={`relative py-1.5 transition-all text-xs font-bold uppercase tracking-wider shrink-0 ${
                    isActive('/') ? 'text-brand-primary font-extrabold' : 'text-text-secondary hover:text-brand-primary'
                  }`}
                >
                  Home
                  {isActive('/') && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  )}
                </Link>
                <Link 
                  to="/about" 
                  className={`relative py-1.5 transition-all text-xs font-bold uppercase tracking-wider shrink-0 ${
                    isActive('/about') ? 'text-brand-primary font-extrabold' : 'text-text-secondary hover:text-brand-primary'
                  }`}
                >
                  About
                  {isActive('/about') && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  )}
                </Link>
                <Link 
                  to="/contact" 
                  className={`relative py-1.5 transition-all text-xs font-bold uppercase tracking-wider shrink-0 ${
                    isActive('/contact') ? 'text-brand-primary font-extrabold' : 'text-text-secondary hover:text-brand-primary'
                  }`}
                >
                  Contact
                  {isActive('/contact') && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  )}
                </Link>
              </>
            )}
         </div>

         {/* Right actions desk */}
         <div className="flex items-center gap-3 border-l border-border-primary pl-4 md:pl-6 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-bg-surface-alt hover:bg-border-primary text-text-secondary hover:text-brand-primary transition-all active:scale-95 cursor-pointer shadow-sm border border-border-primary"
              title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-bg-surface-alt border border-border-primary rounded-full shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent text-white text-[9px] font-extrabold flex items-center justify-center uppercase shadow">
                    {user.name ? user.name.replace(/\s*\(.*\)/, "").charAt(0) : '?'}
                  </div>
                  <span className="text-text-primary text-xs font-bold tracking-tight">{user.name ? user.name.replace(/\s*\(.*\)/, "") : ""}</span>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    user.role === 'admin' || user.role === 'administrator'
                      ? 'bg-brand-error/10 text-brand-error border-brand-error/20'
                      : user.role === 'hr'
                      ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                      : 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
                  }`}>
                    {user.role === 'administrator' ? 'Administrator' : (user.department || 'General')}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-brand-error/10 border border-brand-error/25 hover:bg-brand-error/20 rounded-full text-brand-error font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer transform hover:scale-105 active:scale-95"
                >
                  Log out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-md shadow-brand-primary/10">
                  Log in
                </Link>
              </>
            )}
         </div>
      </div>
    </nav>
  );
};

export default Navbar;
