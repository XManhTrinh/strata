"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean;
}

/**
 * Material Design 3 Checkbox
 *
 * Specs (m3.material.io/components/checkbox/specs):
 * - Container: 18×18px with 2px border radius
 * - State layer: 40×40px (touch target 48×48px)
 * - Unchecked: 2px border, on-surface-variant color
 * - Checked: primary fill, white checkmark icon (12px)
 * - Disabled: 38% opacity
 * - Transition: 200ms for state layer, 150ms for check animation
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, checked, onChange, disabled, id, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const [isChecked, setIsChecked] = React.useState(checked ?? false);

    React.useImperativeHandle(ref, () => innerRef.current!);

    React.useEffect(() => {
      if (checked !== undefined) setIsChecked(checked);
    }, [checked]);

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) setIsChecked(e.target.checked);
      onChange?.(e);
    };

    const active = indeterminate || isChecked;

    return (
      <label
        htmlFor={id}
        className={cn(
          "relative inline-flex items-center justify-center w-12 h-12 cursor-pointer select-none",
          disabled && "cursor-not-allowed opacity-38",
          className
        )}
      >
        {/* State layer — 40px circle */}
        <span
          className={cn(
            "absolute w-10 h-10 rounded-full transition-colors duration-200",
            !active && "group-hover:bg-[hsl(var(--on-surface-variant)/0.08)]",
            active && "group-hover:bg-[hsl(var(--primary)/0.08)]"
          )}
        />

        {/* Hidden native input */}
        <input
          type="checkbox"
          ref={innerRef}
          id={id}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />

        {/* Visual container — 18×18px, 2px border radius */}
        <span
          className={cn(
            "relative z-10 flex items-center justify-center w-[18px] h-[18px] rounded-sm transition-all duration-150",
            !active && "border-2 border-[hsl(var(--on-surface-variant))] bg-transparent",
            active && "border-0 bg-primary"
          )}
        >
          {/* Checkmark / Indeterminate dash */}
          {active && (
            <svg
              className="w-3 h-3 text-primary-foreground"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {indeterminate ? (
                <line x1="2" y1="6" x2="10" y2="6" />
              ) : (
                <polyline points="2 6.5 4.5 9 10 3" />
              )}
            </svg>
          )}
        </span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
