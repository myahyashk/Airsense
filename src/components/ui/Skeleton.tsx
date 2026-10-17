import React from "react";

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-[#152c46]/60 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC<{ lines?: number; height?: string }> = ({
  lines = 3,
  height = "h-40",
}) => {
  return (
    <div className={`bg-[#112338] border border-[#1d3b61] rounded-card p-5 ${height} flex flex-col justify-between`}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = "h-72" }) => {
  return (
    <div className={`bg-[#112338] border border-[#1d3b61] rounded-card p-6 ${height} flex flex-col justify-between`}>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex-1 flex items-end gap-3 pt-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${20 + ((i * 17) % 65)}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};
