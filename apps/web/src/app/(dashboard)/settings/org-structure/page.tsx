"use client";

import { useState } from "react";
import { Badge, SearchInput } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface OrgUnit {
  id: string;
  name: string;
  type: string;
  typeColor: string;
  memberCount: number;
  managerId: string | null;
  managerName: string | null;
  children: OrgUnit[];
}

const mockOrgTree: OrgUnit[] = [
  {
    id: "ou-1",
    name: "Acme Corporation",
    type: "Division",
    typeColor: "#EF4444",
    memberCount: 142,
    managerId: "u-1",
    managerName: "Jane Smith",
    children: [
      {
        id: "ou-2",
        name: "Engineering",
        type: "Department",
        typeColor: "#3B82F6",
        memberCount: 64,
        managerId: "u-2",
        managerName: "Lin Zhang",
        children: [
          {
            id: "ou-5",
            name: "Platform Tribe",
            type: "Tribe",
            typeColor: "#8B5CF6",
            memberCount: 24,
            managerId: "u-5",
            managerName: "Alex Rivera",
            children: [
              { id: "ou-8", name: "Infrastructure Squad", type: "Squad", typeColor: "#10B981", memberCount: 6, managerId: "u-8", managerName: "Tom Lee", children: [] },
              { id: "ou-9", name: "DevOps Squad", type: "Squad", typeColor: "#10B981", memberCount: 5, managerId: "u-9", managerName: "Sara Kim", children: [] },
              { id: "ou-10", name: "Data Platform Squad", type: "Squad", typeColor: "#10B981", memberCount: 7, managerId: null, managerName: null, children: [] },
            ],
          },
          {
            id: "ou-6",
            name: "Product Tribe",
            type: "Tribe",
            typeColor: "#8B5CF6",
            memberCount: 28,
            managerId: "u-6",
            managerName: "Maya Patel",
            children: [
              { id: "ou-11", name: "Core App Squad", type: "Squad", typeColor: "#10B981", memberCount: 8, managerId: "u-11", managerName: "Chris Wu", children: [] },
              { id: "ou-12", name: "Growth Squad", type: "Squad", typeColor: "#10B981", memberCount: 6, managerId: null, managerName: null, children: [] },
            ],
          },
        ],
      },
      {
        id: "ou-3",
        name: "Product & Design",
        type: "Department",
        typeColor: "#3B82F6",
        memberCount: 32,
        managerId: "u-3",
        managerName: "Marcus Johnson",
        children: [
          { id: "ou-7", name: "UX Chapter", type: "Chapter", typeColor: "#F59E0B", memberCount: 8, managerId: "u-7", managerName: "David Park", children: [] },
        ],
      },
      {
        id: "ou-4",
        name: "People & Operations",
        type: "Department",
        typeColor: "#3B82F6",
        memberCount: 18,
        managerId: "u-4",
        managerName: "Olivia Thompson",
        children: [],
      },
    ],
  },
];

function TreeNode({ unit, depth = 0 }: { unit: OrgUnit; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  const hasChildren = unit.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <span className="text-xs">{expanded ? "▼" : "▶"}</span>
          </button>
        ) : (
          <span className="inline-block h-5 w-5" />
        )}

        <div className="flex flex-1 items-center gap-3">
          <span className="font-medium text-foreground">{unit.name}</span>
          <Badge variant="default">
            <span style={{ color: unit.typeColor }}>●</span>
            <span className="ml-1">{unit.type}</span>
          </Badge>
          <span className="text-xs text-muted-foreground">
            {unit.memberCount} {unit.memberCount === 1 ? "member" : "members"}
          </span>
          {unit.managerName && (
            <span className="text-xs text-muted-foreground">
              · Managed by {unit.managerName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Add Child
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Archive
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {unit.children.map((child) => (
            <TreeNode key={child.id} unit={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgStructurePage() {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "", parent: "" });

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Organization Structure</h1>
          <p className="text-xs text-muted-foreground">
            Build and manage your organization&apos;s hierarchical structure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Unit
        </button>
      </AppBar>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search units..."
        />
      </div>

      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Organization Hierarchy</span>
        </div>
        <div className="py-2">
          {mockOrgTree.map((unit) => (
            <TreeNode key={unit.id} unit={unit} />
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Create Organization Unit</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="unit-name" className="block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="unit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Engineering"
                />
              </div>
              <div>
                <label htmlFor="unit-type" className="block text-sm font-medium text-foreground">
                  Type
                </label>
                <select
                  id="unit-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a type...</option>
                  <option value="division">Division</option>
                  <option value="department">Department</option>
                  <option value="tribe">Tribe</option>
                  <option value="squad">Squad</option>
                  <option value="chapter">Chapter</option>
                </select>
              </div>
              <div>
                <label htmlFor="unit-parent" className="block text-sm font-medium text-foreground">
                  Parent Unit
                </label>
                <select
                  id="unit-parent"
                  value={formData.parent}
                  onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">None (root level)</option>
                  <option value="ou-1">Acme Corporation</option>
                  <option value="ou-2">Engineering</option>
                  <option value="ou-3">Product & Design</option>
                  <option value="ou-4">People & Operations</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
