"use client";

interface TimelineSliderProps {
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
}

export default function TimelineSlider({
  selectedDate,
  onDateChange,
}: TimelineSliderProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="timeline-date" className="text-xs text-on-surface-variant whitespace-nowrap">
        View as of:
      </label>
      <input
        id="timeline-date"
        type="date"
        value={selectedDate ?? today}
        max={today}
        onChange={(e) => {
          const val = e.target.value;
          if (val === today || !val) {
            onDateChange(null);
          } else {
            onDateChange(val);
          }
        }}
        className="text-xs border border-outline-variant rounded px-2 py-1 bg-surfacetext-on-surface focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {selectedDate && (
        <>
          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
            Viewing as of: {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={() => onDateChange(null)}
            className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2"
          >
            Reset to current
          </button>
        </>
      )}
    </div>
  );
}
