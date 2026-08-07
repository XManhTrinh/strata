"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Switch
 *
 * M3 Specs (m3.material.io/components/switch/specs):
 * - Track: 52px × 32px, border-radius 16px (default)
 * - Track: 40px × 24px, border-radius 12px (small)
 * - Thumb (off): 16px diameter, outline color (default); 12px (small)
 * - Thumb (on): 24px diameter, on-primary color (default); 18px (small)
 * - Track (off): surface-container-highest with 2px outline border
 * - Track (on): primary fill
 * - State layer: 40px circle on thumb
 * - Touch target: 48px
 * - Transition: 200ms
 * - Icon support: optional checkmark/x inside thumb (18px)
 */

const switchVariants = cva("", {
  variants: {
    size: {
      default: "",
      small: "",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size">,
    VariantProps<typeof switchVariants> {
  /** Show icons inside thumb (checkmark when on, x when off) */
  showIcons?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, defaultChecked, onChange, disabled, showIcons = false, size = "default", ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);
    const controlled = checked !== undefined;
    const active = controlled ? checked : isChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setIsChecked(e.target.checked);
      onChange?.(e);
    };

    const isSmall = size === "small";

    // Dimensions based on size
    const trackWidth = isSmall ? "w-10" : "w-[52px]";
    const trackHeight = isSmall ? "h-6" : "h-8";
    const trackRadius = isSmall ? "rounded-xl" : "rounded-2xl";

    const thumbOnSize = isSmall ? 14 : 24;
    const thumbOffSize = isSmall ? 10 : 16;
    const thumbOnX = isSmall ? 20 : 26;
    const thumbOffX = isSmall ? 5 : 6;

    const iconSize = isSmall ? 12 : 18;

    return (
      <label
        className={cn(
          "relative inline-flex items-center justify-center cursor-pointer select-none",
          isSmall ? "w-10 h-10" : "w-12 h-12",
          disabled && "cursor-not-allowed opacity-38",
          className
        )}
      >
        {/* Hidden input */}
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          aria-checked={active}
          checked={active}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />

        {/* Track */}
        <span
          className={cn(
            "relative transition-colors duration-200",
            trackWidth,
            trackHeight,
            trackRadius,
            active
              ? "bg-primary"
              : "bg-surface-variant border-2 border-outline"
          )}
        >
          {/* Thumb */}
          <motion.span
            className={cn(
              "absolute top-1/2 flex items-center justify-center rounded-full transition-colors duration-200",
              active
                ? "bg-[hsl(var(--on-primary))]"
                : "bg-outline"
            )}
            animate={{
              width: active ? thumbOnSize : thumbOffSize,
              height: active ? thumbOnSize : thumbOffSize,
              x: active ? thumbOnX : thumbOffX,
              y: "-50%",
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {/* Icons inside thumb */}
            {showIcons && active && (
              <Icon name="check" size={iconSize as 18 | 20 | 24 | 40 | 48} className="text-[hsl(var(--on-primary-container))]" />
            )}
            {showIcons && !active && (
              <Icon name="close" size={iconSize as 18 | 20 | 24 | 40 | 48} className="text-surface-variant" />
            )}
          </motion.span>
        </span>
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch, switchVariants };
