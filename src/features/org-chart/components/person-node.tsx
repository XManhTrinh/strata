"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { IconButton } from "@windmorph/react";
import { Avatar } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import type { ChartPerson } from "../types";
import { CARD_HEIGHT, CARD_WIDTH } from "../layout";

export type PersonNodeData = {
  person: ChartPerson;
  /** Their reports are on the chart. */
  open: boolean;
  start: boolean;
  profileHref: string;
  onToggle: (person: ChartPerson) => void;
  onFocus: (person: ChartPerson) => void;
};

/** One person on the chart: photo, name, position and unit, with their reports to open. */
function PersonNodeView({ data }: NodeProps & { data: PersonNodeData }) {
  const t = useTranslations("orgChart");
  const { person, open, start } = data;
  return (
    <div
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className={`bg-surface-container-low text-on-surface flex items-center gap-3 rounded-xl border px-3 ${
        start ? "border-primary border-2" : "border-outline-variant"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      {person.managerHidden && (
        <span
          className="text-on-surface-variant absolute -top-6 left-1/2 -translate-x-1/2"
          title={t("managerHidden")}
        >
          <Icon name="more_horiz" size={20} />
          <span className="sr-only">{t("managerHidden")}</span>
        </span>
      )}
      <Avatar name={person.name} src={person.avatarUrl ?? undefined} size="md" decorative />
      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href={data.profileHref}
          className="text-title-small truncate text-inherit no-underline hover:underline"
        >
          {person.name}
        </a>
        <span className="text-body-small text-on-surface-variant truncate">
          {[person.position, person.unit].filter(Boolean).join(" · ")}
        </span>
      </div>
      <IconButton
        variant="standard"
        aria-label={t("centre", { name: person.name })}
        icon={<Icon name="center_focus_strong" />}
        onPress={() => data.onFocus(person)}
        className="nodrag"
      />
      {person.directReports > 0 && (
        <button
          type="button"
          onClick={() => data.onToggle(person)}
          aria-expanded={open}
          aria-label={t(open ? "hideReports" : "showReports", {
            name: person.name,
            count: person.directReports,
          })}
          className="nodrag bg-secondary-container text-on-secondary-container text-label-medium absolute -bottom-3 left-1/2 flex h-6 min-w-10 -translate-x-1/2 items-center justify-center rounded-full px-2"
        >
          {open ? <Icon name="expand_less" size={18} /> : person.directReports}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
}

export const PersonNode = memo(PersonNodeView);
