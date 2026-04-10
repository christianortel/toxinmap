"use client";

import { timelineStops } from "@/data/mock/methodology";
import { useExplorerStore } from "@/store/explorer-store";

export function TimelineShell({ visibleCount }: { visibleCount: number }) {
  const activeYear = useExplorerStore((state) => state.activeYear);
  const timelineRange = useExplorerStore((state) => state.timelineRange);
  const setActiveYear = useExplorerStore((state) => state.setActiveYear);

  const activeStop =
    timelineStops.find((stop) => stop.year === activeYear) ??
    timelineStops[timelineStops.length - 1];

  return (
    <div className="hud-panel p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Timeline frame</p>
          <p className="text-lg text-white">{activeStop.label}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--foreground-soft)]">{activeStop.year}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
            {visibleCount} visible
          </p>
        </div>
      </div>
      <input
        type="range"
        min={timelineRange[0]}
        max={timelineRange[1]}
        step={1}
        value={activeYear}
        onChange={(event) => setActiveYear(Number(event.target.value))}
        className="mb-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
      />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {timelineStops.map((stop) => {
          const active = stop.year === activeYear;

          return (
            <button
              key={stop.year}
              type="button"
              onClick={() => setActiveYear(stop.year)}
              className={`rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                active
                  ? "border-[rgba(135,160,176,0.28)] bg-[rgba(135,160,176,0.12)]"
                  : "border-white/10 bg-white/4 hover:bg-white/7"
              }`}
            >
              <p className="eyebrow mb-2">{stop.label}</p>
              <p className="body-sm">{stop.summary}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
