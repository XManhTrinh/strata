"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@vkieu/windmorph";
import { cn } from "@/lib/utils";

// ─── Curated Material Symbols ───────────────────────────────────────────────────

export const ICON_OPTIONS = [
  // Organization & Hierarchy (most relevant first)
  "corporate_fare", "domain", "apartment", "hub", "lan", "account_tree",
  "schema", "device_hub", "groups", "group", "people", "person",
  "diversity_3", "supervised_user_circle", "engineering", "badge",
  // Buildings & Places
  "business", "storefront", "factory", "warehouse", "cottage", "home",
  "local_hospital", "museum", "church",
  // Structure & Layout
  "share", "grid_view", "view_module", "dashboard", "widgets",
  // Work & Business
  "work", "business_center", "cases", "inventory_2", "package_2",
  "local_shipping", "conveyor_belt", "precision_manufacturing",
  // People & Teams
  "family_restroom", "support_agent", "headset_mic",
  "school", "psychology", "face",
  // Tech & Development
  "terminal", "code", "developer_board", "memory", "dns", "storage",
  "database", "data_object", "api", "cloud", "cloud_sync",
  "smart_toy", "biotech", "science", "calculate",
  // Communication
  "email", "chat", "forum", "notifications", "campaign", "podcasts",
  "call", "contact_phone", "mark_email_read",
  // Finance
  "payments", "credit_card", "account_balance", "attach_money", "savings",
  "receipt_long", "request_quote", "currency_exchange",
  // Analytics & Charts
  "analytics", "insights", "monitoring", "stacked_bar_chart",
  "bar_chart", "pie_chart", "trending_up", "leaderboard", "query_stats",
  // Security
  "shield", "security", "lock", "verified_user", "admin_panel_settings",
  "gpp_good", "privacy_tip", "key",
  // Files & Content
  "folder", "description", "article", "menu_book", "library_books",
  "topic", "source", "snippet_folder",
  // Tools & Settings
  "settings", "build", "handyman", "construction", "tune",
  "manufacturing", "plumbing", "electrical_services",
  // Navigation & Location
  "public", "language", "travel_explore", "explore", "map", "pin_drop",
  // Time & Calendar
  "event", "calendar_month", "schedule", "timer", "history", "update",
  // Status & Feedback
  "favorite", "star", "lightbulb", "eco", "rocket_launch",
  "flag", "bookmark", "label", "sell",
  // Media
  "image", "photo_camera", "videocam", "mic", "headphones",
  // Shapes
  "extension", "category", "interests", "token", "hexagon",
  "circle", "square", "change_history", "pentagon",
];

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  /** Color to tint the icon preview. */
  color?: string;
  /** Compact mode: small inline button instead of TextField. */
  compact?: boolean;
  label?: string;
  placeholder?: string;
  extraIcons?: string[];
  columns?: number;
  className?: string;
}

// ─── Shared panel & positioning hook ────────────────────────────────────────────

function usePickerPanel(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const dialog = anchorRef.current.closest("[data-radix-dialog-content]") ?? anchorRef.current.closest("[role='dialog']");
    setPortalTarget((dialog as HTMLElement) ?? document.body);
  }, [open, anchorRef]);

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

  return { panelRef, scrollRef, portalTarget };
}

function useClickOutside(
  open: boolean,
  refs: React.RefObject<HTMLElement | null>[],
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (refs.some((r) => r.current?.contains(t))) return;
      onClose();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, refs, onClose]);
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function IconPicker({
  value,
  onChange,
  color,
  compact = false,
  label = "Icon",
  placeholder = "Search icons...",
  extraIcons,
  columns = 7,
  className,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { panelRef, scrollRef, portalTarget } = usePickerPanel(open, anchorRef);

  const allIcons = extraIcons ? [...extraIcons, ...ICON_OPTIONS] : ICON_OPTIONS;
  const filtered = search
    ? allIcons.filter((i) => i.includes(search.toLowerCase().replace(/\s+/g, "_")))
    : allIcons;

  const close = useCallback(() => { setOpen(false); setSearch(""); }, []);
  useClickOutside(open, [anchorRef, panelRef], close);

  const iconGrid = (
    <div
      ref={scrollRef}
      className="overflow-y-auto p-1.5"
      style={{ maxHeight: 210 }}
    >
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {filtered.map((icon) => {
          const isSelected = value === icon;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => { onChange(icon); setOpen(false); setSearch(""); setFocused(false); }}
              className={cn(
                "flex items-center justify-center aspect-square rounded-lg",
                "transition-colors duration-100 cursor-pointer",
                isSelected
                  ? "bg-primary/12 ring-2 ring-primary"
                  : "hover:bg-[hsl(var(--on-surface)/0.08)] active:bg-[hsl(var(--on-surface)/0.12)]",
              )}
              title={icon.replace(/_/g, " ")}
            >
              <Icon name={icon} size={compact ? 18 : 22} className={isSelected ? "text-primary" : "text-on-surface"} />
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-6 text-center">
          <Icon name="search_off" size={20} className="text-on-surface-variant/40 mb-1" />
          <p className="text-[11px] text-on-surface-variant">No icons found</p>
        </div>
      )}
    </div>
  );

  const panel = open && portalTarget ? (
    <div ref={panelRef} className={cn(
      "bg-surface-container border border-outline-variant shadow-lg pointer-events-auto",
      compact ? "rounded-xl" : "rounded-b-xl border-t-0",
    )}>
      {iconGrid}
    </div>
  ) : null;

  // ── Compact mode: small inline button ───────────────────────────────────
  if (compact) {
    return (
      <>
        <button
          ref={anchorRef as unknown as React.RefObject<HTMLButtonElement>}
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className={cn("flex items-center justify-center w-6 h-6 shrink-0 cursor-pointer hover:opacity-70 transition-opacity", className)}
          title={`Icon: ${value}`}
        >
          <span className="material-symbols-rounded text-[18px]" style={{ color: color ?? "#6366F1" }}>{value || "help"}</span>
        </button>
        {portalTarget && createPortal(panel, portalTarget)}
      </>
    );
  }

  // ── Full mode: TextField trigger ────────────────────────────────────────
  return (
    <>
      <div ref={anchorRef} className={className}>
        <TextField
          variant="outlined"
          label={label}
          className="w-full"
          value={focused ? search : (value || "")}
          onChange={(value) => { setSearch(value); setOpen(true); }}
          onFocus={() => { setFocused(true); setSearch(""); setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          leadingIcon={
            color
              ? <span className="material-symbols-rounded" style={{ fontSize: 20, color }}>{value || "help"}</span>
              : <Icon name={value || "help"} size={20} className="text-primary" />
          }
        />
      </div>
      {portalTarget && createPortal(panel, portalTarget)}
    </>
  );
}
