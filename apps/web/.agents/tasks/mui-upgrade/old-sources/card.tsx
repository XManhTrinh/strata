"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";

/**
 * Material Design 3 Card
 *
 * M3 Specs (m3.material.io/components/cards/specs):
 * - 3 variants: elevated, filled, outlined
 * - Elevated: bg surface-container-low, Level 1 shadow, no border
 * - Filled: bg surface-container-highest, no border, no elevation
 * - Outlined: bg surface, border outline-variant, no elevation
 * - Corner radius: 12dp
 * - Left/right padding: 16dp
 * - States (interactive): 8% hover, 10% focus, 10% press state layers
 * - Disabled (interactive): 38% opacity
 * - Dragged: 16% state layer + elevated shadow
 *
 * @m3-audit VERIFIED — CardHeader, CardTitle, CardDescription, CardContent, CardFooter all present.
 * Recommendation: Consider adding a CardMedia sub-component for M3's image/media slot
 * (positioned between CardHeader and CardContent). Low priority — current API is fully functional.
 */
const cardVariants = cva(
  "relative rounded-xl text-surface-foreground transition-[box-shadow,background-color] duration-200",
  {
    variants: {
      variant: {
        elevated:
          "bg-surface-container-low shadow-[0_1px_3px_1px_hsl(var(--elevation-1)),0_1px_2px_0_hsl(var(--elevation-1))]",
        filled: "bg-surface-container-highest",
        outlined: "bg-surface border border-outline-variant",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    compoundVariants: [
      {
        interactive: true,
        variant: "elevated",
        className:
          "hover:shadow-[0_2px_6px_2px_hsl(var(--elevation-2)),0_1px_2px_0_hsl(var(--elevation-2))]",
      },
    ],
    defaultVariants: {
      variant: "elevated",
      interactive: false,
    },
  }
);

export type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>& {
  /** Card style variant */
  variant?: "elevated" | "filled" | "outlined";
  /** Adds state layers + cursor-pointer for clickable cards */
  interactive?: boolean;
  /** Disabled state for interactive cards (M3: 38% opacity, no interaction) */
  disabled?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive = false, disabled = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, interactive }),
        interactive &&
          "before:absolute before:inset-0 before:rounded-xl before:transition-colors before:duration-200 before:pointer-events-none hover:before:bg-[hsl(var(--on-surface)/0.08)] focus-visible:before:bg-[hsl(var(--on-surface)/0.10)] active:before:bg-[hsl(var(--on-surface)/0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        interactive && disabled && "opacity-[0.38] pointer-events-none cursor-not-allowed shadow-none before:opacity-0!",
        className
      )}
      tabIndex={interactive && !disabled ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-disabled={interactive && disabled ? true : undefined}
      {...props}
    />
  )
);
Card.displayName = "Card";

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
      "text-[14px] leading-5 tracking-[0.25px] text-surface-variant-foreground text-start",
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

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
