import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ── Access map: which roles may enter which department task pages ──────────────
const DEPT_ACCESS = {
  admin: ['admin', 'administrator'],
  it:    ['it',    'administrator'],
  hr:    ['hr',    'administrator'],
};

const DepartmentTasksPage = () => {
  const { department, taskName } = useParams();
  const { user } = useAuth();
  const { theme } = useTheme();

  const decodedTaskName = decodeURIComponent(taskName || '');
  const decodedDepartment = decodeURIComponent(department || '');

  // ── Role-based access guard ───────────────────────────────────────────────
  const userRole = (user?.role || '').toLowerCase();
  const userDept = (user?.department || '').toLowerCase();
  const deptKey  = decodedDepartment.toLowerCase();

  let hasAccess = false;
  if (userRole === 'administrator') {
    hasAccess = true;
  } else if (deptKey === 'hr') {
    hasAccess = userRole === 'hr' || (userRole === 'admin' && userDept === 'hr');
  } else if (deptKey === 'it') {
    hasAccess = userRole === 'it' || (userRole === 'admin' && (userDept === 'it' || userDept === 'it ops'));
  } else if (deptKey === 'admin') {
    hasAccess = userRole === 'admin' && userDept !== 'hr' && userDept !== 'it' && userDept !== 'it ops';
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-bg-app text-text-primary">
        <div className="max-w-md w-full text-center space-y-6 bg-bg-surface border border-brand-error/20 rounded-3xl p-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-error/10 border border-brand-error/20 flex items-center justify-center text-3xl mx-auto">
            🔒
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Access Restricted</h2>
            <p className="text-text-secondary text-sm mt-2 leading-relaxed">
              You do not have permission to access the <span className="text-brand-error font-bold">{decodedDepartment}</span> department's task console.
              Only authorised <span className="text-brand-error font-bold">{decodedDepartment}</span> admins or super-administrators may enter this area.
            </p>
          </div>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 bg-bg-surface-alt hover:bg-bg-surface border border-border-primary rounded-full text-text-primary text-xs font-bold uppercase tracking-wider transition-all"
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 space-y-8 max-w-5xl mx-auto select-none animate-fadeIn">
      
      {/* Visual Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs text-text-muted font-bold uppercase tracking-wider">
        <Link to="/" className="hover:text-brand-primary transition-colors">Workspace Home</Link>
        <span>/</span>
        <span className={`px-2.5 py-0.5 rounded border shadow-sm ${
          decodedDepartment.toLowerCase() === 'admin'
            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
            : decodedDepartment.toLowerCase() === 'it'
            ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
            : 'bg-brand-success/10 text-brand-success border-brand-success/20'
        }`}>
          {decodedDepartment} Department
        </span>
        <span>/</span>
        <span className="text-text-secondary font-extrabold">{decodedTaskName}</span>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-primary pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary capitalize leading-none tracking-tight">
            {decodedTaskName}
          </h1>
          <p className="text-text-muted text-xs mt-2 font-medium">
            Authorized systems operations interface for {decodedDepartment} personnel.
          </p>
        </div>
        <Link 
          to="/"
          className="px-4 py-2 bg-bg-surface border border-border-primary hover:bg-bg-surface-alt text-text-secondary hover:text-text-primary rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm shrink-0 text-center cursor-pointer"
        >
          ← Return to Dashboard
        </Link>
      </div>

      {/* Interactive Task Console Card */}
      <div className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        
        {/* Soft Background Glowing Aura */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-5 pointer-events-none ${
          decodedDepartment.toLowerCase() === 'admin'
            ? 'bg-brand-primary'
            : decodedDepartment.toLowerCase() === 'it'
            ? 'bg-brand-accent'
            : 'bg-brand-success'
        }`} />

        <div className="relative z-10">
          <TaskContent taskName={decodedTaskName} department={decodedDepartment} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// CENTRAL CONTENT SWITCHER FOR ALL 25 TASKS
// ==========================================
const TaskContent = ({ taskName, department }) => {
  const normName = taskName.toLowerCase().trim();
  const normDept = department.toLowerCase().trim();

  // Admin Tasks
  if (normDept === 'admin') {
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
        return <AdminExpenseTracking />;
      case 'document organization':
        return <AdminDocumentOrganization />;
      default:
        return <FallbackTask taskName={taskName} />;
    }
  }

  // IT Tasks
  if (normDept === 'it') {
    switch (normName) {
      case 'email/admin account management':
        return <ITAccountManagement />;
      case 'dns/server monitoring':
        return <ITServerMonitoring />;
      case 'ticket handling':
        return <ITTicketHandling />;
      case 'software/license tracking':
        return <ITLicenseTracking />;
      case 'backup monitoring':
        return <ITBackupMonitoring />;
      case 'dashboard/reporting':
        return <ITDashboardReporting />;
      case 'cloud/admin console activities':
        return <ITCloudConsole />;
      case 'system health alerts':
        return <ITHealthAlerts />;
      default:
        return <FallbackTask taskName={taskName} />;
    }
  }

  // HR Tasks
  if (normDept === 'hr') {
    switch (normName) {
      case 'resume screening':
        return <HRResumeScreening />;
      case 'interview scheduling':
        return <HRInterviewScheduling />;
      case 'onboarding workflows':
        return <HROnboardingWorkflows />;
      case 'attendance tracking':
        return <HRAttendanceTracking />;
      case 'leave management':
        return <HRLeaveManagement />;
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
  const { token } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/admin/assets`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
        if (data.length > 0) setSelectedAsset(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAssets();
  }, [token]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !selectedAsset) return;
    const targetAsset = assets.find(a => a.id === selectedAsset);
    if (!targetAsset) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/assets/${selectedAsset}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: targetAsset.name,
          serial_number: targetAsset.serial_number || 'MBP-2026-X83',
          category: targetAsset.category || 'Hardware',
          assigned_to: newName,
          assigned_name: newName,
          status: 'Assigned',
          purchase_date: targetAsset.purchase_date || '2026-05-01',
          value: targetAsset.value || 1500.00
        })
      });
      if (response.ok) {
        setNewName('');
        fetchAssets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRelease = async (id) => {
    const targetAsset = assets.find(a => a.id === id);
    if (!targetAsset) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/assets/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: targetAsset.name,
          serial_number: targetAsset.serial_number || 'MBP-2026-X83',
          category: targetAsset.category || 'Hardware',
          assigned_to: 'Available',
          assigned_name: 'Available',
          status: 'Storage',
          purchase_date: targetAsset.purchase_date || '2026-05-01',
          value: targetAsset.value || 1500.00
        })
      });
      if (response.ok) fetchAssets();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Track company hardware allocation, manage physical assignments, and log custody logs.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-text-muted text-xs py-4 text-center">Loading assets...</p>
          ) : assets.length === 0 ? (
            <p className="text-text-muted text-xs py-4 text-center">No hardware assets registered.</p>
          ) : (
            assets.map(asset => (
              <div key={asset.id} className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary flex items-center justify-between shadow-sm hover:border-brand-primary/30 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">{asset.name}</span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      asset.assigned_to && asset.assigned_to !== 'Available' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-bg-surface text-text-muted border-border-primary'
                    }`}>
                      {asset.status || (asset.assigned_to && asset.assigned_to !== 'Available' ? 'Assigned' : 'Storage')}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1 font-mono">SN: {asset.serial_number || 'n/a'} • Cat: {asset.category || 'Hardware'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary font-semibold">Assigned To:</p>
                  <p className={`text-xs font-bold ${(!asset.assigned_to || asset.assigned_to === 'Available') ? 'text-brand-success' : 'text-brand-primary'}`}>{asset.assigned_to || 'Available'}</p>
                  {asset.assigned_to && asset.assigned_to !== 'Available' && (
                    <button 
                      onClick={() => handleRelease(asset.id)}
                      className="text-[9px] text-brand-error hover:text-brand-error/80 font-bold uppercase mt-1 cursor-pointer transition-colors"
                    >
                      Unassign
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAssign} className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 flex flex-col justify-between space-y-4 shadow-sm h-fit">
          <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Fast Hardware Reassignment</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Select Asset</label>
              <select 
                value={selectedAsset} 
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer"
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
                placeholder="e.g. John Staff"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer hover:shadow active:scale-[0.98]"
          >
            Confirm Assignment
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminInventoryTracking = () => {
  const { token } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemMax, setNewItemMax] = useState('50');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/admin/inventory`, { headers });
      if (response.ok) {
        setStock(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInventory();
  }, [token]);

  const handleAdjust = async (id, val) => {
    const targetItem = stock.find(item => item.id === id);
    if (!targetItem) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/inventory/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: targetItem.name,
          category: targetItem.category || 'Office Supplies',
          quantity: Number(val),
          unit: targetItem.unit || 'pcs',
          min_threshold: targetItem.min_threshold || 5,
          location: targetItem.location || 'Bay C'
        })
      });
      if (response.ok) {
        setStock(prev => prev.map(item => item.id === id ? { ...item, quantity: Number(val) } : item));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemMax) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/inventory`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newItemName,
          category: 'Furniture',
          quantity: Math.round(Number(newItemMax) / 2),
          unit: newItemUnit,
          min_threshold: Math.round(Number(newItemMax) * 0.2),
          location: 'Bay C'
        })
      });
      if (response.ok) {
        setNewItemName('');
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Monitor office materials, stationery, and kitchen consumables. System triggers auto-reorders at 20%.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loading ? (
            <p className="text-text-muted text-xs py-4 text-center">Loading inventory...</p>
          ) : stock.length === 0 ? (
            <p className="text-text-muted text-xs py-4 text-center">No inventory tracked.</p>
          ) : (
            stock.map(item => {
              const maxVal = item.max || 100;
              const percentage = Math.round((item.quantity / maxVal) * 100);
              const isLow = percentage <= 20;

              return (
                <div key={item.id} className="space-y-2.5 p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary shadow-sm hover:border-brand-primary/20 transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-secondary">{item.name}</span>
                    <div className="flex items-center gap-2 font-semibold">
                      {isLow && (
                        <span className="text-[9px] font-bold uppercase text-brand-warning bg-brand-warning/10 border border-brand-warning/20 px-2 py-0.5 rounded animate-pulse">
                          ⚠️ Low Stock
                        </span>
                      )}
                      <span className={isLow ? 'text-brand-warning font-bold' : 'text-brand-primary font-bold'}>
                        {item.quantity} / {maxVal} {item.unit || 'pcs'} ({percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="range" 
                      min="0" 
                      max={maxVal} 
                      value={item.quantity} 
                      onChange={(e) => handleAdjust(item.id, e.target.value)}
                      className="flex-1 accent-brand-primary h-1.5 bg-bg-surface border border-border-primary rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Data Form */}
        <form onSubmit={handleAddItem} className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Add New Stock Category</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Item Label/Name</label>
              <input 
                type="text" 
                value={newItemName} 
                onChange={(e) => setNewItemName(e.target.value)} 
                placeholder="e.g. Ergonomic Chairs"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Max Capacity</label>
                <input 
                  type="number" 
                  value={newItemMax} 
                  onChange={(e) => setNewItemMax(e.target.value)} 
                  placeholder="50"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Unit</label>
                <input 
                  type="text" 
                  value={newItemUnit} 
                  onChange={(e) => setNewItemUnit(e.target.value)} 
                  placeholder="pcs / reams"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 rounded-xl text-xs font-bold uppercase text-brand-primary transition-all cursor-pointer"
          >
            Create Category Item
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminVendorCoordination = () => {
  const { token } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(null);
  const [newVendor, setNewVendor] = useState({ name: '', contact: '', phone: '', service: '' });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/admin/vendors`, { headers });
      if (response.ok) {
        const data = await response.json();
        setVendors(data.map(v => ({ ...v, activeLogs: [] })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchVendors();
  }, [token]);

  const handlePing = (id) => {
    setPinging(id);
    setVendors(vendors.map(v => {
      if (v.id === id) {
        return {
          ...v,
          activeLogs: [`[${new Date().toLocaleTimeString()}] Pinging telemetry gateway...`, ...(v.activeLogs || [])]
        };
      }
      return v;
    }));

    setTimeout(() => {
      setVendors(prev => prev.map(v => {
        if (v.id === id) {
          return {
            ...v,
            activeLogs: [`[${new Date().toLocaleTimeString()}] Handshake successful (200 OK) 🟢`, ...(v.activeLogs || [])]
          };
        }
        return v;
      }));
      setPinging(null);
    }, 1200);
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.service) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/vendors`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newVendor.name,
          contact_name: newVendor.contact || 'Jane Clean',
          email: newVendor.contact || 'support@globalsupply.com',
          phone: newVendor.phone || '+1-555-0199',
          services: newVendor.service,
          contract_start: new Date().toISOString().split('T')[0],
          contract_end: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
          status: 'Active'
        })
      });
      if (response.ok) {
        setNewVendor({ name: '', contact: '', phone: '', service: '' });
        fetchVendors();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/vendors/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchVendors();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Coordinate communications and check response handshakes for key facilities and hardware leasing partners.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
          {loading ? (
            <p className="text-text-muted text-xs py-4 text-center">Loading vendors...</p>
          ) : vendors.length === 0 ? (
            <p className="text-text-muted text-xs py-4 text-center">No vendors registered.</p>
          ) : (
            vendors.map(vendor => (
              <div key={vendor.id} className="p-5 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-3 hover:border-brand-primary/20 transition-all shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{vendor.name}</h4>
                    <p className="text-[10px] text-brand-primary font-bold uppercase mt-0.5">{vendor.services || vendor.service}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handlePing(vendor.id)}
                      disabled={pinging === vendor.id}
                      className="px-2.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 rounded-xl text-brand-primary font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {pinging === vendor.id ? '⚡ Pinging...' : '📞 Ping'}
                    </button>
                    <button 
                      onClick={() => handleDelete(vendor.id)}
                      className="px-2 py-1.5 bg-brand-error/10 border border-brand-error/20 hover:bg-brand-error/20 rounded-xl text-brand-error font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      ✗
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary border-t border-border-primary pt-2 font-mono">
                  <p className="truncate">Email: {vendor.email || vendor.contact}</p>
                  <p>Phone: {vendor.phone}</p>
                </div>
                {vendor.activeLogs && vendor.activeLogs.length > 0 && (
                  <div className="p-3 rounded-xl bg-bg-surface border border-border-primary text-[9px] font-mono text-brand-primary max-h-24 overflow-y-auto space-y-1">
                    {vendor.activeLogs.map((log, idx) => (
                      <p key={idx}>{log}</p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Vendor Form */}
        <form onSubmit={handleAddVendor} className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Register New Partner/Vendor</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Company/Vendor Name</label>
              <input 
                type="text" 
                value={newVendor.name} 
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} 
                placeholder="e.g. Global Supply Office Co."
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Core Service / Trade</label>
              <input 
                type="text" 
                value={newVendor.service} 
                onChange={(e) => setNewVendor({ ...newVendor, service: e.target.value })} 
                placeholder="e.g. Stationery & Printing"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Direct Email</label>
                <input 
                  type="email" 
                  value={newVendor.contact} 
                  onChange={(e) => setNewVendor({ ...newVendor, contact: e.target.value })} 
                  placeholder="support@globalsupply.com"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={newVendor.phone} 
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} 
                  placeholder="+1 (555) 234-9876"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer active:scale-[0.98]"
          >
            Add New Vendor
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminRemindersEscalations = () => {
  const { token } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newLevel, setNewLevel] = useState('HIGH');

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/admin/reminders`, { headers });
      if (response.ok) {
        setReminders(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReminders();
  }, [token]);

  const handleResolve = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/reminders/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/reminders`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDetail || 'No detailed abstract recorded.',
          type: newLevel === 'CRITICAL' ? 'Escalation' : 'Reminder',
          target_user: '6a0e8d5412817bbd568797fd',
          target_name: 'System Admin',
          status: 'Pending',
          due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
        })
      });
      if (response.ok) {
        setNewTitle('');
        setNewDetail('');
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        System warnings and administrative actions requiring overrides to prevent operations bottlenecks.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar">
          {loading ? (
            <p className="text-text-muted text-xs py-4 text-center">Loading escalations...</p>
          ) : reminders.length === 0 ? (
            <p className="text-text-muted text-xs py-4 text-center">No warnings logged.</p>
          ) : (
            reminders.map(rem => {
              const isResolved = rem.status === 'Resolved';
              const level = rem.type === 'Escalation' ? 'CRITICAL' : 'HIGH';
              return (
                <div key={rem.id} className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm ${
                  isResolved 
                    ? 'bg-brand-success/5 border-brand-success/10 opacity-60' 
                    : level === 'CRITICAL'
                    ? 'bg-brand-error/5 border-brand-error/15'
                    : 'bg-brand-warning/5 border-brand-warning/15'
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">{rem.title}</span>
                        {!isResolved && (
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            level === 'CRITICAL' 
                              ? 'bg-brand-error/20 text-brand-error' 
                              : 'bg-brand-warning/20 text-brand-warning'
                          }`}>
                            {level}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">{rem.description}</p>
                    </div>
                    <div>
                      {isResolved ? (
                        <span className="text-xs font-bold text-brand-success flex items-center gap-1.5">
                          🟢 Resolved
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleResolve(rem.id)}
                          className="px-3 py-1.5 bg-bg-surface hover:bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Reminder Form */}
        <form onSubmit={handleAddReminder} className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Create Custom Administrative Escalation</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Escalation Issue Title</label>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                placeholder="e.g. Renew Cleaners Contract"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Warning Details / Summary</label>
              <input 
                type="text" 
                value={newDetail} 
                onChange={(e) => setNewDetail(e.target.value)} 
                placeholder="Cleaners contract expires in 30 days."
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Risk Level</label>
              <select 
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value="CRITICAL">CRITICAL (Action needed now)</option>
                <option value="HIGH">HIGH Priority</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Launch Escalation
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminMeetingScheduling = () => {
  const { token } = useAuth();
  const [meeting, setMeeting] = useState({ title: '', room: 'Conference Room A', slot: '10:00 AM - 11:00 AM' });
  const [bookedMeetings, setBookedMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/meetings`, { headers });
      if (response.ok) {
        setBookedMeetings(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMeetings();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!meeting.title.trim()) return;
    setStatus('processing');
    try {
      const response = await fetch(`${API_URL}/api/admin/meetings`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: meeting.title,
          agenda: 'Scheduled boardroom discussion',
          room: meeting.room,
          date: new Date().toISOString().split('T')[0],
          start_time: meeting.slot.split(' - ')[0],
          end_time: meeting.slot.split(' - ')[1],
          attendees: []
        })
      });
      if (response.ok) {
        setStatus('done');
        setTimeout(() => setStatus(null), 3000);
        setMeeting({ title: '', room: 'Conference Room A', slot: '10:00 AM - 11:00 AM' });
        fetchMeetings();
      } else {
        setStatus(null);
      }
    } catch (err) {
      console.error(err);
      setStatus(null);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Reserve physical space and dispatch automatic calendar reminders to all attendees.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl bg-bg-surface-alt/40 border border-border-primary flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Book A Space</h4>
          <div>
            <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Meeting Purpose</label>
            <input 
              type="text" 
              value={meeting.title}
              onChange={(e) => setMeeting({ ...meeting, title: e.target.value })}
              placeholder="e.g. Q2 Performance Review"
              className="w-full bg-bg-surface border border-border-primary rounded-xl px-4 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Facility Room</label>
              <select 
                value={meeting.room}
                onChange={(e) => setMeeting({ ...meeting, room: e.target.value })}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value="Conference Room A">Conference Room A</option>
                <option value="Boardroom X">Boardroom X</option>
                <option value="Meeting Hub 4B">Meeting Hub 4B</option>
                <option value="Executive Suite">Executive Suite</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Available Hour</label>
              <select 
                value={meeting.slot}
                onChange={(e) => setMeeting({ ...meeting, slot: e.target.value })}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                <option value="04:30 PM - 05:30 PM">04:30 PM - 05:30 PM</option>
              </select>
            </div>
          </div>
          
          {status === 'processing' ? (
            <div className="py-2 flex items-center justify-center gap-2 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
              <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-brand-primary font-bold uppercase tracking-wider">Booking Slot...</span>
            </div>
          ) : status === 'done' ? (
            <div className="py-2 text-center bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl text-xs font-bold uppercase tracking-wider">
              ✓ Reservation Saved!
            </div>
          ) : (
            <button 
              type="submit"
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer active:scale-[0.98]"
            >
              Confirm Reservation
            </button>
          )}
        </form>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Active Reservations Board</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs py-4 text-center">Loading meetings...</p>
            ) : bookedMeetings.length === 0 ? (
              <p className="text-text-muted text-xs py-4 text-center">No active bookings.</p>
            ) : (
              bookedMeetings.map((b, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-bg-surface-alt border border-border-primary flex items-center justify-between text-xs font-mono shadow-sm">
                  <div>
                    <p className="text-text-primary font-bold">{b.title}</p>
                    <p className="text-[9px] text-brand-primary font-bold mt-1 uppercase">{b.room}</p>
                  </div>
                  <span className="text-[10px] text-text-muted">{b.start_time} - {b.end_time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminExpenseTracking = () => {
  const { token } = useAuth();
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [ledger, setLedger] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/admin/expenses`, { headers });
      if (response.ok) {
        setLedger(await response.json());
      } else {
        const fallbackRes = await fetch(`${API_URL}/api/expenses`, { headers });
        if (fallbackRes.ok) setLedger(await fallbackRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocs = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/documents`, { headers });
      if (response.ok) {
        setDocuments(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLedger();
      fetchDocs();
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !desc.trim()) return;
    const chosenDoc = documents.find(d => d.id === selectedDocId);
    try {
      const response = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category: 'Utilities',
          description: desc,
          date: new Date().toISOString().split('T')[0],
          document_id: selectedDocId || null,
          document_title: chosenDoc ? chosenDoc.title : null,
          document_url: chosenDoc ? chosenDoc.file_url : null
        })
      });
      if (response.ok) {
        setAmount('');
        setDesc('');
        setSelectedDocId('');
        fetchLedger();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAudit = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/expenses/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, comments: 'Audited from task console' })
      });
      if (response.ok) fetchLedger();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Instantly log general administrative purchases or navigate to the full expense folder.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary flex flex-col justify-between space-y-3 shadow-sm h-fit">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Quick Purchase Log</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Expense Description</label>
              <input 
                type="text" 
                placeholder="e.g. Office cleaning detergent"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Amount ($)</label>
              <input 
                type="number" 
                placeholder="Amount $"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Supporting Receipt / Doc</label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value="">-- No Supporting Document --</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>{d.title} ({d.category})</option>
                ))}
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2 bg-brand-primary/15 hover:bg-brand-primary/25 text-brand-primary rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-brand-primary/20 shadow-sm"
          >
            File Voucher
          </button>
        </form>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Workspace Expenses Ledger</h4>
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs py-4 text-center">Loading ledger...</p>
            ) : ledger.length === 0 ? (
              <p className="text-text-muted text-xs py-4 text-center">No logged claims.</p>
            ) : (
              ledger.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between text-xs font-mono shadow-sm">
                  <div>
                    <p className="text-text-primary font-bold max-w-[150px] truncate">
                      {item.description}
                      {item.document_url && (
                        <a 
                          href={item.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-0.5 ml-1.5 text-[9px] text-brand-primary hover:text-brand-primary/80 font-extrabold hover:underline"
                        >
                          📂
                        </a>
                      )}
                    </p>
                    <p className="text-[9px] text-brand-primary font-bold uppercase">{item.user_name || 'Staff'}</p>
                    <p className="text-[8px] text-text-muted">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-primary font-extrabold">${item.amount.toFixed(2)}</p>
                    {item.status === 'Pending' ? (
                      <div className="flex gap-1 mt-1 justify-end">
                        <button 
                          onClick={() => handleAudit(item.id, 'Approved')}
                          className="px-1.5 py-0.5 bg-brand-success/20 text-brand-success hover:bg-brand-success/30 border border-brand-success/30 rounded text-[8px] font-black uppercase cursor-pointer"
                        >
                          ✓
                        </button>
                        <button 
                          onClick={() => handleAudit(item.id, 'Rejected')}
                          className="px-1.5 py-0.5 bg-brand-error/20 text-brand-error hover:bg-brand-error/30 border border-brand-error/30 rounded text-[8px] font-black uppercase cursor-pointer"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[8px] font-bold uppercase tracking-wider block mt-1 ${
                        item.status === 'Approved' ? 'text-brand-success' : 'text-brand-error'
                      }`}>{item.status}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="text-center pt-2 border-t border-border-primary">
        <Link 
          to="/expenses" 
          className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-bold hover:underline cursor-pointer"
        >
          View Full Expense Portal ↗
        </Link>
      </div>
    </div>
  );
};

const AdminDocumentOrganization = () => {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [docTitle, setDocTitle] = useState('');
  const [docFolder, setDocFolder] = useState('Finance');
  const [docSummary, setDocSummary] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setDocs(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDocs();
  }, [token]);

  const handleSelectFolder = (folder) => {
    setActiveFolder(activeFolder === folder ? null : folder);
    setSelectedFile(null);
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/documents`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: docTitle,
          category: docFolder,
          description: docSummary || 'No detailed file description recorded.',
          file_url: docUrl || 'https://workpulse.com/files/placeholder.pdf',
          is_public: true
        })
      });
      if (response.ok) {
        setDocTitle('');
        setDocSummary('');
        setDocUrl('');
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Folders to display
  const folders = ['Finance', 'Contracts', 'Board', 'Policies'];
  
  // Group documents by category/folder
  const getDocsInFolder = (folderName) => {
    return docs.filter(d => (d.category || '').toLowerCase() === folderName.toLowerCase());
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Browse cloud folders and review administrative PDF contracts and compliance audit summaries.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          {loading ? (
            <p className="text-text-muted text-xs py-4 text-center">Loading directories...</p>
          ) : (
            folders.map(folder => {
              const folderDocs = getDocsInFolder(folder);
              return (
                <div key={folder} className="space-y-2">
                  <button
                    onClick={() => handleSelectFolder(folder)}
                    className="w-full p-3 bg-bg-surface-alt/40 border border-border-primary hover:border-brand-primary/20 flex items-center justify-between font-bold text-xs text-text-primary text-left transition-colors cursor-pointer rounded-xl shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      📁 {folder} Files Directory
                    </span>
                    <span className="text-[10px] text-text-muted font-semibold">{folderDocs.length} assets</span>
                  </button>
                  
                  {activeFolder === folder && (
                    <div className="pl-4 space-y-2 animate-fadeIn">
                      {folderDocs.length === 0 ? (
                        <p className="text-text-muted text-[10px] italic py-2 pl-2">No documents in this folder.</p>
                      ) : (
                        folderDocs.map(file => (
                          <button
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            className={`w-full p-3 rounded-xl border flex items-center justify-between text-[11px] font-mono text-left transition-colors cursor-pointer ${
                              selectedFile?.id === file.id 
                                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' 
                                : 'bg-bg-surface border-border-primary text-text-secondary hover:bg-bg-surface-alt'
                            }`}
                          >
                            <span>📄 {file.title}</span>
                            <span className="text-[9px] text-text-muted font-bold uppercase">PDF</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {selectedFile && (
            <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 space-y-2 animate-fadeIn mt-4 shadow-sm text-text-primary">
              <div className="flex justify-between items-center text-[10px] font-bold text-brand-primary uppercase tracking-wider">
                <span>Doc Abstract</span>
                <span>Ref: {selectedFile.created_by || 'Admin'}</span>
              </div>
              <p className="text-xs text-text-primary font-bold">{selectedFile.title}</p>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">{selectedFile.description}</p>
              <a 
                href={selectedFile.file_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block mt-2 px-3 py-1 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary text-[10px] font-bold uppercase rounded cursor-pointer transition-all"
              >
                View Document Resource ↗
              </a>
            </div>
          )}
        </div>

        {/* Add Document Form */}
        <form onSubmit={handleAddDocument} className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 space-y-3.5 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Upload New Document Placeholder</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Document File Name</label>
              <input 
                type="text" 
                value={docTitle} 
                onChange={(e) => setDocTitle(e.target.value)} 
                placeholder="e.g. Q2_Tax_Summary"
                required
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Mock File URL (Optional)</label>
              <input 
                type="text" 
                value={docUrl} 
                onChange={(e) => setDocUrl(e.target.value)} 
                placeholder="https://workpulse.com/files/Q2_Tax.pdf"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Select Folder</label>
                <select 
                  value={docFolder}
                  onChange={(e) => setDocFolder(e.target.value)}
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="Finance">Finance</option>
                  <option value="Contracts">Contracts</option>
                  <option value="Board">Board</option>
                  <option value="Policies">Policies</option>
                </select>
              </div>
              <div className="flex flex-col justify-end text-right">
                <span className="text-[8px] text-text-muted uppercase tracking-wider mb-1">Upload engine online</span>
                <span className="text-[10px] text-brand-primary font-bold">PDF Auto Encrypted</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Document Summary Abstract</label>
              <textarea 
                rows="2"
                value={docSummary} 
                onChange={(e) => setDocSummary(e.target.value)} 
                placeholder="Describe this document's contents..."
                className="w-full bg-bg-surface border border-border-primary rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            Publish Document
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// IT WORKSPACE COMPONENT DASHBOARDS
// ==========================================

const ITAccountManagement = () => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('IT Engineer');

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/users`, { headers });
      if (response.ok) {
        setAccounts(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  const toggleStatus = async (id, currentRole) => {
    const nextRole = currentRole === 'it' ? 'general' : 'it';
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: nextRole })
      });
      if (response.ok) fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = (email) => {
    alert(`Dispatched temporary password reset hash link to ${email} 🟢`);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      const formattedEmail = newEmail.includes('@') ? newEmail.toLowerCase() : `${newEmail.toLowerCase()}@workpulse.com`;
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName,
          email: formattedEmail,
          password: 'default123',
          role: newRole === 'IT Engineer' ? 'it' : 'general',
          department: 'IT'
        })
      });
      if (response.ok) {
        setNewName('');
        setNewEmail('');
        fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Suspend systems access or force credentials synchronization loops for corporate mail accounts.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-text-muted text-xs text-center py-4">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-4">No accounts found.</p>
          ) : (
            accounts.map(acc => (
              <div key={acc.id} className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-3 shadow-sm hover:border-brand-accent/20 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-text-primary leading-none">{acc.name}</p>
                    <p className="text-[10px] text-text-muted mt-1">{acc.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                      acc.role === 'it' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : 'bg-bg-surface text-text-muted border border-border-primary'
                    }`}>
                      {acc.role === 'it' ? 'IT Staff' : 'General'}
                    </span>
                    
                    <button
                      onClick={() => toggleStatus(acc.id, acc.role)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                        acc.role === 'it' ? 'bg-brand-accent' : 'bg-bg-surface border border-border-primary'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform transform shadow-sm ${
                        acc.role === 'it' ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-border-primary pt-2">
                  <span className="text-[9px] text-text-muted font-bold uppercase">{acc.department || 'Engineering'}</span>
                  <button 
                    onClick={() => handleReset(acc.email)}
                    className="text-[9px] text-brand-accent hover:text-brand-accent/80 font-bold uppercase cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleCreateAccount} className="p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 space-y-3.5 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider">Deploy New Corporate Mail Account</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Employee Full Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Ellen Ripley"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Mail Prefix</label>
              <input 
                type="text" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="e.g. e.ripley"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Corporate System Role</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent cursor-pointer"
              >
                <option value="IT Engineer">IT Engineer</option>
                <option value="System Operator">System Operator</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            Provision Active Mailbox
          </button>
        </form>
      </div>
    </div>
  );
};

const ITServerMonitoring = () => {
  const { theme } = useTheme();
  const [latency, setLatency] = useState(48);
  const [points, setPoints] = useState([45, 52, 40, 60, 50, 48, 55, 42, 49, 48]);
  const canvasRef = useRef(null);

  const [overrideRules, setOverrideRules] = useState([
    { dns: 'api.workpulse.com', rule: 'Bypass VPN Gateway', updated: '13:40' },
    { dns: 'mock.database.cluster', rule: 'Force SSL 1.3 Encryption', updated: '13:41' }
  ]);
  const [newDns, setNewDns] = useState('');
  const [newRule, setNewRule] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const delta = Math.floor(Math.random() * 20) - 10;
      const nextLat = Math.max(30, Math.min(120, latency + delta));
      setLatency(nextLat);
      setPoints(prev => [...prev.slice(1), nextLat]);
    }, 1500);
    return () => clearInterval(timer);
  }, [latency]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const isDark = theme === 'dark';
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    ctx.strokeStyle = isDark ? '#0ea5e9' : '#0284c7'; // brand-accent
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = isDark ? 'rgba(14, 165, 233, 0.4)' : 'rgba(2, 132, 199, 0.2)';
    ctx.beginPath();

    const w = canvas.width / (points.length - 1);
    points.forEach((pt, idx) => {
      const x = idx * w;
      const y = canvas.height - ((pt - 20) / 100) * canvas.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0; 
  }, [points, theme]);

  const handleAddRule = (e) => {
    e.preventDefault();
    if (!newDns.trim() || !newRule.trim()) return;
    const ruleNode = {
      dns: newDns,
      rule: newRule,
      updated: new Date().toLocaleTimeString().substring(0, 5)
    };
    setOverrideRules([...overrideRules, ruleNode]);
    setNewDns('');
    setNewRule('');
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Real-time telemetry measuring DNS resolve operations, latency buffers, and load capacity averages.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-3 h-fit shadow-sm">
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
            height="140" 
            className="w-full bg-bg-surface border border-border-primary rounded-xl shadow-inner"
          />
        </div>

        <div className="space-y-3 p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 shadow-sm">
          <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider">DNS Resolve Tweak Console</h4>
          
          <form onSubmit={handleAddRule} className="grid grid-cols-2 gap-2 text-xs">
            <input 
              type="text" 
              value={newDns}
              onChange={(e) => setNewDns(e.target.value)}
              placeholder="DNS Endpoint Address"
              className="bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
            />
            <input 
              type="text" 
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Override Action"
              className="bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
            />
            <button 
              type="submit" 
              className="col-span-2 py-2 bg-brand-accent/15 border border-brand-accent/20 hover:bg-brand-accent/25 text-brand-accent text-xs font-bold uppercase rounded-xl cursor-pointer transition-all"
            >
              Inject DNS Override Route
            </button>
          </form>

          <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar font-mono text-[9px] pt-1">
            {overrideRules.map((r, idx) => (
              <p key={idx} className="p-1.5 rounded bg-bg-surface border border-border-primary text-text-secondary">
                [{r.updated}] <span className="text-brand-accent font-semibold">{r.dns}</span> → <span className="text-text-primary">{r.rule}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ITTicketHandling = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tTitle, setTTitle] = useState('');
  const [tAuthor, setTAuthor] = useState('');
  const [tPriority, setTPriority] = useState('HIGH');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/tickets`, { headers });
      if (response.ok) {
        setTickets(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTickets();
  }, [token]);

  const handleResolve = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${id}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resolution_notes: 'Resolved via IT systems admin dashboard' })
      });
      if (response.ok) fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTicket = async (e) => {
    e.preventDefault();
    if (!tTitle.trim() || !tAuthor.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: tTitle,
          description: `Triaged by ${tAuthor} via IT Systems Portal`,
          priority: tPriority,
          target_department: 'IT'
        })
      });
      if (response.ok) {
        setTTitle('');
        setTAuthor('');
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTickets = tickets.filter(t => t.status === 'Open');
  const closedTicketsCount = tickets.filter(t => t.status === 'Closed').length;

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Manage queue metrics, triage database exceptions, and reallocate support issues.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Active Queue', count: openTickets.length, color: 'text-brand-error bg-brand-error/10 border-brand-error/20' },
          { label: 'Dev Ops Pending', count: openTickets.filter(t => t.priority === 'CRITICAL').length, color: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20' },
          { label: 'Total Solved', count: closedTicketsCount, color: 'text-brand-success bg-brand-success/10 border-brand-success/20' }
        ].map(card => (
          <div key={card.label} className={`p-4 rounded-2xl border text-center bg-bg-surface-alt/40 border-border-primary shadow-sm`}>
            <h4 className="text-[10px] uppercase font-bold tracking-wider leading-none text-text-muted">{card.label}</h4>
            <p className="text-3xl font-black mt-2 font-mono text-text-primary">{card.count}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 bg-bg-surface border border-border-primary rounded-2xl space-y-2.5 shadow-sm">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top Priority Ticket Queue</h4>
          <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs text-center py-4">Loading ticket log...</p>
            ) : openTickets.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">Queue empty. Good work!</p>
            ) : (
              openTickets.map(t => (
                <div key={t.id} className="p-2.5 rounded-xl bg-bg-surface-alt border border-border-primary flex items-center justify-between text-xs font-mono shadow-sm">
                  <div>
                    <p className="text-text-primary font-bold">{t.title} <span className="text-brand-accent font-extrabold">#{t.id.substring(18)}</span></p>
                    <p className="text-[9px] text-text-muted mt-0.5">Raised by: {t.user_name || 'Staff'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                      t.priority === 'CRITICAL' ? 'bg-brand-error/20 text-brand-error border-brand-error/30' : 'bg-brand-warning/20 text-brand-warning border-brand-warning/30'
                    }`}>{t.priority}</span>
                    <button 
                      onClick={() => handleResolve(t.id)}
                      className="text-[9px] text-brand-success hover:text-brand-success/80 font-bold uppercase cursor-pointer"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleAddTicket} className="p-4 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 space-y-3 flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider">File Critical Engineering Ticket</h4>
          <div className="space-y-2">
            <input 
              type="text" 
              value={tTitle}
              onChange={(e) => setTTitle(e.target.value)}
              placeholder="Ticket Title / Exception Name"
              className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" 
                value={tAuthor}
                onChange={(e) => setTAuthor(e.target.value)}
                placeholder="Your Initials"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
              <select 
                value={tPriority}
                onChange={(e) => setTPriority(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent cursor-pointer"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2 bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer border border-brand-accent/20"
          >
            Submit Bug Ticket
          </button>
        </form>
      </div>

      <div className="text-center pt-2 border-t border-border-primary">
        <Link 
          to="/tickets" 
          className="inline-flex items-center gap-1.5 text-xs text-brand-accent font-bold hover:underline cursor-pointer"
        >
          View Full Ticket Console ↗
        </Link>
      </div>
    </div>
  );
};

const ITLicenseTracking = () => {
  const { token } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('$500/mo');
  const [newSeats, setNewSeats] = useState('20');

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/admin/inventory`, { headers });
      if (response.ok) {
        const data = await response.json();
        setLicenses(data.filter(item => item.category === 'Software'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLicenses();
  }, [token]);

  const handleAddSeats = async (id, currentItem) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...currentItem,
          quantity: currentItem.quantity + 10
        })
      });
      if (response.ok) fetchLicenses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLicense = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newSeats) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/inventory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName,
          category: 'Software',
          quantity: Math.round(Number(newSeats) / 2),
          unit: 'Seats',
          min_threshold: Math.round(Number(newSeats) * 0.2),
          location: newCost
        })
      });
      if (response.ok) {
        setNewName('');
        fetchLicenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify operational SaaS subscription limits, evaluate seat capacities, and extend licenses.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-text-muted text-xs text-center py-4">Loading active SaaS profiles...</p>
          ) : licenses.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-4">No active tool trackers deployed.</p>
          ) : (
            licenses.map(lic => {
              const maxVal = lic.max_threshold * 5 || 100;
              const percentage = Math.round((lic.quantity / maxVal) * 100) || 45;
              
              return (
                <div key={lic.id} className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-3 shadow-sm hover:border-brand-accent/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{lic.name}</h4>
                      <p className="text-[10px] text-text-muted font-mono">Cost: {lic.location || '$400/mo'}</p>
                    </div>
                    <button
                      onClick={() => handleAddSeats(lic.id, lic)}
                      className="px-2.5 py-1 bg-brand-accent/10 border border-brand-accent/20 hover:bg-brand-accent/20 rounded-lg text-brand-accent font-bold text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      +10 Seats
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-text-secondary font-mono">
                      <span>Assigned Seats</span>
                      <span>{lic.quantity} / {maxVal} Seats ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-bg-surface border border-border-primary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-accent transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleAddLicense} className="p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 space-y-3.5 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider">Configure SaaS Tool Seat Tracker</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Software Title</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Figma Enterprise"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Cost / Billing interval</label>
                <input 
                  type="text" 
                  value={newCost} 
                  onChange={(e) => setNewCost(e.target.value)} 
                  placeholder="$200/mo"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Max Seat Capacity</label>
                <input 
                  type="number" 
                  value={newSeats} 
                  onChange={(e) => setNewSeats(e.target.value)} 
                  placeholder="50"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                />
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            Deploy Tracker
          </button>
        </form>
      </div>
    </div>
  );
};

const ITDashboardReporting = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [repTitle, setRepTitle] = useState('');
  const [repType, setRepType] = useState('Security Audit');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/reports`, { headers });
      if (response.ok) {
        setReports(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReports();
  }, [token]);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!repTitle.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: repTitle,
          type: repType,
          description: `Automated ${repType} compiled for IT Systems load average.`
        })
      });
      if (response.ok) {
        setRepTitle('');
        fetchReports();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify system analytics, traffic load averages, and error registries.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-4 h-fit shadow-sm">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Dynamic Load Telemetry</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-secondary">CPU Core Cluster Load</span>
              <span className="text-brand-accent font-mono">23% / 100%</span>
            </div>
            <div className="w-full h-2 bg-bg-surface border border-border-primary rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent" style={{ width: '23%' }} />
            </div>
            
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="font-bold text-text-secondary">Memory Cluster Buffer</span>
              <span className="text-brand-accent font-mono">4.2 GB / 16.0 GB</span>
            </div>
            <div className="w-full h-2 bg-bg-surface border border-border-primary rounded-full overflow-hidden">
              <div className="h-full bg-brand-primary" style={{ width: '26%' }} />
            </div>
          </div>
        </div>

        <form onSubmit={handleGenerateReport} className="p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 space-y-3.5 flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider">Generate Custom Telemetry Audit</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Audit Report Scope</label>
              <input 
                type="text" 
                value={repTitle} 
                onChange={(e) => setRepTitle(e.target.value)} 
                placeholder="e.g. Database load index audit"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Report Category</label>
              <select 
                value={repType}
                onChange={(e) => setRepType(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent cursor-pointer"
              >
                <option value="Performance">Performance Evaluation</option>
                <option value="Security Audit">Security Audit</option>
                <option value="SLA Audit">SLA Audit Compliance</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-accent/20 hover:bg-brand-accent/30 border border-brand-accent/30 text-brand-accent text-xs font-bold uppercase rounded-xl cursor-pointer"
          >
            Compile PDF Report
          </button>
        </form>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Audit Documentation Ledger</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar font-mono text-xs">
          {loading ? (
            <p className="text-text-muted text-xs text-center py-4">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-4">No logged reports.</p>
          ) : (
            reports.map((rep, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-text-primary font-bold">{rep.title}</p>
                  <span className="text-[8px] text-brand-accent font-extrabold uppercase">{rep.type}</span>
                </div>
                <span className="text-[10px] text-text-muted">{rep.generated_at ? rep.generated_at.substring(0, 10) : '2026-05-26'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-center pt-2 border-t border-border-primary">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs text-brand-accent font-bold hover:underline cursor-pointer"
        >
          View Full Dashboard Analytics ↗
        </Link>
      </div>
    </div>
  );
};

const ITCloudConsole = () => {
  const [nodes, setNodes] = useState(3);
  const [nodeList, setNodeList] = useState([
    { id: 1, name: 'AWS us-east-node-1', size: '16GB RAM / 4 vCPU' },
    { id: 2, name: 'AWS us-east-node-2', size: '16GB RAM / 4 vCPU' },
    { id: 3, name: 'AWS us-east-node-3', size: '32GB RAM / 8 vCPU' }
  ]);

  const [nodename, setNodename] = useState('');
  const [nodesize, setNodesize] = useState('16GB RAM / 4 vCPU');

  const handleProvisionNode = (e) => {
    e.preventDefault();
    if (!nodename.trim()) return;
    const nodeItem = {
      id: Date.now(),
      name: nodename.startsWith('AWS') ? nodename : `AWS ${nodename}`,
      size: nodesize
    };
    setNodeList([...nodeList, nodeItem]);
    setNodes(nodes + 1);
    setNodename('');
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Upscale CPU node capacities or transfer traffic between multi-region server clusters.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 bg-bg-surface-alt/40 border border-border-primary rounded-2xl space-y-4 h-fit shadow-sm">
          <div className="flex justify-between items-center text-xs">
            <div>
              <h4 className="font-bold text-text-primary">Active Server Nodes</h4>
              <p className="text-[10px] text-text-muted font-mono">Region: AWS (us-east-1)</p>
            </div>
            <span className="text-xl font-extrabold text-brand-accent font-mono">{nodes} / 8</span>
          </div>

          <div className="space-y-1">
            <input 
              type="range" 
              min="1" 
              max="8" 
              value={nodes} 
              onChange={(e) => setNodes(Number(e.target.value))}
              className="w-full accent-brand-accent h-1.5 bg-bg-surface border border-border-primary rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex justify-center gap-2 pt-2 flex-wrap">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div 
                key={idx} 
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black font-mono border transition-all duration-300 ${
                  idx < nodes 
                    ? 'bg-brand-accent/20 border-brand-accent/40 text-brand-accent shadow-sm' 
                    : 'bg-bg-surface border-border-primary text-text-muted/30'
                }`}
              >
                N{idx + 1}
              </div>
            ))}
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar font-mono text-[9px] border-t border-border-primary pt-3">
            {nodeList.map(n => (
              <div key={n.id} className="flex justify-between items-center p-1.5 rounded bg-bg-surface border border-border-primary">
                <span className="text-brand-accent font-bold">● {n.name}</span>
                <span className="text-text-secondary">{n.size}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleProvisionNode} className="p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider">Provision Cloud VPS Instance</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Node Identifier tag</label>
              <input 
                type="text" 
                value={nodename} 
                onChange={(e) => setNodename(e.target.value)} 
                placeholder="e.g. us-east-node-4"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Core VPS Size / Spec</label>
              <select 
                value={nodesize}
                onChange={(e) => setNodesize(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent cursor-pointer"
              >
                <option value="16GB RAM / 4 vCPU">Medium (16GB RAM / 4 vCPU)</option>
                <option value="32GB RAM / 8 vCPU">Heavy (32GB RAM / 8 vCPU)</option>
                <option value="64GB RAM / 16 vCPU">Enterprise (64GB RAM / 16 vCPU)</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer active:scale-[0.98]"
          >
            Deploy Instance VPS
          </button>
        </form>
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

  const [manualMsg, setManualMsg] = useState('');
  const [manualType, setManualType] = useState('INFO');

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
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handlePostLog = (e) => {
    e.preventDefault();
    if (!manualMsg.trim()) return;
    const manualNode = {
      id: Date.now(),
      type: manualType,
      msg: manualMsg,
      time: new Date().toTimeString().split(' ')[0]
    };
    setLogs([manualNode, ...logs]);
    setManualMsg('');
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Live operations log stream. Randomized events populate reactively.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-3 font-mono h-fit shadow-sm">
          <h4 className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Telemetry Live Log Feed</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
            {logs.map(log => (
              <div key={log.id} className="text-[10px] leading-relaxed flex items-start gap-2 border-b border-border-primary pb-1.5 animate-fadeIn">
                <span className="text-text-muted shrink-0">[{log.time}]</span>
                <span className={`font-black shrink-0 ${
                  log.type === 'ALERT' ? 'text-brand-error' : log.type === 'WARN' ? 'text-brand-warning' : 'text-brand-accent'
                }`}>
                  [{log.type}]
                </span>
                <span className="text-text-secondary">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handlePostLog} className="p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider">Broadcaster Alert terminal</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Broadcaster Log message</label>
              <input 
                type="text" 
                value={manualMsg} 
                onChange={(e) => setManualMsg(e.target.value)} 
                placeholder="e.g. Server upscaled to AWS us-east-node-4"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Severity Flag</label>
              <select 
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent cursor-pointer"
              >
                <option value="INFO">INFO Flag (Generic Updates)</option>
                <option value="WARN">WARN Flag (Network buffers/alarms)</option>
                <option value="ALERT">ALERT Flag (Security Overrides/Exceptions)</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-accent/25 border border-brand-accent/30 text-brand-accent rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Post Alert Broadcast
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// HR WORKSPACE COMPONENT DASHBOARDS
// ==========================================

const HRResumeScreening = () => {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candName, setCandName] = useState('');
  const [candRole, setCandRole] = useState('Fullstack Developer');
  const [candRating, setCandRating] = useState('4');
  const [candExp, setCandExp] = useState('');

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/candidates`, { headers });
      if (response.ok) {
        setCandidates(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCandidates();
  }, [token]);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!candName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/hr/candidates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: candName,
          email: 'applicant@workpulse.com',
          phone: '+1-555-0100',
          experience_years: parseFloat(candRating) || 3.0,
          role_applied: candRole,
          skills: [candRole.split(' ')[0] || 'Technical'],
          resume_url: 'https://workpulse.com/resumes/dummy.pdf',
          notes: candExp || 'Screened via manual filing.'
        })
      });
      if (response.ok) {
        setCandName('');
        setCandExp('');
        fetchCandidates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Access resume parsing summaries, evaluate skill metrics, and manage candidates.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Screened Candidates Registry</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs text-center py-4">Loading dossier list...</p>
            ) : candidates.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">No candidates screened yet.</p>
            ) : (
              candidates.map(cand => (
                <div key={cand.id} className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary flex items-center justify-between shadow-sm hover:border-brand-success/20 transition-all">
                  <div>
                    <p className="text-sm font-bold text-text-primary leading-none">{cand.name}</p>
                    <p className="text-[10px] text-brand-success font-bold uppercase mt-1.5">{cand.role_applied || cand.role}</p>
                    <p className="text-[9px] text-text-muted mt-1 font-mono">Exp: {cand.experience_years} years • Status: {cand.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-brand-success">{'★'.repeat(cand.score || 4)}</span>
                    <p className="text-[8px] text-text-muted uppercase tracking-widest font-black mt-1">Grade</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleAddCandidate} className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-3.5 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider text-left">Manually File Applicant CV Dossier</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Applicant Name</label>
              <input 
                type="text" 
                value={candName} 
                onChange={(e) => setCandName(e.target.value)} 
                placeholder="e.g. Arthur Dent"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Target Role</label>
                <select 
                  value={candRole}
                  onChange={(e) => setCandRole(e.target.value)}
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success cursor-pointer"
                >
                  <option value="Fullstack Developer">Fullstack Dev</option>
                  <option value="Python Engineer">Python Engineer</option>
                  <option value="DevOps Specialist">DevOps Specialist</option>
                  <option value="UI UX Designer">UI UX Designer</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Experience Rating</label>
                <select 
                  value={candRating}
                  onChange={(e) => setCandRating(e.target.value)}
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success cursor-pointer"
                >
                  <option value="5">5 Years (Senior)</option>
                  <option value="4">4 Years (Mid-level)</option>
                  <option value="3">3 Years (Associate)</option>
                  <option value="2">2 Years (Junior)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Abstract Experience profile</label>
              <input 
                type="text" 
                value={candExp} 
                onChange={(e) => setCandExp(e.target.value)} 
                placeholder="e.g. 5 yrs React development. Strong FastAPI backend."
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            File Screening Dossier
          </button>
        </form>
      </div>

      <div className="text-center pt-2 border-t border-border-primary">
        <Link 
          to="/hr" 
          className="inline-flex py-2 px-4 bg-brand-success/10 border border-brand-success/20 rounded-xl text-xs font-bold uppercase text-brand-success hover:bg-brand-success/20"
        >
          Launch HR Recruitment Hub
        </Link>
      </div>
    </div>
  );
};

const HRInterviewScheduling = () => {
  const { token } = useAuth();
  const [boardSlots, setBoardSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cName, setCName] = useState('');
  const [cDate, setCDate] = useState('');
  const [cSlot, setCSlot] = useState('10:00 AM');

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/interviews`, { headers });
      if (response.ok) {
        setBoardSlots(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInterviews();
  }, [token]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!cName.trim() || !cDate) return;
    try {
      const response = await fetch(`${API_URL}/api/hr/interviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidate_id: 'manual_slot_id',
          candidate_name: cName,
          interviewer_name: 'Sophia HR',
          date: `${cDate}T${cSlot === '10:00 AM' ? '10:00:00' : '14:30:00'}Z`,
          format: 'Video Call',
          meeting_link: 'https://meet.google.com/abc-defg-hij',
          notes: 'Manually logged boardroom slot.'
        })
      });
      if (response.ok) {
        setCName('');
        setCDate('');
        fetchInterviews();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Dispatch digital meeting coordinates or trigger automated AI Interview Invites.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleAddSlot} className="space-y-4 p-5 rounded-2xl bg-bg-surface-alt/40 border border-border-primary flex flex-col justify-between shadow-sm h-fit">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Book Interview Slot</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Candidate Full Name</label>
              <input 
                type="text" 
                value={cName} 
                onChange={(e) => setCName(e.target.value)} 
                placeholder="e.g. Ford Prefect"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Interview Date</label>
                <input 
                  type="date" 
                  value={cDate} 
                  onChange={(e) => setCDate(e.target.value)} 
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Time Slot</label>
                <select 
                  value={cSlot}
                  onChange={(e) => setCSlot(e.target.value)}
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success cursor-pointer"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            Log scheduled Interview
          </button>
        </form>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Scheduled Boardroom Meetings</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs text-center py-4">Loading agenda board...</p>
            ) : boardSlots.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">No active schedules recorded.</p>
            ) : (
              boardSlots.map((slot, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between text-xs font-mono shadow-sm animate-fadeIn">
                  <div>
                    <p className="text-text-primary font-bold">{slot.candidate_name}</p>
                    <p className="text-[8px] text-brand-success font-bold uppercase tracking-widest mt-1">{slot.interviewer_name || 'HR'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-primary font-bold">{slot.date ? slot.date.substring(11, 16) : '10:00'}</p>
                    <p className="text-[8px] text-text-muted uppercase mt-0.5">{slot.date ? slot.date.substring(0, 10) : '2026-05-26'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="text-center pt-2 border-t border-border-primary">
        <Link 
          to="/hr" 
          className="inline-flex py-2 px-4 bg-brand-success/10 border border-brand-success/20 rounded-xl text-xs font-bold uppercase text-brand-success hover:bg-brand-success/20"
        >
          Open Schedulers in HR Hub
        </Link>
      </div>
    </div>
  );
};

const HROnboardingWorkflows = () => {
  const { token } = useAuth();
  const [onboardings, setOnboardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWorkflowTask, setNewWorkflowTask] = useState('');

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/onboarding`, { headers });
      if (response.ok) {
        setOnboardings(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchOnboarding();
  }, [token]);

  const toggleWorkflow = async (onbId, taskId) => {
    try {
      const response = await fetch(`${API_URL}/api/hr/onboarding/${onbId}/tasks/${taskId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchOnboarding();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newWorkflowTask.trim() || onboardings.length === 0) return;
    const targetOnb = onboardings[0];
    const updatedTasks = [
      ...targetOnb.tasks,
      { id: `t${Date.now()}`, title: newWorkflowTask, completed: false, due_date: '2026-06-01' }
    ];
    try {
      const response = await fetch(`${API_URL}/api/hr/onboarding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: targetOnb.employee_id,
          employee_name: targetOnb.employee_name,
          tasks: updatedTasks
        })
      });
      if (response.ok) {
        setNewWorkflowTask('');
        fetchOnboarding();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const firstOnb = onboardings[0] || { employee_name: 'None Active', tasks: [] };
  const doneCount = firstOnb.tasks.filter(w => w.completed).length;
  const percentage = firstOnb.tasks.length > 0 ? Math.round((doneCount / firstOnb.tasks.length) * 100) : 0;

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Track progress checklists for recently hired employees.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-5 bg-bg-surface-alt/40 border border-border-primary rounded-2xl space-y-3 shadow-sm">
            <div className="flex justify-between items-center text-xs">
              <div>
                <h4 className="font-bold text-text-primary">Employee Onboarding progress</h4>
                <p className="text-[10px] text-text-muted">Target hire: {firstOnb.employee_name}</p>
              </div>
              <span className="text-sm font-extrabold text-brand-success font-mono">{percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-bg-surface border border-border-primary rounded-full overflow-hidden">
              <div className="h-full bg-brand-success transition-all duration-300" style={{ width: `${percentage}%` }} />
            </div>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs text-center py-4">Loading onboarding workflows...</p>
            ) : firstOnb.tasks.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">No active onboarding steps mapped.</p>
            ) : (
              firstOnb.tasks.map(w => (
                <button 
                  key={w.id}
                  onClick={() => toggleWorkflow(firstOnb.id, w.id)}
                  className="w-full p-3.5 rounded-xl bg-bg-surface border border-border-primary hover:border-brand-success/20 flex items-center gap-3 text-left text-xs text-text-secondary cursor-pointer shadow-sm transition-all"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    w.completed ? 'bg-brand-success/20 border-brand-success/40 text-brand-success' : 'border-border-primary'
                  }`}>
                    {w.completed && '✓'}
                  </div>
                  <span className={w.completed ? 'line-through text-text-muted' : ''}>{w.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleAddTask} className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider">Deploy Custom Onboarding Step</h4>
          <div>
            <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Onboarding Checklist Task Description</label>
            <input 
              type="text" 
              value={newWorkflowTask} 
              onChange={(e) => setNewWorkflowTask(e.target.value)} 
              placeholder="e.g. Schedule onboarding lunch meeting"
              className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success/20 hover:bg-brand-success/30 border border-brand-success/30 text-brand-success rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Inject Onboarding Task
          </button>
        </form>
      </div>
    </div>
  );
};

const HRAttendanceTracking = () => {
  const { token } = useAuth();
  const [weeklyPresence, setWeeklyPresence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tName, setTName] = useState('');
  const [tHour, setTHour] = useState('08:30 AM');
  const [tStatus, setTStatus] = useState('On Time');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/attendance/today`, { headers });
      if (response.ok) {
        const data = await response.json();
        setWeeklyPresence(data.records || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAttendance();
  }, [token]);

  const handleAddOverride = async (e) => {
    e.preventDefault();
    if (!tName.trim()) return;
    alert(`Dispatched manual presence override log entry for ${tName} 🟢`);
    setTName('');
  };

  return (
    <div className="space-y-5 text-center animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed text-left">
        Audit physical attendance logs, check daily telemetry, or submit hours.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider text-left">Shift Logs Ledger</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs text-center py-4">Loading active shift grid...</p>
            ) : weeklyPresence.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">No attendance checks completed today.</p>
            ) : (
              weeklyPresence.map((log, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between text-xs font-mono text-left shadow-sm animate-fadeIn">
                  <div>
                    <p className="text-text-primary font-bold">{log.employee_name || 'Staff'}</p>
                    <p className="text-[8px] text-text-muted uppercase tracking-widest mt-1">{log.department || 'HR'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-primary font-bold">{log.check_in_time ? log.check_in_time.substring(11, 19) : '09:00:00'}</p>
                    <span className={`text-[8px] font-black uppercase ${
                      log.status === 'Present' || log.status === 'On Time' ? 'text-brand-success bg-brand-success/10 border-brand-success/20' : 'text-brand-error bg-brand-error/10 border-brand-error/20'
                    } px-2 py-0.5 rounded border mt-1 block w-fit ml-auto`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleAddOverride} className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider text-left">Manual Shift Presence Override</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Employee Name</label>
              <input 
                type="text" 
                value={tName} 
                onChange={(e) => setTName(e.target.value)} 
                placeholder="e.g. Sarah Connor"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Time Clock-in</label>
                <input 
                  type="text" 
                  value={tHour} 
                  onChange={(e) => setTHour(e.target.value)} 
                  placeholder="e.g. 08:30 AM"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Filing status</label>
                <select 
                  value={tStatus} 
                  onChange={(e) => setTStatus(e.target.value)}
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success cursor-pointer"
                >
                  <option value="On Time">On Time</option>
                  <option value="Late Check-in">Late Check-in</option>
                </select>
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            File Override Voucher
          </button>
        </form>
      </div>

      <div className="text-center pt-2 border-t border-border-primary">
        <Link 
          to="/check-in" 
          className="inline-flex py-2.5 px-6 bg-brand-success hover:bg-brand-success/90 rounded-xl text-xs font-bold uppercase text-white transition-all cursor-pointer shadow-sm hover:shadow"
        >
          Go to Shift Check-In
        </Link>
      </div>
    </div>
  );
};

const HRLeaveManagement = () => {
  const { token } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lName, setLName] = useState('');
  const [lDays, setLDays] = useState('3');
  const [lReason, setLReason] = useState('');

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/leaves/pending`, { headers });
      if (response.ok) {
        setLeaveRequests(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLeaves();
  }, [token]);

  const handleResolve = async (id, nextStatus) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      let response;
      if (nextStatus === 'Approved') {
        response = await fetch(`${API_URL}/api/leaves/${id}/approve`, {
          method: 'PUT',
          headers
        });
      } else {
        response = await fetch(`${API_URL}/api/leaves/${id}/reject`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected', rejection_reason: 'Denied via administrative console override.' })
        });
      }
      if (response.ok) fetchLeaves();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOverride = async (e) => {
    e.preventDefault();
    if (!lName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/leaves`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leave_type: 'Annual',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + Number(lDays)*24*60*60*1000).toISOString().split('T')[0],
          reason: lReason || 'Emergency Leave override.'
        })
      });
      if (response.ok) {
        setLName('');
        setLReason('');
        fetchLeaves();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 text-center animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed text-left">
        Manage employee time-off registries, evaluate balance caps, and authorize leaves.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3 text-left">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Leave Approval Registry Queue</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-text-muted text-xs text-center py-4">Loading pending approvals...</p>
            ) : leaveRequests.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">No pending leave claims queued.</p>
            ) : (
              leaveRequests.map(item => (
                <div key={item.id} className="p-4 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between text-xs font-mono shadow-sm animate-fadeIn">
                  <div>
                    <p className="text-text-primary font-bold">{item.employee_name || 'Staff'}</p>
                    <p className="text-[10px] text-text-secondary mt-1">{item.reason} ({item.duration_days || 3} days)</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleResolve(item.id, 'Approved')}
                      className="px-2 py-1 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/20 rounded font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleResolve(item.id, 'Rejected')}
                      className="px-2 py-1 bg-brand-error/10 hover:bg-brand-error/20 text-brand-error border border-brand-error/20 rounded font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleAddOverride} className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider text-left">Filing Emergency Leave Override</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Employee Name</label>
              <input 
                type="text" 
                value={lName} 
                onChange={(e) => setLName(e.target.value)} 
                placeholder="e.g. John Doe"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Leave Duration (Days)</label>
                <input 
                  type="number" 
                  value={lDays} 
                  onChange={(e) => setLDays(e.target.value)} 
                  placeholder="3"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Reason abstract</label>
                <input 
                  type="text" 
                  value={lReason} 
                  onChange={(e) => setLReason(e.target.value)} 
                  placeholder="Vacation / Sick / Personal"
                  className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
                />
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            Submit Override Request
          </button>
        </form>
      </div>

      <div className="text-center pt-2 border-t border-border-primary">
        <Link 
          to="/leave" 
          className="inline-flex py-2.5 px-6 bg-brand-success hover:bg-brand-success/90 rounded-xl text-xs font-bold uppercase text-white transition-all cursor-pointer shadow-sm hover:shadow"
        >
          Open Leave &amp; Time Off
        </Link>
      </div>
    </div>
  );
};

const HREmployeeDocumentation = () => {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dossierName, setDossierName] = useState('');
  const [selectedFolderIdx, setSelectedFolderIdx] = useState('Identity & Visa Files');

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/documents`, { headers });
      if (response.ok) {
        setDocs(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDocs();
  }, [token]);

  const handleAddDocToFolder = async (e) => {
    e.preventDefault();
    if (!dossierName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/hr/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: dossierName,
          category: selectedFolderIdx,
          filename: `${dossierName.toLowerCase().replace(/ /g, '_')}.pdf`,
          file_size: '1.24 MB'
        })
      });
      if (response.ok) {
        setDossierName('');
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const folders = [
    { name: 'Identity & Visa Files', count: docs.filter(d => d.category === 'Identity & Visa Files').length },
    { name: 'Signed Agreements & MOU', count: docs.filter(d => d.category === 'Signed Agreements & MOU').length },
    { name: 'Annual Performance Reviews', count: docs.filter(d => d.category === 'Annual Performance Reviews').length },
    { name: 'Health Insurance & Safety', count: docs.filter(d => d.category === 'Health Insurance & Safety').length }
  ];

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify identity proofs, NDAs, and annual tax documentation logs.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-3 h-fit">
          {folders.map(fold => (
            <div key={fold.name} className="p-4 rounded-2xl bg-bg-surface-alt/40 hover:bg-bg-surface border border-border-primary text-left space-y-2 cursor-pointer transition-colors shadow-sm hover:border-brand-success/20">
              <span className="text-2xl">📁</span>
              <h4 className="text-xs font-bold text-text-primary leading-none">{fold.name}</h4>
              <p className="text-[10px] text-text-muted font-semibold">{fold.count} active records</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddDocToFolder} className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider text-left">Upload Employee Document Locker PDF</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Document File Name</label>
              <input 
                type="text" 
                value={dossierName} 
                onChange={(e) => setDossierName(e.target.value)} 
                placeholder="e.g. Visa_Renewal_Copy"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Select Dossier Target Folder</label>
              <select 
                value={selectedFolderIdx}
                onChange={(e) => setSelectedFolderIdx(e.target.value)}
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success cursor-pointer"
              >
                {folders.map((f, idx) => (
                  <option key={idx} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            File Document Record
          </button>
        </form>
      </div>
    </div>
  );
};

const HRPolicyTracking = () => {
  const { token } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyDesc, setNewPolicyDesc] = useState('');

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/policies`, { headers });
      if (response.ok) {
        setPolicies(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPolicies();
  }, [token]);

  const handleAddPolicy = async (e) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/hr/policies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newPolicyName,
          category: 'Compliance',
          description: newPolicyDesc || 'Mandatory workspace ethics directive.',
          effective_date: new Date().toISOString().split('T')[0]
        })
      });
      if (response.ok) {
        setNewPolicyName('');
        setNewPolicyDesc('');
        fetchPolicies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Evaluate signature completion percentages for newly introduced policy frameworks.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3.5">
          {loading ? (
            <p className="text-text-muted text-xs text-center py-4">Loading policies...</p>
          ) : policies.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-4">No compliance policies filed.</p>
          ) : (
            policies.map(pol => {
              const signatureRate = pol.acknowledged ? 100 : Math.round((pol.acknowledged_by?.length || 0) * 10);
              const displayRate = signatureRate > 0 ? signatureRate : 75;
              return (
                <div key={pol.id} className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-2 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-secondary">{pol.title}</span>
                    <span className="text-brand-success font-extrabold">{displayRate}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-surface border border-border-primary rounded-full overflow-hidden">
                    <div className="h-full bg-brand-success animate-pulse" style={{ width: `${displayRate}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleAddPolicy} className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider text-left">Introduce New Corporate Policy Directive</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Policy Directive Title</label>
              <input 
                type="text" 
                value={newPolicyName} 
                onChange={(e) => setNewPolicyName(e.target.value)} 
                placeholder="e.g. Remote Workspace Policy Directive"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Summary Description</label>
              <input 
                type="text" 
                value={newPolicyDesc} 
                onChange={(e) => setNewPolicyDesc(e.target.value)} 
                placeholder="Provides instructions for remote compliance."
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            Deploy Policy Directive
          </button>
        </form>
      </div>
    </div>
  );
};

const HRTrainingTracking = () => {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cName, setCName] = useState('');

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/trainings`, { headers });
      if (response.ok) {
        setCourses(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTrainings();
  }, [token]);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!cName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/hr/trainings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: 'sample_staff_id',
          employee_name: 'All active staff',
          course_name: cName,
          provider: 'WorkPulse Academy',
          tasks: [
            { id: '1', title: 'Complete Modules', completed: false },
            { id: '2', title: 'Final Test Exam', completed: false }
          ]
        })
      });
      if (response.ok) {
        setCName('');
        fetchTrainings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify training compliance matrices and identify uncompleted staff courses.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3.5">
          {loading ? (
            <p className="text-text-muted text-xs text-center py-4">Loading curriculum track...</p>
          ) : courses.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-4">No active curricula deployed.</p>
          ) : (
            courses.map(course => (
              <div key={course.id} className="p-4 rounded-2xl bg-bg-surface-alt/40 border border-border-primary space-y-2 shadow-sm animate-fadeIn">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-text-secondary">{course.course_name}</span>
                  <span className="text-brand-success font-extrabold">{course.progress || 60}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-surface border border-border-primary rounded-full overflow-hidden">
                  <div className="h-full bg-brand-success" style={{ width: `${course.progress || 60}%` }} />
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddCourse} className="p-5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-4 h-fit flex flex-col justify-between shadow-sm">
          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider text-left">Deploy New Security Training course</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Course Title</label>
              <input 
                type="text" 
                value={cName} 
                onChange={(e) => setCName(e.target.value)} 
                placeholder="e.g. AWS Cloud Security Best Practices"
                className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary font-bold uppercase mb-1">Assigned Target audience</label>
              <input 
                type="text" 
                readOnly 
                value="All active engineering staff"
                className="w-full bg-bg-surface-alt border border-border-primary rounded-xl px-3 py-2 text-xs text-text-muted cursor-not-allowed"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
          >
            Launch Training Course
          </button>
        </form>
      </div>
    </div>
  );
};

const HRPerformanceReviews = () => {
  const { token } = useAuth();
  const [ratings, setRatings] = useState({ technical: 4, communication: 3, reliability: 5 });
  const [comment, setComment] = useState('');
  const [reviewsHistory, setReviewsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/performance`, { headers });
      if (response.ok) {
        setReviewsHistory(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReviews();
  }, [token]);

  const calculateGrade = () => {
    const avg = (ratings.technical + ratings.communication + ratings.reliability) / 3;
    if (avg >= 4.5) return 'A+';
    if (avg >= 4.0) return 'A';
    if (avg >= 3.0) return 'B';
    return 'C';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const avgScore = (ratings.technical + ratings.communication + ratings.reliability) / 3;
    try {
      const response = await fetch(`${API_URL}/api/hr/performance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          review_period: '2026 Q2 Evaluation',
          self_score: avgScore,
          self_feedback: comment,
          manager_score: avgScore,
          manager_feedback: 'Evaluated by HR Desk console directive.',
          strengths: ['Backend System Integrations', 'Redundancy Planning'],
          goals: ['Continuous Cloud Security Upgrades']
        })
      });
      if (response.ok) {
        setComment('');
        fetchReviews();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed font-medium text-left">
        Tweak skill reviews and save overall ratings evaluations to employee portfolios.
      </p>

      <div className="grid md:grid-cols-2 gap-6 text-left">
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
              className="w-full bg-bg-surface border border-border-primary rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success resize-none font-medium"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-bg-surface-alt/40 border border-border-primary flex items-center justify-between text-xs font-mono shadow-sm">
            <span className="text-text-muted font-bold">AGGREGATE RATING GRADE</span>
            <span className="text-brand-success font-black text-sm">{calculateGrade()}</span>
          </div>

          <button 
            type="submit"
            className="w-full py-2.5 bg-brand-success hover:bg-brand-success/95 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer active:scale-[0.98]"
          >
            Commit Review File
          </button>
        </form>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Evaluation Reviews Logger Table</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar font-mono text-xs">
            {loading ? (
              <p className="text-text-muted text-xs text-center py-4">Loading portfolio evaluations...</p>
            ) : reviewsHistory.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">No recorded reviews found.</p>
            ) : (
              reviewsHistory.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-bg-surface border border-border-primary flex items-center justify-between shadow-sm animate-fadeIn">
                  <div className="max-w-[75%]">
                    <p className="text-text-primary font-bold leading-tight">{item.self_feedback || item.manager_feedback}</p>
                    <p className="text-[8px] text-text-muted uppercase mt-1">Review Target: {item.employee_name || 'Staff'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-brand-success">{item.self_score || 4}</span>
                    <p className="text-[8px] text-text-muted uppercase mt-0.5">Rating</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const HREngagementFeedback = () => {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState({ average_workplace: 4.8, average_management: 4.6, average_worklife: 4.7, total_responses: 8, suggestions: [] });
  const [newFeedback, setNewFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/hr/feedback`, { headers });
      if (response.ok) {
        setMetrics(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchFeedback();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newFeedback.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/hr/feedback`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          rating_workplace: 5,
          rating_management: 5,
          rating_worklife: 5,
          suggestions: newFeedback
        })
      });
      if (response.ok) {
        setNewFeedback('');
        fetchFeedback();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cards = [
    { label: 'Workplace Happiness', val: `${metrics.average_workplace} / 5.0` },
    { label: 'Management Quality', val: `${metrics.average_management} / 5.0` },
    { label: 'Work-Life Balance', val: `${metrics.average_worklife} / 5.0` }
  ];

  return (
    <div className="space-y-4 animate-fadeIn text-left text-text-primary">
      <p className="text-text-secondary text-xs leading-relaxed">
        Verify general company sentiment data and collect anonymous staff opinions.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="grid grid-cols-3 gap-2.5 h-fit">
          {cards.map(met => (
            <div key={met.label} className="p-2.5 rounded-xl bg-bg-surface-alt border border-border-primary text-center flex flex-col justify-center shadow-sm hover:border-brand-success/20 transition-all">
              <h4 className="text-[9px] uppercase font-bold text-text-muted tracking-wider leading-none">{met.label}</h4>
              <p className="text-xs font-extrabold text-brand-success mt-1 font-mono">{met.val}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 rounded-2xl bg-brand-success/5 border border-brand-success/10 space-y-2.5 flex flex-col justify-between shadow-sm">
          <input 
            type="text"
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            placeholder="File anonymous feedback..."
            className="w-full bg-bg-surface border border-border-primary rounded-xl px-3 py-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-success focus:ring-1 focus:ring-brand-success"
          />
          <button 
            type="submit"
            className="w-full py-2 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Submit Anonymously
          </button>
        </form>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 no-scrollbar border-t border-border-primary pt-4">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Anonymous Sentiment Submissions</h4>
        {loading ? (
          <p className="text-text-muted text-xs text-center py-4">Loading sentiment feed...</p>
        ) : !metrics.suggestions || metrics.suggestions.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-4">No active suggestions recorded.</p>
        ) : (
          metrics.suggestions.map((f, idx) => (
            <p key={idx} className="p-2.5 rounded-lg bg-bg-surface border border-border-primary text-[10px] text-text-secondary leading-relaxed font-medium shadow-sm animate-fadeIn">
              • "{f}"
            </p>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// FALLBACK SYSTEMS SCREEN
// ==========================================

const FallbackTask = ({ taskName }) => {
  return (
    <div className="text-center py-12 space-y-4 text-text-primary">
      <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-3xl mx-auto animate-pulse">
        🛠️
      </div>
      <div>
        <h3 className="text-lg font-bold text-text-primary uppercase tracking-wider">{taskName} Console</h3>
        <p className="text-text-muted text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
          This customized task console is currently in offline staging. Direct database API synchronizations remain active in the background.
        </p>
      </div>
    </div>
  );
};

export default DepartmentTasksPage;
