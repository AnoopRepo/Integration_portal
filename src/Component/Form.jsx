import React, { useRef, useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import { useAuth, API_URL } from "../context/AuthContext";

const EMAILJS_SERVICE_ID  = "service_01z3mco";
const EMAILJS_TEMPLATE_ID = "template_bbmd3rl";
const EMAILJS_PUBLIC_KEY  = "e5eUr8mFe3MNzYcah";

const Form = () => {
  const { user, token } = useAuth();
  const formRef = useRef();

  // Initialise EmailJS once (required by @emailjs/browser v4+)
  useEffect(() => {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }, []);

  // Interactive inputs state
  const [status, setStatus] = useState("On Track");
  const [completion, setCompletion] = useState(100);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Standalone email test (bypasses backend, for debugging only) ──────────
  const testEmail = async () => {
    console.log("[EmailJS TEST] Starting standalone email test...");
    console.log("[EmailJS TEST] Service:", EMAILJS_SERVICE_ID);
    console.log("[EmailJS TEST] Template:", EMAILJS_TEMPLATE_ID);
    console.log("[EmailJS TEST] Public Key:", EMAILJS_PUBLIC_KEY);
    try {
      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          subject:          "[TEST] Email Debug Check",
          user_name:        user?.name || "Test User",
          date:             new Date().toLocaleDateString(),
          hours:            8,
          completion:       100,
          status:           "On Track",
          department:       "Engineering",
          designation:      "Developer",
          today_task:       "Test task entry",
          problems:         "None",
          achievements:     "Email debugging",
          next_day_task:    "Fix email",
          additional_notes: "This is a test email from debug mode",
        },
        { publicKey: EMAILJS_PUBLIC_KEY }
      );
      console.log("[EmailJS TEST] ✅ Success! Response:", result);
      alert("✅ Test email sent! Check inbox (and spam folder). Response status: " + result.status);
    } catch (err) {
      console.error("[EmailJS TEST] ❌ Failed:", err);
      alert("❌ Email failed: " + (err?.text || err?.message || JSON.stringify(err)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    const formData = new FormData(formRef.current);

    // Build the full params object once — shared by backend and email
    const emailParams = {
      subject:          `Work Update | ${new Date().toDateString()}`,
      user_name:        user?.name || formData.get("user_name"),
      date:             formData.get("date"),
      hours:            parseFloat(formData.get("hours")),
      completion:       parseInt(completion),
      status:           status,
      department:       formData.get("department") || "—",
      designation:      formData.get("designation") || "—",
      today_task:       formData.get("today_task"),
      problems:         formData.get("problems") || "",
      achievements:     formData.get("achievements") || "",
      next_day_task:    formData.get("next_day_task"),
      additional_notes: formData.get("additional_notes") || "—",
    };

    console.log("[Form] Params built:", emailParams);

    // ── Operation 1: Backend save (independent) ───────────────────────────────
    let dbSaved = false;
    let dbErrMsg = "";
    try {
      console.log("[Form] Saving to backend...");
      const response = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          user_name:    emailParams.user_name,
          date:         emailParams.date,
          hours:        emailParams.hours,
          completion:   emailParams.completion,
          status:       emailParams.status,
          today_task:   emailParams.today_task,
          problems:     emailParams.problems,
          achievements: emailParams.achievements,
          next_day_task: emailParams.next_day_task,
        })
      });
      console.log("[Form] Backend status:", response.status);
      if (response.ok) {
        dbSaved = true;
        console.log("[Form] ✅ Backend save OK");
      } else {
        const errData = await response.json().catch(() => ({}));
        dbErrMsg = errData.detail || `Server error ${response.status}`;
        console.warn("[Form] ⚠️ Backend rejected:", dbErrMsg);
      }
    } catch (err) {
      dbErrMsg = err.message || "Network error — backend unreachable";
      console.warn("[Form] ⚠️ Backend fetch failed:", dbErrMsg);
    }

    // ── Operation 2: EmailJS (always runs, independent of backend) ────────────
    let emailSent = false;
    let emailErrMsg = "";
    try {
      console.log("[Form] Sending email with params:", emailParams);
      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        emailParams,
        { publicKey: EMAILJS_PUBLIC_KEY }
      );
      emailSent = true;
      console.log("[Form] ✅ Email sent! Response:", result);
    } catch (err) {
      emailErrMsg = err?.text || err?.message || JSON.stringify(err);
      console.error("[Form] ❌ Email failed:", emailErrMsg);
    }

    // ── Compose final status message ──────────────────────────────────────────
    if (dbSaved && emailSent) {
      setSuccessMsg("✅ Status report saved & email notification sent successfully!");
      setErrorMsg("");
    } else if (emailSent && !dbSaved) {
      setSuccessMsg("📧 Email sent successfully!");
      setErrorMsg(`⚠️ Database save failed: ${dbErrMsg}`);
    } else if (dbSaved && !emailSent) {
      setSuccessMsg("💾 Report saved to database.");
      setErrorMsg(`⚠️ Email could not be sent: ${emailErrMsg}`);
    } else {
      setErrorMsg(`Database: ${dbErrMsg} | Email: ${emailErrMsg}`);
    }

    // Reset form regardless of outcome
    formRef.current.reset();
    setStatus("On Track");
    setCompletion(100);
    setLoading(false);
  };




  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 relative overflow-hidden flex justify-center items-center">
      {/* Dynamic background glow blobs */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full filter blur-[80px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full filter blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="relative w-full max-w-4xl z-10 animate-fadeIn">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="w-full backdrop-blur-3xl bg-slate-950/40 border border-white/5 rounded-3xl shadow-2xl p-8 md:p-12 space-y-10"
        >
          {/* Form Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400">
              Submit Status Report
            </h1>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Log today's accomplishments, track key metrics, and schedule tasks planned for tomorrow.
            </p>
          </div>

          {/* User Notifications */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm text-center font-medium animate-pulse">
              ✅ {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Section 1: Employee Details & Time Log */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 border-b border-white/5 pb-2">
              1. Employee Details &amp; Time Log
            </h3>

            {/* Row 1: Name · Date · Hours */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Staff Member</label>
                <div className="relative">
                  <input
                    type="text"
                    name="user_name"
                    value={user?.name || ''}
                    readOnly
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white/50 text-sm outline-none cursor-not-allowed font-medium shadow-inner"
                  />
                  <svg className="absolute left-3.5 top-3 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              {/* Log Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Work Date</label>
                <div className="relative">
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition [color-scheme:dark]"
                  />
                  <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              {/* Hours Log */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Hours Logged</label>
                <div className="relative">
                  <input
                    type="number"
                    name="hours"
                    step="0.5"
                    min="0"
                    max="24"
                    required
                    placeholder="e.g. 8.0"
                    className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition placeholder:text-white/20"
                  />
                  <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Row 2: Department · Designation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Department</label>
                <div className="relative">
                  <input
                    type="text"
                    name="department"
                    placeholder="e.g. Engineering, Marketing…"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition placeholder:text-white/20"
                  />
                  <svg className="absolute left-3.5 top-3 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Designation</label>
                <div className="relative">
                  <input
                    type="text"
                    name="designation"
                    placeholder="e.g. Software Engineer, Designer…"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition placeholder:text-white/20"
                  />
                  <svg className="absolute left-3.5 top-3 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Interactive KPIs */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 border-b border-white/5 pb-2">
              2. Core Performance Indicators
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Interactive Status Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Current Work Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "On Track", icon: "🟢", color: "border-green-500/30 text-green-400 bg-green-500/5 hover:border-green-500/50" },
                    { label: "Blocked", icon: "🔴", color: "border-red-500/30 text-red-400 bg-red-500/5 hover:border-red-500/50" },
                    { label: "Completed", icon: "🔵", color: "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:border-blue-500/50" }
                  ].map((s) => (
                    <div
                      key={s.label}
                      onClick={() => setStatus(s.label)}
                      className={`py-3 px-2 border rounded-xl text-center cursor-pointer transition-all duration-300 flex flex-col items-center gap-1 ${
                        status === s.label
                          ? "border-purple-400 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)] scale-[1.03]"
                          : `border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:text-white ${s.color}`
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <span className="font-bold text-xs">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Percentage Completion Slider */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/40">Task Completion Rate</label>
                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold text-xs rounded-full shadow">
                      {completion}% Completed
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={completion} 
                    onChange={(e) => setCompletion(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500" 
                  />
                </div>
                <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs text-white/50">
                  <span>💡 Slide to allocate today's overall deliverable checklist ratios.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tasks and Progress Details */}
          <div className="space-y-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 border-b border-white/5 pb-2">
              3. Progress Details & Documentation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tasks Completed Today */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-green-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                  Completed Actions Today
                </label>
                <textarea 
                  name="today_task" 
                  rows="4" 
                  required
                  placeholder="Summarize the core tasks and milestones accomplished during this work shift..." 
                  className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-white text-sm placeholder:text-white/20 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all leading-relaxed"
                ></textarea>
              </div>

              {/* Plan for Tomorrow */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  Projected Action Plan Tomorrow
                </label>
                <textarea 
                  name="next_day_task" 
                  rows="4" 
                  required
                  placeholder="Detail the target goals and tasks scheduled for tomorrow's checklist..." 
                  className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-white text-sm placeholder:text-white/20 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all leading-relaxed"
                ></textarea>
              </div>

              {/* Challenges / Blockers */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Challenges / Active Blockers
                </label>
                <textarea 
                  name="problems" 
                  rows="3" 
                  placeholder="Any operational challenges, engineering blockers, or technical issues currently encountered..." 
                  className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-white text-sm placeholder:text-white/20 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all leading-relaxed"
                ></textarea>
              </div>

              {/* Key Achievements */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-yellow-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                  Key Milestones & Achievements
                </label>
                <textarea 
                  name="achievements" 
                  rows="3" 
                  placeholder="Highlight key achievements, feature deployments, or system improvements logged today..." 
                  className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-white text-sm placeholder:text-white/20 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all leading-relaxed"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Section 4: Additional Notes */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 border-b border-white/5 pb-2">
              4. Additional Notes
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                Optional Remarks / Context
              </label>
              <textarea
                name="additional_notes"
                rows="3"
                placeholder="Any extra context, links, meeting notes, or remarks to include in the email report…"
                className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-white text-sm placeholder:text-white/20 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all leading-relaxed"
              ></textarea>
            </div>
          </div>

          {/* Submit + Debug row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-xl hover:shadow-purple-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base tracking-wider uppercase cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Transmitting Report...
                </span>
              ) : "File Status Update"}
            </button>

            {/* 🔧 DEBUG: Test EmailJS independently — remove once email is confirmed working */}
            <button
              type="button"
              onClick={testEmail}
              className="sm:w-48 py-4 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              🔧 Test Email Only
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Form;
