"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@vkieu/mui";

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface SortableOrgLevelItemProps {
  id: number;
  rank: number;
  total: number;
  csvHeader: string;
  unitTypeName: string;
  onUnitTypeChange: (value: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────────

/**
 * Draggable row representing one org-hierarchy level in the CSV import flow.
 *
 * Uses `@dnd-kit/sortable` and renders a drag handle, a rank badge,
 * the original CSV column name, and an editable unit-type input.
 */
export function SortableOrgLevelItem({
  id,
  rank,
  total,
  csvHeader,
  unitTypeName,
  onUnitTypeChange,
}: SortableOrgLevelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: (isDragging ? "relative" : undefined) as "relative" | undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
        isDragging
          ? "border-primary bg-primary/5 shadow-xl ring-1 ring-primary/20"
          : "border-outline-variant/50 bg-surface"
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-surface-variant-foreground hover:text-surface-foreground shrink-0 touch-none flex items-center"
        aria-label={`Reorder ${csvHeader}`}
      >
        <Icon name="drag_indicator" size={16} />
      </button>

      {/* Rank badge */}
      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0 leading-none">
        {rank + 1}
      </span>

      {/* CSV column name */}
      <span
        className="text-[12px] text-surface-variant-foreground w-24 shrink-0 truncate leading-none"
        title={csvHeader}
      >
        {csvHeader}
      </span>

      <Icon name="arrow_forward" size={12} className="text-surface-variant-foreground/50 shrink-0" />

      {/* Editable unit type */}
      <input
        type="text"
        value={unitTypeName}
        onChange={(e) => onUnitTypeChange(e.target.value)}
        placeholder="Type name"
        className="flex-1 min-w-0 h-6 px-1.5 text-[12px] leading-none bg-transparent border border-outline-variant/40 rounded focus:border-primary focus:outline-none"
      />

      {/* Level indicator */}
      <span className="text-[9px] text-surface-variant-foreground/60 shrink-0 w-12 text-right leading-none">
        {rank === 0 ? "Top" : rank === total - 1 ? "Bottom" : `Lvl ${rank + 1}`}
      </span>
    </div>
  );
}
