"use client";

import { Person, TreeNode } from "@/lib/org-tree/types";
import OrgNode from "./OrgNode";

interface OrgTreeProps {
  tree: TreeNode[];
  persons: Person[];
  loading: boolean;
  error: string | null;
  onEdit: (person: Person) => void;
  activeId: string | null;
  overId: string | null;
  matchedIds?: Set<string>;
}

export default function OrgTree({
  tree,
  persons,
  loading,
  error,
  onEdit,
  overId,
  matchedIds = new Set(),
}: OrgTreeProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400 text-sm">No org tree yet. Add people to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-12 items-start justify-start min-w-max px-4 pt-4">
          {tree.map((node) => {
            const isOver = overId === `drop-${node.person.id}`;
            return (
              <OrgNode
                key={node.person.id}
                node={node}
                persons={persons}
                onEdit={onEdit}
                onReparent={async () => {}}
                isOver={isOver}
                matchedIds={matchedIds}
              />
            );
          })}
      </div>
    </div>
  );
}
