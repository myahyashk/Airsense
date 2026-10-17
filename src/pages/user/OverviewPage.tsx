import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Wind,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Clock,
  Compass,
  Thermometer,
  Droplets,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { AQIGauge } from "../../components/ui/AQIGauge";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import type { CurrentReading, ForecastPoint } from "../../services/types";
import { getAQIInfo } from "../../constants/aqi";

export const OverviewPage: React.FC = () => {
  const context = useOutletContext<{
    currentReading: CurrentReading | null;
    refreshData: () => Promise<void>;
    isRefreshing: boolean;
  }>();

  const [forecastPoints, setForecastPoints] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(!context?.currentReading);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    try {
      const data = await api.getForecast(6);
      setForecastPoints(data.points);
    } catch (err: any) {
      console.warn("Could not fetch forecast on overview:", err);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const reading = context?.currentReading;
  const aqiInfo = reading ? getAQIInfo(reading.aqi) : getAQIInfo(0);

  // Identify next expected unhealthy period from forecast
  const nextUnhealthy = forecastPoints.find((f) => f.aqi_pred >= 101);

  if (loading && !reading) {
    return (
      <div className="space-y-6">
        <div className="h-36 bg-[#112338] rounded-2xl animate-pulse border border-[#1d3b61]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton height="h-64" />
          <CardSkeleton height="h-64" />
          <CardSkeleton height="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page HeroCard */}
      <HeroCard
        title="BBSUTSD Campus Air Quality"
        description="Live telemetry from the Khairpur Mirs monitoring station. Continuous real-time assessment of respirable dust, PM2.5, and ambient air safety."
        keyValueLabel="CURRENT AQI"
        keyValue={reading?.aqi ?? 0}
        statusChipText={aqiInfo.category}
        statusChipColor={
          aqiInfo.severity === "danger" ? "red" : aqiInfo.severity === "warning" ? "orange" : "teal"
        }
        actions={
          <button
            onClick={() => context?.refreshData()}
            disabled={context?.isRefreshing}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[#183252] hover:bg-[#1d3b61] border border-[#244b7a] rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${context?.isRefreshing ? "animate-spin" : ""}`} />
            <span>{context?.isRefreshing ? "Syncing..." : "Live Sync"}</span>
          </button>
        }
      />

      {/* Main Grid: Gauge + Key Pollutants + Forecast Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive AQI Gauge Card */}
        <Card className="lg:col-span-5 flex flex-col justify-between p-6">
          <div className="flex items-center justify-between border-b border-[#1d3b61]/60 pb-3">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-[#4f9eff]" />
              <h2 className="text-base font-bold text-white tracking-tight">EPA Air Quality Index</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">BBSUTSD Telemetry</span>
          </div>

          <div className="py-6 flex items-center justify-center">
            <AQIGauge aqi={reading?.aqi ?? 0} size={240} />
          </div>

          {/* Quick Guidance Alert Box */}
          <div
            className="p-3.5 rounded-xl border text-xs flex items-start gap-3"
            style={{
              backgroundColor: aqiInfo.bgLight,
              borderColor: aqiInfo.borderColor,
            }}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: aqiInfo.color }} />
            <div>
              <span className="font-semibold block" style={{ color: aqiInfo.color }}>
                Health Advisory for Campus:
              </span>
              <span className="text-slate-300 mt-0.5 block leading-relaxed">
                {aqiInfo.advisory}
              </span>
            </div>
          </div>
        </Card>

        {/* Right: Key Pollutant Metric Cards & Forecast Window */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* PM2.5 Card */}
            <Card className="flex flex-col justify-between p-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  PM 2.5
                </span>
                <span className="text-[10px] text-[#4f9eff] bg-[#123a63] px-2 py-0.5 rounded font-medium">
                  Fine Dust
                </span>
              </div>
              <div className="my-3">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {reading?.pm25 ?? 0}
                </span>
                <span className="text-xs text-slate-400 ml-1">µg/m³</span>
              </div>
              <div className="w-full bg-[#0b1626] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4f9eff] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((reading?.pm25 ?? 28) / 75) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                EPA standard: 35 µg/m³ 24h
              </span>
            </Card>

            {/* PM10 Card */}
            <Card className="flex flex-col justify-between p-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  PM 10
                </span>
                <span className="text-[10px] text-[#2ec4a6] bg-[#0d2e26] px-2 py-0.5 rounded font-medium">
                  Coarse
                </span>
              </div>
              <div className="my-3">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {reading?.pm10 ?? 0}
                </span>
                <span className="text-xs text-slate-400 ml-1">µg/m³</span>
              </div>
              <div className="w-full bg-[#0b1626] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2ec4a6] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((reading?.pm10 ?? 72) / 150) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                EPA standard: 150 µg/m³ 24h
              </span>
            </Card>

            {/* Airborne Dust Card */}
            <Card className="flex flex-col justify-between p-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Air Dust
                </span>
                <span className="text-[10px] text-[#eab308] bg-[#332a0c] px-2 py-0.5 rounded font-medium">
                  Khairpur
                </span>
              </div>
              <div className="my-3">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {reading?.dust ?? 0}
                </span>
                <span className="text-xs text-slate-400 ml-1">µg/m³</span>
              </div>
              <div className="w-full bg-[#0b1626] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#eab308] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((reading?.dust ?? 54) / 100) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Regional particulate deposit
              </span>
            </Card>
          </div>

          {/* Advance Warning: Next Expected Unhealthy Period */}
          <Card className="p-6 bg-gradient-to-r from-[#112338] to-[#142840] border-[#1d3b61]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4f9eff]" />
                <h3 className="font-bold text-sm text-white tracking-tight">
                  Next 6-Hour Forecast Trajectory
                </h3>
              </div>
              <Link
                to="/app/forecast"
                className="text-xs font-semibold text-[#4f9eff] hover:text-[#7bb3ff] flex items-center gap-1 transition-colors"
              >
                <span>Full Chart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {nextUnhealthy ? (
              <div className="p-4 rounded-xl bg-[#881337]/20 border border-[#ef4444]/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm text-rose-300 block">
                    Advance Notice: Unhealthy air window expected
                  </span>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    The machine learning model predicts AQI will rise to{" "}
                    <strong className="text-white">{nextUnhealthy.aqi_pred}</strong> (
                    {nextUnhealthy.category}) around{" "}
                    <strong className="text-white">
                      {new Date(nextUnhealthy.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                    . Plan indoor coursework accordingly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#2ec4a6]/10 border border-[#2ec4a6]/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#2ec4a6] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm text-[#2ec4a6] block">
                    Safe Air Forecast for the Next 6 Hours
                  </span>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    The forecasting engine does not anticipate dangerous particulate spikes over the next 6 hours around campus. Outdoor exercise is safe.
                  </p>
                </div>
              </div>
            )}

            {/* Quick 6-hour forecast timeline strip */}
            {forecastPoints.length > 0 && (
              <div className="grid grid-cols-6 gap-2 mt-4 pt-4 border-t border-[#1d3b61]/60">
                {forecastPoints.slice(0, 6).map((pt, idx) => {
                  const ptInfo = getAQIInfo(pt.aqi_pred);
                  const time = new Date(pt.timestamp).toLocaleTimeString([], { hour: "numeric" });
                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-[#0b1626] border border-[#1d3b61] text-center flex flex-col items-center"
                    >
                      <span className="text-[10px] text-slate-400 font-mono">{time}</span>
                      <span className="text-sm font-bold my-0.5" style={{ color: ptInfo.color }}>
                        {pt.aqi_pred}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate w-full">
                        {ptInfo.category.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
