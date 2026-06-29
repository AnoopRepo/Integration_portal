import React, { useState, useEffect, useRef } from 'react';
import { useTaskConsole } from '../context/TaskConsoleContext';
import { Link } from 'react-router-dom';

const DepartmentTasksModal = () => {
  const { activeTask, isOpen, closeTask } = useTaskConsole();
  
  if (!activeTask) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={closeTask}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-over drawer */}
      <div 
        className={`fixed top-0 right-0 h-screen w-full max-w-2xl bg-bg-surface border-l border-border-primary shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-surface-alt/10">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded border shadow-sm ${
              activeTask.department === 'Admin'
                ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                : activeTask.department === 'IT'
                ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
                : 'bg-brand-success/10 text-brand-success border-brand-success/20'
            }`}>
              {activeTask.department} Department
            </span>
            <span className="text-text-muted text-xs font-bold">Task Dashboard</span>
          </div>
          <button 
            onClick={closeTask}
            className="w-8 h-8 rounded-full bg-bg-surface-alt hover:bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary border border-border-primary transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Dynamic Task Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <h2 className="text-xl md:text-2xl font-extrabold text-text-primary capitalize leading-tight">
            {activeTask.name}
          </h2>
          
          <div className="bg-bg-surface-alt/40 border border-border-primary rounded-3xl p-5 md:p-6 shadow-sm">
            <TaskContent taskName={activeTask.name} department={activeTask.department} closeTask={closeTask} />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-border-primary bg-bg-surface flex items-center justify-between text-[10px] text-text-muted font-bold uppercase tracking-wider">
          <span>WorkPulse Operations Hub</span>
          <span>Security Token Encrypted 🔐</span>
        </div>
      </div>
    </>
  );
};

// ==========================================
// CENTRAL CONTENT SWITCHER FOR ALL 25 TASKS
// ==========================================
const TaskContent = ({ taskName, department, closeTask }) => {
  const normName = taskName.toLowerCase().trim();

  // Admin Tasks
  if (department === 'Admin') {
    switch (normName) {
      case 'asset management':
        return <AdminAssetManagement />;
      case 'office inventory tracking':
        return <AdminInventoryTracking />;
      case 'vendor coordination':
        return <AdminVendorCoordination />;
      case 'reminders/escalations':
        return <AdminRemindersEscalations />;
      case 'meeting scheduling':
        return <AdminMeetingScheduling />;
      case 'expense tracking':
        return <AdminExpenseTracking closeTask={closeTask} />;
      case 'document organization':
        return <AdminDocumentOrganization />;
      default:
        return <FallbackTask taskName={taskName} />;
    }
  }

  // IT Tasks
  if (department === 'IT') {
    switch (normName) {
      case 'email/admin account management':
        return <ITAccountManagement />;
      case 'dns/server monitoring':
        return <ITServerMonitoring />;
      case 'ticket handling':
        return <ITTicketHandling closeTask={closeTask} />;
      case 'software/license tracking':
        return <ITLicenseTracking />;
      case 'backup monitoring':
        return <ITBackupMonitoring />;
      case 'dashboard/reporting':
        return <ITDashboardReporting closeTask={closeTask} />;
      case 'cloud/admin console activities':
        return <ITCloudConsole />;
      case 'system health alerts':
        return <ITHealthAlerts />;
      default:
        return <FallbackTask taskName={taskName} />;
    }
  }

  // HR Tasks
  if (department === 'HR') {
    switch (normName) {
      case 'resume screening':
        return <HRResumeScreening closeTask={closeTask} />;
      case 'interview scheduling':
        return <HRInterviewScheduling closeTask={closeTask} />;
      case 'onboarding workflows':
        return <HROnboardingWorkflows />;
      case 'attendance tracking':
        return <HRAttendanceTracking closeTask={closeTask} />;
      case 'leave management':
        return <HRLeaveManagement closeTask={closeTask} />;
      case 'employee documentation':
        return <HREmployeeDocumentation />;
      case 'policy acknowledgement tracking':
        return <HRPolicyTracking />;
      case 'training/task tracking':
        return <HRTrainingTracking />;
      case 'performance review summaries':
        return <HRPerformanceReviews />;
      case 'employee engagement feedback':
        return <HREngagementFeedback />;
      default:
        return <FallbackTask taskName={taskName} />;
    }
  }

  return <FallbackTask taskName={taskName} />;
};

// ==========================================
// ADMIN WORKSPACE COMPONENT DASHBOARDS
// ==========================================

const AdminAssetManagement = () => {
  const [assets, setAssets] = useState([
    { id: 1, name: 'MacBook Pro 16"', type: 'Laptop', assignedTo: 'Sarah Connor', serial: 'MBP-2026-X83', status: 'In Use' },
    { id: 2, name: 'iPhone 15 Pro', type: 'Mobile', assignedTo: 'John Connor', serial: 'IPH-938-L92', status: 'In Use' },
    { id: 3, name: 'UltraSharp 34" Curved', type: 'Monitor', assignedTo: 'Available', serial: 'DEL-342-M28', status: 'Storage' },
    { id: 4, name: 'iPad Pro M4', type: 'Tablet', assignedTo: 'Alice Vance', serial: 'IPA-112-U74', status: 'In Use' },
  ]);
  const [newName, setNewName] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(1);

  const handleAssign = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAssets(assets.map(a => a.id === selectedAsset ? { ...a, assignedTo: newName, status: 'In Use' } : a));
    setNewName('');
  };

  const handleRelease = (id) => {
    setAssets(assets.map(a => a.id === id ? { ...a, assignedTo: 'Available', status: 'Storage' } : a));
  };

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Track company hardware allocation, manage physical assignments, and log custody logs.
      </p>

      <div className="space-y-3">
        {assets.map(asset => (
          <div key={asset.id} className="p-4 rounded-2xl bg-bg-surface border border-border-primary flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">{asset.name}</span>
                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  asset.status === 'In Use' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-bg-surface-alt text-text-muted border-border-primary'
                }`}>
                  {asset.status}
                </span>
              </div>
              <p className="text-[10px] text-text-muted mt-1 font-mono">SN: {asset.serial} • Type: {asset.type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary font-semibold">Assigned To:</p>
              <p className={`text-xs font-bold ${asset.assignedTo === 'Available' ? 'text-brand-success' : 'text-brand-primary'}`}>{asset.assignedTo}</p>
              {asset.assignedTo !== 'Available' && (
                <button 
                  onClick={() => handleRelease(asset.id)}
                  className="text-[9px] text-brand-error hover:text-brand-error/80 font-bold uppercase mt-1 cursor-pointer"
                >
                  Unassign
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAssign} className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 shadow-sm">
        <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Fast Hardware Reassignment</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Select Asset</label>
            <select 
              value={selectedAsset} 
              onChange={(e) => setSelectedAsset(Number(e.target.value))}
              className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            >
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Employee Name</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="e.g. Ellen Ripley"
              className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>
        <button 
          type="submit"
          className="w-full py-2 bg-brand-primary hover:bg-brand-primary/95 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
        >
          Confirm Assignment
        </button>
      </form>
    </div>
  );
};

const AdminInventoryTracking = () => {
  const [stock, setStock] = useState({
    coffee: 45,
    paper: 12,
    markers: 8,
    stickyNotes: 62,
  });

  const handleAdjust = (item, val) => {
    setStock({ ...stock, [item]: Number(val) });
  };

  return (
    <div className="space-y-6">
      <p className="text-text-secondary text-xs leading-relaxed">
        Monitor office materials, stationery, and kitchen consumables. System triggers auto-reorders at 20%.
      </p>

      <div className="space-y-4">
        {[
          { key: 'coffee', label: 'Coffee Beans (kg)', max: 100, unit: 'kg' },
          { key: 'paper', label: 'Printer Paper (Reams)', max: 50, unit: 'reams' },
          { key: 'markers', label: 'Dry-Erase Markers (Pack)', max: 40, unit: 'packs' },
          { key: 'stickyNotes', label: 'Sticky Notes (Boxes)', max: 120, unit: 'boxes' },
        ].map(item => {
          const percentage = Math.round((stock[item.key] / item.max) * 100);
          const isLow = percentage <= 20;

          return (
            <div key={item.key} className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-text-secondary">{item.label}</span>
                <div className="flex items-center gap-2 font-semibold">
                  {isLow && (
                    <span className="text-[9px] font-bold uppercase text-brand-warning bg-brand-warning/10 border border-brand-warning/20 px-2 py-0.5 rounded animate-pulse">
                      ⚠️ Low Stock - Auto Reordered
                    </span>
                  )}
                  <span className={isLow ? 'text-brand-warning font-bold' : 'text-brand-primary'}>
                    {stock[item.key]} / {item.max} {item.unit} ({percentage}%)
                  </span>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max={item.max} 
                  value={stock[item.key]} 
                  onChange={(e) => handleAdjust(item.key, e.target.value)}
                  className="flex-1 accent-brand-primary h-1.5 bg-bg-surface border border-border-primary rounded-lg cursor-pointer"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminVendorCoordination = () => {
  const [vendors, setVendors] = useState([
    { id: 1, name: 'Global Supply Office Co.', contact: 'support@globalsupply.com', phone: '+1 (555) 234-9876', service: 'Stationery & Printing', activeLogs: [] },
    { id: 2, name: 'Premium Bean Wholesalers', contact: 'beans@premiumroasters.com', phone: '+1 (555) 902-8344', service: 'Office Cafeteria Supplies', activeLogs: [] },
    { id: 3, name: 'Titan Tech Hardware', contact: 'enterprise@titantech.io', phone: '+1 (555) 782-9912', service: 'Hardware Leasing', activeLogs: [] },
  ]);
  const [pinging, setPinging] = useState(null);

  const handlePing = (id) => {
    setPinging(id);
    setVendors(vendors.map(v => {
      if (v.id === id) {
        return {
          ...v,
          activeLogs: [`[${new Date().toLocaleTimeString()}] Pinging endpoint...`, ...v.activeLogs]
        };
      }
      return v;
    }));

    setTimeout(() => {
      setVendors(prev => prev.map(v => {
        if (v.id === id) {
          return {
            ...v,
            activeLogs: [`[${new Date().toLocaleTimeString()}] Handshake successful (200 OK) 🟢`, ...v.activeLogs]
          };
        }
        return v;
      }));
      setPinging(null);
    }, 1200);
  };

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Coordinate communications and check response handshakes for key facilities and hardware leasing partners.
      </p>

      <div className="space-y-4">
        {vendors.map(vendor => (
          <div key={vendor.id} className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-text-primary">{vendor.name}</h4>
                <p className="text-[10px] text-brand-primary font-bold uppercase mt-0.5">{vendor.service}</p>
              </div>
              <button 
                onClick={() => handlePing(vendor.id)}
                disabled={pinging === vendor.id}
                className="px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/25 rounded-xl text-brand-primary font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {pinging === vendor.id ? '⚡ Telemetry Pinging...' : '📞 Ping Vendor'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary border-t border-border-primary/50 pt-2 font-mono">
              <p>Email: {vendor.contact}</p>
              <p>Phone: {vendor.phone}</p>
            </div>
            {vendor.activeLogs.length > 0 && (
              <div className="p-2.5 rounded-xl bg-bg-surface-alt border border-border-primary text-[9px] font-mono text-brand-primary max-h-20 overflow-y-auto space-y-1">
                {vendor.activeLogs.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminRemindersEscalations = () => {
  const [reminders, setReminders] = useState([
    { id: 1, title: 'Server Hosting Invoice Overdue', detail: 'IT infrastructure charges outstanding (Amount: $2,450.00). Escalates in 3 hours.', level: 'CRITICAL', resolved: false },
    { id: 2, title: 'Q2 Compliance Training Gap', detail: '3 employees missed the mandatory data privacy acknowledgment course. Escalation triggered.', level: 'HIGH', resolved: false },
    { id: 3, title: 'Vendor Lease Agreement Expiry', detail: 'Hardware contract with Titan Tech requires signed addendum. Due tomorrow.', level: 'MEDIUM', resolved: false },
  ]);

  const handleResolve = (id) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, resolved: true } : r));
  };

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        System warnings and administrative actions requiring overrides to prevent operations bottlenecks.
      </p>

      <div className="space-y-3">
        {reminders.map(rem => (
          <div key={rem.id} className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm ${
            rem.resolved 
              ? 'bg-brand-success/5 border-brand-success/20 opacity-60' 
              : rem.level === 'CRITICAL'
              ? 'bg-brand-error/5 border-brand-error/25'
              : rem.level === 'HIGH'
              ? 'bg-brand-warning/5 border-brand-warning/25'
              : 'bg-brand-accent/5 border-brand-accent/25'
          }`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">{rem.title}</span>
                  {!rem.resolved && (
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      rem.level === 'CRITICAL' 
                        ? 'bg-brand-error/10 text-brand-error border-brand-error/20' 
                        : rem.level === 'HIGH'
                        ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                        : 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
                    }`}>
                      {rem.level}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{rem.detail}</p>
              </div>
              <div>
                {rem.resolved ? (
                  <span className="text-xs font-bold text-brand-success flex items-center gap-1.5 whitespace-nowrap">
                    🟢 Resolved
                  </span>
                ) : (
                  <button 
                    onClick={() => handleResolve(rem.id)}
                    className="px-3 py-1.5 bg-bg-surface-alt hover:bg-bg-surface border border-border-primary rounded-xl text-text-secondary hover:text-text-primary font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminMeetingScheduling = () => {
  const [meeting, setMeeting] = useState({ title: '', room: 'Boardroom X', slot: '10:00 AM - 11:00 AM' });
  const [status, setStatus] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!meeting.title.trim()) return;
    setStatus('processing');
    setTimeout(() => {
      setStatus('done');
      setTimeout(() => setStatus(null), 3000);
      setMeeting({ title: '', room: 'Boardroom X', slot: '10:00 AM - 11:00 AM' });
    }, 1500);
  };

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Reserve physical space and dispatch automatic calendar calendar reminders to all attendees.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Meeting Purpose</label>
          <input 
            type="text" 
            value={meeting.title}
            onChange={(e) => setMeeting({ ...meeting, title: e.target.value })}
            placeholder="e.g. Q3 Vendor Review & Alignment"
            className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Facility Room</label>
            <select 
              value={meeting.room}
              onChange={(e) => setMeeting({ ...meeting, room: e.target.value })}
              className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="Boardroom X">Boardroom X (Infinity Tower)</option>
              <option value="Meeting Hub 4B">Meeting Hub 4B</option>
              <option value="Executive Suite">Executive Suite</option>
              <option value="Huddle Corner">Huddle Corner (Coffee Lab)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Available Hour</label>
            <select 
              value={meeting.slot}
              onChange={(e) => setMeeting({ ...meeting, slot: e.target.value })}
              className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
              <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
              <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
              <option value="04:30 PM - 05:30 PM">04:30 PM - 05:30 PM</option>
            </select>
          </div>
        </div>
        
        {status === 'processing' ? (
          <div className="py-2.5 flex items-center justify-center gap-2 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-brand-primary font-bold uppercase tracking-wider">Booking Slot & Inviting...</span>
          </div>
        ) : status === 'done' ? (
          <div className="py-2.5 text-center bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl text-xs font-bold uppercase tracking-wider">
            ✓ Reservation Saved! Invites Sent to Calendars
          </div>
        ) : (
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
          >
            Confirm & Dispatch Invites
          </button>
        )}
      </form>
    </div>
  );
};

const AdminExpenseTracking = ({ closeTask }) => {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [ledger, setLedger] = useState([
    { date: '2026-05-24', desc: 'SaaS licensing renewals', amount: 820.00, status: 'Approved' },
    { date: '2026-05-23', desc: 'Snacks & refreshments order', amount: 145.50, status: 'Pending' },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !desc.trim()) return;
    const item = {
      date: new Date().toISOString().split('T')[0],
      desc,
      amount: parseFloat(amount),
      status: 'Pending'
    };
    setLedger([item, ...ledger]);
    setAmount('');
    setDesc('');
  };

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Instantly log general administrative purchases or navigate to the full expense folder.
      </p>

      <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 shadow-sm">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Quick Purchase Log</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <input 
              type="text" 
              placeholder="e.g. Office cleaning detergent"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div>
            <input 
              type="number" 
              placeholder="Amount $"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>
        <button 
          type="submit"
          className="w-full py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          File Voucher
        </button>
      </form>

      <div className="space-y-2">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Pending Approvals Ledger</h4>
        <div className="space-y-2">
          {ledger.map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between text-xs font-mono text-text-secondary shadow-sm">
              <div>
                <p className="text-text-primary font-bold">{item.desc}</p>
                <p className="text-[10px] text-text-muted">{item.date}</p>
              </div>
              <div className="text-right">
                <p className="text-text-primary font-extrabold">${item.amount.toFixed(2)}</p>
                <span className={`text-[8px] font-bold uppercase tracking-wider ${item.status === 'Approved' ? 'text-brand-success' : 'text-brand-warning'}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-2">
        <Link 
          to="/expenses" 
          onClick={closeTask}
          className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-bold hover:underline cursor-pointer"
        >
          View Full Expense Portal ↗
        </Link>
      </div>
    </div>
  );
};

const AdminDocumentOrganization = () => {
  const [activeFolder, setActiveFolder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const docs = {
    Finance: [
      { name: 'Q1_expense_audit_report.pdf', size: '2.4 MB', updated: '2026-05-10', summary: 'Validated all operational SaaS tool invoices, employee expense reimbursement receipts, and tax allocations.' },
      { name: 'Corporate_insurance_renewal.pdf', size: '5.1 MB', updated: '2026-04-18', summary: 'General liability insurance terms covering equipment lease damage and software failure liabilities.' }
    ],
    Contracts: [
      { name: 'Titan_Tech_Leasing_MOU.pdf', size: '1.2 MB', updated: '2026-05-02', summary: 'Lease agreement for 45 development workstation notebooks with service SLA guarantees.' },
      { name: 'OfficeDepot_preferred_rates.pdf', size: '890 KB', updated: '2026-01-14', summary: 'Volume pricing schedules for office supply items, packaging supplies, and courier boxes.' }
    ],
    Board: [
      { name: 'WorkPulse_Q2_Deck.pdf', size: '8.3 MB', updated: '2026-05-15', summary: 'Operational analytics deck mapping check-in consistency and leave trends.' }
    ]
  };

  const handleSelectFolder = (folder) => {
    setActiveFolder(activeFolder === folder ? null : folder);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Browse cloud folders and review administrative PDF contracts and compliance audit summaries.
      </p>

      <div className="space-y-2">
        {Object.keys(docs).map(folder => (
          <div key={folder} className="space-y-2">
            <button
              onClick={() => handleSelectFolder(folder)}
              className="w-full p-3.5 rounded-2xl bg-bg-surface hover:bg-bg-surface-alt border border-border-primary flex items-center justify-between font-bold text-xs text-text-primary text-left transition-colors cursor-pointer shadow-sm"
            >
              <span className="flex items-center gap-2">
                📁 {folder} Files Directory
              </span>
              <span className="text-[10px] text-text-muted font-semibold">{docs[folder].length} assets</span>
            </button>
            
            {activeFolder === folder && (
              <div className="pl-4 space-y-2 animate-fadeIn">
                {docs[folder].map(file => (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-[11px] font-mono text-left transition-all cursor-pointer shadow-sm ${
                      selectedFile?.name === file.name 
                        ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary font-bold' 
                        : 'bg-bg-surface border-border-primary text-text-secondary hover:bg-bg-surface-alt'
                    }`}
                  >
                    <span>📄 {file.name}</span>
                    <span className="text-[9px] text-text-muted">{file.size}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedFile && (
        <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/15 space-y-2 animate-fadeIn">
          <div className="flex justify-between items-center text-[10px] font-bold text-brand-primary uppercase tracking-wider">
            <span>Doc Abstract</span>
            <span>Ref: {selectedFile.updated}</span>
          </div>
          <p className="text-xs text-text-primary font-semibold">{selectedFile.name}</p>
          <p className="text-xs text-text-secondary leading-relaxed font-medium">{selectedFile.summary}</p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// IT WORKSPACE COMPONENT DASHBOARDS
// ==========================================

const ITAccountManagement = () => {
  const [accounts, setAccounts] = useState([
    { id: 1, name: 'Sarah Connor', email: 's.connor@workpulse.com', role: 'HR Manager', status: 'Active' },
    { id: 2, name: 'John Doe', email: 'j.doe@workpulse.com', role: 'IT Support', status: 'Active' },
    { id: 3, name: 'Kyle Reese', email: 'k.reese@workpulse.com', role: 'Full Stack Dev', status: 'Suspended' },
  ]);

  const toggleStatus = (id) => {
    setAccounts(accounts.map(acc => {
      if (acc.id === id) {
        const nextStatus = acc.status === 'Active' ? 'Suspended' : 'Active';
        return { ...acc, status: nextStatus };
      }
      return acc;
    }));
  };

  const handleReset = (email) => {
    alert(`Dispatched temporary password reset hash link to ${email} 🟢`);
  };

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Suspend systems access or force credentials synchronization loops for corporate mail accounts.
      </p>

      <div className="space-y-3">
        {accounts.map(acc => (
          <div key={acc.id} className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-text-primary leading-none">{acc.name}</p>
                <p className="text-[10px] text-text-muted mt-1">{acc.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${
                  acc.status === 'Active' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : 'bg-brand-error/10 text-brand-error border-brand-error/20'
                }`}>
                  {acc.status}
                </span>
                
                {/* Switch slider */}
                <button
                  onClick={() => toggleStatus(acc.id)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                    acc.status === 'Active' ? 'bg-brand-primary' : 'bg-bg-surface-alt'
                  } border border-border-primary`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform transform ${
                    acc.status === 'Active' ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-border-primary/50 pt-2">
              <span className="text-[9px] text-text-muted font-bold uppercase">{acc.role}</span>
              <button 
                onClick={() => handleReset(acc.email)}
                className="text-[9px] text-brand-primary hover:text-brand-primary/80 font-bold uppercase cursor-pointer"
              >
                Reset Password
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ITServerMonitoring = () => {
  const [latency, setLatency] = useState(48);
  const [points, setPoints] = useState([45, 52, 40, 60, 50, 48, 55, 42, 49, 48]);
  const canvasRef = useRef(null);

  // Fluctuating graph interval
  useEffect(() => {
    const timer = setInterval(() => {
      const delta = Math.floor(Math.random() * 20) - 10;
      const nextLat = Math.max(30, Math.min(120, latency + delta));
      setLatency(nextLat);
      setPoints(prev => [...prev.slice(1), nextLat]);
    }, 1500);
    return () => clearInterval(timer);
  }, [latency]);

  // Redraw path
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = 'var(--border-primary-val)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Plot lines
    ctx.strokeStyle = 'var(--brand-accent-val)';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(14, 165, 233, 0.2)';
    ctx.beginPath();

    const w = canvas.width / (points.length - 1);
    points.forEach((pt, idx) => {
      const x = idx * w;
      // Latency bounds mapped to height
      const y = canvas.height - ((pt - 20) / 100) * canvas.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }, [points]);

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Real-time telemetry measuring DNS resolve operations, latency buffers, and load capacity averages.
      </p>

      <div className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 shadow-sm">
        <div className="flex justify-between items-center text-xs">
          <div>
            <h4 className="font-bold text-text-primary">DNS Node Latency</h4>
            <p className="text-[10px] text-text-muted font-mono">Server node: us-east-gateway</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-extrabold text-brand-accent font-mono">{latency} ms</span>
            <p className="text-[8px] font-bold uppercase text-brand-success tracking-wider">Nodes Operational</p>
          </div>
        </div>

        <canvas 
          ref={canvasRef} 
          width="400" 
          height="120" 
          className="w-full bg-bg-surface-alt border border-border-primary rounded-xl"
        />
      </div>
    </div>
  );
};

const ITTicketHandling = ({ closeTask }) => {
  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Manage queue metrics, triage database exceptions, and reallocate support issues.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Unassigned', count: 3, color: 'text-brand-error bg-brand-error/10 border-brand-error/20' },
          { label: 'Pending Dev', count: 2, color: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20' },
          { label: 'Total Solved', count: 18, color: 'text-brand-success bg-brand-success/10 border-brand-success/20' }
        ].map(card => (
          <div key={card.label} className={`p-3 rounded-2xl border text-center ${card.color} shadow-sm`}>
            <h4 className="text-[10px] uppercase font-bold tracking-wider">{card.label}</h4>
            <p className="text-2xl font-black mt-1 font-mono">{card.count}</p>
          </div>
        ))}
      </div>

      <div className="p-4 bg-bg-surface border border-border-primary rounded-2xl space-y-2.5 shadow-sm">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top Priority Ticket Queue</h4>
        <div className="space-y-2">
          {[
            { id: '#482', title: 'VPN authentication looping', author: 'E. Smith', priority: 'HIGH' },
            { id: '#479', title: 'Sales dashboard telemetry broken', author: 'A. Vance', priority: 'MEDIUM' }
          ].map(t => (
            <div key={t.id} className="p-2.5 rounded-xl bg-bg-surface-alt border border-border-primary flex items-center justify-between text-xs font-mono text-text-secondary">
              <div>
                <p className="text-text-primary font-bold">{t.title} <span className="text-brand-primary font-bold">{t.id}</span></p>
                <p className="text-[9px] text-text-muted">Raised by: {t.author}</p>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                t.priority === 'HIGH' ? 'bg-brand-error/10 text-brand-error border-brand-error/20' : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
              }`}>{t.priority}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-2">
        <Link 
          to="/tickets" 
          onClick={closeTask}
          className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-bold hover:underline cursor-pointer"
        >
          View Full Ticket Console ↗
        </Link>
      </div>
    </div>
  );
};

const ITLicenseTracking = () => {
  const [licenses, setLicenses] = useState([
    { id: 1, name: 'Slack Enterprise Grid', used: 84, total: 100, cost: '$2,400/mo' },
    { id: 2, name: 'GitHub Copilot Business', used: 45, total: 50, cost: '$870/mo' },
    { id: 3, name: 'Zoom Rooms Pro', used: 12, total: 20, cost: '$440/mo' },
  ]);

  const handleAddSeats = (id) => {
    setLicenses(licenses.map(l => l.id === id ? { ...l, total: l.total + 10 } : l));
  };

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify operational SaaS subscription limits, evaluate seat capacities, and extend licenses.
      </p>

      <div className="space-y-3">
        {licenses.map(lic => {
          const ratio = lic.used / lic.total;
          const percentage = Math.round(ratio * 100);
          
          return (
            <div key={lic.id} className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-text-primary">{lic.name}</h4>
                  <p className="text-[10px] text-text-muted font-mono">Subscription Cost: {lic.cost}</p>
                </div>
                <button
                  onClick={() => handleAddSeats(lic.id)}
                  className="px-2.5 py-1 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 rounded-lg text-brand-primary font-bold text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  +10 Seats
                </button>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-text-secondary font-mono">
                  <span>Capacity Assigned</span>
                  <span>{lic.used} / {lic.total} Seats ({percentage}%)</span>
                </div>
                <div className="w-full h-1.5 bg-bg-surface-alt border border-border-primary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ITBackupMonitoring = () => {
  const [backups, setBackups] = useState([
    { name: 'Core SQL Database Cluster', date: '2026-05-25 04:00', size: '1.42 GB', status: 'Completed' },
    { name: 'App Asset Storage Container', date: '2026-05-25 02:00', size: '8.45 GB', status: 'Completed' },
    { name: 'Config Environment Secrets', date: '2026-05-24 23:00', size: '142 KB', status: 'Completed' }
  ]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const triggerBackup = () => {
    if (running) return;
    setRunning(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setBackups([
              { name: 'Database Manual Snapshot', date: new Date().toISOString().replace('T', ' ').substring(0, 16), size: '1.43 GB', status: 'Completed' },
              ...backups
            ]);
            setRunning(false);
          }, 300);
          return 100;
        }
        return p + 10;
      });
    }, 150);
  };

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify daily redundancy snapshots and sync configuration maps offsite.
      </p>

      {running ? (
        <div className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/15 space-y-3 shadow-inner">
          <div className="flex justify-between items-center text-xs font-bold text-brand-primary uppercase tracking-wider">
            <span>Packaging & Syncing Snapshot...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-bg-surface border border-border-primary rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <button 
          onClick={triggerBackup}
          className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
        >
          Execute Manual Backup Now
        </button>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Recent Snapshot Registry</h4>
        <div className="space-y-2">
          {backups.map((bak, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between text-xs font-mono text-text-secondary shadow-sm">
              <div>
                <p className="text-text-primary font-bold">{bak.name}</p>
                <p className="text-[9px] text-text-muted">{bak.date}</p>
              </div>
              <div className="text-right">
                <p className="text-brand-primary font-bold">{bak.size}</p>
                <span className="text-[8px] font-bold text-brand-success uppercase tracking-wider">✓ {bak.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ITDashboardReporting = ({ closeTask }) => {
  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify system analytics, traffic load averages, and error registries.
      </p>

      <div className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 shadow-sm">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-text-secondary">CPU Core Cluster Load</span>
          <span className="text-brand-primary font-mono">23% / 100%</span>
        </div>
        <div className="w-full h-2 bg-bg-surface-alt border border-border-primary rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary" style={{ width: '23%' }} />
        </div>
        
        <div className="flex justify-between items-center text-xs pt-1">
          <span className="font-bold text-text-secondary">Memory Cluster Buffer</span>
          <span className="text-brand-primary font-mono">4.2 GB / 16.0 GB</span>
        </div>
        <div className="w-full h-2 bg-bg-surface-alt border border-border-primary rounded-full overflow-hidden">
          <div className="h-full bg-brand-accent" style={{ width: '26%' }} />
        </div>
      </div>

      <div className="text-center pt-2">
        <Link 
          to="/dashboard" 
          onClick={closeTask}
          className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-bold hover:underline cursor-pointer"
        >
          View Full Dashboard Analytics ↗
        </Link>
      </div>
    </div>
  );
};

const ITCloudConsole = () => {
  const [nodes, setNodes] = useState(3);
  const [provider, setProvider] = useState('AWS (us-east-1)');

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Upscale CPU node capacities or transfer traffic between multi-region server clusters.
      </p>

      <div className="p-4 bg-bg-surface border border-border-primary rounded-2xl space-y-4 shadow-sm">
        <div className="flex justify-between items-center text-xs">
          <div>
            <h4 className="font-bold text-text-primary">Active Server Nodes</h4>
            <p className="text-[10px] text-text-muted font-mono">Provider: {provider}</p>
          </div>
          <span className="text-xl font-extrabold text-brand-primary font-mono">{nodes} / 8</span>
        </div>

        <div className="space-y-1">
          <input 
            type="range" 
            min="1" 
            max="8" 
            value={nodes} 
            onChange={(e) => setNodes(Number(e.target.value))}
            className="w-full accent-brand-primary h-1.5 bg-bg-surface-alt border border-border-primary rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[8px] text-text-muted font-mono uppercase tracking-widest px-1">
            <span>Scale Min</span>
            <span>Scale Max</span>
          </div>
        </div>

        <div className="flex justify-center gap-2 pt-2 flex-wrap">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div 
              key={idx} 
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black font-mono border transition-all duration-300 ${
                idx < nodes 
                  ? 'bg-brand-primary/20 border-brand-primary/40 text-brand-primary shadow-sm' 
                  : 'bg-bg-surface-alt border-border-primary text-text-muted'
              }`}
            >
              N{idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ITHealthAlerts = () => {
  const [logs, setLogs] = useState([
    { id: 1, type: 'INFO', msg: 'Core API server operational', time: '13:42:01' },
    { id: 2, type: 'WARN', msg: 'DB connection pools reached 82%', time: '13:42:15' },
    { id: 3, type: 'ALERT', msg: 'Blocked unauthorized IP: 182.93.42.1', time: '13:43:02' }
  ]);

  useEffect(() => {
    const events = [
      { type: 'INFO', msg: 'System check-in cron ran successfully' },
      { type: 'INFO', msg: 'Cleared system file cache' },
      { type: 'WARN', msg: 'Elevated DNS resolve times (120ms)' },
      { type: 'ALERT', msg: 'Rate limits reached on candidate scanner' }
    ];

    const timer = setInterval(() => {
      const ev = events[Math.floor(Math.random() * events.length)];
      const nextLog = {
        id: Date.now(),
        type: ev.type,
        msg: ev.msg,
        time: new Date().toTimeString().split(' ')[0]
      };
      setLogs(prev => [nextLog, ...prev.slice(0, 5)]);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Live operations log stream. Randomized events populate reactively.
      </p>

      <div className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-3 font-mono shadow-sm">
        <h4 className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Telemetry Live Log Feed</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="text-[10px] leading-relaxed flex items-start gap-2 border-b border-border-primary/40 pb-1.5">
              <span className="text-text-muted shrink-0">[{log.time}]</span>
              <span className={`font-bold shrink-0 ${
                log.type === 'ALERT' ? 'text-brand-error' : log.type === 'WARN' ? 'text-brand-warning' : 'text-brand-primary'
              }`}>
                [{log.type}]
              </span>
              <span className="text-text-secondary">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// HR WORKSPACE COMPONENT DASHBOARDS
// ==========================================

const HRResumeScreening = ({ closeTask }) => {
  return (
    <div className="space-y-4 text-center">
      <p className="text-text-secondary text-xs leading-relaxed text-left">
        Access resume parsing summaries, evaluate skill metrics, and manage candidates.
      </p>
      
      <div className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/15 space-y-3 text-left shadow-sm">
        <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider">Candidate Screen Overview</h4>
        <div className="space-y-1.5 text-xs text-text-secondary">
          <p>• Total Applications Loaded: <span className="text-text-primary font-bold">14</span></p>
          <p>• Shortlisted for Interview: <span className="text-text-primary font-bold">5</span></p>
          <p>• AI Screen Completed: <span className="text-text-primary font-bold">2</span></p>
        </div>
      </div>

      <Link 
        to="/hr" 
        onClick={closeTask}
        className="inline-flex py-2.5 px-6 bg-brand-success hover:bg-brand-success/90 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
      >
        Launch HR Recruitment Hub
      </Link>
    </div>
  );
};

const HRInterviewScheduling = ({ closeTask }) => {
  return (
    <div className="space-y-4 text-center">
      <p className="text-text-secondary text-xs leading-relaxed text-left">
        Dispatch digital meeting coordinates or trigger automated AI Interview Invites.
      </p>

      <div className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/15 space-y-3 text-left shadow-sm">
        <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider">Active Recruiter Calendars</h4>
        <div className="space-y-1.5 text-xs text-text-secondary">
          <p>• Open Time Slots Today: <span className="text-text-primary font-bold">4 slots</span></p>
          <p>• Simulated Invites Dispatched: <span className="text-text-primary font-bold">3 emails</span></p>
        </div>
      </div>

      <Link 
        to="/hr" 
        onClick={closeTask}
        className="inline-flex py-2.5 px-6 bg-brand-success hover:bg-brand-success/90 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
      >
        Open Schedulers in HR Hub
      </Link>
    </div>
  );
};

const HROnboardingWorkflows = () => {
  const [workflow, setWorkflow] = useState([
    { id: 1, item: 'Send contract agreement PDF', done: true },
    { id: 2, item: 'Create company Slack & Google workspace', done: true },
    { id: 3, item: 'Coordinate hardware delivery (MacBook)', done: false },
    { id: 4, item: 'Assign Security Compliance course', done: false },
    { id: 5, item: 'Schedule team introducing meeting', done: false }
  ]);

  const toggleWorkflow = (id) => {
    setWorkflow(workflow.map(w => w.id === id ? { ...w, done: !w.done } : w));
  };

  const doneCount = workflow.filter(w => w.done).length;
  const percentage = Math.round((doneCount / workflow.length) * 100);

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Track progress checklists for recently hired employees.
      </p>

      <div className="p-4 bg-bg-surface border border-border-primary rounded-2xl space-y-3 shadow-sm">
        <div className="flex justify-between items-center text-xs">
          <div>
            <h4 className="font-bold text-text-primary">Employee Onboarding Progress</h4>
            <p className="text-[10px] text-text-muted font-semibold">Target hire: Ellen Ripley</p>
          </div>
          <span className="text-sm font-extrabold text-brand-success font-mono">{percentage}%</span>
        </div>
        <div className="w-full h-1.5 bg-bg-surface-alt border border-border-primary rounded-full overflow-hidden">
          <div className="h-full bg-brand-success transition-all duration-300" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {workflow.map(w => (
          <button 
            key={w.id}
            onClick={() => toggleWorkflow(w.id)}
            className="w-full p-3 rounded-xl bg-bg-surface hover:bg-bg-surface-alt border border-border-primary flex items-center gap-3 text-left text-xs text-text-secondary cursor-pointer shadow-sm transition-all"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
              w.done ? 'bg-brand-success/15 border-brand-success/40 text-brand-success' : 'border-border-primary bg-bg-surface-alt'
            }`}>
              {w.done && '✓'}
            </div>
            <span className={w.done ? 'line-through text-text-muted' : ''}>{w.item}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const HRAttendanceTracking = ({ closeTask }) => {
  return (
    <div className="space-y-4 text-center">
      <p className="text-text-secondary text-xs leading-relaxed text-left">
        Audit physical attendance logs, check daily telemetry, or submit hours.
      </p>

      <div className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/15 space-y-3 text-left shadow-sm">
        <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider">Weekly Attendance Stats</h4>
        <div className="space-y-1.5 text-xs text-text-secondary">
          <p>• Today's On-time Clock-ins: <span className="text-text-primary font-bold">96%</span></p>
          <p>• Missing Check-ins: <span className="text-text-primary font-bold">1 team member</span></p>
        </div>
      </div>

      <Link 
        to="/check-in" 
        onClick={closeTask}
        className="inline-flex py-2.5 px-6 bg-brand-success hover:bg-brand-success/90 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
      >
        Go to Shift Check-In
      </Link>
    </div>
  );
};

const HRLeaveManagement = ({ closeTask }) => {
  return (
    <div className="space-y-4 text-center">
      <p className="text-text-secondary text-xs leading-relaxed text-left">
        Manage employee time-off registries, evaluate balance caps, and authorize leaves.
      </p>

      <div className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/15 space-y-3 text-left shadow-sm">
        <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider">Pending Leave requests</h4>
        <div className="space-y-1.5 text-xs text-text-secondary font-semibold">
          <p>• Vacation (John Doe): <span className="text-brand-warning font-bold">3 days pending</span></p>
          <p>• Personal (Sarah Connor): <span className="text-brand-success font-bold">1 day approved</span></p>
        </div>
      </div>

      <Link 
        to="/leave" 
        onClick={closeTask}
        className="inline-flex py-2.5 px-6 bg-brand-success hover:bg-brand-success/90 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
      >
        Open Leave &amp; Time Off
      </Link>
    </div>
  );
};

const HREmployeeDocumentation = () => {
  const folders = [
    { name: 'Identity & Visa Files', files: 4 },
    { name: 'Signed Agreements & MOU', files: 8 },
    { name: 'Annual Performance Reviews', files: 6 },
    { name: 'Health Insurance & Safety', files: 3 }
  ];

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify identity proofs, NDAs, and annual tax documentation logs.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {folders.map(fold => (
          <div key={fold.name} className="p-4 rounded-2xl bg-bg-surface hover:bg-bg-surface-alt border border-border-primary text-left space-y-2 cursor-pointer transition-all shadow-sm">
            <span className="text-2xl">📁</span>
            <h4 className="text-xs font-bold text-text-primary">{fold.name}</h4>
            <p className="text-[10px] text-text-muted font-semibold">{fold.files} signed records</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const HRPolicyTracking = () => {
  const policies = [
    { name: 'Remote Workspace Policy (Rev 2)', rate: 94 },
    { name: 'AI Ethics & Tools Usage MOU', rate: 82 },
    { name: 'Data Security & NDA Compliance', rate: 100 }
  ];

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Evaluate signature completion percentages for newly introduced policy frameworks.
      </p>

      <div className="space-y-3.5">
        {policies.map(pol => (
          <div key={pol.name} className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-secondary">{pol.name}</span>
              <span className="text-brand-success font-extrabold">{pol.rate}%</span>
            </div>
            <div className="w-full h-1.5 bg-bg-surface-alt border border-border-primary rounded-full overflow-hidden">
              <div className="h-full bg-brand-success" style={{ width: `${pol.rate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HRTrainingTracking = () => {
  const courses = [
    { name: 'Corporate Anti-Phishing 101', rate: 91 },
    { name: 'FastAPI Secure Development', rate: 64 },
    { name: 'Conflict Resolution & Diversity', rate: 100 }
  ];

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify training compliance matrices and identify uncompleted staff courses.
      </p>

      <div className="space-y-3.5">
        {courses.map(course => (
          <div key={course.name} className="p-4 rounded-2xl bg-bg-surface border border-border-primary space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-secondary">{course.name}</span>
              <span className="text-brand-success font-extrabold">{course.rate}%</span>
            </div>
            <div className="w-full h-1.5 bg-bg-surface-alt border border-border-primary rounded-full overflow-hidden">
              <div className="h-full bg-brand-success" style={{ width: `${course.rate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HRPerformanceReviews = () => {
  const [ratings, setRatings] = useState({ technical: 4, communication: 3, reliability: 5 });
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);

  const calculateGrade = () => {
    const avg = (ratings.technical + ratings.communication + ratings.reliability) / 3;
    if (avg >= 4.5) return 'A+';
    if (avg >= 4.0) return 'A';
    if (avg >= 3.0) return 'B';
    return 'C';
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <p className="text-text-secondary text-xs leading-relaxed">
        Tweak skill reviews and save overall ratings evaluations to employee portfolios.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        {[
          { key: 'technical', label: 'Technical Execution' },
          { key: 'communication', label: 'Collaboration & Sync' },
          { key: 'reliability', label: 'Project Delivery Speed' },
        ].map(rating => (
          <div key={rating.key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-text-secondary">{rating.label}</span>
              <span className="text-brand-success font-mono font-bold">{ratings[rating.key]} / 5</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={ratings[rating.key]} 
              onChange={(e) => setRatings({ ...ratings, [rating.key]: Number(e.target.value) })}
              className="w-full accent-brand-success h-1.5 bg-bg-surface border border-border-primary rounded-lg cursor-pointer"
            />
          </div>
        ))}

        <div>
          <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Evaluation Commentary Summary</label>
          <textarea 
            rows="2"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Exhibited strong software leadership. Consistently resolved DB loops."
            className="w-full bg-bg-surface-alt border border-border-primary rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success resize-none"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between text-xs font-mono text-text-secondary shadow-sm">
          <span className="font-bold">AGGREGATE RATING GRADE</span>
          <span className="text-brand-success font-black text-sm">{calculateGrade()}</span>
        </div>

        {saved ? (
          <div className="py-2.5 text-center bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl text-xs font-bold uppercase tracking-wider">
            ✓ Performance Review logged!
          </div>
        ) : (
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/90 rounded-xl text-xs font-bold uppercase text-white shadow-sm transition-all cursor-pointer"
          >
            Commit Review File
          </button>
        )}
      </form>
    </div>
  );
};

const HREngagementFeedback = () => {
  const metrics = [
    { label: 'Workplace Happiness', val: '4.8 / 5.0' },
    { label: 'Remote Flexibility Rating', val: '92%' },
    { label: 'General Morale Average', val: 'High' }
  ];

  const [feedbacks, setFeedbacks] = useState([
    'Highly content with modular working models. The shift check-ins are very fast.',
    'More team cafeteria coffee options would be awesome.'
  ]);
  const [newFeedback, setNewFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newFeedback.trim()) return;
    setFeedbacks([newFeedback, ...feedbacks]);
    setNewFeedback('');
  };

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify general company sentiment data and collect anonymous staff opinions.
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        {metrics.map(met => (
          <div key={met.label} className="p-2.5 rounded-xl bg-bg-surface border border-border-primary text-center shadow-sm">
            <h4 className="text-[9px] uppercase font-bold text-text-muted tracking-wider leading-none">{met.label}</h4>
            <p className="text-xs font-extrabold text-brand-success mt-1 font-mono">{met.val}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-3 rounded-2xl bg-bg-surface border border-border-primary space-y-2 shadow-sm">
        <input 
          type="text"
          value={newFeedback}
          onChange={(e) => setNewFeedback(e.target.value)}
          placeholder="File anonymous feedback..."
          className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
        />
        <button 
          type="submit"
          className="w-full py-1.5 bg-brand-success/15 hover:bg-brand-success/25 text-brand-success border border-brand-success/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Submit Anonymously
        </button>
      </form>

      <div className="space-y-1.5 max-h-24 overflow-y-auto">
        {feedbacks.map((f, idx) => (
          <p key={idx} className="p-2 rounded-lg bg-bg-surface border border-border-primary text-[10px] text-text-secondary leading-relaxed font-medium shadow-sm">
            • "{f}"
          </p>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// FALLBACK / PLACEHOLDER COMPONENT
// ==========================================
const FallbackTask = ({ taskName }) => {
  return (
    <div className="text-center py-6 space-y-2">
      <span className="text-3xl">⚙️</span>
      <h3 className="text-text-primary font-bold text-sm">Dashboard Active</h3>
      <p className="text-xs text-text-secondary leading-relaxed">
        Operational endpoints are syncing telemetry coordinates for {taskName}.
      </p>
    </div>
  );
};

export default DepartmentTasksModal;
