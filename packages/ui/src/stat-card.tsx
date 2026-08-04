"use client";

import React from "react";
import { motion } from "motion/react";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

const trendConfig = {
  up: { color: "text-green-600 dark:text-green-400", arrow: "↑" },
  down: { color: "text-red-600 dark:text-red-400", arrow: "↓" },
  neutral: { color: "text-muted-foreground", arrow: "→" },
};

export function StatCard({ title, value, subtitle, trend, icon }: StatCardProps) {
  return (
    <motion.div
      className="rounded-md border border-border bg-card p-card"
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {icon && (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span className={`text-sm font-medium ${trendConfig[trend].color}`}>
              {trendConfig[trend].arrow}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
