"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Icon } from "@/components/ui/icon";
import type { OrganizationUnit } from "@/services";

// ─── Data shape ─────────────────────────────────────────────────────────────────

export interface OrgUnitGroupNodeData {
  [key: string]: unknown;
  units: OrganizationUnit[];
  onEdit: (unit: OrganizationUnit) => void;
  onAddChild: (parentId: string) => void;
  onArchive: (id: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getFallbackIcon(typeName: string): string {
  const lower = typeName.toLowerCase();
  if (lower.includes("squad") || lower.includes("team")) return "lan";
  if (lower.includes("tribe")) return "groups";
  if (lower.includes("cluster")) return "hub";
  if (lower.includes("division")) return "domain";
  return "folder";
}

// ─── Component ──────────────────────────────────────────────────────────────────

function OrgUnitGroupNodeComponent({ data }: NodeProps) {
  const { units, onEdit, onArchive } = data as OrgUnitGroupNodeData;

  return (
    <div className="group relative">
      <Handle type="target" position={Position.Top} className="w-2! h-2! bg-outline-variant! border-none!" />

      <div className="rounded-2xl overflow-hidden bg-surface-container-low/50 border border-outline-variant/40 shadow-sm backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant/30">
          <span className="text-[10px] font-semibold text-surface-variant-foreground uppercase tracking-wider">
            {units.length} units
          </span>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-2 gap-1.5 p-2">
          {units.map((unit) => {
            const typeName = unit.type?.name ?? "Unit";
            const typeColor = unit.type?.color ?? "#6B7280";
            const typeIcon = unit.type?.icon ?? getFallbackIcon(typeName);

            return (
              <div
                key={unit.id}
                className="group/card flex items-center gap-2 rounded-xl border border-outline-variant/30 px-2.5 py-2 hover:border-outline-variant hover:shadow-sm transition-all cursor-default"
              >
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
                  style={{ backgroundColor: typeColor + "30" }}
                >
                  <span className="material-symbols-rounded text-[14px]" style={{ color: typeColor }}>{typeIcon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-surface-foreground leading-tight truncate">{unit.name}</p>
                  <p className="text-[9px] text-surface-variant-foreground/60 leading-tight">{typeName}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(unit); }} className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-surface-foreground/8" title="Edit">
                    <Icon name="edit" size={11} className="text-surface-variant-foreground" />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onArchive(unit.id); }} className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-surface-foreground/8" title="Archive">
                    <Icon name="archive" size={11} className="text-surface-variant-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const OrgUnitGroupNode = memo(OrgUnitGroupNodeComponent);
export default OrgUnitGroupNode;
