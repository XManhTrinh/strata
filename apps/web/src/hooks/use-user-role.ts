"use client";

import { create } from "zustand";

/**
 * User role determines which UI experience they get:
 * - super_admin: Full sidebar with all business admin sections
 * - manager: Sidebar with people management, budgets, leave, etc.
 * - user: No sidebar, only org chart and calendar
 */
export type UserRoleView = "super_admin" | "manager" | "user";

interface UserRoleState {
  role: UserRoleView;
  setRole: (role: UserRoleView) => void;
}

/**
 * For development: role is stored in localStorage so we can switch between views.
 * In production: this would be derived from the authorization engine response.
 */
export const useUserRole = create<UserRoleState>((set) => ({
  role: (typeof window !== "undefined"
    ? (localStorage.getItem("strata-dev-role") as UserRoleView) || "super_admin"
    : "super_admin") as UserRoleView,
  setRole: (role: UserRoleView) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("strata-dev-role", role);
    }
    set({ role });
  },
}));
