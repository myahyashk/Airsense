import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  CheckCheck,
  Shield,
  Volume2,
  VolumeX,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import type { AlertItem } from "../../services/types";
import { useToast } from "../../context/ToastContext";
import { dedupeAlerts } from "../../utils/alerts";

export const AlertsPage: React.FC = () => {
  const context = useOutletContext<{
    alerts: AlertItem[];
    refreshData: () => Promise<void>;
  }>();

  const [alerts, setAlerts] = useState<AlertItem[]>(dedupeAlerts(context?.alerts || []));
  const [filter, setFilter] = useState<"all" | "active" | "unread">("all");
  const [loading, setLoading] = useState<boolean>(!context?.alerts);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const { addToast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts(50);
      setAlerts(dedupeAlerts(res.items));
    } catch {
      // Degraded handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Request browser Notification API permission politely
  const requestNotificationAccess = async () => {
    if (typeof Notification === "undefined") {
      addToast({
        type: "warning",
        title: "Notifications Unsupported",
        message: "Your browser does not support the web Notification API.",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        addToast({
          type: "success",
          title: "Browser Notifications Enabled",
          message: "You will receive desktop alerts when hazardous air is detected.",
        });
        // Test notification
        new Notification("AirSense Notification Enabled", {
          body: "Campus alerts will alert you before air becomes unsafe.",
          icon: "/favicon.svg",
        });
      }
    } catch (err) {
      console.warn("Notification permission request error:", err);
    }
  };

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await api.markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
      addToast({
        type: "info",
        title: "Alert Read",
        message: "Alert marked as read.",
        duration: 3000,
      });
      if (context?.refreshData) {
        context.refreshData();
      }
    } catch (err: any) {
      addToast({
        type: "danger",
        title: "Action Failed",
        message: err.message,
      });
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "active") return a.active;
    if (filter === "unread") return !a.read;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;
  const activeDanger = alerts.find((a) => a.active && a.severity === "danger");

  return (
    <div className="space-y-6">
      <HeroCard
        title="Campus Alerts & Safety Bulletins"
        description="Real-time threshold exceedance alerts and proactive forecast warnings for the BBSUTSD campus community."
        keyValueLabel="UNREAD"
        keyValue={unreadCount}
        statusChipText={activeDanger ? "DANGER ACTIVE" : "System Guard Active"}
        statusChipColor={activeDanger ? "red" : "teal"}
      />

      {/* Browser Notification Permission Banner */}
      {notificationPermission !== "granted" && (
        <Card className="p-4 bg-gradient-to-r from-[#123a63] to-[#172e4a] border-[#244b7a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#4f9eff]/15 text-[#4f9eff] border border-[#4f9eff]/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Enable Instant Browser Push Alerts
              </h3>
              <p className="text-xs text-slate-300">
                Receive proactive desktop warnings BEFORE campus air quality reaches unsafe particulate levels.
              </p>
            </div>
          </div>
          <button
            onClick={requestNotificationAccess}
            className="px-4 py-2 bg-[#4f9eff] hover:bg-[#3b82f6] text-slate-950 rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-glow"
          >
            Allow Notifications
          </button>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-[#1d3b61]/80 pb-3">
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: `All Alerts (${alerts.length})` },
            { key: "active", label: `Active (${alerts.filter((a) => a.active).length})` },
            { key: "unread", label: `Unread (${unreadCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === tab.key
                  ? "bg-[#123a63] text-[#4f9eff] border border-[#244b7a]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton height="h-28" />
          <CardSkeleton height="h-28" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <CheckCheck className="w-12 h-12 text-[#2ec4a6] mx-auto opacity-80" />
          <h3 className="text-base font-bold text-white">No Alerts to Display</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filter === "unread"
              ? "You have marked all recent notifications as read."
              : "Air quality levels are currently within safe thresholds across campus."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const severityStyles = {
              danger: {
                border: "border-[#ef4444]/40",
                bg: "bg-[#881337]/15",
                badge: "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30",
                icon: AlertCircle,
              },
              warning: {
                border: "border-[#f97316]/40",
                bg: "bg-[#f97316]/10",
                badge: "bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30",
                icon: AlertTriangle,
              },
              info: {
                border: "border-[#1d3b61]",
                bg: "bg-[#112338]",
                badge: "bg-[#4f9eff]/20 text-[#4f9eff] border-[#4f9eff]/30",
                icon: Info,
              },
            }[alert.severity];

            const Icon = severityStyles.icon;

            return (
              <Card
                key={alert.id}
                className={`p-5 transition-all ${severityStyles.bg} ${severityStyles.border} ${
                  !alert.read ? "ring-1 ring-[#4f9eff]/30" : "opacity-85"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2 rounded-xl mt-0.5 border ${severityStyles.badge} flex-shrink-0`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityStyles.badge}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          Source: {alert.source === "auto" ? "Automated Sensor Trigger" : `Admin (${alert.created_by || "Faculty"})`}
                        </span>
                        {!alert.active && (
                          <span className="text-[10px] text-slate-500 bg-[#0b1626] px-1.5 py-0.5 rounded border border-[#1d3b61]">
                            Resolved / Expired
                          </span>
                        )}
                        {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-[#4f9eff] inline-block" title="Unread" />
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white tracking-tight">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                        {alert.message}
                      </p>

                      <div className="text-[11px] text-slate-400 pt-2 flex items-center gap-4">
                        <span>Issued: {new Date(alert.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                        {alert.expires_at && (
                          <span>Valid until: {new Date(alert.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!alert.read && (
                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123a63] hover:bg-[#183252] border border-[#244b7a] rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition-all flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-[#2ec4a6]" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
