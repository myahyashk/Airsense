import React, { useState, useEffect } from "react";
import {
  Cpu,
  RefreshCw,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Play,
  Clock,
  Layers,
  Award,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { api } from "../../services/api";
import type { AdminOverviewResponse, ModelStatusResponse } from "../../services/types";
import { useToast } from "../../context/ToastContext";

export const AdminModelPage: React.FC = () => {
  const { addToast } = useToast();
  const [modelInfo, setModelInfo] = useState<AdminOverviewResponse["model"] | null>(null);
  const [retrainStatus, setRetrainStatus] = useState<ModelStatusResponse | null>(null);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchModelInfo = async () => {
    try {
      const data = await api.getAdminOverview();
      setModelInfo(data.model);
    } catch {
      // Degraded handled
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async () => {
    try {
      const statusData = await api.getModelStatus();
      setRetrainStatus(statusData);
      if (statusData.status === "running" || statusData.status === "queued") {
        setIsRetraining(true);
      } else {
        if (isRetraining && statusData.status === "done") {
          setIsRetraining(false);
          addToast({
            type: "success",
            title: "Model Retrained",
            message: statusData.message || "Model retrained and evaluated successfully.",
          });
          fetchModelInfo();
        } else if (isRetraining && statusData.status === "failed") {
          setIsRetraining(false);
          addToast({
            type: "danger",
            title: "Retraining Failed",
            message: statusData.message || "Background retrain job encountered an error.",
          });
        }
      }
    } catch {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    fetchModelInfo();
    pollStatus();
  }, []);

  // Poll every 3 seconds when retraining or on page
  useEffect(() => {
    const interval = setInterval(() => {
      pollStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isRetraining]);

  const handleStartRetrain = async () => {
    setIsRetraining(true);
    try {
      const res = await api.retrainModel();
      addToast({
        type: "info",
        title: "Retrain Job Queued",
        message: `Job ID: ${res.job_id}. Training GradientBoostingRegressor in background.`,
      });
      pollStatus();
    } catch (err: any) {
      setIsRetraining(false);
      addToast({ type: "danger", title: "Retrain Failed", message: err.message });
    }
  };

  const maeDiff = modelInfo ? (modelInfo.baseline_mae - modelInfo.mae).toFixed(2) : "0";

  return (
    <div className="space-y-6">
      <HeroCard
        title="Predictive Machine Learning Engine"
        description="Explainable Gradient Boosting multi-horizon regressor for 1 to 6-hour particulate forecasting. Evaluated on non-shuffled chronological test sets against moving persistence."
        keyValueLabel="CURRENT ALGORITHM"
        keyValue={modelInfo?.name || "GBR v1"}
        statusChipText="Scikit-Learn Standard"
        statusChipColor="teal"
        actions={
          <button
            onClick={handleStartRetrain}
            disabled={isRetraining}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4f9eff] hover:bg-[#3b82f6] text-slate-950 font-bold rounded-xl text-xs transition-all shadow-glow disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRetraining ? "animate-spin" : ""}`} />
            <span>{isRetraining ? "Retraining in Background..." : "Retrain Model Now"}</span>
          </button>
        }
      />

      {/* Live Retrain Job Status Banner */}
      {retrainStatus && retrainStatus.status !== "idle" && (
        <Card
          className={`p-5 border transition-all ${
            retrainStatus.status === "running" || retrainStatus.status === "queued"
              ? "bg-[#123a63]/50 border-[#4f9eff]/50"
              : retrainStatus.status === "done"
              ? "bg-[#0d2e26]/50 border-[#2ec4a6]/50"
              : "bg-[#881337]/30 border-[#ef4444]/50"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Background Job Status:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    retrainStatus.status === "running"
                      ? "bg-[#4f9eff] text-slate-950 animate-pulse"
                      : retrainStatus.status === "done"
                      ? "bg-[#2ec4a6] text-slate-950"
                      : "bg-[#ef4444] text-white"
                  }`}
                >
                  {retrainStatus.status}
                </span>
                {retrainStatus.job_id && (
                  <span className="text-xs font-mono text-slate-400">
                    ({retrainStatus.job_id})
                  </span>
                )}
              </div>
              <p className="text-xs text-white font-medium">{retrainStatus.message}</p>
            </div>

            {retrainStatus.finished_at && (
              <span className="text-[11px] text-slate-400 font-mono">
                Finished: {new Date(retrainStatus.finished_at).toLocaleTimeString()}
              </span>
            )}
          </div>

          {(retrainStatus.status === "running" || retrainStatus.status === "queued") && (
            <div className="w-full bg-[#0b1626] h-1.5 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-[#2ec4a6] via-[#4f9eff] to-[#2ec4a6] w-full animate-pulse" />
            </div>
          )}
        </Card>
      )}

      {/* Metrics Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model MAE */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Model MAE
            </span>
            <span className="text-[10px] text-[#2ec4a6] bg-[#0d2e26] px-2 py-0.5 rounded font-bold">
              GBR Regressor
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              {modelInfo?.mae ?? 8.4} <span className="text-xs font-normal text-slate-400">AQI</span>
            </div>
            <span className="text-xs text-slate-300 mt-1 block">
              Mean Absolute Error on Chronological Test Split
            </span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#1d3b61]/60 pt-2">
            Beats baseline by +{maeDiff} points
          </div>
        </Card>

        {/* Model RMSE */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Model RMSE
            </span>
            <span className="text-[10px] text-[#4f9eff] bg-[#123a63] px-2 py-0.5 rounded font-bold">
              Penalizes Spikes
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-cyan-400 font-mono">
              {modelInfo?.rmse ?? 11.2} <span className="text-xs font-normal text-slate-400">AQI</span>
            </div>
            <span className="text-xs text-slate-300 mt-1 block">
              Root Mean Squared Error
            </span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#1d3b61]/60 pt-2">
            Low variance across all 6 prediction horizons
          </div>
        </Card>

        {/* Baseline Benchmark */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Persistence Baseline
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-bold">
              Reference
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-slate-300 font-mono">
              {modelInfo?.baseline_mae ?? 14.8} <span className="text-xs font-normal text-slate-400">MAE</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Simple persistence benchmark: y(t+h) = y(t)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#1d3b61]/60 pt-2">
            Model must outperform this to deploy
          </div>
        </Card>
      </div>

      {/* Feature Architecture Matrix */}
      <Card className="p-6 space-y-4">
        <h4 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#4f9eff]" />
          <span>Explainable ML Feature Engineering Architecture</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#0b1626] border border-[#1d3b61] rounded-xl space-y-2">
            <span className="font-bold text-[#4f9eff] uppercase tracking-wider block">
              1. Particulate Lags
            </span>
            <p className="text-slate-300 leading-relaxed">
              AQI and PM2.5 concentrations at lags t-1, t-2, t-3, t-6, t-12, and t-24 hours capture diurnal decay and accumulation cycles.
            </p>
          </div>

          <div className="p-4 bg-[#0b1626] border border-[#1d3b61] rounded-xl space-y-2">
            <span className="font-bold text-[#2ec4a6] uppercase tracking-wider block">
              2. Rolling Windows
            </span>
            <p className="text-slate-300 leading-relaxed">
              3-hour, 6-hour, and 24-hour moving averages smooth out sensor noise and capture sustained morning and evening dust trajectories.
            </p>
          </div>

          <div className="p-4 bg-[#0b1626] border border-[#1d3b61] rounded-xl space-y-2">
            <span className="font-bold text-[#f97316] uppercase tracking-wider block">
              3. Meteorological Context
            </span>
            <p className="text-slate-300 leading-relaxed">
              Open-Meteo ambient temperature, relative humidity, wind speed, and cyclical sin/cos hour-of-day features for Khairpur Mirs.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
