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
        className="rounded px-2 py-1 text-xs font-medium text-tertiary bg-tertiary-container hover:bg-tertiary-container dark:bg-tertiary-container/30 dark:hover:bg-tertiary-container/50 transition-colors"
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
        className="rounded px-2 py-1 text-xs font-medium text-error bg-error-container hover:bg-error-container dark:bg-error-container/30 dark:hover:bg-error-container/50 transition-colors"
        aria-label="Reject leave request"
      >
        Reject
      </button>
    </div>
  );
}
