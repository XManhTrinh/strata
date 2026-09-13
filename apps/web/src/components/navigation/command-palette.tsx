"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";

interface CommandItem {
  id: string;
  label: string;
  section: string;
  href?: string;
  action?: () => void;
  icon: string;
}

const commandItems: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", section: "Navigation", href: "/dashboard", icon: "📊" },
  { id: "people", label: "Members", section: "Navigation", href: "/people", icon: "👤" },
  { id: "org-chart", label: "Org Chart", section: "Navigation", href: "/org-chart", icon: "🏢" },
  { id: "budgets", label: "Budgets", section: "Navigation", href: "/budgets", icon: "💰" },
  { id: "capacity", label: "Capacity", section: "Navigation", href: "/capacity", icon: "📈" },
  { id: "calendar", label: "Calendar", section: "Navigation", href: "/calendar", icon: "📅" },
  { id: "settings", label: "Admin", section: "Navigation", href: "/admin", icon: "⚙️" },
];

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  if (lowerText.includes(lowerQuery)) return true;

  let qi = 0;
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      qi++;
    }
  }
  return qi === lowerQuery.length;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const reducedMotion = useReducedMotionContext();

  const filteredItems = query
    ? commandItems.filter((item) => fuzzyMatch(query, item.label))
    : commandItems;

  // Group by section
  const sections = filteredItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section]!.push(item);
    return acc;
  }, {});

  const flatItems = filteredItems;

  const executeItem = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery("");
      setSelectedIndex(0);
      if (item.href) {
        router.push(item.href);
      } else if (item.action) {
        item.action();
      }
    },
    [router]
  );

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation within the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (item) executeItem(item);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector("[data-selected='true']");
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-sm"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            onClick={() => {
              setOpen(false);
              setQuery("");
              setSelectedIndex(0);
            }}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-x-4 top-[20%] z-50 mx-auto max-w-lg rounded-lg border border-outline-variant bg-surface-container-low shadow-2xl overflow-hidden sm:inset-x-auto"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
          >
            {/* Search input */}
            <div className="flex items-center border-b border-outline-variant px-4">
              <span className="text-on-surface-variant mr-2" aria-hidden="true">🔎</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages, actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 h-12 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
                aria-label="Search commands"
                aria-activedescendant={flatItems[selectedIndex]?.id}
                role="combobox"
                aria-expanded="true"
                aria-controls="command-list"
                aria-autocomplete="list"
              />
              <kbd className="hidden sm:inline-block text-[10px] text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              id="command-list"
              ref={listRef}
              className="max-h-72 overflow-y-auto py-2"
              role="listbox"
            >
              {filteredItems.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-on-surface-variant">
                  No results found.
                </p>
              ) : (
                Object.entries(sections).map(([section, items]) => (
                  <div key={section}>
                    <div className="px-4 py-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      {section}
                    </div>
                    {items.map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          id={item.id}
                          data-selected={isSelected}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "text-on-surface hover:bg-secondary"
                          }`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => executeItem(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-outline-variant px-4 py-2 text-[11px] text-on-surface-variant">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
