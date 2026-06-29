import React from "react";
import { Link } from "react-router-dom";

const PublicHome = () => {
  const features = [
    {
      title: "Department Isolation",
      desc: "Isolated workspaces for Engineering, CS, and HR divisions, governed by secure role authentication.",
      icon: "🏢",
      accentColor: "border-brand-primary/20 hover:border-brand-primary bg-brand-primary/5 text-brand-primary"
    },
    {
      title: "AI Candidate Scanner",
      desc: "Instantly parse resumes, extract skills, and generate tailored diagnostic interview questions.",
      icon: "🤖",
      accentColor: "border-brand-accent/20 hover:border-brand-accent bg-brand-accent/5 text-brand-accent"
    },
    {
      title: "Digital Attendance Clock",
      desc: "Validate office presence using secure physical OTP codes, eliminating clock-in abuse.",
      icon: "⏱️",
      accentColor: "border-brand-success/20 hover:border-brand-success bg-brand-success/5 text-brand-success"
    },
    {
      title: "Leave Ledgers & Request",
      desc: "Submit leave requests, view active annual limits, and track approvals on isolated timelines.",
      icon: "📅",
      accentColor: "border-brand-error/20 hover:border-brand-error bg-brand-error/5 text-brand-error"
    },
    {
      title: "Telemetry & Analytics",
      desc: "Evaluate team productivity metrics and attendance trends via elegant visualization graphs.",
      icon: "📊",
      accentColor: "border-brand-warning/20 hover:border-brand-warning bg-brand-warning/5 text-brand-warning"
    },
    {
      title: "Secure JWT Framework",
      desc: "SHA-256 encrypted cookies and tokens block remote access and maintain system integrity.",
      icon: "🔐",
      accentColor: "border-brand-secondary/20 hover:border-brand-secondary bg-brand-secondary/5 text-brand-secondary"
    }
  ];

  const testimonials = [
    {
      quote: "WorkPulse's department-insulated workflow has completely secured our system access controls.",
      author: "Emma Vance",
      role: "Lead HR Director",
      avatarBg: "from-pink-500 to-rose-500"
    },
    {
      quote: "The automated AI resume scanner saves our recruitment division hours of diagnostic script drafting.",
      author: "Fiona Davis",
      role: "Talent Acquisition Manager",
      avatarBg: "from-purple-500 to-indigo-500"
    },
    {
      quote: "Preventing remote punch spoofing via physical terminal OTP verification solved our attendance leaks.",
      author: "Anoop Yadav",
      role: "Administrator",
      avatarBg: "from-blue-500 to-teal-500"
    }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden text-text-primary bg-bg-app">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-primary/5 rounded-full filter blur-[150px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-brand-accent/5 rounded-full filter blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32 z-10 space-y-32">
        {/* HERO SECTION */}
        <div className="text-center space-y-8 max-w-4xl mx-auto animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">WorkPulse Terminal v1.2.0 Active</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-text-primary">
            Streamline Your Team. <br />
            Secure Your Workspace.
          </h1>

          <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            The premier department-insulated, AI-powered team management workspace. Designed to eliminate presence spoofing, simplify candidate diagnostics, and audit compliance on automated ledgers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              Enter Workspace Hub
            </Link>
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-bg-surface-alt hover:bg-bg-surface border border-border-primary text-text-secondary font-bold text-xs uppercase tracking-wider rounded-full transition-all"
            >
              Register Account
            </Link>
          </div>
        </div>

        {/* METRICS PANEL */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-3xl bg-bg-surface border border-border-primary shadow-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 to-transparent pointer-events-none"></div>
          {[
            { label: "Attendance Precision", value: "100.0%", icon: "🎯" },
            { label: "Resume Parse Speed", value: "< 1.8s", icon: "⚡" },
            { label: "Active Team Nodes", value: "12 Seeded", icon: "💻" },
            { label: "Data Integrity SLA", value: "99.99%", icon: "🛡️" }
          ].map((m, idx) => (
            <div key={idx} className="text-center space-y-2 relative z-10">
              <span className="text-2xl block">{m.icon}</span>
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{m.label}</p>
              <h3 className="text-2xl font-black text-brand-primary font-mono">
                {m.value}
              </h3>
            </div>
          ))}
        </div>

        {/* FEATURES BENTO SECTION */}
        <div className="space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Core Ecosystem</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">
              Modular Architecture &amp; Control
            </h2>
            <p className="text-text-secondary text-xs max-w-md mx-auto leading-relaxed">
              Every tool within WorkPulse is built to comply with high corporate standards and compartmentalized permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-3xl border shadow-card flex flex-col justify-between space-y-6 hover:-translate-y-1 transition-all duration-300 group bg-bg-surface ${f.accentColor}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-bg-surface-alt border border-border-primary flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-all">
                  {f.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-sm text-text-primary">{f.title}</h3>
                  <p className="text-text-secondary text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TESTIMONIALS SECTION */}
        <div className="space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Division Endorsements</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">
              Trusted by Managers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-bg-surface border border-border-primary flex flex-col justify-between space-y-6 shadow-card hover:shadow-card-hover transition-all"
              >
                <p className="text-text-secondary text-xs italic leading-relaxed font-medium">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border-primary">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${t.avatarBg} text-white font-black text-xs flex items-center justify-center shadow-sm uppercase`}>
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-text-primary leading-none">{t.author}</h4>
                    <span className="text-[9px] text-text-muted font-bold uppercase mt-1 block">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CALL TO ACTION */}
        <div className="p-8 md:p-16 rounded-[2.5rem] bg-gradient-to-tr from-brand-primary/10 via-bg-surface to-brand-accent/10 border border-border-primary text-center space-y-6 shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full filter blur-3xl"></div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
            Ready to secure your workspace?
          </h2>
          <p className="text-text-secondary text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
            Deploy WorkPulse in minutes and experience zero punch leaks, clean audit books, and automated recruiter candidate pipelines instantly.
          </p>
          <div className="pt-4">
            <Link
              to="/signup"
              className="inline-block px-8 py-4 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-sm"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicHome;
