"use client";

interface ApprovalActionsProps {
  eventId: string;
  onApprove: (eventId: string) => void;
  onReject: (eventId: string) => void;
}

export function ApprovalActions({ eventId, onApprove, onReject }: ApprovalActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onApprove(eventId);
        }}
        className="rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 transition-colors"
        aria-label="Approve leave request"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReject(eventId);
        }}
        className="rounded px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
        aria-label="Reject leave request"
      >
        Reject
      </button>
    </div>
  );
}
