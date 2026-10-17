import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Bell,
  HeartHandshake,
  Sliders,
  User as UserIcon,
  ShieldCheck,
  Users,
  AlertTriangle,
  SlidersHorizontal,
  Database,
  Cpu,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  unreadAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  unreadAlertsCount = 0,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminPortal = location.pathname.startsWith("/admin");

  const userNavItems = [
    { label: "Overview", to: "/app", icon: LayoutDashboard },
    { label: "6h Forecast", to: "/app/forecast", icon: TrendingUp },
    { label: "History", to: "/app/history", icon: History },
    { label: "Alerts", to: "/app/alerts", icon: Bell, badge: unreadAlertsCount },
    { label: "Health Guidance", to: "/app/guidance", icon: HeartHandshake },
    { label: "Preferences", to: "/app/preferences", icon: Sliders },
    { label: "Profile", to: "/app/profile", icon: UserIcon },
  ];

  const adminNavItems = [
    { label: "Admin Overview", to: "/admin", icon: ShieldCheck },
    { label: "User Management", to: "/admin/users", icon: Users },
    { label: "Alert Management", to: "/admin/alerts", icon: AlertTriangle },
    { label: "Thresholds", to: "/admin/thresholds", icon: SlidersHorizontal },
    { label: "Data & Sources", to: "/admin/data", icon: Database },
    { label: "ML Model", to: "/admin/model", icon: Cpu },
    { label: "Audit Log", to: "/admin/audit", icon: FileText },
  ];

  const currentNavItems = isAdminPortal ? adminNavItems : userNavItems;

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0b1626] border-r border-[#1d3b61] transition-all duration-300 ease-in-out ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } ${
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand & Wordmark Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#1d3b61]/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/favicon.svg" alt="AirSense Logo" className="w-9 h-9 flex-shrink-0" />
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-white leading-tight">
                  Air<span className="text-[#4f9eff]">Sense</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  BBSUTSD Khairpur
                </span>
              </div>
            )}
          </div>

          {/* Close drawer on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse rail toggle on desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-[#123a63]/50 rounded-lg transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Portal Switcher Pill (if user has admin role) */}
        {user?.role === "admin" && (!collapsed || mobileOpen) && (
          <div className="px-3 pt-3">
            <div className="p-1 bg-[#112338] border border-[#1d3b61] rounded-xl flex items-center gap-1">
              <button
                onClick={() => navigate("/app")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  !isAdminPortal
                    ? "bg-[#123a63] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                User Portal
              </button>
              <button
                onClick={() => navigate("/admin")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isAdminPortal
                    ? "bg-[#4f9eff] text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Admin Portal
              </button>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app" || item.to === "/admin"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                    isActive
                      ? "bg-[#123a63] text-[#4f9eff] shadow-sm font-semibold border border-[#244b7a]"
                      : "text-slate-300 hover:text-white hover:bg-[#112338]"
                  } ${collapsed && !mobileOpen ? "justify-center" : ""}`
                }
                title={collapsed && !mobileOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(!collapsed || mobileOpen) && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full bg-[#ef4444] text-white ${
                      collapsed && !mobileOpen ? "absolute top-1.5 right-1.5" : ""
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User Profile & Sign Out */}
        <div className="p-3 border-t border-[#1d3b61]/80 bg-[#08101c]/80">
          <div
            className={`flex items-center gap-3 ${
              collapsed && !mobileOpen ? "justify-center" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#123a63] border border-[#244b7a] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>

            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      user?.role === "admin"
                        ? "bg-[#4f9eff]/20 text-[#4f9eff] border border-[#4f9eff]/30"
                        : "bg-[#2ec4a6]/20 text-[#2ec4a6] border border-[#2ec4a6]/30"
                    }`}
                  >
                    {user?.role}
                  </span>
                </div>
              </div>
            )}

            {(!collapsed || mobileOpen) && (
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-[#ef4444] hover:bg-[#112338] rounded-lg transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          {collapsed && !mobileOpen && (
            <button
              onClick={handleSignOut}
              className="mt-2 w-full flex justify-center p-2 text-slate-400 hover:text-[#ef4444] hover:bg-[#112338] rounded-lg transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
