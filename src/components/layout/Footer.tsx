import React from "react";
import { Info, ShieldAlert, Award } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#1d3b61] bg-[#08101c] text-xs text-slate-400 py-6 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* About AirSense */}
        <div className="max-w-md space-y-1">
          <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
            <span>AirSense Project</span>
            <span className="text-[11px] text-[#4f9eff] bg-[#123a63] px-2 py-0.5 rounded-full font-normal">
              BBSUTSD Khairpur Mirs
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            A university Software Engineering initiative combining Environmental Science and Applied AI to monitor particulate matter (PM2.5, PM10, dust) and deliver explainable 6-hour advance air quality alerts for the campus community.
          </p>
        </div>

        {/* Team Credits */}
        <div className="space-y-1 text-slate-300">
          <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
            <Award className="w-3.5 h-3.5 text-[#2ec4a6]" />
            <span>Project Engineering Team</span>
          </div>
          <p className="text-xs text-slate-400">
            <span className="text-slate-300 font-medium">Developers:</span> Muhammad Yahya &amp; M. Hasnain •{" "}
            <span className="text-slate-300 font-medium">Manager:</span> Abdul Wajid •{" "}
            <span className="text-slate-300 font-medium">Client:</span> Abdul Qudoos
          </p>
        </div>

        {/* Data Disclaimer */}
        <div className="max-w-xs space-y-1 md:text-right">
          <div className="flex items-center md:justify-end gap-1.5 text-slate-300 font-semibold text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-[#f97316]" />
            <span>Data Transparency Note</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Sample air quality readings are shown here. AirSense is a student project and not an official air quality authority.
          </p>
        </div>
      </div>
    </footer>
  );
};
