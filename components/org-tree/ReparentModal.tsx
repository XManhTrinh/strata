"use client";

import { useState, useMemo } from "react";
import { Person } from "@/lib/org-tree/types";

interface ReparentModalProps {
  personName: string;
  directReportCount: number;
  /** null when moving to unallocated */
  targetIsUnallocated: boolean;
  persons: Person[];
  draggedId: string;
  onMoveWithReports: () => void;
  onLeaveReports: () => void;
  onReassignReports: (newParentId: string) => void;
  onCancel: () => void;
}

export default function ReparentModal({
  personName,
  directReportCount,
  targetIsUnallocated,
  persons,
  draggedId,
  onMoveWithReports,
  onLeaveReports,
  onReassignReports,
  onCancel,
}: ReparentModalProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPersons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return persons.filter(
      (p) =>
        p.id !== draggedId &&
        (q === "" || p.fullName.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
    );
  }, [persons, draggedId, search]);

  if (showPicker) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Reassign {directReportCount} {directReportCount === 1 ? "report" : "reports"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Choose who should manage {personName}&apos;s direct reports:
          </p>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or title..."
            autoFocus
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />

          <div className="max-h-52 overflow-y-auto space-y-1 mb-4">
            {filteredPersons.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">No matches</p>
            ) : (
              filteredPersons.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onReassignReports(p.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.title}</p>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Move {personName}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {personName} has{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {directReportCount}
          </span>{" "}
          direct {directReportCount === 1 ? "report" : "reports"}. What should
          happen to them?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onMoveWithReports}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Move together with reports
          </button>
          <button
            type="button"
            onClick={onLeaveReports}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
          >
            Leave reports under current parent
          </button>
          {targetIsUnallocated && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
            >
              Reassign reports to a specific person
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
