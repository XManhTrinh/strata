"use client";

import { create } from "zustand";
import { useEffect, useState } from "react";

interface SidebarStore {
  collapsed: boolean;
  hydrated: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  hydrate: () => void;
}

const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: false, // Always start with false for SSR consistency
  hydrated: false,
  toggle: () =>
    set((state) => {
      const next = !state.collapsed;
      if (typeof window !== "undefined") {
        localStorage.setItem("strata-sidebar-collapsed", String(next));
      }
      return { collapsed: next };
    }),
  setCollapsed: (collapsed: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("strata-sidebar-collapsed", String(collapsed));
    }
    set({ collapsed });
  },
  hydrate: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("strata-sidebar-collapsed");
      set({ collapsed: stored === "true", hydrated: true });
    }
  },
}));

/**
 * Hook that wraps the sidebar store with hydration safety.
 * Defers localStorage read to after hydration to prevent SSR mismatch.
 */
export function useSidebar() {
  const store = useSidebarStore();

  useEffect(() => {
    if (!store.hydrated) {
      store.hydrate();
    }
  }, [store]);

  return {
    collapsed: store.collapsed,
    toggle: store.toggle,
    setCollapsed: store.setCollapsed,
  };
}
