"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Person } from "@/lib/org-tree/types";

export interface PersonNodeData {
  [key: string]: unknown;
  person: Person;
  matched: boolean;
  dimmed: boolean;
  onEdit: (person: Person) => void;
  childCount: number;
  indirectCount: number;
  totalDescendants: number;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  inGroup?: boolean;
  canEdit?: boolean;
}

const HANDLE_CLASS = "!w-2 !h-2 !bg-gray-300 dark:!bg-gray-600 !border-none";

function getCardStyle(matched: boolean, dimmed: boolean) {
  if (matched)
    return "ring-2 ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md";
  if (dimmed) return "opacity-40 border-gray-200 dark:border-gray-700";
  return "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

function getStatusColor(status: Person["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500";
    case "ON_LEAVE":
      return "bg-yellow-400";
    case "SUSPENDED":
      return "bg-orange-500";
    case "TERMINATED":
      return "bg-gray-400";
    default:
      return "bg-green-500";
  }
}

function getCapacityColor(capacity: number): string {
  if (capacity >= 90) return "#ef4444"; // red
  if (capacity >= 70) return "#eab308"; // yellow
  return "#22c55e"; // green
}

function CapacityRing({ capacity }: { capacity: number }) {
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (capacity / 100) * circumference;
  const color = getCapacityColor(capacity);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[8px] font-bold text-gray-600 dark:text-gray-300 z-10">
        {capacity}
      </span>
    </div>
  );
}

function Avatar({ name, avatarUrl, status }: { name: string; avatarUrl?: string; status: Person["status"] }) {
  const initials = getInitials(name);
  return (
    <div className="relative shrink-0">
      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(status)}`}
      />
    </div>
  );
}

function PersonNode({ data }: NodeProps & { data: PersonNodeData }) {
  const {
    person,
    matched,
    dimmed,
    onEdit,
    childCount,
    indirectCount,
    totalDescendants,
    collapsed,
    onToggleCollapse,
    inGroup,
    canEdit = true,
  } = data;

  const isTerminated = person.status === "TERMINATED";

  return (
    <div
      className={[
        "person-node-card relative bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 shadow-sm min-w-70 w-full transition-all duration-150",
        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        inGroup ? "h-full" : "",
        isTerminated ? "opacity-50" : "",
        getCardStyle(matched, dimmed),
      ].join(" ")}
    >
      {!inGroup && (
        <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={person.fullName} avatarUrl={person.avatarUrl} status={person.status} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {person.fullName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              {person.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CapacityRing capacity={person.capacityAllocation} />
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(person);
              }}
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded"
              aria-label={`Edit ${person.fullName}`}
            >
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
            </button>
          )}
        </div>
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

      {(childCount > 0 || indirectCount > 0) && !inGroup && (
        <div className="flex gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          {childCount > 0 && <span>{childCount} direct</span>}
          {indirectCount > 0 && <span>{indirectCount} indirect</span>}
        </div>
      )}

      {!inGroup && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={HANDLE_CLASS}
        />
      )}

      {childCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(person.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-xs font-bold z-10"
          aria-label={collapsed ? "Expand reports" : "Collapse reports"}
          title={
            collapsed
              ? `Expand ${totalDescendants} reports`
              : `Collapse ${totalDescendants} reports`
          }
        >
          {collapsed ? `+${totalDescendants}` : "−"}
        </button>
      )}
    </div>
  );
}

export default memo(PersonNode);
