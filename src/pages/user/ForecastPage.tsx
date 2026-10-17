import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { ChartSkeleton } from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import type { HistoryPoint, ForecastPoint } from "../../services/types";
import { getAQIInfo, AQI_CATEGORIES } from "../../constants/aqi";

export const ForecastPage: React.FC = () => {
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [forecastPoints, setForecastPoints] = useState<ForecastPoint[]>([]);
  const [modelName, setModelName] = useState<string>("gradient_boosting_v1");
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, fcRes] = await Promise.all([
        api.getHistory(12),
        api.getForecast(6),
      ]);
      setHistoryPoints(histRes.points);
      setForecastPoints(fcRes.points);
      setModelName(fcRes.model);
      setGeneratedAt(fcRes.generated_at);
    } catch (err: any) {
      setError(err.message || "Failed to load forecasting trajectory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Combine recent history and forecast into a unified connected chart dataset
  const chartData = useMemo(() => {
    const combined: any[] = [];

    // Recent 6 history points
    const recentHist = historyPoints.slice(-6);
    recentHist.forEach((h) => {
      const date = new Date(h.timestamp);
      combined.push({
        timeLabel: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: h.timestamp,
        actualAQI: h.aqi,
        predictedAQI: null,
        type: "actual",
      });
    });

    // Bridge point: attach the last actual reading as start of prediction line
    if (recentHist.length > 0 && forecastPoints.length > 0) {
      const lastHist = recentHist[recentHist.length - 1];
      combined[combined.length - 1].predictedAQI = lastHist.aqi;
    }

    // Future forecast points
    forecastPoints.forEach((f) => {
      const date = new Date(f.timestamp);
      combined.push({
        timeLabel: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: f.timestamp,
        actualAQI: null,
        predictedAQI: f.aqi_pred,
        category: f.category,
        type: "forecast",
      });
    });

    return combined;
  }, [historyPoints, forecastPoints]);

  const selectedForecast = forecastPoints[scrubberIndex] || forecastPoints[0];
  const selectedInfo = selectedForecast ? getAQIInfo(selectedForecast.aqi_pred) : null;

  return (
    <div className="space-y-6">
      <HeroCard
        title="6-Hour Explainable AQI Forecast"
        description="Predictive gradient boosting model with chronological lag features and meteorological telemetry. Anticipate campus air quality shifts up to 6 hours in advance."
        keyValueLabel="ML ENGINE"
        keyValue={modelName}
        statusChipText="6-Hour Horizon"
        statusChipColor="blue"
      />

      {error ? (
        <Card className="p-8 text-center space-y-4 border-[#ef4444]/30">
          <AlertCircle className="w-10 h-10 text-[#ef4444] mx-auto" />
          <h3 className="text-lg font-bold text-white">Unable to Load Forecast</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#123a63] hover:bg-[#183252] border border-[#244b7a] rounded-xl text-sm font-semibold text-white transition-all"
          >
            Retry Connection
          </button>
        </Card>
      ) : loading ? (
        <ChartSkeleton height="h-96" />
      ) : (
        <>
          {/* Main Forecast Chart Card */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#1d3b61]/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#123a63] text-[#4f9eff]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">
                    Continuous Trajectory: History to Prediction
                  </h3>
                  <p className="text-xs text-slate-400">
                    Solid blue line represents recent telemetry; dashed bright cyan line shows ML predicted trajectory.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#4f9eff]" />
                  <span className="text-slate-300">Observed History</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#2ec4a6]" />
                  <span className="text-slate-300">ML Forecast</span>
                </div>
              </div>
            </div>

            {/* Recharts Connected Forecast with EPA Color Bands */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1d3b61" opacity={0.5} />

                  {/* EPA Category Color Bands */}
                  <ReferenceArea y1={0} y2={50} fill="#10b981" fillOpacity={0.06} />
                  <ReferenceArea y1={51} y2={100} fill="#eab308" fillOpacity={0.06} />
                  <ReferenceArea y1={101} y2={150} fill="#f97316" fillOpacity={0.06} />
                  <ReferenceArea y1={151} y2={200} fill="#ef4444" fillOpacity={0.06} />
                  <ReferenceArea y1={201} y2={300} fill="#8b5cf6" fillOpacity={0.06} />

                  {/* Warning and Danger Reference Lines */}
                  <ReferenceLine y={101} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Warning (101)", fill: "#f97316", fontSize: 10 }} />
                  <ReferenceLine y={151} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Danger (151)", fill: "#ef4444", fontSize: 10 }} />

                  <XAxis
                    dataKey="timeLabel"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#1d3b61" }}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(160, Math.ceil(dataMax * 1.2))]}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#1d3b61" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const aqiVal = data.predictedAQI ?? data.actualAQI;
                        const info = getAQIInfo(aqiVal);
                        return (
                          <div className="bg-[#112338] border border-[#1d3b61] rounded-xl p-3 shadow-xl text-xs space-y-1">
                            <div className="font-semibold text-white flex items-center justify-between gap-3">
                              <span>{data.timeLabel}</span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#183252]">
                                {data.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">AQI:</span>
                              <span className="font-bold text-base" style={{ color: info.color }}>
                                {aqiVal}
                              </span>
                              <span className="text-[10px] font-medium" style={{ color: info.textColor }}>
                                ({info.category})
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Actual readings line */}
                  <Line
                    type="monotone"
                    dataKey="actualAQI"
                    stroke="#4f9eff"
                    strokeWidth={2.5}
                    dot={{ fill: "#4f9eff", r: 3 }}
                    connectNulls={false}
                  />

                  {/* Predicted readings line with dashed styling */}
                  <Line
                    type="monotone"
                    dataKey="predictedAQI"
                    stroke="#2ec4a6"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ fill: "#2ec4a6", r: 4 }}
                    connectNulls={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Interactive Time Scrubber and Dynamic Forecast Inspector */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2ec4a6]" />
                <h3 className="font-bold text-white text-base tracking-tight">
                  Interactive Forecast Scrubber
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Drag slider to inspect predicted conditions hour by hour
              </span>
            </div>

            {/* Range Scrubber */}
            <div className="space-y-3">
              <input
                type="range"
                min={0}
                max={Math.max(0, forecastPoints.length - 1)}
                value={scrubberIndex}
                onChange={(e) => setScrubberIndex(Number(e.target.value))}
                className="w-full accent-[#2ec4a6] bg-[#0b1626] h-2 rounded-lg cursor-pointer"
                aria-label="Forecast hour scrubber"
              />

              <div className="flex justify-between text-xs text-slate-400 font-mono">
                {forecastPoints.map((pt, idx) => {
                  const date = new Date(pt.timestamp);
                  return (
                    <span
                      key={idx}
                      onClick={() => setScrubberIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        idx === scrubberIndex ? "text-[#2ec4a6] font-bold" : "hover:text-white"
                      }`}
                    >
                      +{idx + 1}h ({date.toLocaleTimeString([], { hour: "numeric" })})
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Scrubber Summary Card */}
            {selectedForecast && selectedInfo && (
              <div
                className="mt-6 p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                style={{
                  backgroundColor: selectedInfo.bgLight,
                  borderColor: selectedInfo.borderColor,
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                      style={{ backgroundColor: selectedInfo.borderColor, color: selectedInfo.color }}
                    >
                      {new Date(selectedForecast.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      Prediction (+{scrubberIndex + 1}h)
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      BBSUTSD Campus
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-white tracking-tight">
                    Predicted AQI:{" "}
                    <span style={{ color: selectedInfo.color }}>
                      {selectedForecast.aqi_pred}
                    </span>{" "}
                    — {selectedInfo.category}
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed max-w-xl">
                    {selectedInfo.advisory}
                  </p>
                </div>

                <div className="bg-[#0b1626]/80 p-4 rounded-xl border border-[#1d3b61] text-right flex-shrink-0">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Forecast Severity
                  </div>
                  <div
                    className="text-base font-extrabold uppercase mt-0.5"
                    style={{ color: selectedInfo.color }}
                  >
                    {selectedInfo.severity}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
