import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { History, Calendar, Filter, AlertCircle, RefreshCw } from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { ChartSkeleton } from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { HistoryPoint } from "../../services/types";
import { getAQIInfo } from "../../constants/aqi";

export const HistoryPage: React.FC = () => {
  const [hours, setHours] = useState<number>(48);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePollutants, setActivePollutants] = useState<{
    aqi: boolean;
    pm25: boolean;
    pm10: boolean;
    dust: boolean;
  }>({
    aqi: true,
    pm25: true,
    pm10: false,
    dust: false,
  });

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHistory(hours);
      setHistoryPoints(res.points);
    } catch (err: any) {
      setError(err.message || "Failed to load historical air quality trends.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [hours]);

  // Compute Statistics for selected period
  const stats = useMemo(() => {
    if (!historyPoints.length) return null;
    const aqiVals = historyPoints.map((p) => p.aqi);
    const pm25Vals = historyPoints.map((p) => p.pm25);

    const avgAqi = Math.round(aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length);
    const maxAqi = Math.max(...aqiVals);
    const minAqi = Math.min(...aqiVals);
    const avgPm25 = (pm25Vals.reduce((a, b) => a + b, 0) / pm25Vals.length).toFixed(1);

    const unhealthyHours = aqiVals.filter((v) => v >= 101).length;
    const unhealthyPercent = Math.round((unhealthyHours / aqiVals.length) * 100);

    return { avgAqi, maxAqi, minAqi, avgPm25, unhealthyPercent, totalCount: aqiVals.length };
  }, [historyPoints]);

  const chartData = useMemo(() => {
    return historyPoints.map((p) => {
      const d = new Date(p.timestamp);
      const label =
        hours > 48
          ? `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.getHours()}:00`
          : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      return {
        label,
        aqi: p.aqi,
        pm25: p.pm25,
        pm10: p.pm10,
        dust: p.dust,
      };
    });
  }, [historyPoints, hours]);

  return (
    <div className="space-y-6">
      <HeroCard
        title="Air Quality History & Historical Trends"
        description="Retrospective multi-pollutant telemetry across BBSUTSD campus. Analyze PM2.5, PM10 and dust concentration trends over 24-hour, 48-hour and 7-day windows."
        keyValueLabel="SAMPLES"
        keyValue={historyPoints.length}
        statusChipText={`${hours / 24} Days History`}
        statusChipColor="teal"
      />

      {/* Filter and Time Range Selector Controls */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Time Window Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-[#4f9eff] mr-1 hidden sm:block" />
          <span className="text-xs font-semibold text-slate-400 mr-2">Window:</span>
          {[
            { label: "24 Hours", val: 24 },
            { label: "48 Hours", val: 48 },
            { label: "7 Days", val: 168 },
          ].map((t) => (
            <button
              key={t.val}
              onClick={() => setHours(t.val)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                hours === t.val
                  ? "bg-[#123a63] text-[#4f9eff] border border-[#244b7a] shadow-sm"
                  : "bg-[#0b1626] text-slate-300 hover:text-white border border-[#1d3b61]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Series Visibility Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Series:
          </span>
          <button
            onClick={() => setActivePollutants((prev) => ({ ...prev, aqi: !prev.aqi }))}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activePollutants.aqi
                ? "bg-[#4f9eff]/20 border-[#4f9eff] text-[#4f9eff]"
                : "bg-[#0b1626] border-[#1d3b61] text-slate-500"
            }`}
          >
            US AQI
          </button>
          <button
            onClick={() => setActivePollutants((prev) => ({ ...prev, pm25: !prev.pm25 }))}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activePollutants.pm25
                ? "bg-[#2ec4a6]/20 border-[#2ec4a6] text-[#2ec4a6]"
                : "bg-[#0b1626] border-[#1d3b61] text-slate-500"
            }`}
          >
            PM 2.5
          </button>
          <button
            onClick={() => setActivePollutants((prev) => ({ ...prev, pm10: !prev.pm10 }))}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activePollutants.pm10
                ? "bg-[#f97316]/20 border-[#f97316] text-[#f97316]"
                : "bg-[#0b1626] border-[#1d3b61] text-slate-500"
            }`}
          >
            PM 10
          </button>
          <button
            onClick={() => setActivePollutants((prev) => ({ ...prev, dust: !prev.dust }))}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activePollutants.dust
                ? "bg-[#eab308]/20 border-[#eab308] text-[#eab308]"
                : "bg-[#0b1626] border-[#1d3b61] text-slate-500"
            }`}
          >
            Dust
          </button>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Average AQI</span>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{stats.avgAqi}</div>
            <span className="text-[10px] text-slate-400">Mean for {hours}h window</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Peak AQI</span>
            <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">{stats.maxAqi}</div>
            <span className="text-[10px] text-slate-400">Highest recorded spike</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Cleanest AQI</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{stats.minAqi}</div>
            <span className="text-[10px] text-slate-400">Lowest air pollution</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Unhealthy Air %</span>
            <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{stats.unhealthyPercent}%</div>
            <span className="text-[10px] text-slate-400">Hours with AQI &gt; 100</span>
          </Card>
        </div>
      )}

      {/* Chart Section */}
      {error ? (
        <Card className="p-8 text-center space-y-4 border-[#ef4444]/30">
          <AlertCircle className="w-10 h-10 text-[#ef4444] mx-auto" />
          <h3 className="text-lg font-bold text-white">Historical Data Unavailable</h3>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-[#123a63] hover:bg-[#183252] border border-[#244b7a] rounded-xl text-sm font-semibold text-white transition-all"
          >
            Retry Fetch
          </button>
        </Card>
      ) : loading ? (
        <ChartSkeleton height="h-96" />
      ) : (
        <Card className="p-6">
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1d3b61" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#1d3b61" }}
                  interval={Math.ceil(chartData.length / 10)}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#1d3b61" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#112338",
                    borderColor: "#1d3b61",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#ffffff",
                  }}
                />
                <Legend />
                {activePollutants.aqi && (
                  <Line
                    type="monotone"
                    name="US AQI"
                    dataKey="aqi"
                    stroke="#4f9eff"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {activePollutants.pm25 && (
                  <Line
                    type="monotone"
                    name="PM 2.5 (µg/m³)"
                    dataKey="pm25"
                    stroke="#2ec4a6"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {activePollutants.pm10 && (
                  <Line
                    type="monotone"
                    name="PM 10 (µg/m³)"
                    dataKey="pm10"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {activePollutants.dust && (
                  <Line
                    type="monotone"
                    name="Airborne Dust (µg/m³)"
                    dataKey="dust"
                    stroke="#eab308"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};
