"use client";

import { Person } from "@/lib/org-tree/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface GroupMoveModalProps {
  persons: Person[];
  targetName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function GroupMoveModal({
  persons,
  targetName,
  onConfirm,
  onCancel,
}: GroupMoveModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Move group
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {targetName
            ? <>Move the following <span className="font-medium text-gray-700 dark:text-gray-200">{persons.length}</span> people under <span className="font-medium text-gray-700 dark:text-gray-200">{targetName}</span>?</>
            : <>Move the following <span className="font-medium text-gray-700 dark:text-gray-200">{persons.length}</span> people to unallocated?</>
          }
        </p>

        <div className="max-h-48 overflow-y-auto space-y-2 mb-5">
          {persons.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={p.avatarUrl} alt={p.fullName} />
                <AvatarFallback>{p.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.fullName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.title}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Confirm move
          </button>
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
