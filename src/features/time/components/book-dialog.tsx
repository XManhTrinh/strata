"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Select, SelectItem, Switch, TextField } from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { PeoplePicker } from "@/features/people/components/people-picker";
import { PersonPicker } from "@/features/people/components/person-picker";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { bookTime, previewWorkingDays } from "../time-off-actions";
import type { Balance, BookableType } from "../types";

/** Books time for the signed-in person, showing the working days and what's left as they choose. */
export function BookDialog({
  memberId,
  myName,
  canBookForOthers,
  types,
  balances,
  onClose,
}: {
  memberId: string;
  myName: string;
  /** Holds time.book_for_others (the database checks for whom). */
  canBookForOthers: boolean;
  types: BookableType[];
  balances: Balance[];
  onClose: () => void;
}) {
  const t = useTranslations("timeOff");
  const { workspace } = useWorkspace();
  const today = new Date().toISOString().slice(0, 10);
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [startAfternoon, setStartAfternoon] = useState(false);
  const [endMorning, setEndMorning] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [repeat, setRepeat] = useState("none");
  const type = types.find((x) => x.id === typeId);
  const balance = balances.find((b) => b.timeTypeId === typeId);
  const startHalf = startAfternoon ? "afternoon" : "full";
  const endHalf = endMorning ? "morning" : "full";

  // The working days this would take, from the person's schedule and holidays.
  useEffect(() => {
    let current = true;
    if (end < start) return;
    void previewWorkingDays(memberId, start, startHalf, end, endHalf).then(
      (n) => current && setDays(n)
    );
    return () => {
      current = false;
    };
  }, [memberId, start, end, startHalf, endHalf]);

  return (
    <FormDialog
      title={t("bookTitle")}
      submitLabel={t("book")}
      action={bookTime.bind(null, workspace.id)}
      done={() => t(type?.needsApproval ? "requested" : "booked")}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          {/* Leave and requests are for one person; events can be for several. */}
          {!canBookForOthers || !type?.bookForOthers ? (
            <input type="hidden" name="memberIds" value={memberId} />
          ) : type.usesAllowance || type.needsApproval ? (
            <PersonPicker
              key={type.id}
              name="memberIds"
              label={t("who")}
              defaultValue={{ id: memberId, name: myName }}
              errorMessage={fieldError("memberIds")}
            />
          ) : (
            <PeoplePicker
              key={type.id}
              name="memberIds"
              label={t("whoPeople")}
              defaultValue={[{ id: memberId, name: myName }]}
              errorMessage={fieldError("memberIds")}
            />
          )}
          <Select
            className="w-full"
            name="timeTypeId"
            label={t("type")}
            value={typeId}
            onChange={(key) => key != null && setTypeId(String(key))}
          >
            {types.map((x) => (
              <SelectItem key={x.id} textValue={x.name} leadingIcon={<Icon name={x.icon} />}>
                {x.name}
              </SelectItem>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <IsoDateField
              name="startDate"
              label={t("from")}
              defaultValue={start}
              required
              onChange={(v) => v && setStart(v)}
              errorMessage={fieldError("startDate")}
            />
            <IsoDateField
              name="endDate"
              label={t("to")}
              defaultValue={end}
              min={start}
              required
              onChange={(v) => v && setEnd(v)}
              errorMessage={fieldError("endDate")}
            />
          </div>
          <Switch checked={startAfternoon} onCheckedChange={setStartAfternoon}>
            {t("startAfternoon")}
          </Switch>
          <Switch checked={endMorning} onCheckedChange={setEndMorning}>
            {t("endMorning")}
          </Switch>
          <input type="hidden" name="startHalf" value={startHalf} />
          <input type="hidden" name="endHalf" value={endHalf} />
          {days !== null && end >= start && (
            <p className="text-title-medium text-on-surface" aria-live="polite">
              {t("days", { days })}
              {type?.usesAllowance && balance && (
                <span className="text-body-medium text-on-surface-variant ms-2">
                  {t("daysLeft", { available: balance.available - days })}
                </span>
              )}
            </p>
          )}
          {!type?.usesAllowance && (
            <TextField className="w-full" name="title" label={t("titleField")} />
          )}
          {type?.allowsRecurrence && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                className="w-full"
                name="repeat"
                label={t("repeat")}
                value={repeat}
                onChange={(key) => key != null && setRepeat(String(key))}
              >
                {(["none", "weekly", "fortnightly", "monthly"] as const).map((r) => (
                  <SelectItem key={r}>{t(`repeats.${r}`)}</SelectItem>
                ))}
              </Select>
              {repeat !== "none" && (
                <IsoDateField
                  name="repeatUntil"
                  label={t("repeatUntil")}
                  defaultValue={null}
                  min={start}
                />
              )}
            </div>
          )}
          <TextField className="w-full" name="notes" label={t("notes")} multiline rows={2} />
        </>
      )}
    </FormDialog>
  );
}
