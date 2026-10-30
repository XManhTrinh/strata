"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Tab, Tabs } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import type { Balance, BookableType, CalendarEntry, MyBooking, PendingApproval } from "../types";
import { ApprovalsList } from "./approvals-list";
import { BookDialog } from "./book-dialog";
import { MyTimeOff } from "./my-time-off";
import { TeamCalendar } from "./team-calendar";

export type TimeOffTab = "mine" | "approvals" | "calendar";

export function TimeOffPage(props: {
  tab: TimeOffTab;
  month: string;
  memberId: string;
  types: BookableType[];
  balances: Balance[];
  bookings: MyBooking[];
  approvals: PendingApproval[];
  canApprove: boolean;
  entries: CalendarEntry[];
}) {
  const t = useTranslations("timeOff");
  const router = useRouter();
  const pathname = usePathname();
  const [booking, setBooking] = useState(false);
  const href = (tab: TimeOffTab, month = props.month) =>
    `${pathname}?tab=${tab}${tab === "calendar" ? `&month=${month}` : ""}`;

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
            <Tab key="calendar" title={t("tabs.calendar")} />,
          ]}
        </Tabs>
        {props.types.length > 0 && (
          <Button
            variant="filled"
            leadingIcon={<Icon name="add" />}
            onPress={() => setBooking(true)}
          >
            {t("book")}
          </Button>
        )}
      </div>

      {props.tab === "mine" && <MyTimeOff balances={props.balances} bookings={props.bookings} />}
      {props.tab === "approvals" && <ApprovalsList approvals={props.approvals} />}
      {props.tab === "calendar" && (
        <TeamCalendar
          month={props.month}
          entries={props.entries}
          hrefFor={(month) => href("calendar", month)}
        />
      )}

      {booking && (
        <BookDialog
          memberId={props.memberId}
          types={props.types}
          balances={props.balances}
          onClose={() => setBooking(false)}
        />
      )}
    </div>
  );
}
