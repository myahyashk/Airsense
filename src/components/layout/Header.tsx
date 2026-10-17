import React, { useState, useEffect } from "react";
import { Menu, RefreshCw, Clock } from "lucide-react";

interface HeaderProps {
  title: string;
  lastUpdated?: string | null;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  onOpenMobileMenu: () => void;
  dataSource?: "live" | "degraded";
}

export const Header: React.FC<HeaderProps> = ({
  title,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  onOpenMobileMenu,
  dataSource = "live",
}) => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [minutesAgo, setMinutesAgo] = useState<number>(0);

  // Live Asia/Karachi Clock
  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat("en-PK", {
          timeZone: "Asia/Karachi",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now);
        setCurrentTime(`${formatted} PKT`);
      } catch {
        setCurrentTime(new Date().toLocaleTimeString());
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute minutes ago from lastUpdated
  useEffect(() => {
    const computeFreshness = () => {
      if (!lastUpdated) {
        setMinutesAgo(1);
        return;
      }
      try {
        const updatedTime = new Date(lastUpdated).getTime();
        const diffMinutes = Math.max(0, Math.floor((Date.now() - updatedTime) / 60000));
        setMinutesAgo(diffMinutes);
      } catch {
        setMinutesAgo(1);
      }
    };

    computeFreshness();
    const interval = setInterval(computeFreshness, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const isStale = minutesAgo > 30 || dataSource === "degraded";

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0b1626]/90 backdrop-blur-md border-b border-[#1d3b61] flex items-center justify-between px-4 lg:px-8">
      {/* Thin loading progress bar during refresh */}
      {isRefreshing && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#123a63] overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-[#2ec4a6] via-[#4f9eff] to-[#2ec4a6] animate-pulse" />
        </div>
      )}

      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-[#112338] rounded-xl transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg lg:text-xl font-bold tracking-tight text-white">{title}</h2>
      </div>

      {/* Right: Live Chip, Clock & Refresh */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Status / Freshness Chip */}
        <div
          className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            isStale
              ? "bg-[#eab308]/10 text-[#facc15] border-[#eab308]/30"
              : "bg-[#2ec4a6]/10 text-[#2ec4a6] border-[#2ec4a6]/30"
          }`}
          title={isStale ? "Data source is serving cached readings" : "Data source is live and receiving telemetry"}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isStale ? "bg-[#eab308]" : "bg-[#2ec4a6] animate-ping"
            }`}
          />
          <span className="font-semibold">{isStale ? "Stale data" : "LIVE"}</span>
          <span className="text-slate-400">
            • {minutesAgo === 0 ? "Just now" : `${minutesAgo} min ago`}
          </span>
        </div>

        {/* Local Clock (Asia/Karachi) */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 bg-[#112338] px-3 py-1.5 rounded-xl border border-[#1d3b61]">
          <Clock className="w-3.5 h-3.5 text-[#4f9eff]" />
          <span className="font-mono font-medium">{currentTime}</span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="p-2 text-slate-300 hover:text-white hover:bg-[#112338] border border-[#1d3b61] rounded-xl transition-all disabled:opacity-50"
            title="Refresh air quality data"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#4f9eff]" : ""}`} />
          </button>
        )}
      </div>
    </header>
  );
};
