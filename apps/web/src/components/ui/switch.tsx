"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Switch
 *
 * M3 Specs (m3.material.io/components/switch/specs):
 * - Track: 52px × 32px, border-radius 16px
 * - Thumb (off): 16px diameter, outline color
 * - Thumb (on): 24px diameter, on-primary color
 * - Track (off): surface-container-highest with 2px outline border
 * - Track (on): primary fill
 * - State layer: 40px circle on thumb
 * - Touch target: 48px
 * - Transition: 200ms
 * - Icon support: optional checkmark/x inside thumb (18px)
 */

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Show icons inside thumb (checkmark when on, x when off) */
  showIcons?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, defaultChecked, onChange, disabled, showIcons = false, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);
    const controlled = checked !== undefined;
    const active = controlled ? checked : isChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setIsChecked(e.target.checked);
      onChange?.(e);
    };

    return (
      <label
        className={cn(
          "relative inline-flex items-center justify-center w-12 h-12 cursor-pointer select-none",
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

        {/* Track — 52×32px */}
        <span
          className={cn(
            "relative w-[52px] h-8 rounded-2xl transition-colors duration-200",
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
              width: active ? 24 : 16,
              height: active ? 24 : 16,
              x: active ? 26 : 6,
              y: "-50%",
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {/* Icons inside thumb */}
            {showIcons && active && (
              <Icon name="check" size={18} className="text-[hsl(var(--on-primary-container))]" />
            )}
            {showIcons && !active && (
              <Icon name="close" size={18} className="text-surface-variant" />
            )}
          </motion.span>
        </span>
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
