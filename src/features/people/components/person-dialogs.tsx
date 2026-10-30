"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { changeJob, changePay, updatePersonDetails } from "../actions";
import type { JobChoices, PersonProfile } from "../types";
import { JobFields } from "./job-fields";

const today = () => new Date().toISOString().slice(0, 10);

export function DetailsDialog({ person, onClose }: { person: PersonProfile; onClose: () => void }) {
  const t = useTranslations("person");
  return (
    <FormDialog
      title={t("details.edit")}
      submitLabel={t("save")}
      action={updatePersonDetails.bind(null, person.id)}
      done={() => t("details.saved")}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <TextField
            className="w-full"
            name="fullName"
            label={t("details.fullName")}
            required
            defaultValue={person.fullName}
            invalid={Boolean(fieldError("fullName"))}
            errorMessage={fieldError("fullName")}
          />
          <TextField
            className="w-full"
            name="email"
            type="email"
            label={t("details.email")}
            defaultValue={person.email ?? ""}
            invalid={Boolean(fieldError("email"))}
            errorMessage={fieldError("email")}
          />
          <TextField
            className="w-full"
            name="personKey"
            label={t("details.personKey")}
            supportingText={t("details.personKeyHelp")}
            defaultValue={person.personKey ?? ""}
            invalid={Boolean(fieldError("personKey"))}
            errorMessage={fieldError("personKey")}
          />
          <IsoDateField
            name="startDate"
            label={t("details.startDate")}
            defaultValue={person.startDate}
            errorMessage={fieldError("startDate")}
          />
        </>
      )}
    </FormDialog>
  );
}

/** A dated job change, starting from today's record. */
export function JobDialog({
  person,
  choices,
  onClose,
}: {
  person: PersonProfile;
  choices: JobChoices;
  onClose: () => void;
}) {
  const t = useTranslations("person.jobRecord");
  const tp = useTranslations("person");
  const now = today();
  const current = person.jobs.find((j) => j.validFrom <= now && (!j.validTo || j.validTo > now));
  return (
    <FormDialog
      title={t("changeTitle")}
      submitLabel={tp("save")}
      action={changeJob.bind(null, person.id)}
      done={() => t("saved")}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <IsoDateField
            name="validFrom"
            label={t("effective")}
            supportingText={t("effectiveHelp")}
            defaultValue={now}
            required
            errorMessage={fieldError("validFrom")}
          />
          <JobFields
            choices={choices}
            current={current ?? person.jobs[0]}
            memberId={person.id}
            fieldError={fieldError}
          />
        </>
      )}
    </FormDialog>
  );
}

export function PayDialog({ person, onClose }: { person: PersonProfile; onClose: () => void }) {
  const t = useTranslations("person.pay");
  const tp = useTranslations("person");
  const latest = person.pay?.[0];
  return (
    <FormDialog
      title={t("changeTitle")}
      submitLabel={tp("save")}
      action={changePay.bind(null, person.id)}
      done={() => t("saved")}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <IsoDateField
            name="validFrom"
            label={tp("jobRecord.effective")}
            defaultValue={today()}
            required
            errorMessage={fieldError("validFrom")}
          />
          <TextField
            className="w-full"
            name="annualSalary"
            type="number"
            inputMode="decimal"
            label={t("salary")}
            defaultValue={latest?.annualSalary?.toString() ?? ""}
            invalid={Boolean(fieldError("annualSalary"))}
            errorMessage={fieldError("annualSalary")}
          />
          <TextField
            className="w-full"
            name="dayRate"
            type="number"
            inputMode="decimal"
            label={t("dayRate")}
            defaultValue={latest?.dayRate?.toString() ?? ""}
            invalid={Boolean(fieldError("dayRate"))}
            errorMessage={fieldError("dayRate")}
          />
          <TextField
            className="w-full"
            name="currency"
            label={t("currency")}
            defaultValue={latest?.currency ?? person.currency}
            invalid={Boolean(fieldError("currency"))}
            errorMessage={fieldError("currency")}
          />
        </>
      )}
    </FormDialog>
  );
}
