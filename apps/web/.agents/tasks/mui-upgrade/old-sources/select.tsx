"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "./lib/utils";
import { Icon } from "./icon";

/**
 * Material Design 3 — Exposed Dropdown Menu (Select)
 * https://m3.material.io/components/menus/specs#exposed-dropdown-menu
 *
 * An M3 "Exposed Dropdown Menu" is a TextField with a dropdown menu attached.
 * It uses the same visual container as TextField (56dp height, matching corner radius
 * per variant) with a trailing dropdown arrow that rotates when open.
 *
 * Two variants: filled and outlined (matching TextField).
 * Uses Radix DropdownMenu internally for the menu panel.
 */

export type SelectOption = {
  value: string;
  label: string;
  icon?: string;          // leading Material Symbols icon name
  trailingText?: string;  // trailing secondary text
  disabled?: boolean;
}

export type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  variant?: "filled" | "outlined";
  options: SelectOption[];
  disabled?: boolean;
  error?: boolean;
  errorText?: string;
  supportingText?: string;
  required?: boolean;
  /** Enable typeahead search input inside the dropdown */
  searchable?: boolean;
  className?: string;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Renders the label text with an optional required asterisk. */
function LabelText({ label, required }: { label: string; required: boolean }) {
  return (
    <>
      {label}
      {required && <span className="text-error ms-0.5">*</span>}
    </>
  );
}

/** Renders a single option item within the dropdown menu. */
function SelectOptionItem({
  option,
  isSelected,
  onSelect,
}: {
  option: SelectOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuPrimitive.Item
      key={option.value}
      disabled={option.disabled}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 h-12 px-3 text-[16px] leading-6 tracking-[0.5px] text-surface-foreground cursor-pointer select-none outline-none transition-colors",
        "hover:bg-[hsl(var(--on-surface)/0.08)] focus:bg-[hsl(var(--on-surface)/0.08)] active:bg-[hsl(var(--on-surface)/0.10)]",
        isSelected && "bg-surface-container-highest",
        "data-disabled:pointer-events-none data-disabled:opacity-[0.38] data-disabled:cursor-not-allowed"
      )}
    >
      {option.icon && (
        <Icon name={option.icon} size={24} className="text-surface-variant-foreground" />
      )}
      <span className="flex-1 truncate">{option.label}</span>
      {option.trailingText && (
        <span className="text-[14px] leading-5 text-surface-variant-foreground">
          {option.trailingText}
        </span>
      )}
      {isSelected && (
        <Icon name="check" size={24} className="text-primary" />
      )}
    </DropdownMenuPrimitive.Item>
  );
}

/** Renders the dropdown menu content with all options. */
function SelectMenu({
  options,
  currentValue,
  onSelect,
  searchable = false,
}: {
  options: SelectOption[];
  currentValue: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
}) {
  const [filter, setFilter] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = searchable && filter
    ? options.filter((o) =>
        o.label.toLowerCase().includes(filter.toLowerCase())
      )
    : options;

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align="start"
        side="bottom"
        sideOffset={4}
        className={cn(
          "z-50 min-w-28 max-w-70 w-(--radix-dropdown-menu-trigger-width) max-h-[min(var(--radix-dropdown-menu-content-available-height,300px),300px)] rounded bg-surface-container py-2 shadow-[0_3px_6px_hsl(var(--elevation-2)),0_1px_3px_hsl(var(--elevation-2))]",
          "m3-animate-menu",
          "flex flex-col"
        )}
        onCloseAutoFocus={() => setFilter("")}
        // When searchable: redirect any printable keystroke back to the
        // search input so typing always filters, even when an item is focused.
        onKeyDown={searchable ? (e) => {
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.focus();
            setFilter((f) => f + e.key);
          }
        } : undefined}
      >
        {searchable && (
          <div className="sticky top-0 z-10 px-3 pb-2 bg-surface-container">
            <div className="flex items-center gap-2 h-10 px-3 rounded-full bg-surface-container-high">
              <Icon name="search" size={20} className="shrink-0 text-[hsl(var(--on-surface-variant))]" />
              <input
                ref={inputRef}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-[14px] leading-5 tracking-[0.25px] text-surface-foreground placeholder:text-[hsl(var(--on-surface-variant))] outline-none"
                autoFocus
                // Stop Radix typeahead AND keyboard nav from firing while typing
                onKeyDown={(e) => e.stopPropagation()}
              />
              {filter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFilter("");
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  // Prevent Radix from moving focus away from the search input
                  onPointerDown={(e) => e.preventDefault()}
                  className="shrink-0 flex items-center justify-center size-6 rounded-full cursor-pointer text-[hsl(var(--on-surface-variant))] hover:bg-[hsl(var(--on-surface)/0.08)]"
                  aria-label="Clear search"
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="overflow-y-auto flex-1">
          {filteredOptions.map((option) => (
            <SelectOptionItem
              key={option.value}
              option={option}
              isSelected={option.value === currentValue}
              onSelect={() => onSelect(option.value)}
            />
          ))}
          {searchable && filteredOptions.length === 0 && (
            <div className="px-3 py-3 text-[14px] text-[hsl(var(--on-surface-variant))]">
            No results
          </div>
          )}
        </div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

// ─── Select Component ─────────────────────────────────────────────────────────

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      label,
      placeholder,
      variant = "outlined",
      options,
      disabled = false,
      error = false,
      errorText,
      supportingText,
      required = false,
      searchable = false,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
    const inputId = React.useId();
    const labelId = React.useId();
    const supportingId = React.useId();

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const selectedOption = options.find((o) => o.value === currentValue);
    const hasValue = !!selectedOption;

    const handleSelect = React.useCallback(
      (optionValue: string) => {
        if (!isControlled) {
          setInternalValue(optionValue);
        }
        onValueChange?.(optionValue);
      },
      [isControlled, onValueChange]
    );

    const displayedSupportingText = error && errorText ? errorText : supportingText;

    // ── Tokens ──────────────────────────────────────────────────────────────

    const labelColor = disabled
      ? "text-[hsl(var(--on-surface)/0.38)]"
      : error
        ? "text-[hsl(var(--error))]"
        : open
          ? "text-[hsl(var(--primary))]"
          : "text-[hsl(var(--on-surface-variant))]";

    // ── Filled Variant ──────────────────────────────────────────────────────

    if (variant === "filled") {
      return (
        <div className={cn("isolate", className)}>
          <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
            <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
              <button
                ref={ref}
                type="button"
                id={inputId}
                disabled={disabled}
                aria-required={required || undefined}
                aria-labelledby={label ? labelId : undefined}
                aria-describedby={displayedSupportingText ? supportingId : undefined}
                aria-invalid={error || undefined}
                className={cn(
                  "group relative flex items-center w-full h-14 overflow-hidden text-start",
                  "rounded-t rounded-b-none bg-surface-container-highest",
                  !disabled && "hover:before:absolute hover:before:inset-0 hover:before:bg-[hsl(var(--on-surface)/0.08)]",
                  disabled && "pointer-events-none cursor-not-allowed bg-[hsl(var(--on-surface)/0.04)]",
                  "outline-none"
                )}
              >
                {/* Content area */}
                <div className="relative flex-1 min-w-0 h-full flex items-center ps-4 pe-0">
                  {/* Selected value text */}
                  <span
                    className={cn(
                      "text-[16px] leading-6 tracking-[0.5px] truncate pt-6 pb-2",
                      hasValue
                        ? "text-[hsl(var(--on-surface))]"
                        : "text-[hsl(var(--on-surface-variant))]",
                      disabled && "text-[hsl(var(--on-surface)/0.38)]",
                      // Hide placeholder when label is in resting position (prevents overlap)
                      !hasValue && !open && label && "text-transparent"
                    )}
                  >
                    {selectedOption?.label ?? placeholder ?? ""}
                  </span>

                  {/* Label */}
                  {label && (
                    <span
                      id={labelId}
                      className={cn(
                        "absolute inset-s-4 pointer-events-none select-none",
                        "transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
                        hasValue || open
                          ? "top-2 translate-y-0 text-xs leading-4 tracking-[0.4px]"
                          : "top-1/2 -translate-y-1/2 text-[16px] leading-6 tracking-[0.5px]",
                        labelColor
                      )}
                    >
                      <LabelText label={label} required={required} />
                    </span>
                  )}
                </div>

                {/* Trailing icon */}
                <span
                  className={cn(
                    "shrink-0 flex items-center justify-center w-13 h-full pe-3 transition-transform duration-200",
                    open && "rotate-180",
                    error ? "text-[hsl(var(--error))]" : "text-[hsl(var(--on-surface-variant))]",
                    disabled && "text-[hsl(var(--on-surface)/0.38)]"
                  )}
                >
                  <Icon name="arrow_drop_down" size={24} />
                </span>

                {/* Active indicator */}
                <span
                  className={cn(
                    "absolute bottom-0 inset-x-0 pointer-events-none transition-[height,background-color] duration-200",
                    open
                      ? error
                        ? "h-0.5 bg-[hsl(var(--error))]"
                        : "h-0.5 bg-[hsl(var(--primary))]"
                      : error
                        ? "h-px bg-[hsl(var(--error))]"
                        : "h-px bg-[hsl(var(--on-surface))]",
                    disabled && "h-px bg-[hsl(var(--on-surface)/0.12)]"
                  )}
                />
              </button>
            </DropdownMenuPrimitive.Trigger>

            <SelectMenu
              options={options}
              currentValue={currentValue}
              onSelect={handleSelect}
              searchable={searchable}
            />
          </DropdownMenuPrimitive.Root>
          {(supportingText || (error && errorText)) && (
            <p
              id={supportingId}
              className={cn(
                "px-4 pt-1 text-[12px] leading-4 tracking-[0.4px]",
                error ? "text-[hsl(var(--error))]" : "text-[hsl(var(--on-surface-variant))]",
                disabled && "text-[hsl(var(--on-surface)/0.38)]"
              )}
            >
              {displayedSupportingText}
            </p>
          )}
        </div>
      );
    }

    // ── Outlined Variant ────────────────────────────────────────────────────

    // Compact mode: no label means shorter field (no notch needed)
    const isCompact = !label;

    return (
      <div className={cn("isolate", className)}>
        <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
          <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
            <button
              ref={ref}
              type="button"
              id={inputId}
              disabled={disabled}
              aria-required={required || undefined}
              aria-labelledby={label ? labelId : undefined}
              aria-describedby={displayedSupportingText ? supportingId : undefined}
              aria-invalid={error || undefined}
              className={cn(
                "group relative flex items-center w-full rounded text-start",
                isCompact ? "h-full" : "h-14",
                disabled && "pointer-events-none cursor-not-allowed",
                "outline-none"
              )}
            >
              {/* Border + notch */}
              <fieldset
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 rounded pointer-events-none m-0 px-0 z-2",
                  "-top-1.25 pt-1.25",
                  "transition-[border-color,border-width] duration-200",
                  open
                    ? error
                      ? "border-2 border-[hsl(var(--error))]"
                      : "border-2 border-[hsl(var(--primary))]"
                    : error
                      ? "border border-[hsl(var(--error))]"
                      : cn(
                          "border border-[hsl(var(--outline))]",
                          !disabled && "group-hover:border-[hsl(var(--on-surface))]"
                        ),
                  disabled && "border border-[hsl(var(--on-surface)/0.12)]"
                )}
              >
                {!isCompact && (
                  <legend
                    className={cn(
                      "h-2.75 block text-xs leading-2.75 ms-3",
                      "transition-[max-width,padding] duration-200",
                      hasValue || open ? "px-1 max-w-full" : "px-0 max-w-[0.01px]"
                    )}
                  >
                    <span className="invisible whitespace-nowrap">{label}{required && " *"}</span>
                  </legend>
                )}
              </fieldset>

              {/* Content area */}
              <div className={cn(
                "relative flex-1 min-w-0 h-full flex items-center pe-0",
                isCompact ? "ps-3" : "ps-4"
              )}>
                {/* Selected value text */}
                <span
                  className={cn(
                    "leading-6 tracking-[0.5px] truncate",
                    isCompact ? "text-[14px] py-1" : "text-[16px] py-4",
                    hasValue
                      ? "text-[hsl(var(--on-surface))]"
                      : "text-[hsl(var(--on-surface-variant))]",
                    disabled && "text-[hsl(var(--on-surface)/0.38)]",
                    // Hide placeholder when label is in resting position (prevents overlap)
                    !hasValue && !open && label && "text-transparent"
                  )}
                >
                  {selectedOption?.label ?? placeholder ?? ""}
                </span>

                {/* Label */}
                {label && (
                  <span
                    id={labelId}
                    className={cn(
                      "absolute inset-s-4 pointer-events-none select-none z-3",
                      "transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
                      hasValue || open
                        ? "top-0 -translate-y-1/2 text-xs leading-4 tracking-[0.4px]"
                        : "top-1/2 -translate-y-1/2 text-[16px] leading-6 tracking-[0.5px]",
                      labelColor
                    )}
                  >
                    <LabelText label={label} required={required} />
                  </span>
                )}
              </div>

              {/* Trailing icon */}
              <span
                className={cn(
                  "shrink-0 flex items-center justify-center h-full pe-2 transition-transform duration-200",
                  isCompact ? "w-8" : "w-13 pe-3",
                  open && "rotate-180",
                  error ? "text-[hsl(var(--error))]" : "text-[hsl(var(--on-surface-variant))]",
                  disabled && "text-[hsl(var(--on-surface)/0.38)]"
                )}
              >
                <Icon name="arrow_drop_down" size={isCompact ? 20 : 24} />
              </span>
            </button>
          </DropdownMenuPrimitive.Trigger>

          <SelectMenu
            options={options}
            currentValue={currentValue}
            onSelect={handleSelect}
            searchable={searchable}
          />
        </DropdownMenuPrimitive.Root>
        {(supportingText || (error && errorText)) && (
          <p
            className={cn(
              "px-4 pt-1 text-[12px] leading-4 tracking-[0.4px]",
              error ? "text-[hsl(var(--error))]" : "text-[hsl(var(--on-surface-variant))]",
              disabled && "text-[hsl(var(--on-surface)/0.38)]"
            )}
          >
            {displayedSupportingText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
