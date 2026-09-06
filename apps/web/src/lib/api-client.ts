import { createClient } from "@/lib/supabase/client";

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

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
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

/**
 * API client that automatically attaches the Supabase access token
 * as a Bearer token in the Authorization header.
 *
 * On 401, attempts a session refresh and retries the request once.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, params } = options;

  const url = buildUrl(endpoint, params);
  const token = await getAccessToken();

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
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

  // Handle 401 — attempt Supabase session refresh and retry once
  if (response.status === 401) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.refreshSession();

      if (data.session) {
        requestHeaders["Authorization"] = `Bearer ${data.session.access_token}`;
        try {
          response = await fetch(url, { ...fetchOptions, headers: requestHeaders });
        } catch {
          throw new ApiClientError({
            statusCode: 0,
            message: "Network error. Please check your connection.",
          });
        }
      }

      // If refresh failed or retry still 401, throw (don't redirect — let AuthGuard handle it)
      if (!data.session || response.status === 401) {
        throw new ApiClientError({
          statusCode: 401,
          message: "Session expired. Please log in again.",
        });
      }
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      throw new ApiClientError({
        statusCode: 401,
        message: "Session expired. Please log in again.",
      });
    }
  }

  // Handle non-OK responses
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
