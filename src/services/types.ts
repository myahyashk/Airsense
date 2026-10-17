export interface HealthResponse {
  status: string;
  time: string;
  data_source: "live" | "degraded" | "sample";
}

export interface CurrentReading {
  timestamp: string;
  location: string;
  pm25: number;
  pm10: number;
  dust: number;
  aqi: number;
  category: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  active?: boolean;
  notify_enabled?: boolean;
  notify_threshold?: number;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  expires_at: string;
  user: User;
}

export interface HistoryPoint {
  timestamp: string;
  pm25: number;
  pm10: number;
  dust: number;
  aqi: number;
}

export interface HistoryResponse {
  points: HistoryPoint[];
}

export interface ForecastPoint {
  timestamp: string;
  aqi_pred: number;
  category: string;
}

export interface ForecastResponse {
  generated_at: string;
  model: string;
  points: ForecastPoint[];
}

export interface AlertItem {
  id: number;
  source: "auto" | "manual";
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  created_at: string;
  expires_at?: string | null;
  active: boolean;
  read: boolean;
  created_by?: string | null;
}

export interface AlertsResponse {
  items: AlertItem[];
}

export interface GuidanceItem {
  audience: string;
  icon: string;
  title: string;
  body: string;
}

export interface GuidanceResponse {
  category: string;
  items: GuidanceItem[];
}

export interface AdminOverviewData {
  last_fetch: string;
  freshness_minutes: number;
  source_status: "live" | "degraded" | "sample";
}

export interface AdminOverviewModel {
  name: string;
  trained_at: string;
  mae: number;
  rmse: number;
  baseline_mae: number;
}

export interface AdminOverviewUsers {
  total: number;
  admins: number;
}

export interface AdminOverviewAlerts {
  auto: number;
  manual: number;
}

export interface AdminOverviewResponse {
  data: AdminOverviewData;
  model: AdminOverviewModel;
  users: AdminOverviewUsers;
  alerts_last_7_days: AdminOverviewAlerts;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  active: boolean;
  created_at: string;
}

export interface AdminUsersListResponse {
  items: AdminUser[];
  total: number;
}

export interface ThresholdsConfig {
  warning: number;
  danger: number;
}

export interface RetrainResponse {
  job_id: string;
  status: string;
}

export interface ModelStatusResponse {
  job_id: string | null;
  status: "idle" | "queued" | "running" | "done" | "failed";
  message: string | null;
  finished_at: string | null;
}

export interface AuditItem {
  time: string;
  user: string;
  action: string;
  details: string;
}

export interface AuditListResponse {
  items: AuditItem[];
}
