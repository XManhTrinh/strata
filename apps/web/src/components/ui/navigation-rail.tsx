"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";

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
 * Vertical navigation rail for desktop viewports. Fixed left, 80px wide.
 * Shows up to 7 destinations with icon + optional label.
 *
 * @see https://m3.material.io/components/navigation-rail
 *
 * Specs:
 * - Width: 80px
 * - Position: fixed left, full height
 * - Background: surface
 * - Top: FAB or menu icon (optional, 56px area)
 * - Each item: 56px total height
 * - Icon container: pill 56×32px, centered
 * - Active indicator: secondary-container pill fill (56×32px)
 * - Icon: 24px, centered in pill
 * - Label below icon: Label Medium (12px/16px), optional
 * - Active: filled icon + on-secondary-container
 * - Inactive: outlined icon + on-surface-variant
 * - Items: centered horizontally, grouped vertically with 12px gap
 * - Max destinations: 7 (no scrolling)
 */
export function NavigationRail({ items, topAction, className }: NavigationRailProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 w-20 flex-col items-center bg-surface hidden md:flex",
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
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-1 w-14 h-14"
              >
                {/* Active indicator pill */}
                <div
                  className={cn(
                    "flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-200",
                    isActive ? "bg-secondary-container" : "bg-transparent hover:bg-surface-foreground/8"
                  )}
                >
                  <Icon
                    name={item.icon}
                    size={24}
                    filled={isActive}
                    className={cn(
                      isActive
                        ? "text-secondary-container-foreground"
                        : "text-surface-variant-foreground"
                    )}
                  />
                </div>
                {/* Label */}
                <span
                  className={cn(
                    "text-[12px] leading-4 font-medium",
                    isActive
                      ? "text-secondary-container-foreground"
                      : "text-surface-variant-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
