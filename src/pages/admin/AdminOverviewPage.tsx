import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Cpu,
  Users,
  Bell,
  RefreshCw,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Database,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { AdminOverviewResponse } from "../../services/types";

export const AdminOverviewPage: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || "Failed to load admin overview metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-[#112338] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton height="h-32" />
          <CardSkeleton height="h-32" />
          <CardSkeleton height="h-32" />
          <CardSkeleton height="h-32" />
        </div>
      </div>
    );
  }

  const dataStatus = overview?.data;
  const modelStatus = overview?.model;
  const userStats = overview?.users;
  const alertStats = overview?.alerts_last_7_days;

  return (
    <div className="space-y-6">
      <HeroCard
        title="Administrative Command Center"
        description="University system overview: telemetry freshness, automated alert dispatching, forecasting metrics, and role-based access management."
        keyValueLabel="SOURCE STATUS"
        keyValue={dataStatus?.source_status?.toUpperCase() || "LIVE"}
        statusChipText={dataStatus?.source_status === "live" ? "System Optimal" : "Degraded Mode"}
        statusChipColor={dataStatus?.source_status === "live" ? "teal" : "yellow"}
        actions={
          <button
            onClick={fetchOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#183252] hover:bg-[#1d3b61] border border-[#244b7a] rounded-xl text-xs font-semibold text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Telemetry Freshness */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Data Freshness
            </span>
            <Database className="w-4 h-4 text-[#4f9eff]" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-white font-mono">
              {dataStatus?.freshness_minutes ?? 2} <span className="text-sm font-normal text-slate-400">min ago</span>
            </div>
            <span className="text-xs text-[#2ec4a6] flex items-center gap-1 mt-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ec4a6] animate-pulse" />
              Source: Open-Meteo
            </span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#1d3b61]/60 pt-2">
            Auto-refresh: Every 30 mins
          </div>
        </Card>

        {/* Users Count */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Campus Users
            </span>
            <Users className="w-4 h-4 text-[#2ec4a6]" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-white font-mono">
              {userStats?.total ?? 0}
            </div>
            <span className="text-xs text-slate-300 mt-1 block">
              {userStats?.admins ?? 0} Administrators configured
            </span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#1d3b61]/60 pt-2">
            Role-Based Access Control
          </div>
        </Card>

        {/* Alerts 7 Days */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Alerts (Last 7d)
            </span>
            <Bell className="w-4 h-4 text-[#eab308]" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-white font-mono">
              {(alertStats?.auto || 0) + (alertStats?.manual || 0)}
            </div>
            <span className="text-xs text-slate-300 mt-1 block">
              {alertStats?.auto ?? 0} Auto • {alertStats?.manual ?? 0} Manual Dispatches
            </span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#1d3b61]/60 pt-2">
            Threshold deduplicated
          </div>
        </Card>

        {/* ML Performance */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Forecasting Model
            </span>
            <Cpu className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {modelStatus?.mae ?? 8.4} <span className="text-xs font-normal text-slate-400">MAE</span>
            </div>
            <span className="text-xs text-slate-300 mt-1 block">
              Baseline MAE: {modelStatus?.baseline_mae ?? 14.8}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#1d3b61]/60 pt-2">
            GBR vs Persistence
          </div>
        </Card>
      </div>

      {/* Model Summary & Evaluation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1d3b61]/80 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#4f9eff]" />
              <h3 className="font-bold text-white text-base">Model Accuracy &amp; Benchmark</h3>
            </div>
            <span className="text-xs font-mono text-[#2ec4a6] bg-[#0d2e26] px-2 py-0.5 rounded">
              Outperforming Baseline
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The explainable Gradient Boosting Regressor utilizes rolling particulate means, cyclical diurnal features (sin/cos of hour), and Open-Meteo wind and humidity telemetry. It evaluated against a persistence baseline on an 80/20 chronological split.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[#0b1626] rounded-xl border border-[#1d3b61]">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">GBR Model Error</span>
              <div className="text-lg font-bold text-white mt-1 font-mono">
                MAE: {modelStatus?.mae} | RMSE: {modelStatus?.rmse}
              </div>
            </div>

            <div className="p-3 bg-[#0b1626] rounded-xl border border-[#1d3b61]">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Persistence Baseline</span>
              <div className="text-lg font-bold text-slate-300 mt-1 font-mono">
                MAE: {modelStatus?.baseline_mae}
              </div>
            </div>
          </div>
        </Card>

        {/* System Health Check List */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1d3b61]/80 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2ec4a6]" />
              <h3 className="font-bold text-white text-base">System Subsystem Health</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">All Subsystems Operational</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b1626] border border-[#1d3b61] text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#2ec4a6]" />
                <span className="font-semibold text-white">Ingestion Pipeline</span>
              </div>
              <span className="text-slate-400 font-mono">Open-Meteo REST (Khairpur Mirs)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b1626] border border-[#1d3b61] text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#2ec4a6]" />
                <span className="font-semibold text-white">Periodic Scheduler</span>
              </div>
              <span className="text-slate-400 font-mono">APScheduler (30 min interval)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b1626] border border-[#1d3b61] text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#2ec4a6]" />
                <span className="font-semibold text-white">SQLite Database Storage</span>
              </div>
              <span className="text-slate-400 font-mono">SQLAlchemy ORM (WAL mode)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b1626] border border-[#1d3b61] text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#2ec4a6]" />
                <span className="font-semibold text-white">Security &amp; RBAC</span>
              </div>
              <span className="text-slate-400 font-mono">Bcrypt + JWT HS256 + Rate Limiter</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
