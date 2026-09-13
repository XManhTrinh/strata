"use client";

import { Person } from "@/lib/org-tree/types";

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

function PencilIcon() {
  return (
    <svg
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

interface UnallocatedPanelProps {
  persons: Person[];
  matchedIds: Set<string>;
  onEdit: (person: Person) => void;
  onDragStart: (person: Person, e: React.MouseEvent) => void;
  isDropTarget?: boolean;
}

export default function UnallocatedPanel({
  persons,
  matchedIds,
  onEdit,
  onDragStart,
  isDropTarget,
}: UnallocatedPanelProps) {
  const hasMatch = matchedIds.size > 0;

  return (
    <div
      className={[
        "rounded-2xl border-2 border-dashed p-4 min-h-50 transition-all duration-150",
        isDropTarget
          ? "border-primary bg-primary-container dark:bg-primary-container/20 scale-[1.02] shadow-md"
          : "border-outline-variant bg-transparent",
      ].join(" ")}
    >
      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
        {isDropTarget ? "✓ Drop to unallocate" : "Unallocated"}
      </h3>

      {persons.length === 0 ? (
        <p className="text-on-surface-variant text-sm text-center py-8">
          No unallocated people. Drag nodes here to remove from tree.
        </p>
      ) : (
        <div className="space-y-2">
          {persons.map((person) => {
            const isMatched = hasMatch && matchedIds.has(person.id);
            const dimmed = hasMatch && !matchedIds.has(person.id);
            return (
              <div
                key={person.id}
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  onDragStart(person, e);
                }}
                className={[
                  "flex items-start justify-between gap-2 bg-surfaceborder rounded-xl px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
                  "transition-all duration-150",
                  isMatched
                    ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md"
                    : dimmed
                      ? "opacity-40 border-outline-variant"
                      : "border-outline-variant hover:border-outline-variant dark:hover:border-outline",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={person.fullName} avatarUrl={person.avatarUrl} />
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface text-sm">
                      {person.fullName}
                    </p>
                    <p className="text-on-surface-variant text-xs">
                      {person.title}
                    </p>
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
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(person)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 text-on-surface-variant hover:text-primary dark:hover:text-primary transition-colors p-1 rounded"
                  aria-label={`Edit ${person.fullName}`}
                >
                  <PencilIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
