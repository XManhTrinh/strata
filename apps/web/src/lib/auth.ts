"use client";

import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (returnUrl?: string) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // starts true so auth guard shows loading
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ isLoading: false, error: data.message || "Login failed" });
        return;
      }
      // Fetch user profile from session
      const meRes = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (meRes.ok) {
        const user = await meRes.json();
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      } else {
        set({ isAuthenticated: true, isLoading: false, error: null });
      }
    } catch {
      set({ isLoading: false, error: "Network error. Please try again." });
    }
  },

  loginWithGoogle: (returnUrl: string = "/") => {
    window.location.href = `${API_URL}/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    set({ user: null, isAuthenticated: false, error: null });
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const user = await res.json();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        // Try silent refresh
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          const meRes = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
          if (meRes.ok) {
            const user = await meRes.json();
            set({ user, isAuthenticated: true, isLoading: false });
            return;
          }
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
