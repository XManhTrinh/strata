"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { TextField } from "@vkieu/mui";
import { cn } from "@/lib/utils";

// ─── Preset palette ─────────────────────────────────────────────────────────────

export const M3_PALETTE = [
  "#F44336", "#E91E63", "#AB47BC", "#7E57C2",
  "#5C6BC0", "#42A5F5", "#26C6DA", "#26A69A",
  "#66BB6A", "#FFA726", "#F59E0B", "#8D6E63",
  "#6366F1", "#8B5CF6", "#0EA5E9", "#14B8A6",
  "#3B82F6", "#10B981", "#EF4444", "#EC4899",
  "#D4E157", "#FFEE58", "#FF7043", "#9CCC65",
  "#78909C", "#546E7A", "#37474F", "#84CC16",
  "#A855F7", "#06B6D4", "#EC407A", "#29B6F6",
];

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  /** Compact mode: small inline swatch button instead of TextField. */
  compact?: boolean;
  label?: string;
  extraColors?: string[];
  columns?: number;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ColorPicker({
  value,
  onChange,
  compact = false,
  label = "Color",
  extraColors,
  columns = 8,
  className,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allColors = extraColors ? [...extraColors, ...M3_PALETTE] : M3_PALETTE;

  useEffect(() => { if (!open) setHexInput(value); }, [value, open]);

  // Portal target
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const dialog = anchorRef.current.closest("[data-radix-dialog-content]") ?? anchorRef.current.closest("[role='dialog']");
    setPortalTarget((dialog as HTMLElement) ?? document.body);
  }, [open]);

  // Close on outside click
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

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Position
  useEffect(() => {
    if (!open || !anchorRef.current || !panelRef.current) return;
    const el = anchorRef.current.querySelector("fieldset") ?? anchorRef.current;
    const r = el.getBoundingClientRect();
    const p = panelRef.current;
    p.style.position = "fixed";
    p.style.zIndex = "9999";
    p.style.left = `${r.left}px`;
    p.style.width = `${Math.max(r.width, 246)}px`;
    p.style.top = `${r.bottom}px`;
  });

  // Scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.stopPropagation();
    if (scrollRef.current) scrollRef.current.scrollTop += e.deltaY;
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [open, handleWheel, portalTarget]);

  const swatchGrid = (
    <div ref={scrollRef} className="p-2 max-h-40 overflow-y-auto">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {allColors.map((color) => {
          const isSelected = value.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              aria-label={`Select color ${color}`}
              onClick={() => { onChange(color); setHexInput(color); setOpen(false); }}
              className={cn(
                "aspect-square rounded-full border-2 transition-all duration-150 cursor-pointer",
                isSelected
                  ? "border-primary scale-110 shadow-md ring-2 ring-primary/30"
                  : "border-transparent hover:scale-115 hover:shadow-lg active:scale-95",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );

  const panel = open && portalTarget ? (
    <div ref={panelRef} className={cn(
      "bg-surface-container border border-outline-variant shadow-lg pointer-events-auto",
      compact ? "rounded-xl" : "rounded-b-xl border-t-0",
    )}>
      {swatchGrid}
    </div>
  ) : null;

  // ── Compact mode ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <button
          ref={anchorRef as unknown as React.RefObject<HTMLButtonElement>}
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className={cn("w-5 h-5 rounded-full shrink-0 cursor-pointer hover:opacity-70 transition-opacity", className)}
          style={{ backgroundColor: value }}
          title={`Color: ${value}`}
        />
        {portalTarget && createPortal(panel, portalTarget)}
      </>
    );
  }

  // ── Full mode ───────────────────────────────────────────────────────────
  return (
    <>
      <div ref={anchorRef} className={className}>
        <TextField
          variant="outlined"
          label={label}
          className="w-full"
          value={hexInput}
          onChange={(value) => {
            const v = value;
            setHexInput(v);
            const hex = v.startsWith("#") ? v : `#${v}`;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) onChange(hex);
          }}
          onFocus={() => setOpen(true)}
          placeholder="#000000"
          leadingIcon={
            <div
              className="w-6 h-6 rounded-full border-2 border-outline-variant/30 shadow-sm"
              style={{ backgroundColor: value }}
            />
          }
        />
      </div>
      {portalTarget && createPortal(panel, portalTarget)}
    </>
  );
}
