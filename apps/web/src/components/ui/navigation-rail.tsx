"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { useRipple } from "@/components/ui/ripple";
import * as React from "react";

export interface NavigationRailSubItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavigationRailItem {
  /** Display label */
  label: string;
  /** Route path (main destination) */
  href: string;
  /** Material Symbols icon name */
  icon: string;
  /** Sub-items shown in flyout drawer on hover */
  children?: NavigationRailSubItem[];
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
 * - Hover: entire item triggers pill highlight + flyout drawer for sub-items
 * - Ripple on press
 */
export function NavigationRail({ items, topAction, className }: NavigationRailProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const hoverTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (label: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredItem(label);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredItem(null);
    }, 150);
  };

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
          const hasChildren = item.children && item.children.length > 0;
          const isHovered = hoveredItem === item.label;

          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => hasChildren && handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Rail item */}
              {hasChildren ? (
                <RailItem item={item} isActive={isActive} />
              ) : (
                <Tooltip content={item.label} side="right">
                  <RailItem item={item} isActive={isActive} />
                </Tooltip>
              )}

              {/* Flyout drawer for sub-items */}
              {hasChildren && (
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-[calc(100%+4px)] top-1/2 -translate-y-1/2 z-50"
                      onMouseEnter={() => handleMouseEnter(item.label)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <FlyoutDrawer
                        title={item.label}
                        items={item.children!}
                        pathname={pathname}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
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
      {/* Pill indicator */}
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

/**
 * Flyout Drawer — appears on hover for nav items with sub-pages.
 * Like m3.material.io's navigation where hovering a section reveals sub-items.
 */
function FlyoutDrawer({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavigationRailSubItem[];
  pathname: string;
}) {
  return (
    <div className="w-56 rounded-2xl bg-[hsl(var(--surface))] shadow-xl border border-outline-variant/50 py-2 px-2">
      {/* Header */}
      <p className="px-3 py-2 text-[12px] leading-4 font-medium text-surface-variant-foreground uppercase tracking-wider">
        {title}
      </p>

      {/* Sub-items */}
      <ul className="space-y-0.5">
        {items.map((sub) => {
          const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/");

          return (
            <li key={sub.href}>
              <Link
                href={sub.href}
                className={cn(
                  "flex items-center gap-3 rounded-full h-10 px-3 transition-colors duration-150",
                  isSubActive
                    ? "bg-secondary-container text-secondary-container-foreground font-medium"
                    : "text-surface-foreground hover:bg-surface-foreground/8"
                )}
              >
                <Icon
                  name={sub.icon}
                  size={20}
                  filled={isSubActive}
                  className="shrink-0"
                />
                <span className="text-[13px] leading-5 truncate">{sub.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
