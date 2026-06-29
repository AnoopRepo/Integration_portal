import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Search, Globe, Building2, Lock, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";

// Helper for role permissions access
const canAccess = (shortcut, userRole) => {
  if (!shortcut.roles) return true; // public
  if (userRole === "administrator") return true; // super admin
  return shortcut.roles.map((r) => r.toLowerCase()).includes(userRole);
};

const GENERAL_SHORTCUTS = [
  {
    title: "Submit Daily Update",
    desc: "Log hours, shift reports, milestones, and schedule planned tasks.",
    path: "/submit-update",
    icon: "📝",
    color: "hover:border-brand-primary/30 text-brand-primary",
    badge: "Tasks",
  },
  {
    title: "Daily Task updates",
    desc: "Log daily task checklists, mark status updates, and track blocker items.",
    path: "/daily-tasks",
    icon: "📋",
    color: "hover:border-brand-primary/30 text-brand-primary",
    badge: "Tasks",
  },
  {
    title: "Shift Check-In",
    desc: "Register daily shift presence, validate physical OTP codes, and checkout.",
    path: "/check-in",
    icon: "⏱️",
    color: "hover:border-brand-success/30 text-brand-success",
    badge: "Tasks",
  },
  {
    title: "Work Analytics",
    desc: "Review platform telemetry trend statistics, consistency, and report logs.",
    path: "/dashboard",
    icon: "📊",
    color: "hover:border-brand-accent/30 text-brand-accent",
    badge: "Self-Service",
  },
  {
    title: "Leave & Time Off",
    desc: "Track leave balance limits, request time-off, or review attendance history.",
    path: "/leave",
    icon: "📅",
    color: "hover:border-brand-primary/30 text-brand-primary",
    badge: "Self-Service",
  },
  {
    title: "Support Tickets",
    desc: "Raise system assistance queries or resolve division-level operations.",
    path: "/tickets",
    icon: "🎫",
    color: "hover:border-brand-warning/30 text-brand-warning",
    badge: "Self-Service",
  },
  {
    title: "Expenses & Docs",
    desc: "Submit claim invoices and audit official reimbursement files.",
    path: "/expenses",
    icon: "💵",
    color: "hover:border-brand-error/30 text-brand-error",
    badge: "Self-Service",
  },
  {
    title: "Document Center",
    desc: "Review framework modules, dependencies, and database connection metrics.",
    path: "/documents",
    icon: "📂",
    color: "hover:border-brand-secondary/30 text-brand-secondary",
    badge: "System",
  },
];

const DEPT_SECTIONS = [
  {
    key: "admin",
    label: "Admin",
    icon: "🏛️",
    roles: ["admin", "administrator"],
    accent: "brand-primary",
    tagColor: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
    borderColor: "border-brand-primary/20",
    bgColor: "bg-brand-primary/[0.02]",
    cardColor: "hover:border-brand-primary/30 text-brand-primary",
    items: [
      {
        title: "Admin Hub & Keys",
        desc: "Manage systemic access controls, user definitions, and credential audits.",
        path: "/admin/hub",
        icon: "🔑",
        badge: "Portal",
        roles: ["admin", "administrator"],
      },
      {
        title: "Asset Management",
        desc: "Track company hardware allocations, manage physical inventory custody.",
        path: `/tasks/Admin/${encodeURIComponent("Asset Management")}`,
        icon: "💼",
        roles: ["admin", "administrator"],
      },
      {
        title: "Office Inventory Tracking",
        desc: "Monitor office materials, kitchen items, and stationery supplies.",
        path: `/tasks/Admin/${encodeURIComponent("Office Inventory Tracking")}`,
        icon: "📦",
        roles: ["admin", "administrator"],
      },
      {
        title: "Vendor Coordination",
        desc: "Maintain profiles, services and ping connection status for system suppliers.",
        path: `/tasks/Admin/${encodeURIComponent("Vendor Coordination")}`,
        icon: "🤝",
        roles: ["admin", "administrator"],
      },
      {
        title: "Reminders & Escalations",
        desc: "Override pending actions and resolve administrative workflow bottlenecks.",
        path: `/tasks/Admin/${encodeURIComponent("Reminders/Escalations")}`,
        icon: "⏰",
        roles: ["admin", "administrator"],
      },
      {
        title: "Meeting Scheduling",
        desc: "Coordinate boardroom reservations and dispatch calendar notifications.",
        path: `/tasks/Admin/${encodeURIComponent("Meeting Scheduling")}`,
        icon: "📅",
        roles: ["admin", "administrator"],
      },
      {
        title: "Expense Auditing Console",
        desc: "Fulfill employee reimbursement claims and log office utility expenditures.",
        path: `/tasks/Admin/${encodeURIComponent("Expense Tracking")}`,
        icon: "💵",
        roles: ["admin", "administrator"],
      },
      {
        title: "Document Organization",
        desc: "Publish files, categorize resources, and manage corporate repositories.",
        path: `/tasks/Admin/${encodeURIComponent("Document Organization")}`,
        icon: "📂",
        roles: ["admin", "administrator"],
      },
    ],
  },
  {
    key: "it",
    label: "Information Technology",
    icon: "💻",
    roles: ["it", "administrator"],
    accent: "brand-accent",
    tagColor: "bg-brand-accent/10 text-brand-accent border-brand-accent/20",
    borderColor: "border-brand-accent/20",
    bgColor: "bg-brand-accent/[0.02]",
    cardColor: "hover:border-brand-accent/30 text-brand-accent",
    items: [
      {
        title: "Email & Admin Accounts",
        desc: "Maintain accounts, assign directory access and audit operational credentials.",
        path: `/tasks/IT/${encodeURIComponent("Email/Admin Account Management")}`,
        icon: "📧",
        roles: ["it", "administrator"],
      },
      {
        title: "DNS & Server Monitoring",
        desc: "Track cloud server loads, evaluate latency and verify hosting health logs.",
        path: `/tasks/IT/${encodeURIComponent("DNS/Server Monitoring")}`,
        icon: "🌐",
        roles: ["it", "administrator"],
      },
      {
        title: "Ticket Handling",
        desc: "Fulfill workspace maintenance requests and technical support queries.",
        path: `/tasks/IT/${encodeURIComponent("Ticket Handling")}`,
        icon: "🎫",
        roles: ["it", "administrator"],
      },
      {
        title: "Software & Licenses",
        desc: "Audit office platform subscriptions, manage keys and tracking metrics.",
        path: `/tasks/IT/${encodeURIComponent("Software/License Tracking")}`,
        icon: "🔑",
        roles: ["it", "administrator"],
      },
      {
        title: "Backup Monitoring",
        desc: "Manage systemic snapshot storage pools, verify encryption validation.",
        path: `/tasks/IT/${encodeURIComponent("Backup Monitoring")}`,
        icon: "💾",
        roles: ["it", "administrator"],
      },
      {
        title: "IT Reporting Dashboards",
        desc: "Review workspace activity metrics, security summaries, and system logs.",
        path: `/tasks/IT/${encodeURIComponent("Dashboard/Reporting")}`,
        icon: "📊",
        roles: ["it", "administrator"],
      },
      {
        title: "Cloud Console Activities",
        desc: "Audit cloud identity provider boundaries and administrative operations.",
        path: `/tasks/IT/${encodeURIComponent("Cloud/Admin Console Activities")}`,
        icon: "☁️",
        roles: ["it", "administrator"],
      },
      {
        title: "System Health Alerts",
        desc: "Examine infrastructure uptime statistics and platform telemetry charts.",
        path: `/tasks/IT/${encodeURIComponent("System Health Alerts")}`,
        icon: "🔔",
        roles: ["it", "administrator"],
      },
    ],
  },
  {
    key: "hr",
    label: "Human Resources",
    icon: "👥",
    roles: ["hr", "administrator"],
    accent: "brand-success",
    tagColor: "bg-brand-success/10 text-brand-success border-brand-success/20",
    borderColor: "border-brand-success/20",
    bgColor: "bg-brand-success/[0.02]",
    cardColor: "hover:border-brand-success/30 text-brand-success",
    items: [
      {
        title: "HR Portal",
        desc: "Review candidate resumes with AI scanners, track team consistency, and approve leave requests.",
        path: "/hr",
        icon: "💼",
        badge: "Portal",
        roles: ["hr", "administrator"],
      },
      {
        title: "Resume Screening (AI)",
        desc: "Analyze applicant files using our premium semantic match scanners.",
        path: `/tasks/HR/${encodeURIComponent("Resume Screening")}`,
        icon: "📄",
        roles: ["hr", "administrator"],
      },
      {
        title: "Interview Scheduling",
        desc: "Coordinate interview rooms and schedule live candidate meetings.",
        path: `/tasks/HR/${encodeURIComponent("Interview Scheduling")}`,
        icon: "👤",
        roles: ["hr", "administrator"],
      },
      {
        title: "Onboarding Workflows",
        desc: "Organize employee account activation schedules and orientation logs.",
        path: `/tasks/HR/${encodeURIComponent("Onboarding Workflows")}`,
        icon: "🚀",
        roles: ["hr", "administrator"],
      },
      {
        title: "Attendance Audits",
        desc: "Review daily shift consistency metrics and location log sheets.",
        path: `/tasks/HR/${encodeURIComponent("Attendance Tracking")}`,
        icon: "⏱️",
        roles: ["hr", "administrator"],
      },
      {
        title: "Leave Management Portal",
        desc: "Process time-off claims and audit annual balances.",
        path: `/tasks/HR/${encodeURIComponent("Leave Management")}`,
        icon: "📅",
        roles: ["hr", "administrator"],
      },
      {
        title: "Employee Documentation",
        desc: "Track tax vouchers, credentials and official hiring files.",
        path: `/tasks/HR/${encodeURIComponent("Employee Documentation")}`,
        icon: "📂",
        roles: ["hr", "administrator"],
      },
      {
        title: "Policy Acknowledgements",
        desc: "Track missing compliance acknowledgments and handbook validations.",
        path: `/tasks/HR/${encodeURIComponent("Policy Acknowledgement Tracking")}`,
        icon: "📜",
        roles: ["hr", "administrator"],
      },
      {
        title: "Training Coordination",
        desc: "Schedule safety training courses and track progress limits.",
        path: `/tasks/HR/${encodeURIComponent("Training/Task Tracking")}`,
        icon: "🎓",
        roles: ["hr", "administrator"],
      },
      {
        title: "Performance Reviews",
        desc: "Log quarterly consistent score logs and summarize key results.",
        path: `/tasks/HR/${encodeURIComponent("Performance Review Summaries")}`,
        icon: "🏆",
        roles: ["hr", "administrator"],
      },
      {
        title: "Engagement Feedback",
        desc: "Track employee consistency charts and check engagement scores.",
        path: `/tasks/HR/${encodeURIComponent("Employee Engagement Feedback")}`,
        icon: "💬",
        roles: ["hr", "administrator"],
      },
    ],
  },
];

const ShortcutCard = ({ sc, cardColor, userRole }) => {
  const accessible = canAccess(sc, userRole);
  const accessibleColors = cardColor || "hover:border-brand-primary/30 text-brand-primary";
  const Card = accessible ? Link : "div";

  return (
    <Card
      to={accessible ? sc.path : undefined}
      className={`group relative p-5 bg-bg-surface border border-border-primary rounded-2xl shadow-sm flex flex-col justify-between gap-3 transition-all duration-300 ${
        accessible
          ? `hover:-translate-y-1 hover:shadow-md cursor-pointer ${accessibleColors}`
          : "opacity-45 cursor-not-allowed bg-bg-surface-alt/40"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="w-9 h-9 rounded-xl bg-bg-surface-alt border border-border-primary flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-transform">
          {sc.icon}
        </div>
        <div className="flex items-center gap-1.5">
          {sc.badge && (
            <span className="text-[8px] font-black uppercase tracking-widest text-text-muted border border-border-primary px-1.5 py-0.5 rounded-full">
              {sc.badge}
            </span>
          )}
          {accessible ? (
            <ArrowRight size={12} className="text-text-muted group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
          ) : (
            <span className="text-[9px] bg-brand-error/15 text-brand-error border border-brand-error/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
              <Lock size={8} /> Lock
            </span>
          )}
        </div>
      </div>
      <div>
        <h4 className="font-extrabold text-sm text-text-primary leading-snug">{sc.title}</h4>
        <p className="text-text-secondary text-[11px] mt-1 leading-relaxed">{sc.desc}</p>
      </div>
    </Card>
  );
};

const CommonWorkspaceSection = ({ userRole }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-3xl border border-border-primary bg-bg-surface-alt/40 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-surface-alt/70 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-md bg-gradient-to-br from-brand-primary to-brand-accent text-white">
            🌐
          </div>
          <div className="text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-primary">
              Self-Service
            </p>
            <h3 className="text-sm font-extrabold text-text-primary leading-none">Common Workspace</h3>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-brand-primary/10 text-brand-primary border-brand-primary/20">
            {GENERAL_SHORTCUTS.length} tools
          </span>
        </div>
        <span
          className={`text-text-muted text-xs transition-transform duration-300 shrink-0 ml-2 ${
            !collapsed ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {/* Grid */}
      {!collapsed && (
        <div className="px-6 pb-6">
          <div className="h-px bg-border-primary mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {GENERAL_SHORTCUTS.map((sc, i) => (
              <ShortcutCard key={i} sc={sc} cardColor="" userRole={userRole} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DeptSection = ({ section, userRole, userDept }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = userRole === "administrator";

  const isHRAdmin  = userRole === "admin" && userDept === "hr";
  const isITAdmin  = userRole === "admin" && (userDept === "it" || userDept === "it ops");
  const isGenAdmin = userRole === "admin" && !isHRAdmin && !isITAdmin;

  const hasAccess =
    isAdmin
    || section.roles.includes(userRole)
    || (section.key === "hr"    && isHRAdmin)
    || (section.key === "it"    && isITAdmin)
    || (section.key === "admin" && isGenAdmin);

  if (!hasAccess) return null;

  return (
    <div className={`rounded-3xl border ${section.borderColor} ${section.bgColor} overflow-hidden shadow-sm`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-surface-alt/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-md bg-gradient-to-br ${
              section.accent === "brand-primary"
                ? "from-brand-primary to-brand-primary"
                : section.accent === "brand-accent"
                ? "from-brand-accent to-brand-accent"
                : "from-brand-success to-brand-success"
            } text-white`}
          >
            {section.icon}
          </div>
          <div className="text-left">
            <p className={`text-[9px] font-black uppercase tracking-widest ${section.tagColor.split(" ")[1]}`}>
              Department
            </p>
            <h3 className="text-sm font-extrabold text-text-primary leading-none">{section.label}</h3>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${section.tagColor}`}>
            {section.items.length} items
          </span>
          {isAdmin && (
            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-warning/15 text-brand-warning border border-brand-warning/20 flex items-center gap-1">
              <Sparkles size={8} /> Admin Access
            </span>
          )}
        </div>
        <span
          className={`text-text-muted text-xs transition-transform duration-300 shrink-0 ml-2 ${
            !collapsed ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {/* Grid */}
      {!collapsed && (
        <div className="px-6 pb-6">
          <div className="h-px bg-border-primary mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {section.items.map((sc, i) => (
              <ShortcutCard
                key={i}
                sc={sc}
                cardColor={section.cardColor}
                userRole={userRole}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const userRole = (user?.role || "").toLowerCase();
  const userDept  = (user?.department || "").toLowerCase();
  const isAdmin   = userRole === "administrator";

  const isHRAdmin  = userRole === "admin" && userDept === "hr";
  const isITAdmin  = userRole === "admin" && (userDept === "it" || userDept === "it ops");
  const isGenAdmin = userRole === "admin" && !isHRAdmin && !isITAdmin;

  const visibleSections = DEPT_SECTIONS.filter((s) => {
    if (isAdmin) return true;
    if (s.roles.includes(userRole)) return true;
    if (s.key === "hr"    && isHRAdmin)  return true;
    if (s.key === "it"    && isITAdmin)  return true;
    if (s.key === "admin" && isGenAdmin) return true;
    return false;
  });
  const hasDeptAccess = visibleSections.length > 0;

  const searchableItems = [
    ...GENERAL_SHORTCUTS,
    ...visibleSections.flatMap((s) => s.items),
  ];

  const searchResults = searchQuery.trim()
    ? searchableItems.filter((sc) => {
        const q = searchQuery.toLowerCase();
        return sc.title.toLowerCase().includes(q) || sc.desc.toLowerCase().includes(q);
      })
    : [];

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 lg:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      {/* Background blurs */}
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-brand-primary/5 rounded-full filter blur-[120px] pointer-events-none animate-pulse" />
      <div
        className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-brand-accent/5 rounded-full filter blur-[120px] pointer-events-none animate-pulse"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative max-w-7xl mx-auto z-10 space-y-8">
        {/* Header */}
        <div className="border-b border-border-primary pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
              Workspace Landing Hub
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
              Welcome, {user?.name ? user.name.replace(/\s*\(.*\)/, "") : "Employee"}
            </h1>
            <p className="text-text-secondary text-sm">
              Your central launchpad — portals and task consoles organised by department.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm flex items-center"><Search size={14} /></span>
          <input
            type="text"
            placeholder={
              hasDeptAccess
                ? "Search portals and tasks across your department…"
                : "Search workspace portals…"
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-bg-surface hover:bg-bg-surface-alt border border-border-primary rounded-2xl text-sm text-text-primary placeholder-text-text-muted outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-medium shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent">
              Search Results · {searchResults.length} found
            </p>
            {searchResults.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border-primary rounded-3xl bg-bg-surface/50 space-y-2">
                <span className="text-3xl block">🛸</span>
                <h4 className="font-bold text-text-secondary">No portals matched</h4>
                <p className="text-xs text-text-muted">Try a different keyword.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {searchResults.map((sc, i) => (
                  <ShortcutCard key={i} sc={sc} cardColor="" userRole={userRole} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Common Workspace */}
        {!isSearching && (
          <>
            <CommonWorkspaceSection userRole={userRole} />

            {/* Department Consoles */}
            {hasDeptAccess && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-brand-warning to-brand-warning" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-text-secondary">
                    Department Consoles
                  </h2>
                  {isAdmin && (
                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-warning/15 text-brand-warning border border-brand-warning/20">
                      All Departments Unlocked
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {DEPT_SECTIONS.map((section) => (
                    <DeptSection key={section.key} section={section} userRole={userRole} userDept={userDept} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-border-primary flex items-center justify-between flex-wrap gap-3">
          <p className="text-[10px] text-text-muted font-semibold tracking-wider uppercase">
            ⚡ WorkPulse · Secure Division Insulation Active
          </p>
          <div className="flex gap-4 text-[10px] text-text-muted font-semibold uppercase tracking-wider">
            <Link to="/about" className="hover:text-brand-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-brand-primary transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;