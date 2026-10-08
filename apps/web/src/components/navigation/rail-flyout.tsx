"use client";

import Link from "next/link";
import type { PointerEvent, Ref } from "react";
import { Icon } from "@/components/ui/icon";
import type { NavCategory, NavChild } from "./nav-model";

export interface GroupTriggerProps {
  group: NavCategory;
  /** Whether this group's flyout is open. */
  open: boolean;
  /** Whether the current page belongs to this group (visual-only `data-current`). */
  current: boolean;
  /** The id of the flyout this trigger controls. */
  flyoutId: string;
  triggerRef?: Ref<HTMLAnchorElement>;
  /** Pointer entered the trigger — open/switch after the hover-intent delay. */
  onPointerOpen: () => void;
  /** Trigger received keyboard focus — open immediately (no hover delay). */
  onFocusOpen: () => void;
  /** Pointer left the trigger. */
  onPointerLeave: (event: PointerEvent) => void;
}

/**
 * A rail group trigger — a site-owned anchor styled with the nav-item token language. It
 * NAVIGATES to the group hub (so it works with the keyboard, middle-click / open-in-new-tab
 * and no-JS), while hover/focus OPENS the group's flyout. It still controls the panel
 * (`aria-expanded`/`aria-controls`) and reads as current (`data-current`) when any page in
 * the group is active — a group link, never "the current page", so it carries no
 * `aria-current`.
 */
export function GroupTrigger({
  group,
  open,
  current,
  flyoutId,
  triggerRef,
  onPointerOpen,
  onFocusOpen,
  onPointerLeave,
}: GroupTriggerProps) {
  return (
    <Link
      ref={triggerRef}
      href={group.href}
      aria-expanded={open}
      aria-controls={open ? flyoutId : undefined}
      data-current={current ? "true" : undefined}
      data-open={open ? "true" : undefined}
      onPointerEnter={onPointerOpen}
      onFocus={onFocusOpen}
      onPointerLeave={onPointerLeave}
      className="group/trigger grid min-h-[64px] w-full cursor-pointer content-start justify-items-center outline-none"
    >
      <span className="relative grid h-[32px] w-[56px] place-items-center rounded-full group-focus-visible/trigger:outline-2 group-focus-visible/trigger:outline-offset-2 group-focus-visible/trigger:outline-secondary">
        {/* Selection pill: grows horizontally + fades in when active, open or hovered. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 origin-center scale-x-0 rounded-full bg-secondary-container opacity-0 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover/trigger:scale-x-100 group-hover/trigger:opacity-100 group-focus-visible/trigger:scale-x-100 group-focus-visible/trigger:opacity-100 group-data-[current=true]/trigger:scale-x-100 group-data-[current=true]/trigger:opacity-100 group-data-[open=true]/trigger:scale-x-100 group-data-[open=true]/trigger:opacity-100 motion-reduce:transition-none"
        />
        {/* State layer: ~8% tint on hover/focus (on-secondary-container when active). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-on-surface-variant opacity-0 transition-[background-color,opacity] duration-200 group-hover/trigger:opacity-[0.08] group-focus-visible/trigger:opacity-[0.08] group-data-[current=true]/trigger:bg-on-secondary-container motion-reduce:transition-none"
        />
        <span className="relative inline-flex size-[24px] text-on-surface-variant transition-colors duration-200 group-hover/trigger:text-on-secondary-container group-focus-visible/trigger:text-on-secondary-container group-data-[current=true]/trigger:text-on-secondary-container group-data-[open=true]/trigger:text-on-secondary-container motion-reduce:transition-none">
          <Icon name={group.icon} size={24} />
        </span>
      </span>
      <span className="mt-[4px] max-w-full truncate text-center text-label-medium text-on-surface-variant transition-colors duration-200 group-hover/trigger:text-secondary group-focus-visible/trigger:text-secondary group-data-[current=true]/trigger:text-secondary group-data-[open=true]/trigger:text-secondary motion-reduce:transition-none">
        {group.label}
      </span>
    </Link>
  );
}

export interface RailFlyoutProps {
  id?: string;
  /** The group whose links to show. `null` before any group has been opened. */
  group: NavCategory | null;
  /** The accessible children to list (already feature-filtered). */
  childLinks: NavChild[];
  pathname: string;
  /** Whether the panel is open (slid in). The panel stays mounted so close animates too. */
  open: boolean;
  /**
   * When `true` the panel is a PERMANENT secondary pane (pinned on a detail page, in the
   * layout); when `false` it is the transient hover/focus overlay. Styling is the same; only
   * the shell's content inset differs.
   */
  pinned?: boolean;
  flyoutRef?: Ref<HTMLElement>;
  /** A link was activated — close the flyout. */
  onNavigate: () => void;
  onPointerEnter: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
}

/**
 * The secondary column of links for a rail group — a full-height pane with a border +
 * rounded corners on its inline-END edge, a 1px divider on its inline-START (rail) edge and
 * no shadow. It stays MOUNTED and animates a two-way inline-axis slide via `data-open` (open
 * slides in from behind the rail; close slides back out), RTL-mirrored and snapped under
 * reduced motion. Closed it is inert (translated away, not focusable, hidden from assistive
 * tech). A labelled `<nav>` disclosure (controlled by the trigger's
 * `aria-expanded`/`aria-controls`), NOT a menu: links are ordinary in-Tab-order anchors and
 * only the active one carries `aria-current="page"`.
 */
export function RailFlyout({
  id,
  group,
  childLinks,
  pathname,
  open,
  pinned = false,
  flyoutRef,
  onNavigate,
  onPointerEnter,
  onPointerLeave,
}: RailFlyoutProps) {
  return (
    <nav
      ref={flyoutRef}
      id={id}
      aria-label={group?.label}
      data-open={open ? "true" : "false"}
      data-pinned={pinned ? "true" : undefined}
      // Closed: removed from tab order and the a11y tree while it slides away.
      inert={!open ? true : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="absolute top-0 start-full z-20 flex h-full flex-col overflow-x-hidden overflow-y-auto rounded-e-corner-large bg-surface-container shadow-[2px_0_8px_0_color-mix(in_srgb,var(--md-sys-color-shadow)_20%,transparent)] transition-[width,opacity] duration-[var(--md-sys-motion-spring-spatial-default-duration)] ease-[var(--md-sys-motion-spring-spatial-default-easing)] will-change-[width] rtl:shadow-[-2px_0_8px_0_color-mix(in_srgb,var(--md-sys-color-shadow)_20%,transparent)] motion-reduce:transition-none data-[open=false]:pointer-events-none data-[open=false]:w-0 data-[open=false]:opacity-0 data-[open=false]:duration-[var(--md-sys-motion-spring-spatial-fast-duration)] data-[open=false]:ease-[var(--md-sys-motion-spring-spatial-fast-easing)] data-[open=true]:w-52 data-[open=true]:opacity-100"
    >
      {/* 1px divider on the inline-START (rail) edge — an element, not a panel border. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-0 w-px bg-outline-variant"
      />
      {group && (
        // Fixed 208px width so the content doesn't reflow while the panel's width animates —
        // it's revealed from the rail edge under overflow-x-hidden (no seam). Keyed by group
        // so the content re-runs a quick fade on group switch. Snaps under reduced motion.
        <div
          key={group.id}
          className="flex w-52 shrink-0 flex-col will-change-[opacity] motion-safe:animate-[drawer-fade-in_150ms_ease-out]"
        >
          <p className="px-4 pt-5 pb-3 text-label-small uppercase text-on-surface-variant">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5 px-2 pb-3">
            {childLinks.map((child) => {
              const active = pathname === child.href;
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className="flex flex-col rounded-corner-full px-3 py-2.5 text-body-medium text-on-surface-variant outline-none transition-colors hover:bg-on-surface/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary aria-[current=page]:bg-secondary-container aria-[current=page]:text-body-medium-emphasized aria-[current=page]:text-on-secondary-container motion-reduce:transition-none"
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
