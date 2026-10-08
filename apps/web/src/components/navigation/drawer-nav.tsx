"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import {
  current as currentGroup,
  isActive,
  useVisibleCategories,
  type NavCategory,
  type NavChild,
} from "./nav-model";

/** A full-bleed drawer row (link), styled with the nav token language. */
function DrawerLink({
  href,
  icon,
  active,
  onNavigate,
  children,
}: {
  href: string;
  icon?: ReactNode;
  active: boolean;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-full px-4 py-2.5 text-label-large text-on-surface-variant outline-none transition-colors hover:bg-on-surface/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary aria-[current=page]:bg-secondary-container aria-[current=page]:text-on-secondary-container motion-reduce:transition-none"
    >
      {icon != null && <span className="inline-flex size-6 shrink-0">{icon}</span>}
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

/** A collapsible category section — site-owned expandable markup (not a core item). */
function AccordionSection({
  label,
  icon,
  childLinks,
  current,
  defaultOpen,
  pathname,
  onNavigate,
}: {
  label: string;
  icon: ReactNode;
  childLinks: NavChild[];
  current: boolean;
  defaultOpen: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-current={current ? "true" : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-full px-4 py-2.5 text-label-large text-on-surface-variant outline-none transition-colors hover:bg-on-surface/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary data-current:text-on-secondary-container motion-reduce:transition-none"
      >
        <span className="inline-flex size-6 shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-start">{label}</span>
        <span
          aria-hidden="true"
          className={`inline-flex size-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        >
          <Icon name="expand_more" size={20} />
        </span>
      </button>
      {open && (
        <ul id={panelId} className="flex flex-col gap-0.5 ps-6">
          {childLinks.map((child) => (
            <li key={child.href}>
              <DrawerLink href={child.href} active={pathname === child.href} onNavigate={onNavigate}>
                {child.label}
              </DrawerLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The compact modal-drawer navigation: flat categories as rows and grouped categories
 * (Finance) as in-place accordions of child links. Rendered inside the modal
 * `NavigationRail`. Every link calls `onNavigate` to dismiss the drawer on activation.
 */
export function DrawerNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const visibleCategories = useVisibleCategories();
  const current = currentGroup(pathname);
  return (
    <div className="flex flex-col gap-1 px-3 pb-4 pt-3">
      {visibleCategories.map((cat: NavCategory) =>
        cat.children && cat.children.length > 0 ? (
          <AccordionSection
            key={cat.id}
            label={cat.label}
            icon={<Icon name={cat.icon} />}
            childLinks={cat.children}
            current={current === cat.id}
            defaultOpen={isActive(pathname, cat.href)}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : (
          <DrawerLink
            key={cat.id}
            href={cat.href}
            icon={<Icon name={cat.icon} />}
            active={isActive(pathname, cat.href)}
            onNavigate={onNavigate}
          >
            {cat.label}
          </DrawerLink>
        ),
      )}
    </div>
  );
}
