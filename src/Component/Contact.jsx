import React, { useState } from "react";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Support");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
      setTimeout(() => setSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 relative overflow-hidden bg-bg-app text-text-primary flex justify-center items-center">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-primary/5 rounded-full filter blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-brand-accent/5 rounded-full filter blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="relative w-full max-w-6xl z-10 space-y-10 animate-fadeIn">
        {/* Header Block */}
        <div className="text-center space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Corporate Communication Panel</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Contact WorkPulse Team
          </h1>
          <p className="text-text-secondary text-xs max-w-md mx-auto">
            Get in touch with our security audits desk, technical operations team, or general assistance desk.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
          {/* Col 1 & 2: Contact Info Card */}
          <div className="lg:col-span-2 bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-card hover:shadow-card-hover transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-primary/10 to-transparent rounded-full filter blur-2xl"></div>

            <div className="space-y-8 relative z-10">
              <div className="border-b border-border-primary pb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Office Coordinates</span>
                <h2 className="text-xl font-bold text-text-primary mt-1">Global Headquarters</h2>
              </div>

              {/* Details List */}
              <div className="space-y-6">
                {[
                  { title: "Physical Location", value: "Level 45, Infinity Towers, Silicon Heights, DLF Phase 5, Gurugram, India", icon: "📍" },
                  { title: "Support Hotline", value: "+91 (124) 895-7000 (Mon - Fri, 9am - 6pm)", icon: "📞" },
                  { title: "Compliance Registry", value: "sec-audits@workpulse.com", icon: "✉️" },
                  { title: "Network Status", value: "All Systems Operational", icon: "🟢" }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <span className="w-8 h-8 rounded-xl bg-bg-surface-alt border border-border-primary flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-all text-text-primary">
                      {item.icon}
                    </span>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">{item.title}</span>
                      <span className="text-xs text-text-secondary font-medium leading-relaxed block">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Humanized Vector Map Placeholder */}
            <div className="mt-8 border border-border-primary rounded-2xl p-4 bg-bg-surface-alt/30 space-y-3 relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-error/5 via-brand-warning/5 to-brand-primary/5 pointer-events-none"></div>
              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-text-muted">
                <span>Interactive Office Campus Map</span>
                <span>Zoom Level 14x</span>
              </div>
              <div className="h-32 rounded-xl bg-bg-surface border border-border-primary relative overflow-hidden flex items-center justify-center">
                {/* Stylized vector street grid */}
                <svg className="absolute inset-0 w-full h-full text-text-muted/15 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="10" y1="0" x2="10" y2="100" stroke="currentColor" strokeWidth="0.8" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="85" y1="0" x2="85" y2="100" stroke="currentColor" strokeWidth="0.8" />
                  <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeWidth="0.8" />
                  <line x1="0" y1="65" x2="100" y2="65" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2,2" />
                  
                  {/* Soft green park space */}
                  <rect x="15" y="5" width="30" height="20" rx="2" fill="var(--brand-success-val)" opacity="0.08" stroke="var(--brand-success-val)" strokeWidth="0.5" />
                  {/* Happy coffee shop zone */}
                  <circle cx="70" cy="45" r="4" fill="var(--brand-warning-val)" opacity="0.08" stroke="var(--brand-warning-val)" strokeWidth="0.5" />
                </svg>

                {/* Friendly landmarks */}
                <div className="absolute top-8 left-20 text-xs flex items-center gap-1 opacity-40">
                  <span>🌳</span> <span className="text-[8px] font-bold tracking-widest text-text-muted uppercase">Greenwood Park</span>
                </div>
                <div className="absolute bottom-6 right-24 text-xs flex items-center gap-1 opacity-40">
                  <span>☕</span> <span className="text-[8px] font-bold tracking-widest text-text-muted uppercase">Coffee Lab</span>
                </div>

                {/* Animated Office Location Pin */}
                <div className="relative flex flex-col items-center gap-1.5 z-10">
                  <div className="flex h-4 w-4 relative items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-error opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-error shadow-md"></span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-bg-surface border border-border-primary shadow-lg flex items-center gap-2 transform hover:scale-105 transition-transform duration-300">
                    <span className="text-xs">📍</span>
                    <div className="text-left">
                      <span className="text-[9px] font-bold text-brand-primary uppercase tracking-widest block leading-none">WorkPulse Campus HQ</span>
                      <span className="text-[7px] text-text-muted block mt-0.5 leading-none">Infinity Towers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3, 4 & 5: Message Submission Form */}
          <div className="lg:col-span-3 bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-card hover:shadow-card-hover transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-primary/10 to-transparent rounded-full filter blur-3xl"></div>

            <div className="space-y-6 relative z-10 w-full">
              <div className="border-b border-border-primary pb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Digital Dispatch System</span>
                <h2 className="text-xl font-bold text-text-primary mt-1">Transmit Message Packet</h2>
              </div>

              {success ? (
                <div className="py-12 text-center space-y-4 bg-brand-success/5 border border-brand-success/20 rounded-2xl animate-scaleIn">
                  <div className="w-14 h-14 bg-brand-success/10 border border-brand-success/20 rounded-full flex items-center justify-center text-2xl mx-auto mb-2 text-brand-success">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold text-brand-success">Transmission Dispatched</h3>
                  <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                    Your corporate communication packet has been encrypted and securely transmitted. Our support leads will follow up shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary">Sender Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary">Encryption Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john.doe@company.com"
                        className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary">Operational Division</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary focus:border-brand-primary transition cursor-pointer outline-none"
                    >
                      <option value="General Support">✨ General Support &amp; Sales</option>
                      <option value="Security Audit">🔒 Security Auditing &amp; Access Keys</option>
                      <option value="Billing Desk">💳 Enterprise Billing &amp; Finance</option>
                      <option value="Custom Integration">⚙️ Developers &amp; Integrations API</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary">Transmission Payload</label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Compile detail logs or text message here..."
                      rows="4"
                      className="w-full px-4 py-3 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer shadow-sm text-center"
                  >
                    {submitting ? "Transmitting Signal..." : "Transmit Encrypted Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
