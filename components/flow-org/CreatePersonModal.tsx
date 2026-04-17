"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Person } from "@/lib/org-tree/types";
import SquadPicker from "./SquadPicker";
import PersonPicker from "./PersonPicker";

interface CreatePersonModalProps {
  onSubmit: (data: {
    fullName: string;
    title: string;
    squads?: string[];
    salary?: number;
    parentId?: string | null;
  }) => Promise<void>;
  onClose: () => void;
  error?: string | null;
  persons: Person[];
  allSquads: string[];
}

export default function CreatePersonModal({
  onSubmit,
  onClose,
  error,
  persons,
  allSquads,
}: CreatePersonModalProps) {
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [salary, setSalary] = useState<number | "">("");
  const [squads, setSquads] = useState<string[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setValidationError("Full name is required.");
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        title: title.trim(),
        salary: salary === "" ? undefined : salary,
        squads: squads.length > 0 ? squads : undefined,
        parentId,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          key="modal"
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Person</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {validationError && (
                <p className="text-red-500 text-xs mt-1">{validationError}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary
              </label>
              <input
                type="number"
                value={salary}
                onChange={(e) =>
                  setSalary(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            </div>

            {/* Squads */}
            <SquadPicker squads={squads} allSquads={allSquads} onChange={setSquads} />

            {/* Parent selector */}
            <PersonPicker
              label="Reports to (optional)"
              persons={persons}
              value={parentId}
              onChange={setParentId}
              placeholder="Search for a manager..."
            />

            {/* Repository error */}
            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
