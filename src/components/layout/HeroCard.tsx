import React from "react";

interface HeroCardProps {
  title: string;
  description: string;
  keyValueLabel?: string;
  keyValue?: string | number;
  statusChipText?: string;
  statusChipColor?: "teal" | "blue" | "green" | "yellow" | "orange" | "red";
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  title,
  description,
  keyValueLabel,
  keyValue,
  statusChipText,
  statusChipColor = "teal",
  icon,
  actions,
}) => {
  const chipStyles = {
    teal: "bg-[#2ec4a6]/15 text-[#2ec4a6] border-[#2ec4a6]/30",
    blue: "bg-[#4f9eff]/15 text-[#4f9eff] border-[#4f9eff]/30",
    green: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30",
    yellow: "bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30",
    orange: "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30",
    red: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30",
  }[statusChipColor];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#123a63] via-[#0f2d4e] to-[#0b1626] border border-[#244b7a] p-6 mb-6 shadow-soft">
      {/* Subtle background ambient glow */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#4f9eff]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#2ec4a6]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3 flex-wrap">
            {icon && <div className="text-[#4f9eff]">{icon}</div>}
            <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
            {statusChipText && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${chipStyles}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                {statusChipText}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 self-start md:self-auto">
          {keyValue !== undefined && keyValueLabel && (
            <div className="bg-[#0b1626]/70 backdrop-blur-sm border border-[#1d3b61] rounded-xl px-4 py-2 text-right">
              <div className="text-xs text-slate-400 font-medium">{keyValueLabel}</div>
              <div className="text-xl font-bold text-white tracking-tight">{keyValue}</div>
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
};
