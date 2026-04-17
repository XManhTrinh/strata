"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Person } from "@/lib/org-tree/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface PersonNodeData {
  [key: string]: unknown;
  person: Person;
  matched: boolean;
  dimmed: boolean;
  onEdit: (person: Person) => void;
  childCount: number;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  inGroup?: boolean;
}

const HANDLE_CLASS = "w-2! h-2! bg-gray-300! dark:bg-gray-600! border-none!";

function getCardStyle(matched: boolean, dimmed: boolean) {
  if (matched) return "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md";
  if (dimmed) return "opacity-40 border-gray-200 dark:border-gray-700";
  return "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600";
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2);
}

function PersonNode({ data }: NodeProps & { data: PersonNodeData }) {
  const { person, matched, dimmed, onEdit, childCount, collapsed, onToggleCollapse, inGroup } = data;

  return (
    <div
      className={[
        "person-node-card relative bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 shadow-sm min-w-70 w-full cursor-grab active:cursor-grabbing transition-all duration-150",
        inGroup ? "h-full" : "",
        getCardStyle(matched, dimmed),
      ].join(" ")}
    >
      {!inGroup && <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar>
            <AvatarImage src={person.avatarUrl} alt={person.fullName} />
            <AvatarFallback>{getInitials(person.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {person.fullName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{person.title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(person); }}
          className="shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded"
          aria-label={`Edit ${person.fullName}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
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

      {!inGroup && <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />}

      {childCount > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(person.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-xs font-bold z-10"
          aria-label={collapsed ? "Expand reports" : "Collapse reports"}
          title={collapsed ? `Expand ${childCount} reports` : `Collapse ${childCount} reports`}
        >
          {collapsed ? `+${childCount}` : "−"}
        </button>
      )}
    </div>
  );
}

export default memo(PersonNode);
