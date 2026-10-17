import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  Send,
  XCircle,
  Clock,
  CheckCircle,
  Info,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { api } from "../../services/api";
import { AlertItem } from "../../services/types";
import { useToast } from "../../context/ToastContext";

export const AdminAlertsPage: React.FC = () => {
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State for Manual Alert
  const [severity, setSeverity] = useState<"info" | "warning" | "danger">("warning");
  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Deactivate Modal
  const [deactivateTarget, setDeactivateTarget] = useState<AlertItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminAlerts(50);
      setAlerts(data);
    } catch (err: any) {
      addToast({ type: "danger", title: "Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createAdminAlert({
        severity,
        title: title.trim(),
        message: message.trim(),
        expires_in_hours: expiresInHours,
      });
      addToast({
        type: "success",
        title: "Alert Dispatched",
        message: "Manual campus alert has been published to all users.",
      });
      setTitle("");
      setMessage("");
      fetchAlerts();
    } catch (err: any) {
      addToast({ type: "danger", title: "Dispatch Failed", message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await api.deactivateAdminAlert(deactivateTarget.id);
      addToast({
        type: "info",
        title: "Alert Deactivated",
        message: `Alert '${deactivateTarget.title}' was marked inactive.`,
      });
      setDeactivateTarget(null);
      fetchAlerts();
    } catch (err: any) {
      addToast({ type: "danger", title: "Action Failed", message: err.message });
    } finally {
      setIsDeactivating(false);
    }
  };

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <div className="space-y-6">
      <HeroCard
        title="Campus Alert Dispatcher &amp; Log"
        description="Broadcast emergency warnings or advisories directly to the campus app feed. Deactivate active alerts or audit automated trigger histories."
        keyValueLabel="ACTIVE ALERTS"
        keyValue={activeCount}
        statusChipText="Broadcast Authority"
        statusChipColor="orange"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Broadcast Form */}
        <div className="lg:col-span-5">
          <Card className="p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-[#4f9eff]" />
              <span>Broadcast Manual Campus Alert</span>
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Severity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "info", label: "Info", color: "text-[#4f9eff] border-[#4f9eff]/40 bg-[#4f9eff]/10" },
                    { val: "warning", label: "Warning", color: "text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10" },
                    { val: "danger", label: "Danger", color: "text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/10" },
                  ].map((lvl) => (
                    <button
                      key={lvl.val}
                      type="button"
                      onClick={() => setSeverity(lvl.val as any)}
                      className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                        severity === lvl.val
                          ? `${lvl.color} shadow-sm ring-1 ring-current`
                          : "bg-[#0b1626] border-[#1d3b61] text-slate-400 hover:text-white"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alert Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dust Storm Approaching Khairpur"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0b1626] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Message / Advisory Body
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide concrete precautions for students and staff..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#0b1626] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl px-4 py-2.5 text-xs text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expiry Duration (Hours)
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  className="w-full bg-[#0b1626] border border-[#1d3b61] rounded-xl px-4 py-2.5 text-xs text-white"
                >
                  <option value={6}>6 Hours</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={168}>1 Week</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-[#4f9eff] hover:bg-[#3b82f6] text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-glow disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? "Broadcasting..." : "Dispatch Alert to All Portals"}</span>
              </button>
            </form>
          </Card>
        </div>

        {/* Right: Alert History Table */}
        <div className="lg:col-span-7">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#112338] border-b border-[#1d3b61] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Alert History &amp; Dispatch Log</h3>
              <span className="text-xs text-slate-400 font-mono">{alerts.length} total events</span>
            </div>

            <div className="overflow-x-auto max-h-[560px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b1626] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1d3b61] sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Alert</th>
                    <th className="py-3 px-4">Creator</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d3b61]/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading alerts...
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No alerts recorded.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((a) => (
                      <tr key={a.id} className="hover:bg-[#152c46]/40 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              a.severity === "danger"
                                ? "bg-[#ef4444]/20 text-[#ef4444]"
                                : a.severity === "warning"
                                ? "bg-[#f97316]/20 text-[#f97316]"
                                : "bg-[#4f9eff]/20 text-[#4f9eff]"
                            }`}
                          >
                            {a.severity}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-white truncate">{a.title}</div>
                          <div className="text-slate-400 text-[11px] truncate">{a.message}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {a.source === "auto" ? (
                            <span className="text-[#2ec4a6]">Auto Trigger</span>
                          ) : (
                            <span className="text-[#4f9eff]">{a.created_by || "Faculty Admin"}</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              a.active
                                ? "bg-[#10b981]/15 text-[#10b981]"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {a.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {a.active ? (
                            <button
                              onClick={() => setDeactivateTarget(a)}
                              className="text-xs text-[#ef4444] hover:text-rose-300 font-semibold transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Campus Alert"
        description={`Are you sure you want to deactivate alert '${deactivateTarget?.title}'? It will no longer show in active banners or dispatch notifications.`}
        confirmLabel="Yes, Deactivate"
        isDestructive={true}
        isLoading={isDeactivating}
      />
    </div>
  );
};
