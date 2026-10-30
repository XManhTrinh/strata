"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Select, SelectItem, TextField } from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { adjustAllowance } from "../time-off-actions";
import type { Balance, MyBooking } from "../types";
import { MyTimeOff } from "./my-time-off";

/** A person's balances and bookings on their profile, with adjustments for those allowed. */
export function PersonTimeOff({
  memberId,
  balances,
  bookings,
  canAdjust,
}: {
  memberId: string;
  balances: Balance[];
  bookings: MyBooking[];
  canAdjust: boolean;
}) {
  const t = useTranslations("timeOff");
  const [adjusting, setAdjusting] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {canAdjust && balances.length > 0 && (
        <Button
          variant="tonal"
          className="self-start"
          leadingIcon={<Icon name="tune" />}
          onPress={() => setAdjusting(true)}
        >
          {t("adjust")}
        </Button>
      )}
      <MyTimeOff balances={balances} bookings={bookings} />
      {adjusting && (
        <FormDialog
          title={t("adjustTitle")}
          submitLabel={t("adjust")}
          action={adjustAllowance.bind(null, memberId)}
          done={() => t("adjusted")}
          onClose={() => setAdjusting(false)}
        >
          {(fieldError) => (
            <>
              <Select
                className="w-full"
                name="timeTypeId"
                label={t("type")}
                defaultValue={balances[0]?.timeTypeId}
              >
                {balances.map((b) => (
                  <SelectItem key={b.timeTypeId}>{b.name}</SelectItem>
                ))}
              </Select>
              <TextField
                className="w-full"
                name="days"
                type="number"
                inputMode="decimal"
                label={t("adjustDays")}
                invalid={Boolean(fieldError("days"))}
                errorMessage={fieldError("days")}
              />
              <TextField
                className="w-full"
                name="reason"
                label={t("adjustReason")}
                required
                invalid={Boolean(fieldError("reason"))}
                errorMessage={fieldError("reason")}
              />
            </>
          )}
        </FormDialog>
      )}
    </div>
  );
}
