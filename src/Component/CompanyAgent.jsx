import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./company_agent/components/layout/AppLayout";
import { ChatPage } from "./company_agent/pages/ChatPage";
import { DashboardPage } from "./company_agent/pages/DashboardPage";
import { AgentsPage } from "./company_agent/pages/AgentsPage";
import { ProfilePage } from "./company_agent/pages/ProfilePage";
import { SettingsPage } from "./company_agent/pages/SettingsPage";
import { PdfExtractorPage } from "./company_agent/pages/PdfExtractorPage";
import { BillExtractorPage } from "./company_agent/pages/BillExtractorPage";

const CompanyAgent = () => {
  return (
    <div className="company-agent-root min-h-screen w-full relative select-text">
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="pdf-extractor" element={<PdfExtractorPage />} />
          <Route path="bill-extractor" element={<BillExtractorPage />} />
        </Route>
      </Routes>
    </div>
  );
};

export default CompanyAgent;
