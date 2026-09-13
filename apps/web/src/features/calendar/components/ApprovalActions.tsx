"use client";

import { Button } from "@vkieu/mui/buttons";

interface ApprovalActionsProps {
  eventId: string;
  onApprove: (eventId: string) => void;
  onReject: (eventId: string) => void;
}

export function ApprovalActions({ eventId, onApprove, onReject }: ApprovalActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="tonal"
        size="xs"
        className="text-tertiary bg-tertiary-container hover:bg-tertiary-container dark:bg-tertiary-container/30 dark:hover:bg-tertiary-container/50"
        onClick={(e) => {
          e.stopPropagation();
          onApprove(eventId);
        }}
        aria-label="Approve leave request"
      >
        Approve
      </Button>
      <Button
        variant="tonal"
        size="xs"
        className="text-error bg-error-container hover:bg-error-container dark:bg-error-container/30 dark:hover:bg-error-container/50"
        onClick={(e) => {
          e.stopPropagation();
          onReject(eventId);
        }}
        aria-label="Reject leave request"
      >
        Reject
      </Button>
    </div>
  );
}
