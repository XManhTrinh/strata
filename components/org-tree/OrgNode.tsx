"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Person, TreeNode } from "@/lib/org-tree/types";
import Avatar from "@/components/ui/Avatar";

interface OrgNodeProps {
  node: TreeNode;
  persons: Person[];
  onEdit: (person: Person) => void;
  onReparent: (draggedId: string, newParentId: string | null) => Promise<void>;
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

export default function OrgNode({
  node,
  persons,
  onEdit,
  onReparent,
  isOver,
  matchedIds = new Set(),
}: OrgNodeProps) {
  const { person, children } = node;
  const isMatched = matchedIds.size > 0 && matchedIds.has(person.id);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: person.id,
    data: { type: "node", personId: person.id },
  });

  const { setNodeRef: setDropRef, isOver: isOverDrop } = useDroppable({
    id: `drop-${person.id}`,
    data: { type: "node", personId: person.id },
  });

  const highlighted = isOver || isOverDrop;

  // Combine drag and drop refs
  function setRef(el: HTMLDivElement | null) {
    setDragRef(el);
    setDropRef(el);
  }

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div
        ref={setRef}
        {...listeners}
        {...attributes}
        className={[
          "relative cursor-grab active:cursor-grabbing select-none",
          "bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 shadow-sm min-w-[180px] max-w-[220px]",
          "transition-all duration-150",
          highlighted
            ? "ring-2 ring-blue-400 border-blue-400 bg-blue-50 dark:bg-blue-900/30 scale-105 shadow-md"
            : isMatched
            ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md"
            : matchedIds.size > 0
            ? "opacity-40 border-gray-200 dark:border-gray-700"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
          isDragging ? "opacity-30" : "",
        ].join(" ")}
      >
        {highlighted && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
            Drop here
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Avatar src={person.avatarUrl} name={person.fullName} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                {person.fullName}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{person.title}</p>
            </div>
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

      {/* Children with connector lines */}
      {children.length > 0 && (
        <div className="flex flex-col items-center">
          {/* Vertical line from parent down */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Horizontal bar + children */}
          <div className="relative flex items-start gap-6">
            {/* Horizontal connector line spanning all children */}
            {children.length > 1 && (
              <div
                className="absolute top-0 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600"
                style={{ top: 0 }}
              />
            )}

            {children.map((child, idx) => (
                <div key={child.person.id} className="flex flex-col items-center">
                  {/* Vertical line from horizontal bar down to child */}
                  {children.length > 1 && (
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                  )}
                  {children.length === 1 && idx === 0 && (
                    <div className="w-px h-0 bg-transparent" />
                  )}
                  <OrgNode
                    node={child}
                    persons={persons}
                    onEdit={onEdit}
                    onReparent={onReparent}
                    matchedIds={matchedIds}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
