"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  resolvedTheme: "light" | "dark";
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  resolvedTheme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    function apply() {
      const isDark = theme === "dark" || (theme === "system" && getSystemTheme() === "dark");
      document.documentElement.classList.toggle("dark", isDark);
      setResolvedTheme(isDark ? "dark" : "light");
    }

    apply();

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setThemeState(next);
    localStorage.setItem("theme", next);
  }

  return (
    <ThemeContext.Provider value={{ resolvedTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
