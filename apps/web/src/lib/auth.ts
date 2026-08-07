"use client";

import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  devLogin: () => void;
  loginWithSSO: (organizationId: string) => void;
  handleSSOCallback: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useAuth = create<AuthState>((set, get) => ({
  accessToken: typeof window !== "undefined" ? (localStorage.getItem("strata-access-token") || (localStorage.getItem("strata-refresh-token") ? "pending-refresh" : null)) : null,
  isAuthenticated: typeof window !== "undefined" && !!(localStorage.getItem("strata-access-token") || localStorage.getItem("strata-refresh-token")),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.message || (response.status === 401 ? "Invalid credentials" : "Login failed");
        set({ isLoading: false, error: message });
        return;
      }

      const data = await response.json();
      const { accessToken, refreshToken } = data;

      // Store access token in memory and localStorage, refresh token in localStorage
      set({ accessToken, isAuthenticated: true, isLoading: false, error: null });
      if (typeof window !== "undefined") {
        localStorage.setItem("strata-access-token", accessToken);
        if (refreshToken) {
          localStorage.setItem("strata-refresh-token", refreshToken);
        }
      }
    } catch {
      set({ isLoading: false, error: "Network error. Please try again." });
    }
  },

  devLogin: () => {
    // Development-only bypass — sets a mock token without calling the backend
    set({
      accessToken: "dev-mock-token",
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("strata-access-token", "dev-mock-token");
      localStorage.setItem("strata-refresh-token", "dev-mock-refresh-token");
    }
  },

  loginWithSSO: (organizationId: string) => {
    // Redirect to the backend SSO initiation endpoint
    const returnUrl = typeof window !== "undefined" ? window.location.pathname : "/";
    window.location.href = `${API_URL}/auth/sso/${organizationId}/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  },

  handleSSOCallback: (accessToken: string, refreshToken: string) => {
    set({ accessToken, isAuthenticated: true, isLoading: false, error: null });
    if (typeof window !== "undefined") {
      localStorage.setItem("strata-access-token", accessToken);
      if (refreshToken) {
        localStorage.setItem("strata-refresh-token", refreshToken);
      }
    }
  },

  logout: () => {
    set({ accessToken: null, isAuthenticated: false, error: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem("strata-access-token");
      localStorage.removeItem("strata-refresh-token");
    }
  },

  getAccessToken: () => get().accessToken,

  refreshAccessToken: async () => {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("strata-refresh-token")
        : null;

    if (!refreshToken) {
      get().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        get().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = data;

      set({ accessToken, isAuthenticated: true });

      if (typeof window !== "undefined") {
        localStorage.setItem("strata-access-token", accessToken);
        if (newRefreshToken) {
          localStorage.setItem("strata-refresh-token", newRefreshToken);
        }
      }

      return accessToken;
    } catch (error) {
      // If the error is from our own throw above, re-throw it
      if (error instanceof Error && (error.message === "Token refresh failed" || error.message === "No refresh token available")) {
        throw error;
      }
      // Network or unexpected error
      get().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Token refresh failed");
    }
  },
}));
