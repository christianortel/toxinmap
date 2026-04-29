"use client";

import { explorerGroupCategories } from "@/content/explorer-data";
import { FilterChip } from "@/components/filter-chip";
import { getLayersForGroup, layerRegistry } from "@/lib/map/layer-registry";
import type { ExplorerVisibleEntity } from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

type LayerSummary = {
  id: string;
  entityCount: number;
  coverageRange: string;
  sourceIds: string[];
  preferredSource: "database" | "etl-file" | "mock" | "none";
  sourceTruthNote: string | null;
};

const defaultGroups = ["official", "emerging", "legal"] as const;

function getSourceBadgeLabel(source: LayerSummary["preferredSource"]) {
  switch (source) {
    case "database":
      return "DB";
    case "etl-file":
      return "ETL";
    case "mock":
      return "Mock";
    default:
      return "None";
  }
}

export function LayerControlShell({
  visibleEntities,
  layerSummaries,
  sourceCount,
}: {
  visibleEntities: ExplorerVisibleEntity[];
  layerSummaries: LayerSummary[];
  sourceCount: number;
}) {
  const activeGroups = useExplorerStore((state) => state.activeGroups);
  const activeLayerIds = useExplorerStore((state) => state.activeLayerIds);
  const activeFilterChips = useExplorerStore((state) => state.activeFilterChips);
  const activeYear = useExplorerStore((state) => state.activeYear);
  const timelineRange = useExplorerStore((state) => state.timelineRange);
  const toggleGroup = useExplorerStore((state) => state.toggleGroup);
  const toggleLayer = useExplorerStore((state) => state.toggleLayer);
  const resetExplorerFilters = useExplorerStore((state) => state.resetExplorerFilters);

  const layerSummaryMap = new Map(layerSummaries.map((summary) => [summary.id, summary]));
  const visibleEntityCount = visibleEntities.reduce(
    (sum, entity) => sum + (entity.aggregateCount ?? 1),
    0,
  );
  const defaultVisibleLayerCount = layerRegistry.filter((layer) => layer.visibleByDefault).length;
  const usingDefaultGroups =
    activeGroups.length === defaultGroups.length &&
    defaultGroups.every((group) => activeGroups.includes(group));
  const yearLabel = activeYear === timelineRange[1] ? "Current view" : `${activeYear}`;
  const hasNonDefaultState =
    !usingDefaultGroups ||
    activeLayerIds.length !== defaultVisibleLayerCount ||
    activeFilterChips.length > 0 ||
    activeYear !== timelineRange[1];

  return (
    <div className="hud-panel-slim space-y-4 border-[rgba(106,138,158,0.14)] bg-[rgba(10,14,20,0.58)] p-4 xl:max-h-[720px] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="status-rail mb-2 text-white">Layers</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white">
              {visibleEntityCount.toLocaleString()} onscreen
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--foreground-muted)]">
              {activeLayerIds.length}/{layerRegistry.length} layers
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--foreground-muted)]">
              {yearLabel}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {explorerGroupCategories.map((category) => (
              <FilterChip
                key={category.key}
                label={category.title.replace(" And ", " ")}
                active={activeGroups.includes(category.key)}
                onClick={() => toggleGroup(category.key)}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => resetExplorerFilters()}
          className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-soft)] transition hover:text-white"
        >
          Reset
        </button>
      </div>

      <div className="space-y-3">
        {hasNonDefaultState ? (
          <div className="rounded-[18px] border border-[rgba(186,127,92,0.18)] bg-[rgba(186,127,92,0.08)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            Narrowed view / {activeGroups.length} groups / {activeLayerIds.length} layers
            {activeFilterChips.length > 0 ? `, and ${activeFilterChips.length} active filters` : ""}
            
          </div>
        ) : (
          <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--foreground-muted)]">
            Default stack / {sourceCount.toLocaleString()} mapped sources
          </div>
        )}

        {explorerGroupCategories.map((category) => {
          const groupLayers = getLayersForGroup(category.key);
          const enabledLayers = groupLayers.filter((layer) => activeLayerIds.includes(layer.id));
          const groupVisibleCount = visibleEntities
            .filter((entity) => entity.layerGroup === category.key)
            .reduce((sum, entity) => sum + (entity.aggregateCount ?? 1), 0);
          const groupTotalCount = groupLayers.reduce(
            (sum, layer) => sum + (layerSummaryMap.get(layer.id)?.entityCount ?? 0),
            0,
          );

          return (
            <section
              key={category.key}
              className="space-y-2.5 rounded-[20px] border border-white/8 bg-[rgba(255,255,255,0.025)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{category.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--foreground-soft)]">
                    {enabledLayers.length}/{groupLayers.length} active / {groupVisibleCount.toLocaleString()} onscreen / {groupTotalCount.toLocaleString()} mapped
                  </p>
                </div>
                <FilterChip
                  label={activeGroups.includes(category.key) ? "Visible" : "Hidden"}
                  active={activeGroups.includes(category.key)}
                  onClick={() => toggleGroup(category.key)}
                />
              </div>

              <div className="space-y-2">
                {groupLayers.map((layer) => {
                  const summary = layerSummaryMap.get(layer.id);
                  const count = visibleEntities
                    .filter((entity) => entity.layerId === layer.id)
                    .reduce((sum, entity) => sum + (entity.aggregateCount ?? 1), 0);

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => toggleLayer(layer.id)}
                      className={`flex w-full items-start justify-between gap-4 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3.5 py-3 text-left transition hover:bg-[rgba(255,255,255,0.05)] ${
                        activeLayerIds.includes(layer.id) ? "border-white/16" : "opacity-65"
                      }`}
                    >
                      <div>
                        <div className="mb-1.5 flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: layer.accent }}
                          />
                          <p className="text-sm text-white">{layer.label}</p>
                          {summary ? (
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                              {getSourceBadgeLabel(summary.preferredSource)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                          <span>{layer.shortLabel}</span>
                          {summary?.coverageRange ? <span>{summary.coverageRange}</span> : null}
                          {summary?.sourceIds.length && summary.sourceIds.length < 4 ? (
                            <span>
                              {summary.sourceIds.length} source
                              {summary.sourceIds.length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                        {summary?.sourceTruthNote ? (
                          <p className="mt-2 max-w-[22rem] text-[11px] leading-5 text-[var(--foreground-soft)]">
                            {summary.sourceTruthNote}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm text-white">{count.toLocaleString()}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                          onscreen
                        </p>
                        {summary ? (
                          <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                            {summary.entityCount.toLocaleString()} total
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
