"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { useRipple } from "@/components/ui/ripple";
import * as React from "react";

export interface NavigationRailItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Material Symbols icon name */
  icon: string;
}

export interface NavigationRailProps {
  /** Navigation destinations (max 7 per M3 spec) */
  items: NavigationRailItem[];
  /** Optional FAB or menu icon at top */
  topAction?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Material Design 3 Navigation Rail
 *
 * @see https://m3.material.io/components/navigation-rail
 *
 * Specs:
 * - Width: 80px
 * - Each item: 56px height, icon in pill (56×32px)
 * - Active: secondary-container pill, filled icon, on-secondary-container
 * - Inactive: transparent pill, outlined icon, on-surface-variant
 * - Hover: entire item triggers pill highlight (on-surface at 8%)
 * - Ripple on press
 */
export function NavigationRail({ items, topAction, className }: NavigationRailProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 w-20 flex-col items-center bg-[hsl(var(--surface-variant)/0.4)] hidden md:flex",
        className
      )}
      aria-label="Main navigation"
    >
      {/* Top action area (menu/FAB) */}
      {topAction && (
        <div className="flex items-center justify-center h-14 w-full shrink-0 mt-2">
          {topAction}
        </div>
      )}

      {/* Navigation items — vertically centered */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-3">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Tooltip key={item.href} content={item.label} side="right">
              <RailItem item={item} isActive={isActive} />
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}

/** Individual rail item with ripple and proper hover propagation */
function RailItem({ item, isActive }: { item: NavigationRailItem; isActive: boolean }) {
  const { ripples, trigger, containerRef } = useRipple();

  return (
    <Link
      ref={containerRef as React.RefObject<HTMLAnchorElement | null>}
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      onMouseDown={trigger}
      onTouchStart={trigger}
      className="group relative overflow-hidden flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl"
    >
      {/* Pill indicator — highlights on parent hover via group */}
      <div
        className={cn(
          "flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-200",
          isActive
            ? "bg-secondary-container"
            : "bg-transparent group-hover:bg-surface-foreground/8"
        )}
      >
        <Icon
          name={item.icon}
          size={24}
          filled={isActive}
          className={cn(
            "transition-colors duration-200",
            isActive
              ? "text-secondary-container-foreground"
              : "text-surface-variant-foreground group-hover:text-surface-foreground"
          )}
        />
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-[11px] leading-4 font-medium transition-colors duration-200",
          isActive
            ? "text-secondary-container-foreground"
            : "text-surface-variant-foreground group-hover:text-surface-foreground"
        )}
      >
        {item.label}
      </span>

      {/* Ripple circles */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-surface-foreground/12 animate-[ripple_500ms_ease-out_forwards] pointer-events-none"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </Link>
  );
}
