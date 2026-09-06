"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  name: string;
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

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name:
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      supabaseUser.email?.split("@")[0] ??
      "",
  };
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return;
      }

      set({
        user: mapSupabaseUser(data.user),
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: "Network error. Please try again." });
    }
  },

  loginWithGoogle: (returnUrl: string = "/dashboard") => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`,
      },
    });
  },

  logout: async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    // Don't redirect here — let the caller or AuthGuard handle navigation
  },

  checkSession: async () => {
    // Avoid redundant checks if already authenticated
    if (get().isAuthenticated && get().user) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        set({
          user: mapSupabaseUser(data.session.user),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
