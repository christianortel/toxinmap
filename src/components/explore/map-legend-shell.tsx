"use client";

import { scaleLinear } from "d3";
import type { ExplorerLegendItem } from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

type MapLegendShellProps = {
  items: ExplorerLegendItem[];
  cameraBand: string;
  viewSummary: string;
};

export function MapLegendShell({ items, cameraBand, viewSummary }: MapLegendShellProps) {
  const isLegendExpanded = useExplorerStore((state) => state.isLegendExpanded);
  const setLegendExpanded = useExplorerStore((state) => state.setLegendExpanded);
  const gradientScale = scaleLinear<string>()
    .domain([0, 0.5, 1])
    .range(["#50616d", "#93a58c", "#b26d43"]);

  return (
    <div className="hud-panel-slim w-[224px] border-[rgba(106,138,158,0.1)] bg-[rgba(10,14,20,0.5)] p-3">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="status-rail text-white">Legend</p>
        <button
          type="button"
          onClick={() => setLegendExpanded(!isLegendExpanded)}
          className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] transition hover:text-white"
        >
          {isLegendExpanded ? "Close" : "Open"}
        </button>
      </div>
      <div className="rounded-2xl border border-[rgba(87,132,154,0.08)] bg-[rgba(5,9,14,0.44)] p-3">
        <div
          className="h-2 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradientScale(0)}, ${gradientScale(
              0.5,
            )}, ${gradientScale(1)})`,
          }}
        />
        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-[rgba(87,132,154,0.08)] bg-[rgba(5,9,14,0.44)] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
            {cameraBand}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
            {items.length} layers
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">{viewSummary}</p>
      </div>
      {isLegendExpanded ? (
        <div className="mt-4 grid gap-2">
          {items.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-2xl border border-[rgba(87,132,154,0.08)] bg-[rgba(5,9,14,0.44)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.accent }}
                  />
                  {item.label}
                </div>
                <span className="text-sm text-white">{item.count}</span>
              </div>
            </div>
          ))}
          {items.length > 6 ? (
            <div className="rounded-2xl border border-[rgba(87,132,154,0.08)] bg-[rgba(5,9,14,0.44)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
              +{items.length - 6} more
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
