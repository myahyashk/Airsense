import React, { useState, useEffect } from "react";
import { FileText, Filter, Search, ShieldCheck, Clock, RefreshCw } from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { api } from "../../services/api";
import type { AuditItem } from "../../services/types";
import { useToast } from "../../context/ToastContext";

export const AdminAuditPage: React.FC = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(100, actionFilter || undefined);
      setLogs(data.items);
    } catch (err: any) {
      addToast({ type: "danger", title: "Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      log.user.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <HeroCard
        title="Security &amp; Administrative Audit Log"
        description="Immutable audit trail of security events, administrative role updates, manual alert publications, model retraining operations, and data exports."
        keyValueLabel="TOTAL AUDITED"
        keyValue={logs.length}
        statusChipText="Security Compliant"
        statusChipColor="teal"
      />

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, details..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#0b1626] border border-[#1d3b61] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#4f9eff]"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#0b1626] border border-[#1d3b61] rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="failed_login">Failed Login</option>
            <option value="register">Register</option>
            <option value="role_change">Role Change</option>
            <option value="user_disable">User Disable</option>
            <option value="threshold_change">Threshold Change</option>
            <option value="alert_create">Alert Create</option>
            <option value="alert_deactivate">Alert Deactivate</option>
            <option value="model_retrain">Model Retrain</option>
            <option value="data_export">Data Export</option>
          </select>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 text-slate-300 hover:text-white hover:bg-[#112338] border border-[#1d3b61] rounded-xl text-xs transition-colors"
          title="Refresh audit logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </Card>

      {/* Audit Log Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1626] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1d3b61] sticky top-0">
              <tr>
                <th className="py-3 px-5">Timestamp (PKT)</th>
                <th className="py-3 px-5">Actor</th>
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-5">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d3b61]/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const actionStyle = {
                    login: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30",
                    failed_login: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30",
                    role_change: "bg-[#4f9eff]/15 text-[#4f9eff] border-[#4f9eff]/30",
                    threshold_change: "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30",
                    alert_create: "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30",
                    model_retrain: "bg-[#8b5cf6]/15 text-[#8b5cf6] border-[#8b5cf6]/30",
                    data_export: "bg-[#2ec4a6]/15 text-[#2ec4a6] border-[#2ec4a6]/30",
                  }[log.action] || "bg-slate-800 text-slate-300 border-slate-700";

                  return (
                    <tr key={idx} className="hover:bg-[#152c46]/40 transition-colors">
                      <td className="py-3 px-5 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.time).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>

                      <td className="py-3 px-5 font-medium text-white whitespace-nowrap">
                        {log.user}
                      </td>

                      <td className="py-3 px-5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${actionStyle}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-5 text-slate-300 font-mono text-[11px]">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
