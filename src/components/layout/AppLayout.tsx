import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { api } from "../../services/api";
import type { CurrentReading, AlertItem } from "../../services/types";
import { useToast } from "../../context/ToastContext";
import { dedupeAlerts, shouldNotifyForAlert } from "../../utils/alerts";
import { AlertCircle, Bell } from "lucide-react";

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentReading, setCurrentReading] = useState<CurrentReading | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const location = useLocation();
  const { addToast } = useToast();
  const previousAlertsRef = useRef<AlertItem[]>([]);

  const getPageTitle = (pathname: string): string => {
    if (pathname === "/app") return "Live Campus Air Quality";
    if (pathname === "/app/forecast") return "6-Hour Forecast & Trajectory";
    if (pathname === "/app/history") return "Pollutant Trends & History";
    if (pathname === "/app/alerts") return "Campus Air Alerts & Advisories";
    if (pathname === "/app/guidance") return "Health & Protective Guidance";
    if (pathname === "/app/preferences") return "Personal Alert Preferences";
    if (pathname === "/app/profile") return "User Account Profile";

    if (pathname === "/admin") return "Admin Command Center";
    if (pathname === "/admin/users") return "User & Role Management";
    if (pathname === "/admin/alerts") return "Alert Dispatcher & History";
    if (pathname === "/admin/thresholds") return "Campus Threshold Configuration";
    if (pathname === "/admin/data") return "Telemetry Ingestion & Data Export";
    if (pathname === "/admin/model") return "Forecasting Model & Retraining";
    if (pathname === "/admin/audit") return "Security & System Audit Log";

    return "AirSense";
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [readingRes, alertsRes] = await Promise.allSettled([
        api.getCurrent(),
        api.getAlerts(20),
      ]);

      if (readingRes.status === "fulfilled") {
        setCurrentReading(readingRes.value);
      }
      if (alertsRes.status === "fulfilled") {
        const nextAlerts = dedupeAlerts(alertsRes.value.items);
        setAlerts(nextAlerts);

        if (shouldNotifyForAlert(previousAlertsRef.current, nextAlerts)) {
          const newestAlert = nextAlerts.find((alert) => !alert.read && alert.active) ?? nextAlerts[0];
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && newestAlert) {
            new Notification("AirSense Alert", {
              body: newestAlert.title || newestAlert.message || "New campus air quality update available.",
              icon: "/favicon.svg",
            });
          }
        }

        previousAlertsRef.current = nextAlerts;
      }
    } catch {
      // Degraded or network error handled gracefully
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.read && a.active);
  const activeDangerAlert = alerts.find((a) => a.active && a.severity === "danger");

  return (
    <div className="min-h-screen bg-[#0b1626] text-slate-100 flex flex-col font-sans">
      {/* Accessibility Skip-to-Content Link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Persistent Left Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        unreadAlertsCount={unreadAlerts.length}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Slim Header */}
        <Header
          title={getPageTitle(location.pathname)}
          lastUpdated={currentReading?.timestamp}
          onRefresh={fetchData}
          isRefreshing={isRefreshing}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        {/* Prominent Active Danger Alert Banner (if danger alert active) */}
        {activeDangerAlert && (
          <div
            role="alert"
            className="bg-[#881337]/90 border-b border-[#ef4444]/60 text-white px-4 lg:px-8 py-3 flex items-center justify-between gap-4 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <span className="p-1.5 bg-[#ef4444] rounded-lg flex-shrink-0 animate-bounce">
                <AlertCircle className="w-5 h-5 text-white" />
              </span>
              <div>
                <span className="font-bold tracking-wide uppercase text-xs text-rose-200 mr-2">
                  Campus Danger Alert
                </span>
                <span className="font-semibold text-sm">{activeDangerAlert.title}: </span>
                <span className="text-sm text-rose-100">{activeDangerAlert.message}</span>
              </div>
            </div>
            <a
              href="/app/alerts"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              View Alert Feed
            </a>
          </div>
        )}

        {/* Dynamic Route View */}
        <main id="main-content" className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto outline-none" tabIndex={-1}>
          <Outlet context={{ currentReading, alerts, refreshData: fetchData, isRefreshing }} />
        </main>

        {/* Consistent Global Footer */}
        <Footer />
      </div>
    </div>
  );
};
