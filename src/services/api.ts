import type {
  HealthResponse,
  CurrentReading,
  AuthResponse,
  User,
  HistoryResponse,
  ForecastResponse,
  AlertsResponse,
  AlertItem,
  GuidanceResponse,
  AdminOverviewResponse,
  AdminUsersListResponse,
  AdminUser,
  ThresholdsConfig,
  RetrainResponse,
  ModelStatusResponse,
  AuditListResponse,
} from "./types";

export class ApiError extends Error {
  status: number;
  data?: any;
  kind: "network" | "http" | "shape";
  constructor(message: string, status: number = 0, data?: any, kind: "network" | "http" | "shape" = "http") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.kind = kind;
  }
}

// In-memory token with sessionStorage sync
let memoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  memoryToken = token;
  if (token) {
    sessionStorage.setItem("airsense_token", token);
  } else {
    sessionStorage.removeItem("airsense_token");
  }
};

export const getAuthToken = (): string | null => {
  if (memoryToken) return memoryToken;
  const stored = sessionStorage.getItem("airsense_token");
  if (stored) {
    memoryToken = stored;
  }
  return memoryToken;
};

// Typed request wrapper with 10s timeout, auto-retry once on network error, and token attachment
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  parseBody?: (response: Response) => Promise<T>,
): Promise<T> {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const apiBase = import.meta.env.DEV || !configuredBase ? "/api" : `${configuredBase}/api`;
  const url = endpoint.startsWith("http") ? endpoint : `${apiBase}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchWithTimeout = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let response: Response;
  try {
    response = await fetchWithTimeout();
  } catch (err: any) {
    // Retry once on network failure
    try {
      response = await fetchWithTimeout();
    } catch (retryErr: any) {
      if (retryErr.name === "AbortError") {
        throw new ApiError("Connection timed out. Please check your network and retry.", 408, undefined, "network");
      }
      throw new ApiError("Network connection error. Server might be unavailable.", 0, undefined, "network");
    }
  }

  // Token expired / Unauthorized handling
  if (response.status === 401) {
    setAuthToken(null);
    if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
      window.dispatchEvent(new CustomEvent("airsense:unauthorized"));
    }
  }

  // Handle errors
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData && errorData.detail) {
        errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // Non-JSON response
    }
    throw new ApiError(errorMessage, response.status, errorData, "http");
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (parseBody) {
    return parseBody(response);
  }

  const parseResponse = async (): Promise<T> => {
    try {
      const data: unknown = await response.json();
      if (data === null || typeof data !== "object") {
        throw new ApiError("The server returned data in an unexpected format.", response.status, data, "shape");
      }
      return data as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("The server returned invalid JSON.", response.status, undefined, "shape");
    }
  };

  return parseResponse();
}

export const api = {
  // Public
  getHealth: () => apiRequest<HealthResponse>("/health"),
  getCurrent: () => apiRequest<CurrentReading>("/current"),

  // Auth
  register: (data: { name: string; email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => apiRequest<User>("/auth/me"),
  updateMe: (data: { name?: string; notify_enabled?: boolean; notify_threshold?: number }) =>
    apiRequest<User>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    apiRequest<{ ok: boolean }>("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
  deleteAccount: () => apiRequest<{ ok: boolean }>("/auth/me", { method: "DELETE" }),

  // User
  getHistory: (hours: number = 48) => apiRequest<HistoryResponse>(`/history?hours=${hours}`),
  getForecast: (hours: number = 6) => apiRequest<ForecastResponse>(`/forecast?hours=${hours}`),
  getAlerts: (limit: number = 20) => apiRequest<AlertsResponse>(`/alerts?limit=${limit}`),
  markAlertRead: (id: number) => apiRequest<{ ok: boolean }>(`/alerts/${id}/read`, { method: "POST" }),
  getGuidance: (category?: string) =>
    apiRequest<GuidanceResponse>(category ? `/guidance?category=${encodeURIComponent(category)}` : "/guidance"),

  // Admin
  getAdminOverview: () => apiRequest<AdminOverviewResponse>("/admin/overview"),
  getAdminUsers: (q: string = "", page: number = 1, pageSize: number = 10) =>
    apiRequest<AdminUsersListResponse>(`/admin/users?q=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`),
  updateAdminUser: (id: number, data: { role?: string; active?: boolean }) =>
    apiRequest<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  resetUserPassword: (id: number) =>
    apiRequest<{ temporary_password: string }>(`/admin/users/${id}/reset-password`, { method: "POST" }),
  deleteAdminUser: (id: number) => apiRequest<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
  getAdminAlerts: (limit: number = 50) => apiRequest<AlertItem[]>(`/admin/alerts?limit=${limit}`),
  createAdminAlert: (data: { severity: string; title: string; message: string; expires_in_hours?: number }) =>
    apiRequest<AlertItem>("/admin/alerts", { method: "POST", body: JSON.stringify(data) }),
  deactivateAdminAlert: (id: number) =>
    apiRequest<AlertItem>(`/admin/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ active: false }) }),
  getThresholds: () => apiRequest<ThresholdsConfig>("/admin/thresholds"),
  updateThresholds: (data: { warning: number; danger: number }) =>
    apiRequest<ThresholdsConfig>("/admin/thresholds", { method: "PUT", body: JSON.stringify(data) }),
  refreshData: () => apiRequest<{ status: string; fetched: number }>("/admin/refresh", { method: "POST" }),
  retrainModel: () => apiRequest<RetrainResponse>("/admin/model/retrain", { method: "POST" }),
  getModelStatus: () => apiRequest<ModelStatusResponse>("/admin/model/status"),
  getAuditLogs: (limit: number = 50, action?: string) =>
    apiRequest<AuditListResponse>(
      action ? `/admin/audit?limit=${limit}&action=${encodeURIComponent(action)}` : `/admin/audit?limit=${limit}`
    ),
  exportReadingsUrl: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const qs = params.toString();
    return `/admin/export/readings${qs ? `?${qs}` : ""}`;
  },
  exportReadings: (from?: string, to?: string) =>
    apiRequest<Blob>(api.exportReadingsUrl(from, to), { headers: { Accept: "text/csv" } }, (response) => response.blob()),
};
