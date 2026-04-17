"use client";

import { memo } from "react";
import { type NodeProps, Handle, Position } from "@xyflow/react";
import { Person } from "@/lib/org-tree/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface GroupNodeData {
  [key: string]: unknown;
  label: string;
  persons: Person[];
  matchedIds: Set<string>;
  onEdit: (person: Person) => void;
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function GroupNode({ data }: NodeProps & { data: GroupNodeData }) {
  const { label, persons, matchedIds, onEdit } = data;
  const hasMatch = matchedIds.size > 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 p-5 w-full text-left">
      <Handle type="target" position={Position.Top} className="w-2! h-2! bg-gray-300! dark:bg-gray-600! border-none!" />
      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
                "bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
                "transition-all duration-150",
                isMatched
                  ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md"
                  : dimmed
                  ? "opacity-40 border-gray-200 dark:border-gray-700"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar>
                    <AvatarImage src={person.avatarUrl} alt={person.fullName} />
                    <AvatarFallback>{person.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {person.fullName}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">{person.title}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(person); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded"
                  aria-label={`Edit ${person.fullName}`}
                >
                  <PencilIcon />
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(GroupNode);
