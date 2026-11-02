"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Card } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { PageHeader } from "@/components/shell/page-header";
import { Icon } from "@/components/ui/icon";
import type { HomeSummary } from "../home-summary";
import { useWorkspace } from "../workspace-context";

/** Home: the cards for your role, from `home_summary` (each appears only when you may see it). */
export function DashboardPage({ summary }: { summary: HomeSummary }) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const { workspace, user } = useWorkspace();
  const base = `/w/${workspace.slug}`;
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const dates = (from: string, to: string) =>
    from === to ? day(from) : `${day(from)} – ${day(to)}`;
  const empty = !summary.me && !summary.team && !summary.org;

  return (
    <>
      <PageHeader title={workspace.name} />
      <div className="medium:p-6 flex flex-col gap-6 p-4">
        <h2 className="text-headline-small text-on-surface">
          {t("welcome", { name: user.fullName })}
        </h2>
        {empty ? (
          <EmptyState
            variant="filled"
            titleAs="h3"
            icon={<Icon name="rocket_launch" />}
            title={t("emptyTitle")}
            description={t("emptyBody")}
          />
        ) : (
          <div className="expanded:grid-cols-2 large:grid-cols-3 grid items-start gap-4">
            {summary.me && (
              <HomeCard title={t("me.title")} icon="beach_access">
                {summary.me.balances.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {summary.me.balances.map((b) => (
                      <li key={b.name} className="flex items-baseline justify-between gap-4">
                        <span className="text-body-medium text-on-surface-variant">{b.name}</span>
                        <span className="text-title-large text-on-surface">
                          {t("me.daysLeft", { days: format.number(b.available) })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <h4 className="text-title-small text-on-surface mt-2">{t("me.next")}</h4>
                {summary.me.upcoming.length === 0 ? (
                  <p className="text-body-medium text-on-surface-variant">
                    {t("me.nothingBooked")}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {summary.me.upcoming.map((b) => (
                      <li
                        key={`${b.start_date}-${b.type}-${b.title}`}
                        className="text-body-medium text-on-surface"
                      >
                        {b.title ?? b.type ?? t("me.busy")}
                        <span className="text-on-surface-variant">
                          {" · "}
                          {dates(b.start_date, b.end_date)}
                          {b.status === "pending" && ` · ${t("me.waiting")}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="tonal" className="mt-2 self-start" href={`${base}/time-off`}>
                  {t("me.book")}
                </Button>
              </HomeCard>
            )}

            {summary.team && (
              <HomeCard title={t("team.title")} icon="event_busy">
                {summary.team.approvals ? (
                  <Button
                    variant="filled"
                    className="self-start"
                    href={`${base}/time-off?tab=approvals`}
                  >
                    {t("team.approvals", { count: summary.team.approvals })}
                  </Button>
                ) : null}
                {summary.team.away.length === 0 ? (
                  <p className="text-body-medium text-on-surface-variant">{t("team.nobodyAway")}</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {summary.team.away.map((a) => (
                      <li
                        key={`${a.name}-${a.start_date}`}
                        className="text-body-medium text-on-surface"
                      >
                        {a.name}
                        <span className="text-on-surface-variant">
                          {t("team.detail", {
                            type: a.type ?? t("me.busy"),
                            dates: dates(a.start_date, a.end_date),
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="text"
                  className="self-start"
                  href={`${base}/time-off?tab=calendar`}
                >
                  {summary.team.away_count > summary.team.away.length
                    ? t("team.more", { count: summary.team.away_count - summary.team.away.length })
                    : t("team.calendar")}
                </Button>
              </HomeCard>
            )}

            {summary.org && (
              <HomeCard title={t("org.title")} icon="groups">
                <div className="flex flex-wrap gap-6">
                  <Figure label={t("org.headcount")} value={format.number(summary.org.headcount)} />
                  <Figure label={t("org.starters")} value={format.number(summary.org.starters)} />
                  <Figure label={t("org.leavers")} value={format.number(summary.org.leavers)} />
                </div>
                {summary.org.units.length > 0 && (
                  <Bars
                    label={t("org.byUnit")}
                    rows={summary.org.units.map((u) => ({
                      name: u.name,
                      value: u.people,
                      text: format.number(u.people),
                    }))}
                  />
                )}
              </HomeCard>
            )}

            {summary.org?.plan && (
              <HomeCard
                title={t("plan.title", { name: summary.org.plan.scenario })}
                icon="insights"
              >
                <Bars
                  label={t("plan.byUnit")}
                  rows={summary.org.plan.units.map((u) => ({
                    name: u.name,
                    value: u.fte,
                    text:
                      u.cost === null
                        ? t("plan.fte", { fte: format.number(u.fte, { maximumFractionDigits: 1 }) })
                        : t("plan.fteCost", {
                            fte: format.number(u.fte, { maximumFractionDigits: 1 }),
                            cost: format.number(u.cost, {
                              style: "currency",
                              currency: u.currency,
                              maximumFractionDigits: 0,
                            }),
                          }),
                  }))}
                />
                <Button variant="text" className="self-start" href={`${base}/planning/totals`}>
                  {t("plan.open")}
                </Button>
              </HomeCard>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function HomeCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <Card variant="outlined" className="flex flex-col gap-3 p-4">
      <h3 className="text-title-medium text-on-surface flex items-center gap-2">
        <Icon name={icon} />
        {title}
      </h3>
      {children}
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-display-small text-on-surface">{value}</span>
      <span className="text-body-small text-on-surface-variant">{label}</span>
    </div>
  );
}

/** Horizontal bars in Windmorph's colours; the numbers are in the text, the bars only show size. */
function Bars({
  label,
  rows,
}: {
  label: string;
  rows: { name: string; value: number; text: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {rows.slice(0, 8).map((r) => (
        <li key={r.name} className="flex flex-col gap-1">
          <span className="text-body-small text-on-surface flex justify-between gap-2">
            <span className="truncate">{r.name}</span>
            <span className="text-on-surface-variant shrink-0">{r.text}</span>
          </span>
          <span aria-hidden className="bg-surface-container-highest block h-2 rounded-full">
            <span
              className="bg-primary block h-2 rounded-full"
              style={{ width: `${Math.max(2, (100 * r.value) / max)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
