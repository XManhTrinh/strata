"use client";

import { Avatar } from "@vkieu/mui/vk";
import { Icon } from "@/components/ui/icon";
import { Person } from "@/lib/org-tree/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnallocatedPanelProps {
  persons: Person[];
  matchedIds: Set<string>;
  isDropTarget: boolean;
  onEdit: (person: Person) => void;
  onDragStart: (person: Person, e: React.MouseEvent) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UnallocatedPanel({
  persons,
  matchedIds,
  isDropTarget,
  onEdit,
  onDragStart,
}: UnallocatedPanelProps) {
  return (
    <div
      className={`w-80 shrink-0 border-l transition-all overflow-y-auto p-4 ${
        isDropTarget
          ? "border-primary bg-primary-container/20 scale-[1.02]"
          : "border-outline-variant bg-surface"
      }`}
    >
      {isDropTarget && (
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Icon name="check_circle" size={20} />
          <span className="text-label-large text-primary">Drop to unallocate</span>
        </div>
      )}

      <span className="text-label-small text-on-surface-variant uppercase tracking-wider mb-3">
        Unallocated · {persons.length}
      </span>

      {persons.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Icon name="person_off" size={32} className="text-on-surface-variant/30 mb-2" />
          <p className="text-body-small text-on-surface-variant">
            No unallocated people. Drag nodes here to remove from tree.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {persons.map((person) => (
            <div
              key={person.id}
              data-person-id={person.id}
              className="bg-surface border border-outline-variant rounded-xl px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-all hover:border-outline"
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                onDragStart(person, e);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={person.fullName} src={person.avatarUrl} size="sm" decorative />
                  <div className="min-w-0">
                    <span className="text-label-large truncate">{person.fullName}</span>
                    <p className="text-body-small text-on-surface-variant truncate">
                      {person.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(person); }}
                  className="shrink-0 text-on-surface-variant hover:text-primary transition-colors p-1 rounded"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
