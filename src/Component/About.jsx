import React from "react";

const About = () => {
  const systemMetrics = [
    { label: "Core Platform", value: "WorkPulse Workspace Terminal" },
    { label: "Current Version", value: "v1.2.0 (Stable)" },
    { label: "Frontend Stack", value: "React 19, Vite 8, Tailwind CSS" },
    { label: "Backend Core", value: "FastAPI, Python 3.11, Uvicorn" },
    { label: "Primary Database", value: "MongoDB Atlas Cloud Cluster" },
    { label: "Security Layer", value: "Bcrypt Hashing, SHA-256 JWT OTP" },
  ];

  const officeDirectory = [
    { department: "IT & System Ops", lead: "Anoop Yadav (Administrator)", staffCount: "2 Active Members" },
    { department: "Engineering Team", lead: "Anoop Yadav (Eng Admin)", staffCount: "2 Active Members" },
    { department: "Human Resources (HR)", lead: "Grace HR Admin", staffCount: "2 Active Members" },
    { department: "Customer Support (CS)", lead: "Sam Support Admin", staffCount: "2 Active Members" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 relative overflow-hidden bg-bg-app text-text-primary flex justify-center items-center">
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-primary/5 rounded-full filter blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-accent/5 rounded-full filter blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="relative w-full max-w-4xl z-10 space-y-8 animate-fadeIn">
        {/* Header Block */}
        <div className="text-center space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">System Information Ledger</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
            About WorkPulse Portal
          </h1>
          <p className="text-text-secondary text-xs max-w-md mx-auto">
            Review core architecture metadata, physical office directory specifications, and platform telemetry.
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Platform telemetry */}
          <div className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-6 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-primary/10 to-transparent rounded-full filter blur-xl"></div>
            
            <div className="border-b border-border-primary pb-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-primary">Spec 01</span>
              <h3 className="text-md font-bold text-text-primary mt-0.5">Platform Telemetry &amp; Specs</h3>
            </div>

            <div className="space-y-4">
              {systemMetrics.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs border-b border-border-primary/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-text-secondary font-medium">{m.label}</span>
                  <span className="font-bold text-text-primary font-mono text-[11px] bg-bg-surface-alt border border-border-primary px-2.5 py-1 rounded-lg">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Office Directory */}
          <div className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-6 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-accent/10 to-transparent rounded-full filter blur-xl"></div>

            <div className="border-b border-border-primary pb-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-accent">Spec 02</span>
              <h3 className="text-md font-bold text-text-primary mt-0.5">Workspace Directory</h3>
            </div>

            <div className="space-y-4">
              {officeDirectory.map((d, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs border-b border-border-primary/50 pb-2 last:border-0 last:pb-0 gap-4">
                  <div>
                    <span className="font-bold text-text-primary block">{d.department}</span>
                    <span className="text-[10px] text-text-secondary block mt-0.5">Lead: {d.lead}</span>
                  </div>
                  <span className="shrink-0 font-bold text-[9px] tracking-wider uppercase bg-brand-accent/10 border border-brand-accent/20 text-brand-accent px-2 py-0.5 rounded">
                    {d.staffCount}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="bg-bg-surface border border-border-primary rounded-2xl p-4 text-center text-[10px] text-text-muted font-bold tracking-wider uppercase">
          🔒 System Access Boundaries Monitored Under SHA-256 OTP Protocols
        </div>
      </div>
    </div>
  );
};

export default About;
