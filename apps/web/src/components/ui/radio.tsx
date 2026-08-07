"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Radio Button
 *
 * M3 Specs (m3.material.io/components/radio-button/specs):
 * - Outer circle: 20px diameter, 2px border
 * - Inner circle (selected): 10px diameter, primary color
 * - Touch target: 48px
 * - State layer: 40px circle
 * - Unselected: on-surface-variant border
 * - Selected: primary border + primary fill dot
 * - Disabled: 38% opacity
 * - Transition: 200ms
 */

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, checked, disabled, onChange, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex items-center justify-center w-12 h-12 cursor-pointer select-none group",
          disabled && "cursor-not-allowed opacity-38",
          className
        )}
      >
        {/* State layer — 40px circle */}
        <span className="absolute w-10 h-10 rounded-full transition-colors duration-200 group-hover:bg-primary/8" />

        {/* Hidden native input */}
        <input
          type="radio"
          ref={ref}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
          {...props}
        />

        {/* Outer circle — 20px, 2px border */}
        <span
          className={cn(
            "relative z-10 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200",
            checked
              ? "border-primary"
              : "border-[hsl(var(--on-surface-variant))]"
          )}
        >
          {/* Inner dot — 10px, scales in on select */}
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full bg-primary transition-transform duration-200",
              checked ? "scale-100" : "scale-0"
            )}
          />
        </span>
      </label>
    );
  }
);
Radio.displayName = "Radio";

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Name shared across all radios in the group */
  name?: string;
  /** Current value */
  value?: string;
  /** Change handler */
  onValueChange?: (value: string) => void;
  /** Orientation for a11y */
  orientation?: "horizontal" | "vertical";
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, orientation = "vertical", children, name, value, onValueChange, ...props }, ref) => (
    <div
      ref={ref}
      role="radiogroup"
      aria-orientation={orientation}
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "flex-row gap-2",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<RadioProps>(child)) {
          return React.cloneElement(child, {
            name,
            checked: value !== undefined ? child.props.value === value : undefined,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              onValueChange?.(e.target.value);
              child.props.onChange?.(e);
            },
          } as Partial<RadioProps>);
        }
        return child;
      })}
    </div>
  )
);
RadioGroup.displayName = "RadioGroup";

export { Radio, RadioGroup };
