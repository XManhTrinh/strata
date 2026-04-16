"use client";

import { useMemo, useState } from "react";
import { Person } from "@/lib/org-tree/types";

interface PersonPickerProps {
  label: string;
  persons: Person[];
  value: string | null;
  onChange: (id: string | null) => void;
  excludeId?: string;
  placeholder?: string;
}

export default function PersonPicker({
  label,
  persons,
  value,
  onChange,
  excludeId,
  placeholder = "Search by name or title...",
}: PersonPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selected = value ? persons.find((p) => p.id === value) : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return persons.filter(
      (p) =>
        p.id !== excludeId &&
        (q === "" ||
          p.fullName.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q))
    );
  }, [persons, excludeId, search]);

  function select(id: string | null) {
    onChange(id);
    setSearch("");
    setOpen(false);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>

      {selected ? (
        <div className="flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {selected.fullName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {selected.title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => select(null)}
            className="shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            aria-label="Clear selection"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />

          {open && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(null)}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                — None (unallocated) —
              </button>
              {filtered.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-3">
                  No matches
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(p.id)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {p.fullName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {p.title}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
