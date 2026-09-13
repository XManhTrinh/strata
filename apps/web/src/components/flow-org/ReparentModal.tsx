"use client";

import { useState, useMemo } from "react";
import { Person } from "@/lib/org-tree/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = getInitials(name);
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0 overflow-hidden">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

interface ReparentModalProps {
  personName: string;
  directReportCount: number;
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
        (q === "" ||
          p.fullName.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q))
    );
  }, [persons, draggedId, search]);

  if (showPicker) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-inverse-surface/40" onClick={onCancel} />
        <div className="relative bg-surfacerounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
          <h3 className="text-base font-semibold text-on-surface mb-2">
            Reassign {directReportCount}{" "}
            {directReportCount === 1 ? "report" : "reports"}
          </h3>
          <p className="text-sm text-on-surface-variant mb-3">
            Choose who should manage {personName}&apos;s direct reports:
          </p>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or title..."
            autoFocus
            className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-on-surface placeholder:text-on-surface-variant dark:placeholder:text-on-surface-variant"
          />

          <div className="max-h-52 overflow-y-auto space-y-1 mb-4">
            {filteredPersons.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-4">
                No matches
              </p>
            ) : (
              filteredPersons.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onReassignReports(p.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary-container dark:hover:bg-primary-container/30 transition-colors flex items-center gap-2"
                >
                  <Avatar name={p.fullName} avatarUrl={p.avatarUrl} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">
                      {p.fullName}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {p.title}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg text-on-surface-variant hover:text-on-surface dark:hover:text-outline-variant transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-inverse-surface/40" onClick={onCancel} />
      <div className="relative bg-surfacerounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-on-surface mb-2">
          Move {personName}
        </h3>
        <p className="text-sm text-on-surface-variant mb-5">
          {personName} has{" "}
          <span className="font-medium text-on-surface">
            {directReportCount}
          </span>{" "}
          direct {directReportCount === 1 ? "report" : "reports"}. What should
          happen to them?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onMoveWithReports}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary text-on-primary transition-colors"
          >
            Move together with reports
          </button>
          <button
            type="button"
            onClick={onLeaveReports}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-surface-container-low hover:bg-surface-variant dark:hover:bg-surface-container-high text-on-surface transition-colors"
          >
            Leave reports under current parent
          </button>
          {targetIsUnallocated && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-surface-container-low hover:bg-surface-variant dark:hover:bg-surface-container-high text-on-surface transition-colors"
            >
              Reassign reports to a specific person
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg text-on-surface-variant hover:text-on-surface dark:hover:text-outline-variant transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
