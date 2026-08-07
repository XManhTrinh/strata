"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Text Field
 *
 * M3 Specs (m3.material.io/components/text-fields/specs):
 * - Variants: filled and outlined
 * - Filled: 56px height, surface-container-highest bg, rounded-t-[4px], flat bottom with 1px indicator line
 * - Outlined: 56px height, transparent bg, 1px outline border, rounded-[4px]
 * - Label: floats up when focused/filled, Body Small when floating, Body Large when placeholder
 * - Supporting text: below field, 16px padding-top
 * - Error state: error color indicator/border + error icon
 * - Leading/trailing icons: 48px touch target area
 * - Font: Body Large (16px/24px) for input text
 */

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Variant style */
  variant?: "filled" | "outlined";
  /** Label text (floats on focus/fill) */
  label?: string;
  /** Supporting/helper text below the field */
  supportingText?: string;
  /** Error state */
  error?: boolean;
  /** Error message (replaces supportingText on error) */
  errorText?: string;
  /** Leading icon name */
  leadingIcon?: string;
  /** Trailing icon name */
  trailingIcon?: string;
  /** Callback when trailing icon is clicked */
  onTrailingIconClick?: () => void;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      className,
      variant = "filled",
      label,
      supportingText,
      error = false,
      errorText,
      leadingIcon,
      trailingIcon,
      onTrailingIconClick,
      disabled,
      value,
      defaultValue,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(
      Boolean(value || defaultValue)
    );

    const isFloating = isFocused || hasValue;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    React.useEffect(() => {
      setHasValue(Boolean(value));
    }, [value]);

    const helperText = error && errorText ? errorText : supportingText;

    return (
      <div className={cn("w-full", className)}>
        {/* Field container */}
        <div
          className={cn(
            "relative flex items-center h-14",
            variant === "filled" && [
              "rounded-t-[4px] bg-surface-variant",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px",
              error
                ? "after:bg-error after:h-0.5"
                : isFocused
                  ? "after:bg-primary after:h-0.5"
                  : "after:bg-surface-variant-foreground",
            ],
            variant === "outlined" && [
              "rounded-[4px] border bg-transparent transition-colors",
              error
                ? "border-error border-2"
                : isFocused
                  ? "border-primary border-2"
                  : "border-outline",
            ],
            disabled && "opacity-38 pointer-events-none"
          )}
        >
          {/* Leading icon */}
          {leadingIcon && (
            <div className="flex items-center justify-center w-12 h-12 shrink-0 ml-1">
              <Icon
                name={leadingIcon}
                size={24}
                className={cn(
                  error ? "text-error" : "text-surface-variant-foreground"
                )}
              />
            </div>
          )}

          {/* Input area */}
          <div className={cn("relative flex-1 h-full", !leadingIcon && "pl-4", !trailingIcon && "pr-4")}>
            {/* Floating label */}
            {label && (
              <label
                className={cn(
                  "absolute left-0 pointer-events-none transition-all duration-200 origin-top-left",
                  isFloating
                    ? "top-2 text-[12px] leading-4"
                    : "top-1/2 -translate-y-1/2 text-[16px] leading-6",
                  error
                    ? "text-error"
                    : isFocused
                      ? "text-primary"
                      : "text-surface-variant-foreground"
                )}
              >
                {label}
              </label>
            )}

            {/* Input */}
            <input
              ref={ref}
              value={value}
              defaultValue={defaultValue}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              disabled={disabled}
              className={cn(
                "w-full h-full bg-transparent text-[16px] leading-6 text-surface-foreground outline-none",
                label && isFloating && "pt-5",
                label && !isFloating && "placeholder:text-transparent"
              )}
              {...props}
            />
          </div>

          {/* Trailing icon */}
          {trailingIcon && (
            <button
              type="button"
              onClick={onTrailingIconClick}
              tabIndex={-1}
              className="flex items-center justify-center w-12 h-12 shrink-0 mr-1 rounded-full"
            >
              <Icon
                name={error ? "error" : trailingIcon}
                size={24}
                className={cn(
                  error ? "text-error" : "text-surface-variant-foreground"
                )}
              />
            </button>
          )}

          {/* Error icon when no trailing icon specified */}
          {error && !trailingIcon && (
            <div className="flex items-center justify-center w-12 h-12 shrink-0 mr-1">
              <Icon name="error" size={24} className="text-error" />
            </div>
          )}
        </div>

        {/* Supporting text */}
        {helperText && (
          <p
            className={cn(
              "mt-1 px-4 text-[12px] leading-4",
              error ? "text-error" : "text-surface-variant-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
TextField.displayName = "TextField";

export { TextField };
