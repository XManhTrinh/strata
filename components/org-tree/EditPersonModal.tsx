"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Person } from "@/lib/org-tree/types";
import SquadPicker from "./SquadPicker";

interface EditPersonModalProps {
  person: Person;
  allSquads: string[];
  onSubmit: (
    data: Partial<Pick<Person, "fullName" | "title" | "squads" | "salary">>
  ) => Promise<void>;
  onClose: () => void;
  error?: string | null;
}

export default function EditPersonModal({
  person,
  allSquads,
  onSubmit,
  onClose,
  error,
}: EditPersonModalProps) {
  const [fullName, setFullName] = useState(person.fullName);
  const [title, setTitle] = useState(person.title);
  const [salary, setSalary] = useState<number | "">(person.salary);
  const [squads, setSquads] = useState<string[]>([...person.squads]);
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
        salary: salary === "" ? 0 : salary,
        squads,
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
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Edit Person</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              {validationError && (
                <p className="text-red-500 text-xs mt-1">{validationError}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Salary
              </label>
              <input
                type="number"
                value={salary}
                onChange={(e) =>
                  setSalary(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                min={0}
              />
            </div>

            {/* Squads */}
            <SquadPicker squads={squads} allSquads={allSquads} onChange={setSquads} />

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
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
