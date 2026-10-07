"use client";

import { memo } from "react";
import { type NodeProps, Handle, Position } from "@xyflow/react";
import { Icon } from "@/components/ui/icon";
import { Person } from "@/lib/org-tree/types";

export interface GroupNodeData {
  [key: string]: unknown;
  label: string;
  persons: Person[];
  matchedIds: Set<string>;
  onEdit: (person: Person) => void;
  childCounts: Record<string, number>;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = getInitials(name);
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0 overflow-hidden">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

function GroupNode({ data }: NodeProps & { data: GroupNodeData }) {
  const {
    label,
    persons,
    matchedIds,
    onEdit,
    childCounts,
    collapsedIds,
    onToggleCollapse,
  } = data;
  const hasMatch = matchedIds.size > 0;

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest/80 dark:bg-surface-container/50 p-5 w-full text-left">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2! h-2! bg-outline-variant!! border-none!"
      />
      <span className="text-[10px] font-semibold text-surface-variant-foreground uppercase tracking-wider">
        {label} · {persons.length}
      </span>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {persons.map((person) => {
          const isMatched = hasMatch && matchedIds.has(person.id);
          const dimmed = hasMatch && !matchedIds.has(person.id);
          return (
            <div
              key={person.id}
              data-person-id={person.id}
              className={[
                "bg-surface border rounded-xl px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
                "transition-all duration-150",
                isMatched
                  ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md"
                  : dimmed
                    ? "opacity-40 border-outline-variant"
                    : "border-outline-variant hover:border-outline-variant dark:hover:border-outline",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={person.fullName} avatarUrl={person.avatarUrl} />
                  <div className="min-w-0 text-left">
                    <p className="font-semibold text-surface-foreground text-sm">
                      {person.fullName}
                    </p>
                    <p className="text-surface-variant-foreground text-xs">
                      {person.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(person);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 text-surface-variant-foreground hover:text-primary transition-colors p-1 rounded"
                  aria-label={`Edit ${person.fullName}`}
                >
                  <Icon name="edit" size={14} />
                </button>
              </div>
              {person.squads.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {person.squads.map((squad) => (
                    <span
                      key={squad}
                      className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    >
                      {squad}
                    </span>
                  ))}
                </div>
              )}
              {(childCounts[person.id] ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(person.id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="mt-2 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  {collapsedIds.has(person.id)
                    ? `▶ Show ${childCounts[person.id]} reports`
                    : `▼ Hide ${childCounts[person.id]} reports`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(GroupNode);
