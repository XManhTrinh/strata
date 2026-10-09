"use client";

import type { CalendarEvent } from "../types/calendar.types";
import { getEventTypeColors } from "../utils/calendar.utils";

interface EventCardProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const colors = getEventTypeColors(event.eventType.name);
  const isPending = event.leaveRequest?.status === "PENDING";
  const isRejected = event.leaveRequest?.status === "REJECTED";

  const borderStyle = isPending ? "border-dashed" : "border-solid";
  const textStyle = isRejected ? "line-through opacity-60" : "";

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={`group flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left border ${borderStyle} ${colors.bg} ${colors.border} hover:opacity-80 transition-opacity`}
      title={`${event.title}${event.leaveRequest ? ` (${event.leaveRequest.status})` : ""}${event.notes ? `\n${event.notes}` : ""}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} aria-hidden="true" />
      <span className={`truncate text-label-small ${colors.text} ${textStyle}`}>
        {event.title}
      </span>
    </button>
  );
}
