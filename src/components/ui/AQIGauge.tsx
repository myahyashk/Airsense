import React from "react";
import { Smile, Meh, AlertTriangle, AlertCircle, Skull, Biohazard } from "lucide-react";
import { getAQIInfo } from "../../constants/aqi";

interface AQIGaugeProps {
  aqi: number;
  size?: number;
  showDetails?: boolean;
}

export const AQIGauge: React.FC<AQIGaugeProps> = ({
  aqi,
  size = 220,
  showDetails = true,
}) => {
  const info = getAQIInfo(aqi);

  // Icon mapping
  const CategoryIcon = {
    Good: Smile,
    Moderate: Meh,
    "Unhealthy for Sensitive Groups": AlertTriangle,
    Unhealthy: AlertCircle,
    "Very Unhealthy": Skull,
    Hazardous: Biohazard,
  }[info.category] || AlertCircle;

  // Gauge geometry: semi-circle from 180 to 0 degrees
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half-circle arc length

  // Clamp AQI between 0 and 500 for the gauge percentage
  const clampedAqi = Math.max(0, Math.min(500, aqi));
  const progressRatio = clampedAqi / 500;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 30 }}>
        <svg
          width={size}
          height={size / 2 + 10}
          viewBox={`0 0 ${size} ${size / 2 + 10}`}
          className="overflow-visible"
        >
          {/* Background Arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#1d3b61"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated Value Arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={info.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease",
            }}
          />
        </svg>

        {/* Center AQI readout */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4 flex flex-col items-center">
          <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-white font-mono">
            {aqi}
          </span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">
            US AQI
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 flex flex-col items-center">
          {/* Category Chip (Color + Icon + Label) */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm border shadow-sm"
            style={{
              backgroundColor: info.bgLight,
              color: info.color,
              borderColor: info.borderColor,
            }}
          >
            <CategoryIcon className="w-4 h-4 flex-shrink-0" />
            <span>{info.category}</span>
          </div>

          <p className="text-xs text-slate-300 mt-2 max-w-xs text-center leading-relaxed">
            {info.advisory}
          </p>
        </div>
      )}
    </div>
  );
};
