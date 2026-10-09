"use client";
import type React from "react";

import { useEffect, useRef } from "react";
import { Divider, List, ListItem } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";

// Legacy compatibility type for interactive ListItem
// Legacy compatibility - TypeScript cast for interactive list items
const ListItemWithClick = ListItem as unknown as (props: React.ComponentProps<typeof ListItem> & { onClick?: () => void; selected?: boolean; }) => React.ReactElement;


// ─── Types ────────────────────────────────────────────────────────────────────

export type ContextMenuTarget =
  | { type: "person"; personId: string; personName: string }
  | { type: "vacancy"; vacancyId: string; vacancyTitle: string };

interface ContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  onAction: (action: string, targetId: string) => void;
  onClose: () => void;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

const PERSON_ACTIONS = [
  { action: "view_profile", label: "View Profile", icon: "person" },
  { action: "edit", label: "Edit", icon: "edit" },
  { action: "change_manager", label: "Change Manager", icon: "swap_horiz" },
  { action: "view_capacity", label: "View Capacity", icon: "stacked_bar_chart" },
  { action: "view_leave", label: "View Leave Balance", icon: "event_busy" },
];

const VACANCY_ACTIONS = [
  { action: "fill_position", label: "Fill Position", icon: "person_add" },
  { action: "remove_vacancy", label: "Remove Vacancy", icon: "delete" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContextMenu({ x, y, target, onAction, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const actions = target.type === "person" ? PERSON_ACTIONS : VACANCY_ACTIONS;
  const targetId = target.type === "person" ? target.personId : target.vacancyId;
  const title = target.type === "person" ? target.personName : target.vacancyTitle;

  return (
    <div
      ref={ref}
      className="fixed z-100 bg-surface border border-outline-variant rounded-xl shadow-xl py-1 min-w-48"
      style={{ left: x, top: y }}
    >
      <div className="px-4 py-2">
        <span className="text-label-small text-on-surface-variant truncate">
          {title}
        </span>
      </div>
      <Divider />
      <List aria-label="List" className="py-1">
        {actions.map((item) => (
          <ListItemWithClick
            key={item.action}
            leading={<Icon name={item.icon} size={18} className="text-on-surface-variant" />}
            onClick={() => {
              onAction(item.action, targetId);
              onClose();
            }}
          >
            {item.label}
          </ListItemWithClick>
        ))}
      </List>
    </div>
  );
}
