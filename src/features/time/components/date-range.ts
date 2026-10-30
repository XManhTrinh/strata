"use client";

import { useFormatter, useTranslations } from "next-intl";

type Span = { startDate: string; endDate: string; startHalf: string; endHalf: string };

/** "3 Mar 2027", "3 Mar 2027, afternoon" or "3 Mar 2027 – 5 Mar 2027" for a booking. */
export function useBookingDates(): (b: Span) => string {
  const t = useTranslations("timeOff");
  const format = useFormatter();
  const date = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return (b) => {
    if (b.startDate !== b.endDate)
      return t("range.span", { from: date(b.startDate), to: date(b.endDate) });
    if (b.startHalf === "afternoon")
      return t("range.halfDay", { date: date(b.startDate), half: t("halves.afternoon") });
    if (b.endHalf === "morning")
      return t("range.halfDay", { date: date(b.startDate), half: t("halves.morning") });
    return t("range.oneDay", { date: date(b.startDate) });
  };
}
