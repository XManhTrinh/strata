"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Card sub-components.
 *
 * Provides layout primitives for composing card content:
 * CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
 *
 * Use these inside a Card component (from @vkieu/windmorph or a local wrapper).
 */

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 px-4 pt-4 pb-2", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-[16px] font-medium leading-6 tracking-[0.15px] text-start",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-[14px] leading-5 tracking-[0.25px] text-on-surface-variant text-start",
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center px-4 pb-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
