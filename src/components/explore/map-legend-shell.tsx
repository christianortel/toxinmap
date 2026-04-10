"use client";

import { scaleLinear } from "d3";
import type { ExplorerLegendItem } from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

type MapLegendShellProps = {
  items: ExplorerLegendItem[];
  cameraBand: string;
};

export function MapLegendShell({ items, cameraBand }: MapLegendShellProps) {
  const isLegendExpanded = useExplorerStore((state) => state.isLegendExpanded);
  const setLegendExpanded = useExplorerStore((state) => state.setLegendExpanded);
  const gradientScale = scaleLinear<string>()
    .domain([0, 0.5, 1])
    .range(["#50616d", "#93a58c", "#b26d43"]);

  return (
    <div className="hud-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="eyebrow">Legend</p>
        <button
          type="button"
          onClick={() => setLegendExpanded(!isLegendExpanded)}
          className="text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)] transition hover:text-white"
        >
          {isLegendExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
        <div
          className="h-3 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradientScale(0)}, ${gradientScale(
              0.5,
            )}, ${gradientScale(1)})`,
          }}
        />
        <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
          <span>Lower density</span>
          <span>Higher overlap</span>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
          Camera scope: {cameraBand}
        </p>
      </div>
      {isLegendExpanded ? (
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <div key={item.id} className="surface-panel-soft p-3">
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
              <p className="mt-2 body-sm">{item.description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
