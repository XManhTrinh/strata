"use client";

import React from "react";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ className = "", variant = "text" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-muted";

  const variantClasses: Record<string, string> = {
    text: "rounded-sm h-4 w-full",
    circular: "rounded-full h-10 w-10",
    rectangular: "rounded-md h-20 w-full",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
