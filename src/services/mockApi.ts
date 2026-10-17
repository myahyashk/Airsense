import { getAQIInfo } from "../constants/aqi";
import type {
  AdminOverviewResponse,
  AdminUser,
  AdminUsersListResponse,
  AlertItem,
  AlertsResponse,
  AuditItem,
  AuditListResponse,
  AuthResponse,
  CurrentReading,
  ForecastResponse,
  GuidanceItem,
  GuidanceResponse,
  HistoryResponse,
  ModelStatusResponse,
  ThresholdsConfig,
  User,
} from "./types";

interface AuthStorage {
  getAuthToken: () => string | null;
  setAuthToken: (token: string | null) => void;
}

const now = () => new Date();
const iso = (date: Date) => date.toISOString();

const users: AdminUser[] = [
  {
    id: 1,
    name: "AirSense Administrator",
    email: "admin@airsense.edu.pk",
    role: "admin",
    active: true,
    created_at: "2025-01-12T08:00:00.000Z",
  },
  {
    id: 2,
    name: "Campus Student",
    email: "student@airsense.edu.pk",
    role: "user",
    active: true,
    created_at: "2025-02-05T09:30:00.000Z",
  },
  {
    id: 3,
    name: "Faculty Member",
    email: "faculty@airsense.edu.pk",
    role: "user",
    active: true,
    created_at: "2025-03-18T11:15:00.000Z",
  },
];

const createUser = (user: AdminUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  notify_enabled: true,
  notify_threshold: 101,
  created_at: user.created_at,
});

let currentReading: CurrentReading = {
  timestamp: iso(now()),
  location: "BBSUTSD Campus, Khairpur Mirs",
  pm25: 34.6,
  pm10: 68.2,
  dust: 41.8,
  aqi: 92,
  category: "Moderate",
};

let alerts: AlertItem[] = [
  {
    id: 1,
    source: "auto",
    severity: "warning",
    title: "Elevated particulate levels",
    message: "Air quality is moderate. Sensitive individuals may wish to reduce prolonged outdoor activity.",
    created_at: iso(new Date(now().getTime() - 18 * 60 * 1000)),
    active: true,
    read: false,
    created_by: null,
  },
  {
    id: 2,
    source: "manual",
    severity: "info",
    title: "Campus air quality update",
    message: "Sample readings are available for the campus monitoring station.",
    created_at: iso(new Date(now().getTime() - 3 * 60 * 60 * 1000)),
    active: true,
    read: true,
    created_by: "AirSense Administrator",
  },
  {
    id: 3,
    source: "auto",
    severity: "danger",
    title: "High AQI recorded earlier",
    message: "An earlier sample exceeded the healthy range. Current conditions have improved.",
    created_at: iso(new Date(now().getTime() - 24 * 60 * 60 * 1000)),
    active: false,
    read: true,
    created_by: null,
  },
];

let thresholds: ThresholdsConfig = { warning: 101, danger: 151 };
let lastFetch = iso(now());
let nextUserId = 4;
let nextAlertId = 4;
let retrainStatus: ModelStatusResponse = {
  job_id: null,
  status: "idle",
  message: null,
  finished_at: null,
};

let auditLogs: AuditItem[] = [
  {
    time: iso(new Date(now().getTime() - 20 * 60 * 1000)),
    user: "AirSense Administrator",
    action: "LOGIN",
    details: "Administrator session started",
  },
  {
    time: iso(new Date(now().getTime() - 2 * 60 * 60 * 1000)),
    user: "AirSense Administrator",
    action: "DATA_REFRESH",
    details: "Sample air quality records refreshed",
  },
  {
    time: iso(new Date(now().getTime() - 5 * 60 * 60 * 1000)),
    user: "Faculty Member",
    action: "LOGIN",
    details: "User session started",
  },
];

const addAuditLog = (action: string, details: string, user = "AirSense Administrator") => {
  auditLogs = [{ time: iso(now()), user, action, details }, ...auditLogs];
};

const createHistory = (hours: number): HistoryResponse => {
  const count = Math.max(1, Math.min(hours, 168));
  return {
    points: Array.from({ length: count }, (_, index) => {
    const hour = count - index - 1;
    const timestamp = new Date(now().getTime() - hour * 60 * 60 * 1000);
    const aqi = Math.round(76 + Math.sin(hour / 4) * 17 + Math.cos(hour / 8) * 9);
    return {
      timestamp: iso(timestamp),
      pm25: Number((aqi * 0.38).toFixed(1)),
      pm10: Number((aqi * 0.74).toFixed(1)),
      dust: Number((aqi * 0.46).toFixed(1)),
      aqi,
    };
  }),
  };
};

const guidance: GuidanceItem[] = [
  {
    audience: "All campus members",
    icon: "Wind",
    title: "Plan outdoor activities",
    body: "Check current conditions before extended outdoor activity and take breaks when needed.",
  },
  {
    audience: "Sensitive groups",
    icon: "HeartHandshake",
    title: "Reduce prolonged exertion",
    body: "People with asthma, heart conditions, children, and older adults should consider limiting strenuous outdoor activity.",
  },
  {
    audience: "Campus community",
    icon: "Shield",
    title: "Follow campus updates",
    body: "Watch for new air quality notices and follow guidance from campus health staff.",
  },
];

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "number" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    (user.role === "admin" || user.role === "user")
  );
};

export const createMockApi = ({ getAuthToken, setAuthToken }: AuthStorage) => {
  const getCurrentUser = (): User => {
    const token = getAuthToken();
    if (!token?.startsWith("airsense-local:")) {
      throw new Error("Please sign in to continue.");
    }

    const encodedUser = token.slice("airsense-local:".length);
    let parsedUser: unknown;
    try {
      parsedUser = JSON.parse(decodeURIComponent(encodedUser));
    } catch {
      throw new Error("Your session is no longer valid. Please sign in again.");
    }

    if (!isUser(parsedUser)) {
      throw new Error("Your session is no longer valid. Please sign in again.");
    }
    return parsedUser;
  };

  const saveCurrentUser = (user: User) => {
    setAuthToken(`airsense-local:${encodeURIComponent(JSON.stringify(user))}`);
    const existingUser = users.find((item) => item.id === user.id);
    if (existingUser) {
      Object.assign(existingUser, user);
    } else {
      users.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active ?? true,
        created_at: user.created_at ?? iso(now()),
      });
    }
  };

  const authResponse = (user: User): AuthResponse => {
    saveCurrentUser(user);
    return {
      token: `airsense-local:${encodeURIComponent(JSON.stringify(user))}`,
      expires_at: iso(new Date(now().getTime() + 24 * 60 * 60 * 1000)),
      user,
    };
  };

  return {
    getHealth: async () => ({ status: "ok", time: iso(now()), data_source: "sample" as const }),
    getCurrent: async () => ({ ...currentReading }),

    register: async (data: { name: string; email: string; password: string }) => {
      const email = data.email.trim().toLowerCase();
      if (users.some((user) => user.email.toLowerCase() === email)) {
        throw new Error("An account with this email already exists. Please sign in.");
      }
      const account: AdminUser = {
        id: nextUserId++,
        name: data.name.trim(),
        email,
        role: "user",
        active: true,
        created_at: iso(now()),
      };
      users.push(account);
      return authResponse(createUser(account));
    },

    login: async (data: { email: string; password: string }) => {
      const email = data.email.trim().toLowerCase();
      let account = users.find((user) => user.email.toLowerCase() === email);
      if (!account) {
        account = {
          id: nextUserId++,
          name: email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          email,
          role: "user",
          active: true,
          created_at: iso(now()),
        };
        users.push(account);
      }
      addAuditLog("LOGIN", "Local account session started", account.name);
      return authResponse(createUser(account));
    },

    getMe: async () => getCurrentUser(),
    updateMe: async (data: { name?: string; notify_enabled?: boolean; notify_threshold?: number }) => {
      const user = { ...getCurrentUser(), ...data };
      saveCurrentUser(user);
      return user;
    },
    changePassword: async (_data: { current_password: string; new_password: string }) => ({ ok: true }),
    deleteAccount: async () => {
      const user = getCurrentUser();
      const index = users.findIndex((account) => account.id === user.id);
      if (index >= 0) users.splice(index, 1);
      setAuthToken(null);
      return { ok: true };
    },

    getHistory: async (hours = 48) => createHistory(hours),
    getForecast: async (hours = 6): Promise<ForecastResponse> => ({
      generated_at: iso(now()),
      model: "Campus Air Quality Forecast",
      points: Array.from({ length: Math.max(1, Math.min(hours, 24)) }, (_, index) => {
        const aqi = Math.round(88 + Math.sin(index / 2) * 13 + index * 1.2);
        return {
          timestamp: iso(new Date(now().getTime() + (index + 1) * 60 * 60 * 1000)),
          aqi_pred: aqi,
          category: getAQIInfo(aqi).category,
        };
      }),
    }),
    getAlerts: async (limit = 20): Promise<AlertsResponse> => ({
      items: alerts.filter((alert) => alert.active).slice(0, limit).map((alert) => ({ ...alert })),
    }),
    markAlertRead: async (id: number) => {
      const alert = alerts.find((item) => item.id === id);
      if (alert) alert.read = true;
      return { ok: true };
    },
    getGuidance: async (category = "Moderate"): Promise<GuidanceResponse> => ({
      category,
      items: guidance.map((item) => ({ ...item })),
    }),

    getAdminOverview: async (): Promise<AdminOverviewResponse> => ({
      data: {
        last_fetch: lastFetch,
        freshness_minutes: Math.max(0, Math.floor((now().getTime() - new Date(lastFetch).getTime()) / 60000)),
        source_status: "sample",
      },
      model: {
        name: "Campus Forecast Model",
        trained_at: "2025-05-12T08:00:00.000Z",
        mae: 8.4,
        rmse: 11.2,
        baseline_mae: 14.8,
      },
      users: { total: users.length, admins: users.filter((user) => user.role === "admin").length },
      alerts_last_7_days: {
        auto: alerts.filter((alert) => alert.source === "auto").length,
        manual: alerts.filter((alert) => alert.source === "manual").length,
      },
    }),
    getAdminUsers: async (q = "", page = 1, pageSize = 10): Promise<AdminUsersListResponse> => {
      const query = q.trim().toLowerCase();
      const matchingUsers = users.filter(
        (user) => !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
      );
      const start = Math.max(0, (page - 1) * pageSize);
      return {
        items: matchingUsers.slice(start, start + pageSize).map((user) => ({ ...user })),
        total: matchingUsers.length,
      };
    },
    updateAdminUser: async (id: number, data: { role?: string; active?: boolean }) => {
      const user = users.find((account) => account.id === id);
      if (!user) throw new Error("User account could not be found.");
      if (data.role === "admin" || data.role === "user") user.role = data.role;
      if (typeof data.active === "boolean") user.active = data.active;
      addAuditLog("USER_UPDATED", `Updated account settings for ${user.email}`);
      return { ...user };
    },
    resetUserPassword: async (id: number) => {
      if (!users.some((user) => user.id === id)) throw new Error("User account could not be found.");
      addAuditLog("PASSWORD_RESET", `Reset password for account #${id}`);
      return { temporary_password: "AirSense-Access-2025" };
    },
    deleteAdminUser: async (id: number) => {
      const index = users.findIndex((user) => user.id === id);
      if (index >= 0) {
        const [deletedUser] = users.splice(index, 1);
        addAuditLog("USER_DELETED", `Removed account ${deletedUser.email}`);
      }
      return { ok: true };
    },
    getAdminAlerts: async (limit = 50) => alerts.slice(0, limit).map((alert) => ({ ...alert })),
    createAdminAlert: async (data: { severity: string; title: string; message: string; expires_in_hours?: number }) => {
      const alert: AlertItem = {
        id: nextAlertId++,
        source: "manual",
        severity: data.severity === "danger" || data.severity === "warning" ? data.severity : "info",
        title: data.title,
        message: data.message,
        created_at: iso(now()),
        expires_at: data.expires_in_hours ? iso(new Date(now().getTime() + data.expires_in_hours * 3600000)) : null,
        active: true,
        read: false,
        created_by: getCurrentUser().name,
      };
      alerts = [alert, ...alerts];
      addAuditLog("ALERT_CREATED", `Created alert: ${alert.title}`);
      return { ...alert };
    },
    deactivateAdminAlert: async (id: number) => {
      const alert = alerts.find((item) => item.id === id);
      if (!alert) throw new Error("Alert could not be found.");
      alert.active = false;
      addAuditLog("ALERT_DEACTIVATED", `Deactivated alert: ${alert.title}`);
      return { ...alert };
    },
    getThresholds: async () => ({ ...thresholds }),
    updateThresholds: async (data: ThresholdsConfig) => {
      thresholds = { ...data };
      addAuditLog("THRESHOLDS_UPDATED", `Warning: ${data.warning}, danger: ${data.danger}`);
      return { ...thresholds };
    },
    refreshData: async () => {
      lastFetch = iso(now());
      currentReading = { ...currentReading, timestamp: lastFetch };
      addAuditLog("DATA_REFRESH", "Sample air quality records refreshed");
      return { status: "complete", fetched: 24 };
    },
    retrainModel: async () => {
      retrainStatus = {
        job_id: "local-model-refresh",
        status: "done",
        message: "Sample forecast metrics refreshed.",
        finished_at: iso(now()),
      };
      addAuditLog("MODEL_RETRAINED", "Sample forecast metrics refreshed");
      return { job_id: retrainStatus.job_id, status: retrainStatus.status };
    },
    getModelStatus: async () => ({ ...retrainStatus }),
    getAuditLogs: async (limit = 50, action?: string): Promise<AuditListResponse> => ({
      items: auditLogs
        .filter((log) => !action || log.action === action)
        .slice(0, limit)
        .map((log) => ({ ...log })),
    }),
    exportReadings: async (from?: string, to?: string) => {
      const points = createHistory(168).points.filter((point) => {
        const date = point.timestamp.slice(0, 10);
        return (!from || date >= from) && (!to || date <= to);
      });
      const rows = [
        "timestamp,pm25,pm10,dust,aqi",
        ...points.map((point) => `${point.timestamp},${point.pm25},${point.pm10},${point.dust},${point.aqi}`),
      ];
      return new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    },
  };
};
