"use client";

import { useEffect, useRef } from "react";

export type ContextMenuTarget =
  | { type: "person"; personId: string; personName: string }
  | { type: "vacancy"; vacancyId: string; vacancyTitle: string };

interface ContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  onClose: () => void;
  onAction: (action: string, targetId: string) => void;
}

const PERSON_ACTIONS = [
  { id: "view-profile", label: "View Profile" },
  { id: "edit", label: "Edit" },
  { id: "change-manager", label: "Change Manager" },
  { id: "view-capacity", label: "View Capacity" },
  { id: "view-leave-balance", label: "View Leave Balance" },
];

const VACANCY_ACTIONS = [
  { id: "fill-position", label: "Fill Position" },
  { id: "remove-vacancy", label: "Remove Vacancy" },
];

export default function ContextMenu({
  x,
  y,
  target,
  onClose,
  onAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const actions = target.type === "person" ? PERSON_ACTIONS : VACANCY_ACTIONS;
  const targetId =
    target.type === "person" ? target.personId : target.vacancyId;
  const title =
    target.type === "person" ? target.personName : target.vacancyTitle;

  return (
    <div
      ref={menuRef}
      className="fixed z-100 bg-surfaceborder border-outline-variant rounded-lg shadow-xl py-1 min-w-45"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-outline-variant">
        <p className="text-xs font-semibold text-on-surface-variant truncate">
          {title}
        </p>
      </div>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => {
            onAction(action.id, targetId);
            onClose();
          }}
          className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-lowest dark:hover:bg-surface-container-high transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
