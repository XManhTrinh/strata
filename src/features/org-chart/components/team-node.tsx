"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { TEAM_COLUMNS, TEAM_GAP, TEAM_HEADER, TEAM_PADDING } from "../layout";
import { PersonCard, type PersonNodeData } from "./person-node";

export type TeamNodeData = { members: PersonNodeData[] };

/**
 * A manager's reports who have none shown below them, together in one box of two columns, so a
 * large team stays compact instead of one long row (people with open reports stay branches).
 */
function TeamNodeView({ data }: NodeProps & { data: TeamNodeData }) {
  const t = useTranslations("orgChart");
  return (
    <div
      role="group"
      aria-label={t("team", { count: data.members.length })}
      className="bg-surface-container-lowest border-outline-variant rounded-2xl border"
      style={{ padding: TEAM_PADDING }}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      <p
        aria-hidden
        className="text-label-small text-on-surface-variant flex items-center uppercase"
        style={{ height: TEAM_HEADER - TEAM_PADDING }}
      >
        {t("team", { count: data.members.length })}
      </p>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${TEAM_COLUMNS}, max-content)`, gap: TEAM_GAP }}
      >
        {data.members.map((member) => (
          <PersonCard key={member.person.id} data={member} />
        ))}
      </div>
    </div>
  );
}

export const TeamNode = memo(TeamNodeView);
