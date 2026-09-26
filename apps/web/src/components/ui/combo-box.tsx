"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TextField } from "@vkieu/mui";
import { cn } from "@/lib/utils";

export interface ComboBoxProps {
  /** Current text value. */
  value: string;
  /** Fires on every keystroke and on option selection (free-form allowed). */
  onChange: (value: string) => void;
  /** Known values offered as suggestions; the user may still type anything. */
  options: string[];
  label?: string;
  placeholder?: string;
  /** Cap the number of suggestions shown. */
  maxOptions?: number;
  className?: string;
}

const DEFAULT_MAX_OPTIONS = 50;

/**
 * A single-control combobox: an MUI TextField for free-form typing with a
 * portalled dropdown of matching known values attached below it. Unlike a
 * Select, the user can enter values that aren't in the list (e.g. partial
 * strings for CONTAINS/STARTS_WITH); the dropdown just offers autocomplete.
 *
 * @vkieu/mui has no combobox, so this composes MUI's TextField with a small
 * suggestion panel (steering allows local components where the library lacks
 * one). Styled with M3 surface tokens to match the library.
 */
export function ComboBox({
  value,
  onChange,
  options,
  label,
  placeholder,
  maxOptions = DEFAULT_MAX_OPTIONS,
  className,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();
  const matches = options.filter((o) => (query ? o.toLowerCase().includes(query) : true));
  // Nothing useful to suggest when the only match is exactly what's typed.
  const onlyExact = matches.length === 1 && matches[0].toLowerCase() === query;
  const filtered = onlyExact ? [] : matches.slice(0, maxOptions);

  // Portal target: prefer the enclosing dialog so the panel isn't clipped.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const dialog =
      anchorRef.current.closest("[data-radix-dialog-content]") ??
      anchorRef.current.closest("[role='dialog']");
    setPortalTarget((dialog as HTMLElement) ?? document.body);
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Position the panel under the field (fixed, follows the anchor).
  const position = useCallback(() => {
    if (!open || !anchorRef.current || !panelRef.current) return;
    const el = anchorRef.current.querySelector("fieldset") ?? anchorRef.current;
    const r = el.getBoundingClientRect();
    const p = panelRef.current;
    p.style.position = "fixed";
    p.style.zIndex = "9999";
    p.style.left = `${r.left}px`;
    p.style.width = `${r.width}px`;
    p.style.top = `${r.bottom + 2}px`;
  }, [open]);
  useEffect(() => {
    position();
  });

  // The panel is portalled into the scrollable dialog body, so wheel events
  // over it bubble up and scroll the dialog instead. Redirect them to the
  // panel's own scroll area.
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!scrollRef.current) return;
    e.stopPropagation();
    scrollRef.current.scrollTop += e.deltaY;
  }, []);
  useEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [open, handleWheel, portalTarget, filtered.length]);

  const showPanel = open && portalTarget && filtered.length > 0;

  const panel = showPanel ? (
    <div
      ref={panelRef}
      className="bg-surface-container border border-outline-variant rounded-xl shadow-lg pointer-events-auto overflow-hidden"
    >
      <div ref={scrollRef} className="max-h-52 overflow-y-auto py-1">
        {filtered.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              onChange(o);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center px-3 h-10 text-[14px] text-surface-foreground text-left cursor-pointer transition-colors",
              "hover:bg-[hsl(var(--on-surface)/0.08)]",
              o === value && "bg-surface-container-highest",
            )}
          >
            <span className="truncate">{o}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div ref={anchorRef} className={className}>
        <TextField
          variant="outlined"
          label={label}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {portalTarget && createPortal(panel, portalTarget)}
    </>
  );
}
