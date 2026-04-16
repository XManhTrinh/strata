"use client";

import { useMemo, useState } from "react";
import { MockPersonRepository } from "@/lib/org-tree/MockPersonRepository";
import { MockAIProvider } from "@/lib/org-tree/MockAIProvider";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { Person } from "@/lib/org-tree/types";
import { buildSquadTree } from "@/lib/org-tree/tree";
import OrgTreeDndWrapper from "@/components/org-tree/OrgTreeDndWrapper";
import EditPersonModal from "@/components/org-tree/EditPersonModal";
import CreatePersonModal from "@/components/org-tree/CreatePersonModal";
import AIChatPanel from "@/components/org-tree/AIChatPanel";

const ALL_SQUADS = [
  "PLP", "PDP", "Order Management", "Checkout",
  "Basket", "Search", "Navigation", "Learn", "Platform", "L2",
];

export default function OrgTreePage() {
  const repository = useMemo(() => new MockPersonRepository(), []);
  const aiProvider = useMemo(() => new MockAIProvider(), []);

  const { tree, unallocated, persons, loading, error, reparent, editPerson, createPerson } =
    useOrgTree(repository);

  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Selected squads — empty set means "All"
  const [selectedSquads, setSelectedSquads] = useState<Set<string>>(new Set());

  // Search state
  const [search, setSearch] = useState("");

  function toggleSquad(squad: string) {
    setSelectedSquads((prev) => {
      const next = new Set(prev);
      next.has(squad) ? next.delete(squad) : next.add(squad);
      return next;
    });
  }

  function clearSquads() {
    setSelectedSquads(new Set());
  }

  const isAllView = selectedSquads.size === 0;

  // Build the tree for the active view
  const activeTree = useMemo(() => {
    if (isAllView) return tree;
    return buildSquadTree(persons, Array.from(selectedSquads));
  }, [isAllView, selectedSquads, tree, persons]);

  const activeUnallocated = unallocated;

  // Unique member count for selected squads (union, no duplicates)
  const selectedMemberCount = useMemo(() => {
    if (isAllView) return persons.length;
    const ids = new Set(
      persons
        .filter((p) => p.squads.some((s) => selectedSquads.has(s)))
        .map((p) => p.id)
    );
    return ids.size;
  }, [isAllView, selectedSquads, persons]);

  // Compute matched person ids from search
  const matchedIds = useMemo<Set<string>>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set();
    return new Set(
      persons
        .filter((p) => p.fullName.toLowerCase().includes(q))
        .map((p) => p.id)
    );
  }, [persons, search]);

  // All known squad names (static list + any from data)
  const allSquads = useMemo(() => {
    const fromData = new Set(persons.flatMap((p) => p.squads));
    ALL_SQUADS.forEach((s) => fromData.add(s));
    return Array.from(fromData).sort();
  }, [persons]);

  // Member count per squad for badges
  const squadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const squad of ALL_SQUADS) {
      counts[squad] = persons.filter((p) => p.squads.includes(squad)).length;
    }
    return counts;
  }, [persons]);

  async function handleEdit(
    data: Partial<Pick<Person, "fullName" | "title" | "squads" | "salary">>
  ) {
    if (!editingPerson) return;
    setEditError(null);
    try {
      await editPerson(editingPerson.id, data);
      setEditingPerson(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update person.");
      throw err;
    }
  }

  async function handleCreate(data: {
    fullName: string;
    title: string;
    squads?: string[];
    salary?: number;
    parentId?: string | null;
  }) {
    setCreateError(null);
    try {
      await createPerson(data);
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create person.");
      throw err;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 shrink-0">Org Tree</h1>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setCreateError(null); setShowCreate(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            + Add Person
          </button>
        </div>

        {/* Squad tabs — multi-select */}
        <div className="px-6 flex items-center gap-1 overflow-x-auto pb-px scrollbar-hide">
          {/* All button */}
          <button
            type="button"
            onClick={clearSquads}
            className={[
              "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              isAllView
                ? "border-blue-600 text-blue-500"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600",
            ].join(" ")}
          >
            All
            <span className={[
              "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
              isAllView ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
            ].join(" ")}>
              {persons.length}
            </span>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />

          {ALL_SQUADS.map((squad) => {
            const active = selectedSquads.has(squad);
            return (
              <button
                key={squad}
                type="button"
                onClick={() => toggleSquad(squad)}
                className={[
                  "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-indigo-600 text-indigo-500"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600",
                ].join(" ")}
              >
                {squad}
                <span className={[
                  "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                  active ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                ].join(" ")}>
                  {squadCounts[squad]}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Status bar */}
      <div className="px-6 pt-3 pb-0 flex items-center gap-3 min-h-[28px]">
        {!isAllView && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">{selectedMemberCount}</span>{" "}
            {selectedMemberCount === 1 ? "person" : "people"} across{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {Array.from(selectedSquads).join(", ")}
            </span>
            {" "}—{" "}
            <button
              type="button"
              onClick={clearSquads}
              className="text-indigo-500 hover:text-indigo-400 underline underline-offset-2"
            >
              clear
            </button>
          </p>
        )}
        {search.trim() && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {matchedIds.size === 0
              ? "No matches"
              : `${matchedIds.size} ${matchedIds.size === 1 ? "person" : "people"} highlighted`}
          </p>
        )}
      </div>

      {/* Main content */}
      <main className="p-6">
        <OrgTreeDndWrapper
          tree={activeTree}
          unallocated={activeUnallocated}
          persons={persons}
          loading={loading}
          error={error}
          onEdit={(person) => { setEditError(null); setEditingPerson(person); }}
          reparent={reparent}
          matchedIds={matchedIds}
        />
      </main>

      {editingPerson && (
        <EditPersonModal
          person={editingPerson}
          allSquads={allSquads}
          onSubmit={handleEdit}
          onClose={() => { setEditingPerson(null); setEditError(null); }}
          error={editError}
        />
      )}

      {showCreate && (
        <CreatePersonModal
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setCreateError(null); }}
          error={createError}
          persons={persons}
          allSquads={allSquads}
        />
      )}

      <AIChatPanel provider={aiProvider} persons={persons} />
    </div>
  );
}
