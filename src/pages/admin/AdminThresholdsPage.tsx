import React, { useState, useEffect } from "react";
import { SlidersHorizontal, AlertTriangle, ShieldCheck, Check, Save } from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { api } from "../../services/api";
import type { ThresholdsConfig } from "../../services/types";
import { useToast } from "../../context/ToastContext";
import { getAQIInfo } from "../../constants/aqi";

export const AdminThresholdsPage: React.FC = () => {
  const { addToast } = useToast();
  const [warningThreshold, setWarningThreshold] = useState<number>(101);
  const [dangerThreshold, setDangerThreshold] = useState<number>(151);
  const [initialThresholds, setInitialThresholds] = useState<ThresholdsConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchThresholds = async () => {
    setLoading(true);
    try {
      const data = await api.getThresholds();
      setWarningThreshold(data.warning);
      setDangerThreshold(data.danger);
      setInitialThresholds(data);
    } catch (err: any) {
      addToast({ type: "danger", title: "Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (warningThreshold < 0 || warningThreshold > 500) {
      setValidationError("Warning threshold must be between 0 and 500 AQI.");
      return;
    }
    if (dangerThreshold < 0 || dangerThreshold > 500) {
      setValidationError("Danger threshold must be between 0 and 500 AQI.");
      return;
    }
    if (warningThreshold >= dangerThreshold) {
      setValidationError("Warning threshold must be strictly lower than Danger threshold.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      await api.updateThresholds({
        warning: warningThreshold,
        danger: dangerThreshold,
      });
      addToast({
        type: "success",
        title: "Thresholds Updated",
        message: `Warning: ${warningThreshold} AQI, Danger: ${dangerThreshold} AQI applied system-wide.`,
      });
      setShowConfirmModal(false);
      fetchThresholds();
    } catch (err: any) {
      addToast({ type: "danger", title: "Update Failed", message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const warningInfo = getAQIInfo(warningThreshold);
  const dangerInfo = getAQIInfo(dangerThreshold);

  return (
    <div className="space-y-6">
      <HeroCard
        title="Campus Threshold Configuration"
        description="Calibrate the university-wide automated alert triggers. Warning and danger thresholds govern automated sensor alerts and proactive 6-hour forecast warnings."
        keyValueLabel="ACTIVE BOUNDARIES"
        keyValue={`W:${warningThreshold} / D:${dangerThreshold}`}
        statusChipText="Autonomous Engine"
        statusChipColor="teal"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-6">
          <form onSubmit={handleOpenConfirm} className="space-y-6">
            <div className="border-b border-[#1d3b61] pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#4f9eff]" />
                <span>Automated Threshold Settings</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Both parameters must be in the range 0 to 500, with Warning strictly below Danger.
              </p>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div
                role="alert"
                className="p-3.5 bg-[#881337]/30 border border-[#ef4444]/50 rounded-xl text-xs text-rose-300 flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Warning Threshold Slider */}
            <div className="space-y-3 p-4 bg-[#0b1626] border border-[#1d3b61] rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-white block">
                    Campus Warning Threshold
                  </label>
                  <span className="text-xs text-slate-400">
                    Dispatches advisory when current or forecast AQI crosses this level
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(Number(e.target.value))}
                    className="w-20 bg-[#112338] border border-[#1d3b61] rounded-xl px-3 py-1 text-center font-mono font-bold text-white text-base focus:border-[#4f9eff]"
                  />
                  <span className="text-xs text-slate-400 font-mono">AQI</span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={500}
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(Number(e.target.value))}
                className="w-full accent-[#f97316] bg-[#112338] h-2 rounded-lg cursor-pointer"
              />

              <div className="flex items-center gap-2 text-xs" style={{ color: warningInfo.color }}>
                <span className="w-2 h-2 rounded-full bg-current" />
                <span>Category at this boundary: {warningInfo.category}</span>
              </div>
            </div>

            {/* Danger Threshold Slider */}
            <div className="space-y-3 p-4 bg-[#0b1626] border border-[#1d3b61] rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-white block">
                    Campus Danger Threshold
                  </label>
                  <span className="text-xs text-slate-400">
                    Triggers top-priority emergency banner across all user and admin portals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={dangerThreshold}
                    onChange={(e) => setDangerThreshold(Number(e.target.value))}
                    className="w-20 bg-[#112338] border border-[#1d3b61] rounded-xl px-3 py-1 text-center font-mono font-bold text-white text-base focus:border-[#ef4444]"
                  />
                  <span className="text-xs text-slate-400 font-mono">AQI</span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={500}
                value={dangerThreshold}
                onChange={(e) => setDangerThreshold(Number(e.target.value))}
                className="w-full accent-[#ef4444] bg-[#112338] h-2 rounded-lg cursor-pointer"
              />

              <div className="flex items-center gap-2 text-xs" style={{ color: dangerInfo.color }}>
                <span className="w-2 h-2 rounded-full bg-current" />
                <span>Category at this boundary: {dangerInfo.category}</span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-mono">
                System Defaults: Warning 101, Danger 151
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4f9eff] hover:bg-[#3b82f6] text-slate-950 font-bold rounded-xl text-xs transition-all shadow-glow"
              >
                <Save className="w-4 h-4" />
                <span>Apply System Thresholds</span>
              </button>
            </div>
          </form>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSave}
        title="Confirm Threshold Modification"
        description={`Are you sure you want to update the university air quality alert thresholds to Warning: ${warningThreshold} AQI and Danger: ${dangerThreshold} AQI? This will immediately re-evaluate alerts for all students and staff.`}
        confirmLabel="Confirm & Apply"
        isLoading={isSaving}
      />
    </div>
  );
};
