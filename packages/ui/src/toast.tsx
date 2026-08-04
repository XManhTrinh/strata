"use client";

import React, { useEffect } from "react";
import { motion } from "motion/react";

export interface ToastProps {
  variant: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
  onDismiss?: () => void;
  duration?: number;
}

const variantStyles: Record<string, { bg: string; icon: string }> = {
  success: {
    bg: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
    icon: "text-green-600 dark:text-green-400",
  },
  error: {
    bg: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
    icon: "text-red-600 dark:text-red-400",
  },
  info: {
    bg: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
    icon: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    bg: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
};

const icons: Record<string, React.ReactNode> = {
  success: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
};

export function Toast({
  variant,
  title,
  description,
  onDismiss,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (onDismiss && duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [onDismiss, duration]);

  const styles = variantStyles[variant];

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-md border shadow-lg ${styles.bg}`}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 ${styles.icon}`}>{icons[variant]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
