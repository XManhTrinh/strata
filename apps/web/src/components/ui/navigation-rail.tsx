"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
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
 * Material Design 3 Navigation Rail with Flyout Drawer
 *
 * @see https://m3.material.io/components/navigation-rail
 *
 * Behavior (like m3.material.io):
 * - Hovering an item with children opens a flyout drawer to the right
 * - Moving to another item with children smoothly transitions the drawer content
 * - The drawer stays open while cursor is on the rail or on the flyout
 * - Leaving both rail and flyout closes the drawer after a short delay
 * - Items without children show a tooltip on hover
 */
export function NavigationRail({ items, topAction, className }: NavigationRailProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const closeTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = React.useRef<HTMLElement>(null);
  const flyoutRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<string, HTMLElement>>(new Map());

  // Get the hovered item's data for flyout content
  const activeHoverItem = items.find((i) => i.label === hoveredItem && i.children?.length);

  // Calculate flyout vertical position based on the hovered item
  const [flyoutTop, setFlyoutTop] = React.useState(0);

  React.useEffect(() => {
    if (hoveredItem && railRef.current) {
      const itemEl = itemRefs.current.get(hoveredItem);
      if (itemEl && railRef.current) {
        const railRect = railRef.current.getBoundingClientRect();
        const itemRect = itemEl.getBoundingClientRect();
        setFlyoutTop(itemRect.top - railRect.top);
      }
    }
  }, [hoveredItem]);

  const cancelClose = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimeout.current = setTimeout(() => {
      setHoveredItem(null);
    }, 200);
  };

  const handleItemEnter = (label: string) => {
    cancelClose();
    setHoveredItem(label);
  };

  const handleItemLeave = () => {
    scheduleClose();
  };

  const handleFlyoutEnter = () => {
    cancelClose();
  };

  const handleFlyoutLeave = () => {
    scheduleClose();
  };

  return (
    <aside
      ref={railRef}
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

          return (
            <div
              key={item.href}
              ref={(el) => {
                if (el) itemRefs.current.set(item.label, el);
              }}
              onMouseEnter={() => handleItemEnter(item.label)}
              onMouseLeave={handleItemLeave}
            >
              {hasChildren ? (
                <RailItem item={item} isActive={isActive} />
              ) : (
                <Tooltip content={item.label} side="right">
                  <RailItem item={item} isActive={isActive} />
                </Tooltip>
              )}
            </div>
          );
        })}
      </nav>

      {/* Single flyout drawer — positioned to the right of the rail */}
      <AnimatePresence>
        {activeHoverItem && (
          <motion.div
            ref={flyoutRef}
            key="flyout"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-20 z-50"
            style={{ top: flyoutTop }}
            onMouseEnter={handleFlyoutEnter}
            onMouseLeave={handleFlyoutLeave}
          >
            <FlyoutDrawer
              title={activeHoverItem.label}
              items={activeHoverItem.children!}
              pathname={pathname}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

/** Individual rail item — M3 active indicator animates from center outward */
function RailItem({ item, isActive }: { item: NavigationRailItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className="group relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl"
    >
      {/* Pill indicator — animates scale from center when active */}
      <div className="relative flex items-center justify-center w-14 h-8">
        {/* Active background pill — expands horizontally from center */}
        <motion.div
          className="absolute inset-0 rounded-full bg-secondary-container origin-center"
          initial={false}
          animate={{
            scaleX: isActive ? 1 : 0,
            opacity: isActive ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] as [number, number, number, number] }}
        />
        {/* Hover/press state layer — only when inactive */}
        {!isActive && (
          <div className="absolute inset-0 rounded-full transition-colors duration-200 group-hover:bg-surface-foreground/8 group-active:bg-surface-foreground/12" />
        )}
        {/* Icon */}
        <Icon
          name={item.icon}
          size={24}
          filled={isActive}
          className={cn(
            "relative z-10 transition-colors duration-200",
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
    </Link>
  );
}

/**
 * Flyout Drawer — appears beside the rail showing sub-navigation items.
 * Content transitions when hovering between different parent items.
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
