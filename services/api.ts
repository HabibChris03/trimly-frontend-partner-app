// Base API configuration and HTTP client for Trimly REST API

export const API_BASE_URL = "https://api.trimly237.com";

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "trimly_auth_token";

// In-memory token store with persistent fallback
let authToken: string | null = null;

export const setAuthToken = async (token: string | null) => {
  authToken = token;
  try {
    if (token) {
      if (Platform.OS === "web") {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } else {
      if (Platform.OS === "web") {
        localStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    }
  } catch {
    // Ignore storage errors on restricted environments
  }
};

export const getStoredAuthToken = async (): Promise<string | null> => {
  if (authToken) return authToken;
  try {
    if (Platform.OS === "web") {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) authToken = stored;
      return stored;
    } else {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) authToken = stored;
      return stored;
    }
  } catch {
    return null;
  }
};

export const getAuthToken = (): string | null => {
  return authToken;
};

const ACTIVE_MODE_KEY = "trimly_active_mode";
let activeMode: "client" | "barber" | "sub-barber" | null = null;

export const setActiveMode = async (mode: "client" | "barber" | "sub-barber" | null) => {
  activeMode = mode;
  try {
    if (mode) {
      if (Platform.OS === "web") {
        localStorage.setItem(ACTIVE_MODE_KEY, mode);
      } else {
        await SecureStore.setItemAsync(ACTIVE_MODE_KEY, mode);
      }
    } else {
      if (Platform.OS === "web") {
        localStorage.removeItem(ACTIVE_MODE_KEY);
      } else {
        await SecureStore.deleteItemAsync(ACTIVE_MODE_KEY);
      }
    }
  } catch {
    // Ignore storage errors
  }
};

export const getStoredActiveMode = async (): Promise<"client" | "barber" | "sub-barber" | null> => {
  if (activeMode) return activeMode;
  try {
    if (Platform.OS === "web") {
      const stored = localStorage.getItem(ACTIVE_MODE_KEY) as any;
      if (stored) activeMode = stored;
      return stored;
    } else {
      const stored = (await SecureStore.getItemAsync(ACTIVE_MODE_KEY)) as any;
      if (stored) activeMode = stored;
      return stored;
    }
  } catch {
    return null;
  }
};

export const getActiveMode = () => activeMode;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers = {}, ...restOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  // Append query params if provided
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    "Accept": "application/json",
    ...(headers as Record<string, string>),
  };

  // Attach bearer token if authenticated
  if (authToken && !reqHeaders["Authorization"]) {
    reqHeaders["Authorization"] = `Bearer ${authToken}`;
  }

  // Set Content-Type to JSON if body is an object and not FormData / URLSearchParams
  if (
    restOptions.body &&
    typeof restOptions.body === "string" &&
    !reqHeaders["Content-Type"]
  ) {
    reqHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: reqHeaders,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        responseData?.detail?.message ||
        responseData?.detail ||
        (Array.isArray(responseData?.detail)
          ? responseData.detail.map((d: any) => d.msg).join(", ")
          : null) ||
        responseData?.message ||
        `Request failed with status ${response.status}`;

      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || "Network error occurred", 0, error);
  }
}
