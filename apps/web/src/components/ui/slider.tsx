"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Slider
 *
 * M3 Specs (m3.material.io/components/sliders/specs):
 * - Track height: 4px (inactive), 4px (active)
 * - Track corner radius: 2px
 * - Thumb: 20px diameter (at rest), 28px (pressed)
 * - Thumb color: primary
 * - Active track: primary
 * - Inactive track: secondary-container
 * - Touch target: 48px
 * - State layer: 40px on thumb
 * - Value label (tooltip): appears on drag
 */

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Show value label above thumb on interaction */
  showValueLabel?: boolean;
  /** Format the value label */
  formatLabel?: (value: number) => string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue,
      onChange,
      showValueLabel = false,
      formatLabel,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      Number(defaultValue ?? min)
    );
    const [isDragging, setIsDragging] = React.useState(false);
    const controlled = value !== undefined;
    const currentValue = controlled ? Number(value) : internalValue;

    const percentage =
      ((currentValue - Number(min)) / (Number(max) - Number(min))) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setInternalValue(Number(e.target.value));
      onChange?.(e);
    };

    return (
      <div
        className={cn(
          "relative flex items-center w-full h-12 select-none",
          disabled && "opacity-38 pointer-events-none",
          className
        )}
      >
        {/* Value label */}
        {showValueLabel && isDragging && (
          <div
            className="absolute -top-8 transform -translate-x-1/2 bg-[hsl(var(--on-surface))] text-[hsl(var(--surface))] text-[12px] leading-4 px-2 py-1 rounded-[4px] pointer-events-none z-10"
            style={{ left: `${percentage}%` }}
          >
            {formatLabel ? formatLabel(currentValue) : currentValue}
          </div>
        )}

        {/* Track background */}
        <div className="relative w-full h-1 rounded-full bg-secondary-container">
          {/* Active track */}
          <div
            className="absolute h-full rounded-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Native range input (hidden visually but functional) */}
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
          disabled={disabled}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
            "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5"
          )}
          {...props}
        />

        {/* Visual thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-150",
            isDragging ? "w-7 h-7" : "w-5 h-5",
            "rounded-full bg-primary shadow-md"
          )}
          style={{ left: `${percentage}%` }}
        >
          {/* State layer */}
          <span
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full transition-colors",
              isDragging && "bg-primary/[0.12]"
            )}
          />
        </div>
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
