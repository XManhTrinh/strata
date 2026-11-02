"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Select, SelectItem, Tab, Tabs } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { type CalendarView, shiftDate, viewRange } from "../calendar-range";
import type { Balance, BookableType, CalendarEntry, MyBooking, PendingApproval } from "../types";
import { ApprovalsList } from "./approvals-list";
import type { FeedLink } from "../time-off-queries";
import { BookDialog } from "./book-dialog";
import { FeedLinks } from "./feed-links";
import { MyTimeOff } from "./my-time-off";
import { TeamCalendar } from "./team-calendar";

export type TimeOffTab = "mine" | "approvals" | "calendar";

export function TimeOffPage(props: {
  tab: TimeOffTab;
  view: CalendarView;
  /** The date the calendar is showing around. */
  date: string;
  weekStart: number;
  memberId: string;
  myName: string;
  canBookForOthers: boolean;
  types: BookableType[];
  balances: Balance[];
  bookings: MyBooking[];
  approvals: PendingApproval[];
  canApprove: boolean;
  entries: CalendarEntry[];
  feeds: FeedLink[];
}) {
  const t = useTranslations("timeOff");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  // The dialog is open, with the days chosen on the calendar when there are some.
  const [booking, setBooking] = useState<{ start?: string; end?: string } | null>(null);
  const href = (tab: TimeOffTab, view = props.view, date = props.date) =>
    `${pathname}?tab=${tab}${tab === "calendar" ? `&view=${view}&date=${date}` : ""}`;
  const range = viewRange(props.view, props.date, props.weekStart);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="secondary"
          align="start"
          aria-label={t("title")}
          value={props.tab}
          onChange={(key) => router.push(href(key as TimeOffTab))}
        >
          {[
            <Tab key="calendar" title={t("tabs.calendar")} />,
            <Tab key="mine" title={t("tabs.mine")} />,
            ...(props.canApprove
              ? [
                  <Tab
                    key="approvals"
                    title={
                      props.approvals.length
                        ? t("approvalsCount", { count: props.approvals.length })
                        : t("tabs.approvals")
                    }
                  />,
                ]
              : []),
          ]}
        </Tabs>
        <div className="flex flex-wrap items-center gap-4">
          {props.balances.length > 0 && (
            // What My time off is mostly opened for, visible from every tab.
            <p className="text-body-medium text-on-surface-variant">
              {props.balances
                .map((b) => t("balanceLine", { name: b.name, days: format.number(b.available) }))
                .join(" · ")}
            </p>
          )}
          {props.types.length > 0 && (
            <Button
              variant="filled"
              leadingIcon={<Icon name="add" />}
              onPress={() => setBooking({})}
            >
              {t("book")}
            </Button>
          )}
        </div>
      </div>

      {props.tab === "mine" && (
        <>
          <MyTimeOff balances={props.balances} bookings={props.bookings} />
          <FeedLinks feeds={props.feeds} />
        </>
      )}
      {props.tab === "approvals" && <ApprovalsList approvals={props.approvals} />}
      {props.tab === "calendar" && (
        <>
          <TeamCalendar
            controls={
              <Select
                className="w-40"
                label={t("views.label")}
                value={props.view}
                onChange={(key) =>
                  key != null && router.push(href("calendar", key as CalendarView))
                }
              >
                {(["calendar", "month", "week", "list"] as const).map((v) => (
                  <SelectItem key={v}>{t(`views.${v}`)}</SelectItem>
                ))}
              </Select>
            }
            todayHref={href("calendar", props.view, new Date().toISOString().slice(0, 10))}
            view={props.view}
            date={props.date}
            onBook={props.types.length > 0 ? (start, end) => setBooking({ start, end }) : undefined}
            teamHref={(day) => href("calendar", "month", day)}
            from={range.from}
            to={range.to}
            entries={props.entries}
            previousHref={href("calendar", props.view, shiftDate(props.view, props.date, -1))}
            nextHref={href("calendar", props.view, shiftDate(props.view, props.date, 1))}
          />
        </>
      )}

      {booking && (
        <BookDialog
          initialStart={booking.start}
          initialEnd={booking.end}
          memberId={props.memberId}
          myName={props.myName}
          canBookForOthers={props.canBookForOthers}
          types={props.types}
          balances={props.balances}
          onClose={() => setBooking(null)}
        />
      )}
    </div>
  );
}
