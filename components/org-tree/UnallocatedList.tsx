"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { Person } from "@/lib/org-tree/types";

interface UnallocatedListProps {
  persons: Person[];
  onEdit: (person: Person) => void;
  isOver?: boolean;
  matchedIds?: Set<string>;
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function UnallocatedItem({
  person,
  onEdit,
  isMatched,
  dimmed,
}: {
  person: Person;
  onEdit: (person: Person) => void;
  isMatched: boolean;
  dimmed: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: person.id,
    data: { type: "unallocated", personId: person.id },
  });

  return (
    <motion.div
      layout
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "flex items-start justify-between gap-2 bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
        "transition-all duration-150",
        isMatched
          ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md"
          : dimmed
          ? "opacity-40 border-gray-200 dark:border-gray-700"
          : "hover:border-gray-300 dark:hover:border-gray-600 border-gray-200 dark:border-gray-700",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: isDragging ? 0.4 : 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
          {person.fullName}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{person.title}</p>
        {person.squads.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(person);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded"
        aria-label={`Edit ${person.fullName}`}
      >
        <PencilIcon />
      </button>
    </motion.div>
  );
}

export default function UnallocatedList({
  persons,
  onEdit,
  isOver,
  matchedIds = new Set(),
}: UnallocatedListProps) {
  const { setNodeRef } = useDroppable({
    id: "unallocated-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "rounded-2xl border-2 border-dashed p-4 min-h-[200px] transition-all duration-150",
        isOver
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-md"
          : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50",
      ].join(" ")}
    >
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {isOver ? "✓ Drop to unallocate" : "Unallocated"}
      </h3>

      {persons.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
          No unallocated people. Drag nodes here to remove from tree.
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {persons.map((person) => (
              <UnallocatedItem
                key={person.id}
                person={person}
                onEdit={onEdit}
                isMatched={matchedIds.size > 0 && matchedIds.has(person.id)}
                dimmed={matchedIds.size > 0 && !matchedIds.has(person.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
