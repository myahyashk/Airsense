import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

import { AuthPage } from "./pages/auth/AuthPage";
import { AppLayout } from "./components/layout/AppLayout";

// User Portal Pages
import { OverviewPage } from "./pages/user/OverviewPage";
import { ForecastPage } from "./pages/user/ForecastPage";
import { HistoryPage } from "./pages/user/HistoryPage";
import { AlertsPage } from "./pages/user/AlertsPage";
import { GuidancePage } from "./pages/user/GuidancePage";
import { PreferencesPage } from "./pages/user/PreferencesPage";
import { ProfilePage } from "./pages/user/ProfilePage";

// Admin Portal Pages
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminAlertsPage } from "./pages/admin/AdminAlertsPage";
import { AdminThresholdsPage } from "./pages/admin/AdminThresholdsPage";
import { AdminDataPage } from "./pages/admin/AdminDataPage";
import { AdminModelPage } from "./pages/admin/AdminModelPage";
import { AdminAuditPage } from "./pages/admin/AdminAuditPage";

// Route Guard for Authenticated Users
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1626] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#4f9eff] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Verifying Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route Guard for Administrators Only (403 Protection)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1626] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#4f9eff] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Checking Admin Privileges...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0b1626] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#112338] border border-[#ef4444]/40 rounded-2xl p-8 space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-white">403 — Admin Access Prohibited</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your university account does not possess administrator credentials to view the /admin command center.
          </p>
          <a
            href="/app"
            className="inline-block px-5 py-2 bg-[#4f9eff] hover:bg-[#3b82f6] text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            Return to User Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Root Redirect Component
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1626] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4f9eff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Root Route */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />

            {/* User Portal Routes */}
            <Route
              path="/app"
              element={
                <UserRoute>
                  <AppLayout />
                </UserRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="forecast" element={<ForecastPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="guidance" element={<GuidancePage />} />
              <Route path="preferences" element={<PreferencesPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Admin Portal Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AppLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="alerts" element={<AdminAlertsPage />} />
              <Route path="thresholds" element={<AdminThresholdsPage />} />
              <Route path="data" element={<AdminDataPage />} />
              <Route path="model" element={<AdminModelPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
