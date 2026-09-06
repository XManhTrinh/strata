"use client";

import { create } from "zustand";

/**
 * Tracks the currently selected role view.
 * - "super_admin": the super admin view (all admin features visible)
 * - any other string: a company role ID — sidebar filters by that role's permissions
 */
interface UserRoleState {
  role: string;
  setRole: (role: string) => void;
}

export const useUserRole = create<UserRoleState>((set) => ({
  role:
    typeof window !== "undefined"
      ? localStorage.getItem("strata-dev-role") || "super_admin"
      : "super_admin",
  setRole: (role: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("strata-dev-role", role);
    }
    set({ role });
  },
}));
