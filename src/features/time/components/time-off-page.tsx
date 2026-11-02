"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, ButtonGroup, Tab, Tabs } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { type CalendarView, shiftDate, viewRange } from "../calendar-range";
import type {
  Balance,
  BookableType,
  CalendarEntry,
  MyBooking,
  PendingApproval,
  RoleChoice,
  TimeType,
} from "../types";
import { ApprovalsList } from "./approvals-list";
import type { FeedLink } from "../time-off-queries";
import { BookDialog } from "./book-dialog";
import { CalendarPanel, type LegendType } from "./calendar-panel";
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
  /** The workspace's time types and roles, for people who manage time settings. */
  timeSettings: { types: TimeType[]; roles: RoleChoice[] } | null;
}) {
  const t = useTranslations("timeOff");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  // The dialog is open, with the days chosen on the calendar when there are some.
  const [booking, setBooking] = useState<{ start?: string; end?: string } | null>(null);
  const href = (tab: TimeOffTab, view = props.view, date = props.date) =>
    `${pathname}?tab=${tab}${tab === "calendar" ? `&view=${view}&date=${date}` : ""}`;
  // Time types hidden on the calendar, chosen in the side panel's legend.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const legend: LegendType[] = [
    ...new Map(
      [
        ...(props.timeSettings?.types ?? props.types),
        ...props.entries.filter((e) => e.typeName),
      ].map((x) => {
        const name = "typeName" in x ? x.typeName! : x.name;
        return [name, { name, color: x.color, icon: x.icon }] as const;
      })
    ).values(),
  ];
  const entries = props.entries.filter((e) => !e.typeName || !hidden.has(e.typeName));
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
            // What My time off is mostly opened for, visible from every tab (on wide screens the
            // calendar's side panel shows it instead).
            <p
              className={`text-body-medium text-on-surface-variant ${props.tab === "calendar" ? "large:hidden" : ""}`}
            >
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
        <div className="large:grid large:grid-cols-[minmax(0,1fr)_18rem] large:items-start large:gap-6">
          <TeamCalendar
            controls={
              <ButtonGroup
                variant="connected"
                // A connected group fills its container by default; here it sits beside other controls.
                className="w-auto"
                selectionMode="single"
                aria-label={t("views.label")}
                selectedKeys={[props.view]}
                onSelectionChange={(keys) => {
                  const [key] = keys;
                  if (key) router.push(href("calendar", key as CalendarView));
                }}
              >
                {(["calendar", "month", "week", "list"] as const).map((v) => (
                  <Button key={v} toggle value={v}>
                    {t(`views.${v}`)}
                  </Button>
                ))}
              </ButtonGroup>
            }
            todayHref={href("calendar", props.view, new Date().toISOString().slice(0, 10))}
            view={props.view}
            date={props.date}
            onBook={props.types.length > 0 ? (start, end) => setBooking({ start, end }) : undefined}
            teamHref={(day) => href("calendar", "month", day)}
            from={range.from}
            to={range.to}
            entries={entries}
            previousHref={href("calendar", props.view, shiftDate(props.view, props.date, -1))}
            nextHref={href("calendar", props.view, shiftDate(props.view, props.date, 1))}
          />
          <div className="large:block hidden">
            <CalendarPanel
              balances={props.balances}
              approvals={props.canApprove ? props.approvals : null}
              approvalsHref={href("approvals")}
              myPending={props.bookings.filter((b) => b.status === "pending")}
              legend={legend}
              hidden={hidden}
              onToggle={(name) =>
                setHidden((current) => {
                  const next = new Set(current);
                  if (next.has(name)) next.delete(name);
                  else next.add(name);
                  return next;
                })
              }
              manage={props.timeSettings}
            />
          </div>
        </div>
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
