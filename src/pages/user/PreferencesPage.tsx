import React, { useState, useEffect } from "react";
import { Sliders, Bell, BellOff, ShieldAlert, Check, Save } from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";
import { getAQIInfo } from "../../constants/aqi";

export const PreferencesPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(user?.notify_enabled ?? true);
  const [threshold, setThreshold] = useState<number>(user?.notify_threshold ?? 101);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setNotifyEnabled(user.notify_enabled ?? true);
      setThreshold(user.notify_threshold ?? 101);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateMe({
        notify_enabled: notifyEnabled,
        notify_threshold: threshold,
      });
      await refreshUser();
      addToast({
        type: "success",
        title: "Preferences Saved",
        message: "Your personal notification settings have been updated.",
      });
    } catch (err: any) {
      addToast({
        type: "danger",
        title: "Update Failed",
        message: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const aqiInfo = getAQIInfo(threshold);

  return (
    <div className="space-y-6">
      <HeroCard
        title="Alert & Notification Preferences"
        description="Configure your personal sensitivity threshold. AirSense will alert you immediately whenever current or forecasted campus air quality crosses this limit."
        keyValueLabel="PERSONAL THRESHOLD"
        keyValue={threshold}
        statusChipText={notifyEnabled ? "Alerts Enabled" : "Alerts Muted"}
        statusChipColor={notifyEnabled ? "teal" : "orange"}
      />

      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Enable / Disable Toggle */}
            <div className="flex items-center justify-between pb-6 border-b border-[#1d3b61]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {notifyEnabled ? (
                    <Bell className="w-5 h-5 text-[#2ec4a6]" />
                  ) : (
                    <BellOff className="w-5 h-5 text-slate-500" />
                  )}
                  <h3 className="text-base font-bold text-white">Air Quality Notifications</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Receive in-app banners, sound notifications and web push alerts
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEnabled}
                  onChange={(e) => setNotifyEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#0b1626] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2ec4a6] border border-[#1d3b61]"></div>
              </label>
            </div>

            {/* Threshold Slider */}
            <div className={`space-y-4 ${!notifyEnabled ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-white">
                    Personal Warning AQI Threshold
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trigger advisory when campus AQI reaches or exceeds this value
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-20 bg-[#0b1626] border border-[#1d3b61] rounded-xl px-3 py-1.5 text-center font-mono font-bold text-white text-base focus:border-[#4f9eff]"
                  />
                  <span className="text-xs text-slate-400 font-mono">AQI</span>
                </div>
              </div>

              {/* Range slider */}
              <input
                type="range"
                min={0}
                max={300}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-[#4f9eff] bg-[#0b1626] h-2 rounded-lg cursor-pointer"
              />

              {/* Threshold Meaning Card */}
              <div
                className="p-4 rounded-xl border flex items-start gap-3 transition-all"
                style={{
                  backgroundColor: aqiInfo.bgLight,
                  borderColor: aqiInfo.borderColor,
                }}
              >
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: aqiInfo.color }} />
                <div>
                  <span className="text-xs font-bold block" style={{ color: aqiInfo.color }}>
                    Triggers at: {aqiInfo.category} (AQI {threshold})
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {threshold <= 50
                      ? "Very sensitive: You will be notified on any minor air fluctuation."
                      : threshold <= 100
                      ? "Standard sensitive: Recommended for individuals with mild respiratory sensitivity."
                      : threshold <= 150
                      ? "Default setting: You will be notified when air becomes unhealthy for sensitive groups."
                      : "High threshold: You will only be alerted during serious hazardous events."}
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-[#1d3b61] flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4f9eff] hover:bg-[#3b82f6] text-slate-950 font-bold rounded-xl text-sm transition-all shadow-glow disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
