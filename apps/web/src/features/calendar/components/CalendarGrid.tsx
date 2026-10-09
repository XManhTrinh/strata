"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { CalendarEvent } from "../types/calendar.types";
import { getCalendarDays, isToday, isSameDay } from "../utils/calendar.utils";
import { getEventTypeColors } from "../utils/calendar.utils";

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onDateRangeSelect: (startDate: Date, endDate: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  showWeekends?: boolean;
}

const WEEKDAY_LABELS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LABELS_NO_WEEKEND = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface EventBar {
  event: CalendarEvent;
  startCol: number;
  colSpan: number;
  row: number;
  startsBeforeWeek: boolean;
  endsAfterWeek: boolean;
}

/**
 * Assigns row positions to event bars so they don't overlap.
 * Uses a greedy lane assignment algorithm.
 */
function assignRows(bars: Omit<EventBar, "row">[]): EventBar[] {
  // Sort by startCol then by span length (longer first)
  const sorted = [...bars].sort((a, b) => a.startCol - b.startCol || b.colSpan - a.colSpan);
  const lanes: number[] = []; // lanes[row] = end column of last event in that lane

  return sorted.map((bar) => {
    // Find the first lane where this bar fits
    let assignedRow = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] <= bar.startCol) {
        assignedRow = i;
        break;
      }
    }
    if (assignedRow === -1) {
      assignedRow = lanes.length;
      lanes.push(0);
    }
    lanes[assignedRow] = bar.startCol + bar.colSpan;
    return { ...bar, row: assignedRow };
  });
}

export function CalendarGrid({
  year,
  month,
  events,
  onDateClick,
  onDateRangeSelect,
  onEventClick,
  showWeekends = false,
}: CalendarGridProps) {
  const allDays = getCalendarDays(year, month);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const isDragging = useRef(false);

  const weekdayLabels = showWeekends ? WEEKDAY_LABELS_FULL : WEEKDAY_LABELS_NO_WEEKEND;
  const colCount = showWeekends ? 7 : 5;

  // Build weeks
  const weeks: Date[][] = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const fullWeek = allDays.slice(i, i + 7);
      if (showWeekends) {
        result.push(fullWeek);
      } else {
        result.push(fullWeek.filter((d) => d.getDay() !== 0 && d.getDay() !== 6));
      }
    }
    return result;
  }, [allDays, showWeekends]);

  // For each week, compute event bars with row assignments
  const weekBars = useMemo(() => {
    return weeks.map((weekDays) => {
      const weekStart = new Date(weekDays[0]);
      const weekEnd = new Date(weekDays[weekDays.length - 1]);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(0, 0, 0, 0);

      const bars: Omit<EventBar, "row">[] = [];

      for (const event of events) {
        if (event.leaveRequest?.status === "CANCELLED") continue;
        const evStart = new Date(event.startDate);
        const evEnd = new Date(event.endDate);
        evStart.setHours(0, 0, 0, 0);
        evEnd.setHours(0, 0, 0, 0);

        if (evStart > weekEnd || evEnd < weekStart) continue;

        // Find column positions within visible days
        let startCol = -1;
        let endCol = -1;
        for (let i = 0; i < weekDays.length; i++) {
          const d = new Date(weekDays[i]);
          d.setHours(0, 0, 0, 0);
          if (d >= evStart && d <= evEnd) {
            if (startCol === -1) startCol = i;
            endCol = i;
          }
        }
        if (startCol === -1) continue;

        bars.push({
          event,
          startCol,
          colSpan: endCol - startCol + 1,
          startsBeforeWeek: evStart < weekStart,
          endsAfterWeek: evEnd > weekEnd,
        });
      }

      return assignRows(bars);
    });
  }, [weeks, events]);

  // Drag handlers
  const handleMouseDown = useCallback((date: Date) => {
    isDragging.current = true;
    setDragStart(date);
    setDragEnd(date);
  }, []);

  const handleMouseEnter = useCallback((date: Date) => {
    if (isDragging.current) {
      setDragEnd(date);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current && dragStart && dragEnd) {
      isDragging.current = false;
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      if (isSameDay(start, end)) {
        onDateClick(start);
      } else {
        onDateRangeSelect(start, end);
      }
      setDragStart(null);
      setDragEnd(null);
    }
  }, [dragStart, dragEnd, onDateClick, onDateRangeSelect]);

  function isInDragRange(date: Date): boolean {
    if (!dragStart || !dragEnd) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const start = new Date(dragStart < dragEnd ? dragStart : dragEnd);
    const end = new Date(dragStart < dragEnd ? dragEnd : dragStart);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
  }

  return (
    <div
      className="flex flex-col h-full select-none overflow-auto border border-outline-variant rounded-lg"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Weekday headers */}
      <div className={`grid sticky top-0 z-10 bg-surface border-b border-outline-variant ${colCount === 5 ? "grid-cols-5" : "grid-cols-7"}`}>
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className={`px-2 py-2 text-center text-xs font-medium uppercase tracking-wider ${
              label === "Sat" || label === "Sun"
                ? "text-on-surface-variant/60 bg-surface-variant/30"
                : "text-on-surface-variant"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows — fill remaining height equally, grow if events overflow */}
      <div className="flex-1 flex flex-col">
      {weeks.map((weekDays, weekIdx) => {
        const bars = weekBars[weekIdx];
        const maxRow = bars.length > 0 ? Math.max(...bars.map((b) => b.row)) : -1;
        const eventRowCount = maxRow + 1;

        return (
          <div key={weekIdx} className="border-b border-outline-variant last:border-b-0 flex-1 min-h-20 relative">
            {/* Day cells - fill full height */}
            <div className={`grid h-full ${colCount === 5 ? "grid-cols-5" : "grid-cols-7"}`}>
              {weekDays.map((date, dayIdx) => {
                const isCurrentMonth = date.getMonth() === month;
                const todayHighlight = isToday(date);
                const inDragRange = isInDragRange(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div
                    key={dayIdx}
                    className={`border-outline-variant px-1.5 pt-1 pb-0.5 cursor-pointer transition-colors ${
                      dayIdx < colCount - 1 ? "border-r" : ""
                    } ${!isCurrentMonth ? "bg-surface-variant/20" : ""
                    } ${isWeekend && showWeekends ? "bg-orange-50/40 dark:bg-orange-950/10" : ""} ${
                      inDragRange ? "bg-primary/10" : "hover:bg-surface-variant/30"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown(date);
                    }}
                    onMouseEnter={() => handleMouseEnter(date)}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        todayHighlight
                          ? "bg-primary text-on-primary"
                          : isCurrentMonth
                            ? "text-on-surface"
                            : "text-on-surface-variant"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Event bars overlay — positioned on top of the day cells */}
            {eventRowCount > 0 && (
              <div className="absolute left-0 right-0 pointer-events-none" style={{ top: "28px" }}>
                {bars.map((bar) => {
                  const colors = getEventTypeColors(bar.event.eventType.name);
                  const isPending = bar.event.leaveRequest?.status === "PENDING";
                  const leftPct = (bar.startCol / colCount) * 100;
                  const widthPct = (bar.colSpan / colCount) * 100;

                  return (
                    <div
                      key={bar.event.id + "-" + weekIdx}
                      className={`absolute pointer-events-auto text-[10px] font-medium px-1.5 py-0.5 truncate cursor-pointer ${
                        colors.bg
                      } ${colors.text} ${
                        isPending ? "border border-dashed " + colors.border : ""
                      } ${
                        bar.colSpan === 1 && !bar.startsBeforeWeek && !bar.endsAfterWeek
                          ? "rounded"
                          : bar.startsBeforeWeek && bar.endsAfterWeek
                            ? ""
                            : bar.startsBeforeWeek
                              ? "rounded-r"
                              : bar.endsAfterWeek
                                ? "rounded-l"
                                : "rounded"
                      }`}
                      style={{
                        top: `${bar.row * 22 + 2}px`,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 5px)`,
                        height: "18px",
                      }}
                      onClick={() => onEventClick(bar.event)}
                      title={`${bar.event.title} (${bar.event.ownerName})`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors.dot} mr-1 align-middle`} />
                      {bar.event.title}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
