import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wind, AlertCircle, ArrowRight, Lock, Mail, User as UserIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import type { CurrentReading } from "../../services/types";
import { getAQIInfo } from "../../constants/aqi";

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentReading, setCurrentReading] = useState<CurrentReading | null>(null);

  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/app");
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    api.getCurrent()
      .then((data) => setCurrentReading(data));
  }, []);

  const handleQuickLogin = async (accountEmail: string) => {
    setError(null);
    setIsRegister(false);
    setIsSubmitting(true);
    try {
      const loggedUser = await login(accountEmail, "");
      navigate(loggedUser.role === "admin" ? "/admin" : "/app");
    } catch (err: any) {
      setError(err.message || "Unable to open this account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error("Please enter your full name.");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        const newUser = await register(name, email, password);
        navigate(newUser.role === "admin" ? "/admin" : "/app");
      } else {
        const loggedUser = await login(email, password);
        navigate(loggedUser.role === "admin" ? "/admin" : "/app");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const aqiInfo = currentReading ? getAQIInfo(currentReading.aqi) : null;

  return (
    <div className="min-h-screen bg-[#0b1626] flex flex-col md:flex-row text-white selection:bg-[#4f9eff] selection:text-slate-950">
      {/* Left Column: Brand Hero */}
      <div className="flex-1 bg-gradient-to-br from-[#123a63] via-[#0b1b30] to-[#08101c] p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-[#1d3b61]">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4f9eff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#2ec4a6]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand & Wordmark */}
        <div className="relative z-10 flex items-center gap-3.5">
          <img src="/favicon.svg" alt="AirSense Logo" className="w-11 h-11" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white leading-none">
              Air<span className="text-[#4f9eff]">Sense</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium tracking-wide mt-1 uppercase">
              BBSUTSD Khairpur Mirs
            </p>
          </div>
        </div>

        {/* Hero Tagline & Context */}
        <div className="relative z-10 my-12 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#183252] border border-[#244b7a] text-xs text-[#2ec4a6] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#2ec4a6] animate-pulse" />
            University Environmental AI Project
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Know the air <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4f9eff] to-[#2ec4a6]">
              before you breathe it.
            </span>
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            Continuous particulate matter monitoring (PM2.5, PM10, dust) and explainable 6-hour predictive forecasting around the Benazir Bhutto Shaheed University of Technology and Skill Development campus in Khairpur Mirs, Sindh.
          </p>

          {/* Campus AQI Preview Badge */}
          {currentReading && aqiInfo && (
            <div className="p-4 bg-[#0b1626]/80 backdrop-blur-md border border-[#1d3b61] rounded-2xl flex items-center justify-between gap-4 shadow-soft">
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                  Campus Air Quality
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {currentReading.location}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black font-mono" style={{ color: aqiInfo.color }}>
                    {currentReading.aqi}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: aqiInfo.textColor }}>
                    {aqiInfo.category}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team Credits Footer Note */}
        <div className="relative z-10 text-xs text-slate-400 border-t border-[#1d3b61]/60 pt-4">
          Software Engineering Project • Supervised &amp; Developed for BBSUTSD
        </div>
      </div>

      {/* Right Column: Polished Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#0b1626]">
        <div className="w-full max-w-md space-y-6">
          {/* Header Switch */}
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isRegister ? "Join the AirSense Network" : "Welcome Back"}
            </h2>
            <p className="text-sm text-slate-400">
              {isRegister
                ? "Create a university account to access personal air alerts"
                : "Sign in with your campus credentials to access your dashboard"}
            </p>
          </div>

          {/* Form Tabs */}
          <div className="flex p-1 bg-[#112338] border border-[#1d3b61] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isRegister ? "bg-[#123a63] text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isRegister ? "bg-[#123a63] text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="p-3.5 bg-[#881337]/30 border border-[#ef4444]/40 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#ef4444]" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muhammad Yahya"
                    className="w-full bg-[#112338] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@airsense.edu.pk"
                  className="w-full bg-[#112338] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password {isRegister && <span className="text-slate-400 font-normal">(min 8 characters)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#112338] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#4f9eff] hover:bg-[#3b82f6] text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-glow disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                "Authenticating..."
              ) : (
                <>
                  <span>{isRegister ? "Create Account" : "Sign In to Portal"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {!isRegister && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Open a workspace without entering credentials:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickLogin("student@airsense.edu.pk")}
                  className="px-3 py-2.5 bg-[#112338] border border-[#1d3b61] hover:border-[#2ec4a6] rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  Continue as User
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickLogin("admin@airsense.edu.pk")}
                  className="px-3 py-2.5 bg-[#112338] border border-[#1d3b61] hover:border-[#4f9eff] rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  Continue as Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
