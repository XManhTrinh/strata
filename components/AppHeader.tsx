"use client";

import { useTheme } from "./ThemeProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const { resolvedTheme, toggle } = useTheme();
  const isDark = resolvedTheme === "dark";
  const pathname = usePathname();

  const navItems = [
    { href: "/flow-org", label: "Org Chart" },
    { href: "/capacity", label: "Capacity" },
    { href: "/budget", label: "Budget" },
    { href: "/calendar", label: "Calendar" },
  ];

  return (
    <div className="h-12 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">OrgChart</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                pathname === item.href
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {/* Sun */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={[
            "absolute transition-all duration-300 ease-in-out",
            isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100",
          ].join(" ")}
        >
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>

        {/* Moon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={[
            "absolute transition-all duration-300 ease-in-out",
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0",
          ].join(" ")}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </div>
  );
}
