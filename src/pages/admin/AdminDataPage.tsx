import React, { useState, useEffect } from "react";
import {
  Database,
  RefreshCw,
  Download,
  Calendar,
  CheckCircle,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export const AdminDataPage: React.FC = () => {
  const { addToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>("");
  const [sourceStatus, setSourceStatus] = useState<string>("sample");

  // Export filters
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const checkStatus = async () => {
    try {
      const data = await api.getAdminOverview();
      setLastFetchTime(data.data.last_fetch);
      setSourceStatus(data.data.source_status);
    } catch {
      // Degraded handled
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleRefreshNow = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.refreshData();
      addToast({
        type: "success",
        title: "Ingestion Synchronized",
        message: `Successfully pulled telemetry: ${res.fetched} new readings stored.`,
      });
      checkStatus();
    } catch (err: any) {
      addToast({ type: "danger", title: "Ingestion Failed", message: err.message });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const blob = await api.exportReadings(fromDate || undefined, toDate || undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "airsense_readings.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast({
        type: "success",
        title: "Export Downloaded",
        message: "The campus sample readings CSV has been downloaded.",
      });
    } catch (err: any) {
      addToast({ type: "danger", title: "Export Failed", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <HeroCard
        title="Campus Data &amp; Export"
        description="Review the locally available campus readings, refresh the sample dataset, and export a date-filtered CSV."
        keyValueLabel="SOURCE INTEGRITY"
        keyValue={sourceStatus.toUpperCase()}
        statusChipText={sourceStatus === "sample" ? "Sample Dataset" : sourceStatus === "live" ? "Open-Meteo Live" : "Degraded Cache"}
        statusChipColor={sourceStatus === "sample" || sourceStatus === "live" ? "teal" : "yellow"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Telemetry Connection Status & Manual Trigger */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1d3b61] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#4f9eff]" />
                <h3 className="font-bold text-white text-base">Campus Sample Readings</h3>
              </div>
              <span className="text-xs text-[#2ec4a6] flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2ec4a6] animate-ping" />
                Locally Available
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#0b1626] rounded-xl border border-[#1d3b61] flex justify-between">
                <span className="text-slate-400">Target Campus Coordinates:</span>
                <span className="font-mono text-white font-semibold">27.53° N, 68.76° E</span>
              </div>

              <div className="p-3 bg-[#0b1626] rounded-xl border border-[#1d3b61] flex justify-between">
                <span className="text-slate-400">Monitoring Station:</span>
                <span className="text-white font-medium">BBSUTSD Campus, Khairpur Mirs</span>
              </div>

              <div className="p-3 bg-[#0b1626] rounded-xl border border-[#1d3b61] flex justify-between">
                <span className="text-slate-400">Last Telemetry Fetch:</span>
                <span className="font-mono text-white">
                  {lastFetchTime ? new Date(lastFetchTime).toLocaleString() : "Just now"}
                </span>
              </div>

              <div className="p-3 bg-[#0b1626] rounded-xl border border-[#1d3b61] flex justify-between">
                <span className="text-slate-400">Monitored Pollutants:</span>
                <span className="text-[#4f9eff] font-medium">PM2.5, PM10, Dust, US AQI, Temp, Wind</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleRefreshNow}
                disabled={isRefreshing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#123a63] hover:bg-[#183252] border border-[#244b7a] rounded-xl text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-[#4f9eff] ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Refreshing Readings..." : "Refresh Sample Readings"}</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Right: CSV Research Data Export */}
        <div className="lg:col-span-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1d3b61] pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#2ec4a6]" />
                <h3 className="font-bold text-white text-base">Export Readings to CSV</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Research Export</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Export campus air quality records for university scientific analysis. The export includes timestamp (Asia/Karachi PKT), PM2.5, PM10, airborne dust, and EPA AQI.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">From Date (Optional)</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-[#0b1626] border border-[#1d3b61] rounded-xl px-3 py-2 text-white focus:border-[#4f9eff]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">To Date (Optional)</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-[#0b1626] border border-[#1d3b61] rounded-xl px-3 py-2 text-white focus:border-[#4f9eff]"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleDownloadCsv}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2ec4a6] hover:bg-[#25a98f] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-glow"
              >
                <Download className="w-4 h-4" />
                <span>Download airsense_readings.csv</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
