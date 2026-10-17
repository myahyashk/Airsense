import React, { useState, useEffect } from "react";
import {
  HeartHandshake,
  Shield,
  Activity,
  Wind,
  Home,
  CheckCircle,
  AlertTriangle,
  Smile,
  Meh,
  AlertCircle,
  Skull,
  Biohazard,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { api } from "../../services/api";
import type { GuidanceItem } from "../../services/types";
import { AQI_CATEGORIES, getAQIInfo } from "../../constants/aqi";

export const GuidancePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("Moderate");
  const [guidanceItems, setGuidanceItems] = useState<GuidanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    api.getGuidance(selectedCategory)
      .then((res) => setGuidanceItems(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  const categoryMeta = AQI_CATEGORIES.find((c) => c.category === selectedCategory) || AQI_CATEGORIES[1];

  return (
    <div className="space-y-6">
      <HeroCard
        title="Public Health & Protective Measures"
        description="Practical, category-based environmental advisories for campus students, faculty, and sensitive groups. No medical diagnosis; purely preventive environmental recommendations."
        keyValueLabel="ACTIVE ADVISORY"
        keyValue={selectedCategory}
        statusChipText="EPA Aligned"
        statusChipColor="teal"
      />

      {/* Category Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {AQI_CATEGORIES.map((cat) => {
          const isSelected = cat.category === selectedCategory;
          return (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                isSelected
                  ? "bg-[#123a63] border-[#4f9eff] shadow-glow"
                  : "bg-[#112338] border-[#1d3b61] hover:border-slate-500"
              }`}
            >
              <span className="w-3 h-3 rounded-full mb-1.5" style={{ backgroundColor: cat.color }} />
              <span className="text-xs font-bold text-white line-clamp-1">{cat.category}</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {cat.min}-{cat.max === 9999 ? "500+" : cat.max}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Category Header Banner */}
      <Card
        className="p-6 transition-all"
        style={{
          backgroundColor: categoryMeta.bgLight,
          borderColor: categoryMeta.borderColor,
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: categoryMeta.borderColor, color: categoryMeta.color }}
              >
                AQI {categoryMeta.min} to {categoryMeta.max === 9999 ? "500+" : categoryMeta.max}
              </span>
              <span className="text-xs text-slate-300 font-medium">BBSUTSD Campus Standard</span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{categoryMeta.category}</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {categoryMeta.description}
            </p>
          </div>

          <div className="bg-[#0b1626]/80 p-3.5 rounded-xl border border-[#1d3b61] text-right flex-shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Health Impact
            </span>
            <div className="text-base font-extrabold capitalize mt-0.5" style={{ color: categoryMeta.color }}>
              {categoryMeta.severity}
            </div>
          </div>
        </div>
      </Card>

      {/* Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {guidanceItems.map((item, idx) => (
          <Card key={idx} className="p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#4f9eff] bg-[#123a63] px-2.5 py-0.5 rounded-full">
                  {item.audience}
                </span>
                <CheckCircle className="w-4 h-4 text-[#2ec4a6]" />
              </div>

              <h4 className="text-base font-bold text-white tracking-tight">{item.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1d3b61]/60 flex items-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Recommended university campus measure</span>
            </div>
          </Card>
        ))}
      </div>

      {/* General Best Practices Matrix */}
      <Card className="p-6">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2ec4a6]" />
          <span>Quick Campus Environmental Checklist</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#0b1626] border border-[#1d3b61] space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#4f9eff]" />
              <span>Protective Masks</span>
            </div>
            <p className="text-slate-400">
              Cloth masks filter coarse dust. When AQI exceeds 150, use certified N95 or KN95 masks.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1626] border border-[#1d3b61] space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-[#2ec4a6]" />
              <span>Ventilation &amp; Windows</span>
            </div>
            <p className="text-slate-400">
              Air out rooms during early mornings when traffic and dust are lowest; seal windows during dusty afternoons.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1626] border border-[#1d3b61] space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#eab308]" />
              <span>Athletics &amp; Sports</span>
            </div>
            <p className="text-slate-400">
              Outdoor football and running should be moved indoors whenever campus AQI exceeds 100.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1626] border border-[#1d3b61] space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Home className="w-4 h-4 text-[#8b5cf6]" />
              <span>Classrooms &amp; Labs</span>
            </div>
            <p className="text-slate-400">
              Ensure air conditioning filters are cleaned weekly during dry, windy Khairpur weather.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
