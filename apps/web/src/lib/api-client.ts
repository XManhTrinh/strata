import { useAuth } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export class ApiClientError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.statusCode = apiError.statusCode;
    this.errors = apiError.errors;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

// Token refresh state — module-level singleton to prevent parallel refresh calls
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem("strata-refresh-token")
      : null;

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  const data = await response.json();
  const { accessToken, refreshToken: newRefreshToken } = data;

  // Update the auth store with the new access token
  useAuth.setState({ accessToken, isAuthenticated: true });

  // Update refresh token in localStorage if a new one was returned
  if (typeof window !== "undefined" && newRefreshToken) {
    localStorage.setItem("strata-refresh-token", newRefreshToken);
  }

  return accessToken;
}

async function handleTokenRefresh(): Promise<string> {
  // If a refresh is already in-flight, share the same promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    return {
      message: body.message || response.statusText,
      statusCode: response.status,
      errors: body.errors,
    };
  } catch {
    return {
      message: response.statusText || "An error occurred",
      statusCode: response.status,
    };
  }
}

function buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return url;
}

function buildFetchOptions(
  method: string,
  body: unknown | undefined,
  headers: Record<string, string>,
  accessToken: string | null
): RequestInit {
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (accessToken) {
    requestHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  return fetchOptions;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, params } = options;

  const url = buildUrl(endpoint, params);
  const accessToken = useAuth.getState().getAccessToken();
  const fetchOptions = buildFetchOptions(method, body, headers, accessToken);

  let response: Response;

  try {
    response = await fetch(url, fetchOptions);
  } catch {
    // Network error — no response received
    throw new ApiClientError({
      statusCode: 0,
      message: "Network error. Please check your connection.",
    });
  }

  // Handle 401 — attempt token refresh and retry
  if (response.status === 401) {
    try {
      const newToken = await handleTokenRefresh();
      // Retry the original request with the new token
      const retryFetchOptions = buildFetchOptions(method, body, headers, newToken);

      try {
        response = await fetch(url, retryFetchOptions);
      } catch {
        throw new ApiClientError({
          statusCode: 0,
          message: "Network error. Please check your connection.",
        });
      }
    } catch (refreshError) {
      // Refresh failed — clear auth and redirect to login
      useAuth.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiClientError({
        statusCode: 401,
        message: "Session expired. Please log in again.",
      });
    }
  }

  // Handle 5xx — retry once after 1 second delay
  if (response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      // Re-read the token in case it was refreshed during the delay
      const currentToken = useAuth.getState().getAccessToken();
      const retryFetchOptions = buildFetchOptions(method, body, headers, currentToken);
      response = await fetch(url, retryFetchOptions);
    } catch {
      throw new ApiClientError({
        statusCode: 0,
        message: "Network error. Please check your connection.",
      });
    }
  }

  // Handle non-OK responses after retries
  if (!response.ok) {
    const apiError = await parseErrorResponse(response);
    throw new ApiClientError(apiError);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
