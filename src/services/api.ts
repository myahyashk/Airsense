import { createMockApi } from "./mockApi";

export class ApiError extends Error {
  status: number;
  data?: unknown;
  kind: "network" | "http" | "shape";

  constructor(
    message: string,
    status = 0,
    data?: unknown,
    kind: "network" | "http" | "shape" = "http",
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.kind = kind;
  }
}

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

export const api = createMockApi({ getAuthToken, setAuthToken });
