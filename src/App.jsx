import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
// Eagerly load small/always-needed components
import Navbar from "./Component/Navbar";
import Sidebar from "./Component/Sidebar";
import ProtectedRoute from "./Component/ProtectedRoute";

// Lazy load heavy route components — each becomes its own JS chunk
const Login       = lazy(() => import("./Component/Login"));
const Signup      = lazy(() => import("./Component/Signup"));
const Home        = lazy(() => import("./Component/Home"));
const Dashboard   = lazy(() => import("./Component/Dashboard"));
const AdminHub    = lazy(() => import("./Component/AdminHub"));
const AdminUsers  = lazy(() => import("./Component/AdminUsers"));
const UserExpenses = lazy(() => import("./Component/UserExpenses"));
const Tickets     = lazy(() => import("./Component/Tickets"));
const HRPortal    = lazy(() => import("./Component/HRPortal"));
const About       = lazy(() => import("./Component/About"));
const SubmitUpdate = lazy(() => import("./Component/SubmitUpdate"));
const PublicHome  = lazy(() => import("./Component/PublicHome"));
const Contact     = lazy(() => import("./Component/Contact"));
const LeavePortal = lazy(() => import("./Component/LeavePortal"));
const AIInterviewRoom = lazy(() => import("./Component/AIInterviewRoom"));
const AttendancePortal = lazy(() => import("./Component/AttendancePortal"));
const DepartmentTasksPage = lazy(() => import("./Component/DepartmentTasksPage"));
const CompanyAgent = lazy(() => import("./Component/CompanyAgent"));
const DailyTasks   = lazy(() => import("./Component/DailyTasks"));
const DocumentCenter = lazy(() => import("./Component/DocumentCenter"));
const AdminDownloads = lazy(() => import("./Component/AdminDownloads"));


// Shared loading fallback
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
      <p className="text-white/40 text-sm font-medium tracking-wide">Loading…</p>
    </div>
  </div>
);

const LayoutWrapper = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Invisible Hover Zone on the Left Edge — z-[60] so it's always on top of Navbar */}
      <div 
        onMouseEnter={() => setSidebarOpen(true)}
        className="fixed left-0 top-0 bottom-0 w-3 z-[60] transition-all cursor-pointer flex items-center justify-center group"
      >
        <div className="w-1.5 h-20 bg-purple-500/20 group-hover:bg-purple-400 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
      </div>

      {/* Floating Menu Trigger Button — z-[60] raises it above the Navbar (z-50).
          top-3 + h-11 centers the 44px button within the 64px Navbar row. */}
      <div className="fixed left-4 top-[10px] z-[60]">
        <button
          onMouseEnter={() => setSidebarOpen(true)}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 rounded-xl bg-bg-surface/90 backdrop-blur-md border border-border-primary hover:border-brand-primary/40 hover:bg-bg-surface flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer group"
          title="Open navigation menu"
        >
          <span className="text-text-secondary group-hover:text-brand-primary transition-colors text-sm font-bold">☰</span>
        </button>
      </div>

      {/* Mobile Top Header Banner (Hidden on desktop, provides brand title) */}
      <div className="md:hidden w-full h-16 border-b border-border-primary bg-bg-surface/75 backdrop-blur-md flex items-center justify-between px-6 pl-20 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center font-black text-white text-xs">
            W
          </div>
          <span className="font-extrabold text-sm text-text-primary tracking-tight">WorkPulse</span>
        </div>
      </div>

      {/* Main Content Area - Shift padding to give nice breathing room */}
      <main className="flex-1 min-w-0 md:pl-20">
        {children}
      </main>
    </div>
  );
};

const HomeSelector = () => {
  const { user } = useAuth();
  return user ? <Home /> : <Navigate to="/login" replace={true} />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-bg-app text-text-primary font-sans selection:bg-brand-primary/20 transition-colors duration-200">
          <Navbar/>
          <LayoutWrapper>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomeSelector />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/submit-update" element={
                  <ProtectedRoute>
                    <SubmitUpdate />
                  </ProtectedRoute>
                } />
                <Route path="/daily-tasks" element={
                  <ProtectedRoute>
                    <DailyTasks />
                  </ProtectedRoute>
                } />
                <Route path="/admin/hub" element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminHub />
                  </ProtectedRoute>
                } />
                <Route path="/expenses" element={
                  <ProtectedRoute>
                    <UserExpenses />
                  </ProtectedRoute>
                } />
                <Route path="/tickets" element={
                  <ProtectedRoute>
                    <Tickets />
                  </ProtectedRoute>
                } />
                <Route path="/check-in" element={
                  <ProtectedRoute>
                    <AttendancePortal />
                  </ProtectedRoute>
                } />
                <Route path="/leave" element={
                  <ProtectedRoute>
                    <LeavePortal />
                  </ProtectedRoute>
                } />
                <Route path="/hr" element={
                  <ProtectedRoute hrOnly={true}>
                    <HRPortal />
                  </ProtectedRoute>
                } />
                <Route path="/tasks/:department/:taskName" element={
                  <ProtectedRoute>
                    <DepartmentTasksPage />
                  </ProtectedRoute>
                } />
                <Route path="/about" element={
                  <ProtectedRoute>
                    <About />
                  </ProtectedRoute>
                } />
                <Route path="/contact" element={
                  <ProtectedRoute>
                    <Contact />
                  </ProtectedRoute>
                } />
                <Route path="/ai-interview/:candidateId" element={<AIInterviewRoom />} />
                <Route path="/company-agent/*" element={
                  <ProtectedRoute>
                    <CompanyAgent />
                  </ProtectedRoute>
                } />
                <Route path="/documents" element={
                  <ProtectedRoute>
                    <DocumentCenter />
                  </ProtectedRoute>
                } />
                <Route path="/admin/downloads" element={
                  <ProtectedRoute allowedRoles={["admin", "administrator", "hr"]}>
                    <AdminDownloads />
                  </ProtectedRoute>
                } />
                <Route path="/login" element={<Login />} />
              </Routes>
            </Suspense>
          </LayoutWrapper>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;