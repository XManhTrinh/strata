"use client";

import { useMemo, useRef, useState } from "react";

interface SquadPickerProps {
  squads: string[];
  allSquads: string[];
  onChange: (squads: string[]) => void;
}

export default function SquadPicker({ squads, allSquads = [], onChange }: SquadPickerProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const trimmed = input.trim();
  const isNew = trimmed !== "" && !allSquads.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  const suggestions = useMemo(() => {
    const q = trimmed.toLowerCase();
    return allSquads.filter(
      (s) => !squads.includes(s) && (q === "" || s.toLowerCase().includes(q))
    );
  }, [allSquads, squads, trimmed]);

  function add(value: string) {
    const v = value.trim();
    if (v && !squads.includes(v)) {
      onChange([...squads, v]);
    }
    setInput("");
    setOpen(false);
  }

  function remove(squad: string) {
    onChange(squads.filter((s) => s !== squad));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Squads
      </label>

      {squads.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {squads.map((squad) => (
            <span
              key={squad}
              className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded-full"
            >
              {squad}
              <button
                type="button"
                onClick={() => remove(squad)}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 leading-none"
                aria-label={`Remove ${squad}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={wrapperRef}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (trimmed) add(trimmed);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Type to search or add..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />

        {open && (suggestions.length > 0 || (isNew && trimmed)) && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-900 dark:text-gray-100 transition-colors"
              >
                {s}
              </button>
            ))}
            {isNew && trimmed && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(trimmed)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 transition-colors flex items-center gap-2"
              >
                <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-semibold px-1.5 py-0.5 rounded">NEW</span>
                Create &ldquo;{trimmed}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
