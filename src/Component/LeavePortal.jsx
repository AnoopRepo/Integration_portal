import React, { useState, useEffect } from "react";
import { useAuth, API_URL } from "../context/AuthContext";
import { Calendar, Plus, RefreshCw, BarChart2, FileText, CheckCircle } from "lucide-react";

const LeavePortal = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Leave states
  const [leaveBalances, setLeaveBalances] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState(null);

  // Form states
  const [leaveType, setLeaveType] = useState("Sick");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaveSubmitLoading, setLeaveSubmitLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const headers = { Authorization: `Bearer ${token}` };
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const responses = await Promise.all([
        fetch(`${API_URL}/api/leaves/balances?year=${currentYear}`, { headers }),
        fetch(`${API_URL}/api/leaves/my-requests`, { headers }),
        fetch(`${API_URL}/api/attendance/metrics?month=${currentMonth}&year=${currentYear}`, { headers })
      ]);

      const [balRes, reqRes, metricsRes] = responses;

      if (balRes.ok) {
        const balData = await balRes.json();
        setLeaveBalances(balData.balances || {});
      }
      if (reqRes.ok) {
        setLeaveRequests(await reqRes.json());
      }
      if (metricsRes.ok) {
        setMonthlyMetrics(await metricsRes.json());
      }
    } catch (err) {
      console.error(err);
      setError("Unable to synchronize Leave data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    
    if (new Date(startDate) > new Date(endDate)) {
      alert("⚠️ Start date cannot be after end date.");
      return;
    }

    setLeaveSubmitLoading(true);
    const payload = {
      leave_type: leaveType,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      reason
    };

    try {
      const res = await fetch(`${API_URL}/api/leaves`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setStartDate("");
        setEndDate("");
        setReason("");
        alert("🚀 Leave request submitted successfully!");
        fetchData();
      } else {
        alert(`Leave Request Failed: ${data.detail || "Please check your balances."}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLeaveSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      {/* Background glow blobs */}
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-brand-primary/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-brand-accent/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto z-10 space-y-10">
        {/* Header Block */}
        <div className="border-b border-border-primary pb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1 font-mono">Employee Self-Service Desk</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
            Leave &amp; Time Off Portal
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Submit daily time-off requests, scan remaining annual leave limits, and audit compliance metrics.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-bg-surface border border-border-primary rounded-2xl shadow-sm">
            <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary text-sm">Syncing Leave Records...</p>
          </div>
        ) : error ? (
          <div className="bg-brand-error/10 border border-brand-error/20 rounded-2xl p-8 text-center text-brand-error shadow-sm animate-fadeIn">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-brand-error/25 border border-brand-error/35 rounded-xl text-sm font-medium hover:bg-brand-error/20 transition-all cursor-pointer">
              Retry Sync
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Top Balances Ledger */}
            <div className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="border-b border-border-primary pb-4 mb-6 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary font-mono">Active Leave Ledger</span>
                <span className="text-[10px] font-bold text-text-muted font-mono">CY {new Date().getFullYear()}</span>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Sick", "Casual", "Annual", "Maternity"].map((type) => {
                  const bal = leaveBalances[type] || { total: 0, used: 0, remaining: 0 };
                  const colorMap = {
                    Sick: "hover:border-brand-warning/30 text-brand-warning",
                    Casual: "hover:border-brand-accent/30 text-brand-accent",
                    Annual: "hover:border-brand-primary/30 text-brand-primary",
                    Maternity: "hover:border-brand-error/30 text-brand-error"
                  };
                  return (
                    <div key={type} className={`p-5 rounded-2xl border border-border-primary bg-bg-surface-alt/45 flex flex-col justify-between space-y-4 transition-all duration-300 shadow-sm ${colorMap[type] || "hover:border-border-hover"}`}>
                      <div>
                        <span className="px-2 py-0.5 bg-bg-surface border border-border-primary text-text-secondary text-[8px] font-black uppercase tracking-wider rounded font-mono">
                          {type}
                        </span>
                        <h2 className="text-4xl font-black text-text-primary tracking-tight mt-3">{bal.remaining}</h2>
                        <span className="text-[9px] text-text-muted block mt-1">Days Remaining</span>
                      </div>
                      <div className="text-[10px] text-text-muted border-t border-border-primary/50 pt-3 flex justify-between font-mono">
                        <span>Used: {bal.used}</span>
                        <span>Limit: {bal.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Monthly attendance gauge */}
              <div className="mt-8 border-t border-border-primary pt-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-secondary font-bold uppercase tracking-wider text-[10px]">Monthly Attendance consistency</span>
                    <span className="text-brand-primary font-bold">{monthlyMetrics?.attendance_percentage || "0.00"}%</span>
                  </div>
                  <div className="w-full bg-bg-surface-alt border border-border-primary rounded-full h-3.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand-primary to-brand-accent h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-all duration-1000"
                      style={{ width: `${monthlyMetrics?.attendance_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-center shrink-0 w-full md:w-auto justify-around border border-border-primary bg-bg-surface-alt/20 rounded-2xl p-3 shadow-sm font-mono">
                  <div className="px-4">
                    <span className="text-text-muted text-[9px] font-black uppercase tracking-widest block">Present</span>
                    <p className="font-bold text-sm text-brand-success">{monthlyMetrics?.present_days || 0}</p>
                  </div>
                  <div className="px-4 border-l border-border-primary">
                    <span className="text-text-muted text-[9px] font-black uppercase tracking-widest block">Late</span>
                    <p className="font-bold text-sm text-brand-warning">{monthlyMetrics?.late_days || 0}</p>
                  </div>
                  <div className="px-4 border-l border-border-primary">
                    <span className="text-text-muted text-[9px] font-black uppercase tracking-widest block">On Leave</span>
                    <p className="font-bold text-sm text-brand-primary">{monthlyMetrics?.on_leave_days || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Form & History Ledger Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Request Form */}
              <div className="lg:col-span-1">
                <form onSubmit={handleSubmitLeave} className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
                  <h3 className="text-lg font-extrabold tracking-tight text-text-primary border-b border-border-primary pb-3">Request Time-Off</h3>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Leave Category</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-sm text-text-primary focus:border-brand-primary outline-none cursor-pointer transition"
                    >
                      <option value="Sick">🤢 Sick Leave</option>
                      <option value="Casual">✨ Casual Leave</option>
                      <option value="Annual">✈ Annual Vacation</option>
                      <option value="Maternity">👶 Maternity (180 days)</option>
                      <option value="Unpaid">🛑 Unpaid Leave</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Start Date</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-xs outline-none focus:border-brand-primary transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">End Date</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary text-xs outline-none focus:border-brand-primary transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Justification Notes</label>
                    <textarea
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain details of this leave request..."
                      rows="3"
                      className="w-full px-4 py-3 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary outline-none focus:border-brand-primary transition text-xs resize-none placeholder:text-text-muted"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={leaveSubmitLoading}
                    className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all uppercase tracking-wider text-xs cursor-pointer text-center"
                  >
                    {leaveSubmitLoading ? "Transmitting Request..." : "Transmit Request"}
                  </button>
                </form>
              </div>

              {/* History Registry */}
              <div className="lg:col-span-2 bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
                <h3 className="text-lg font-bold text-text-primary">My Time-Off Registry</h3>
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-primary">
                        <th className="py-2 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Category</th>
                        <th className="py-2 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Justification</th>
                        <th className="py-2 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Duration</th>
                        <th className="py-2 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Status</th>
                        <th className="py-2 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono text-right">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/50">
                      {leaveRequests.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-10 text-text-muted text-xs font-mono">No time-off requests registered.</td>
                        </tr>
                      ) : (
                        leaveRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-bg-surface-alt/45 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-bold text-xs text-text-primary block">{req.leave_type} Leave</span>
                              <span className="text-[9px] font-mono text-text-muted">{new Date(req.start_date).toLocaleDateString()}</span>
                            </td>
                            <td className="py-3 px-3 text-xs text-text-secondary max-w-xs truncate">{req.reason}</td>
                            <td className="py-3 px-3 font-mono text-xs font-bold text-brand-primary">{req.duration_days} days</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                req.status === "Approved" ? "bg-brand-success/10 text-brand-success border-brand-success/20" :
                                req.status === "Rejected" ? "bg-brand-error/10 text-brand-error border-brand-error/20" :
                                "bg-brand-warning/10 text-brand-warning border-brand-warning/20"
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[10px] text-text-muted italic max-w-xs truncate text-right">
                              {req.rejection_reason || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeavePortal;
