"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Icon } from "@vkieu/mui";
import type { OrganizationUnit } from "@/services";

// ─── Data shape ─────────────────────────────────────────────────────────────────

export interface OrgUnitNodeData {
  [key: string]: unknown;
  unit: OrganizationUnit;
  childCount: number;
  onEdit: (unit: OrganizationUnit) => void;
  onAddChild: (parentId: string) => void;
  onArchive: (id: string) => void;
}

// ─── Fallback icon ──────────────────────────────────────────────────────────────

function getFallbackIcon(typeName: string): string {
  const lower = typeName.toLowerCase();
  if (lower.includes("division")) return "domain";
  if (lower.includes("cluster")) return "hub";
  if (lower.includes("tribe")) return "groups";
  if (lower.includes("squad") || lower.includes("team")) return "lan";
  if (lower.includes("department")) return "apartment";
  return "folder";
}

// ─── Component ──────────────────────────────────────────────────────────────────

function OrgUnitNodeComponent({ data }: NodeProps) {
  const { unit, childCount, onEdit, onAddChild, onArchive } = data as OrgUnitNodeData;
  const typeName = unit.type?.name ?? "Unit";
  const typeColor = unit.type?.color ?? "#6B7280";
  const typeIcon = unit.type?.icon ?? getFallbackIcon(typeName);

  return (
    <div className="group relative">
      <Handle type="target" position={Position.Top} className="w-2! h-2! bg-outline-variant! border-none!" />
      <Handle type="source" position={Position.Bottom} className="w-2! h-2! bg-outline-variant! border-none!" />

      <div
        className="w-56 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200"
        style={{ backgroundColor: typeColor }}
      >
        {/* Actions — top-right overlay, visible on hover */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(unit); }} className="flex items-center justify-center w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm" title="Edit">
            <Icon name="edit" size={13} className="text-white" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onAddChild(unit.id); }} className="flex items-center justify-center w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm" title="Add child">
            <Icon name="add" size={13} className="text-white" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onArchive(unit.id); }} className="flex items-center justify-center w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm" title="Archive">
            <Icon name="archive" size={13} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
            <Icon name={typeIcon} size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-tight truncate text-white">
              {unit.name}
            </p>
            <p className="text-[10px] leading-tight mt-0.5 text-white/70">
              {typeName}
              {childCount > 0 && ` · ${childCount}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const OrgUnitNode = memo(OrgUnitNodeComponent);
export default OrgUnitNode;
