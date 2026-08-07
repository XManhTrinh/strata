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

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
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

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, params } = options;

  const url = buildUrl(endpoint, params);

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add CSRF token for state-changing requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      requestHeaders["X-CSRF-Token"] = csrf;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: "include",
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(url, fetchOptions);
  } catch {
    throw new ApiClientError({
      statusCode: 0,
      message: "Network error. Please check your connection.",
    });
  }

  // Handle 401 — attempt cookie-based refresh and retry
  if (response.status === 401) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!refreshRes.ok) {
        throw new Error("Refresh failed");
      }
      // Retry original request (cookies refreshed automatically by browser)
      try {
        response = await fetch(url, fetchOptions);
      } catch {
        throw new ApiClientError({
          statusCode: 0,
          message: "Network error. Please check your connection.",
        });
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiClientError({
        statusCode: 401,
        message: "Session expired. Please log in again.",
      });
    }
  }

  // Handle 403 CSRF — re-read cookie and retry once
  if (response.status === 403) {
    const csrf = getCsrfToken();
    if (csrf && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      requestHeaders["X-CSRF-Token"] = csrf;
      const retryFetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        credentials: "include",
      };
      if (body && method !== "GET") {
        retryFetchOptions.body = JSON.stringify(body);
      }
      try {
        response = await fetch(url, retryFetchOptions);
      } catch {
        throw new ApiClientError({
          statusCode: 0,
          message: "Network error. Please check your connection.",
        });
      }
    }
  }

  // Handle 5xx — retry once after 1 second delay
  if (response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      response = await fetch(url, fetchOptions);
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
