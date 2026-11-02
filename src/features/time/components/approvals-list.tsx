"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  TextField,
} from "@windmorph/react";
import { useRunAction } from "@/features/structure/use-run-action";
import { decideBooking } from "../time-off-actions";
import type { PendingApproval } from "../types";
import { useBookingDates } from "./date-range";

/** Requests waiting for the signed-in approver: approve straight away, or decline with a reason. */
export function ApprovalsList({ approvals }: { approvals: PendingApproval[] }) {
  const t = useTranslations("timeOff");
  const tc = useTranslations("common");
  const format = useFormatter();
  const dates = useBookingDates();
  const [run, pending] = useRunAction();
  const [declining, setDeclining] = useState<PendingApproval | null>(null);
  const [comment, setComment] = useState("");

  if (approvals.length === 0) {
    return <p className="text-body-medium text-on-surface-variant">{t("approvals.empty")}</p>;
  }
  return (
    <>
      <List aria-label={t("tabs.approvals")} className="max-w-form">
        {approvals.map((a) => (
          <ListItem
            key={a.bookingId}
            textValue={t("approvals.for", { name: a.memberName, type: a.typeName })}
            supportingText={[dates(a), t("days", { days: a.workingDays }), a.notes]
              .filter(Boolean)
              .join(" · ")}
            trailing={
              <div className="flex gap-2">
                <Button
                  variant="text"
                  onPress={() => {
                    setComment("");
                    setDeclining(a);
                  }}
                >
                  {t("approvals.reject")}
                </Button>
                <Button
                  variant="tonal"
                  pending={pending}
                  onPress={() =>
                    run(() => decideBooking(a.bookingId, true, ""), t("approvals.approved"))
                  }
                >
                  {t("approvals.approve")}
                </Button>
              </div>
            }
          >
            {t("approvals.for", { name: a.memberName, type: a.typeName })}
          </ListItem>
        ))}
      </List>
      {declining && (
        <Dialog open onOpenChange={(open) => !open && setDeclining(null)}>
          <DialogTitle>{t("approvals.rejectTitle")}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <p className="text-body-medium">
              {t("approvals.for", { name: declining.memberName, type: declining.typeName })}
            </p>
            <TextField
              className="w-full"
              label={t("approvals.comment")}
              value={comment}
              onChange={setComment}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="text" onPress={() => setDeclining(null)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="text"
              onPress={() => {
                run(
                  () => decideBooking(declining.bookingId, false, comment),
                  t("approvals.rejected")
                );
                setDeclining(null);
              }}
            >
              {t("approvals.reject")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
