"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@vkieu/mui";
import { cn } from "@/lib/utils";

import { ICON_OPTIONS } from "./icon-picker";
import { M3_PALETTE } from "./color-picker";

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface IconColorPickerProps {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function IconColorPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
  className,
}: IconColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"icon" | "color">("icon");
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredIcons = search
    ? ICON_OPTIONS.filter((i) => i.includes(search.toLowerCase().replace(/\s+/g, "_")))
    : ICON_OPTIONS;

  // Close when clicking outside the container
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll handler for Radix dialog compat
  const handleWheel = useCallback((e: WheelEvent) => {
    e.stopPropagation();
    if (scrollRef.current) scrollRef.current.scrollTop += e.deltaY;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!open || !el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [open, handleWheel]);

  // Focus search input when opening icon tab
  useEffect(() => {
    if (open && tab === "icon") {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, tab]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ zIndex: open ? 50 : undefined }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center justify-center w-6 h-6 shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
        title={`${icon} · ${color}`}
      >
        <span className="material-symbols-rounded text-[18px]" style={{ color }}>{icon || "help"}</span>
      </button>

      {/* Panel — rendered inline, positioned absolute */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-61.5 rounded-xl bg-surface-container border border-outline-variant shadow-xl z-50">
          {/* Tabs */}
          <div className="flex border-b border-outline-variant/50">
            <button
              type="button"
              onClick={() => { setTab("icon"); setSearch(""); }}
              className={cn(
                "flex-1 py-2 text-[12px] font-medium transition-colors",
                tab === "icon"
                  ? "text-primary border-b-2 border-primary"
                  : "text-surface-variant-foreground hover:text-surface-foreground",
              )}
            >
              Icon
            </button>
            <button
              type="button"
              onClick={() => { setTab("color"); setSearch(""); }}
              className={cn(
                "flex-1 py-2 text-[12px] font-medium transition-colors",
                tab === "color"
                  ? "text-primary border-b-2 border-primary"
                  : "text-surface-variant-foreground hover:text-surface-foreground",
              )}
            >
              Color
            </button>
          </div>

          {/* Search (icon tab) */}
          {tab === "icon" && (
            <div className="px-2 pt-2 pb-1">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons..."
                className="w-full h-7 px-2 text-[12px] text-surface-foreground bg-surface rounded-md border border-outline-variant/50 outline-none focus:border-primary placeholder:text-surface-variant-foreground/60"
              />
            </div>
          )}

          {/* Content */}
          <div ref={scrollRef} className="overflow-y-auto p-1.5" style={{ maxHeight: 180 }}>
            {tab === "icon" && (
              <div className="grid grid-cols-7 gap-0.5">
                {filteredIcons.map((ic) => {
                  const isSelected = icon === ic;
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => onIconChange(ic)}
                      className={cn(
                        "flex items-center justify-center aspect-square rounded-lg transition-colors duration-100 cursor-pointer",
                        isSelected
                          ? "bg-primary/12 ring-2 ring-primary"
                          : "hover:bg-[hsl(var(--on-surface)/0.08)] active:bg-[hsl(var(--on-surface)/0.12)]",
                      )}
                      title={ic.replace(/_/g, " ")}
                    >
                      <Icon name={ic} size={18} className={isSelected ? "text-primary" : "text-surface-foreground"} />
                    </button>
                  );
                })}
                {filteredIcons.length === 0 && (
                  <p className="col-span-7 text-center text-[11px] text-surface-variant-foreground py-4">No icons found</p>
                )}
              </div>
            )}

            {tab === "color" && (
              <div className="grid grid-cols-8 gap-1.5">
                {M3_PALETTE.map((c) => {
                  const isSelected = color.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onColorChange(c)}
                      className={cn(
                        "aspect-square rounded-full border-2 transition-all duration-150 cursor-pointer",
                        isSelected
                          ? "border-primary scale-110 shadow-md ring-2 ring-primary/30"
                          : "border-transparent hover:scale-115 hover:shadow-lg active:scale-95",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
