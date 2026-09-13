"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { VacancyNode as VacancyNodeType } from "@/lib/org-tree/types";

export interface VacancyNodeData {
  [key: string]: unknown;
  vacancy: VacancyNodeType;
}

function VacancyNode({ data }: NodeProps & { data: VacancyNodeData }) {
  const { vacancy } = data;

  return (
    <div className="relative bg-surface/60 dark:bg-surface-container/60 border-2 border-dashed border-outline-variant rounded-xl px-4 py-3 shadow-sm min-w-70 w-full opacity-70">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2! h-2! bg-outline-variant!! border-none!"
      />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-surface-container-low border-2 border-dashed border-outline-variant flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-on-surface-variant"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-on-surface-variant text-sm">
            {vacancy.title}
          </p>
          <p className="text-on-surface-variant text-xs">
            {vacancy.departmentName} · Level {vacancy.level}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
          Open Position
        </span>
      </div>
    </div>
  );
}

export default memo(VacancyNode);
