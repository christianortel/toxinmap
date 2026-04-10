"use client";

import { explorerGroupCategories } from "@/content/explorer-data";
import { FilterChip } from "@/components/filter-chip";
import { layerRegistry } from "@/lib/map/layer-registry";
import type { ExplorerVisibleEntity } from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

type LayerSummary = {
  id: string;
  entityCount: number;
  coverageRange: string;
  sourceIds: string[];
};

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
  const toggleGroup = useExplorerStore((state) => state.toggleGroup);
  const toggleLayer = useExplorerStore((state) => state.toggleLayer);
  const resetExplorerFilters = useExplorerStore((state) => state.resetExplorerFilters);
  const layerSummaryMap = new Map(layerSummaries.map((summary) => [summary.id, summary]));

  return (
    <div className="hud-panel space-y-5 p-5 xl:max-h-[720px] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Toxic layer groups</p>
          <div className="flex flex-wrap gap-2">
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

      <div>
        <p className="eyebrow mb-3">Map layers</p>
        <div className="space-y-3">
          {layerRegistry.map((layer) => {
            const summary = layerSummaryMap.get(layer.id);
            const count = visibleEntities
              .filter((entity) => entity.layerId === layer.id)
              .reduce((sum, entity) => sum + (entity.aggregateCount ?? 1), 0);

            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
                className={`surface-panel-soft interactive-surface flex w-full items-start justify-between gap-4 p-4 text-left ${
                  activeLayerIds.includes(layer.id) ? "border-white/16" : "opacity-65"
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: layer.accent }}
                    />
                    <p className="text-sm text-white">{layer.label}</p>
                  </div>
                  <p className="body-sm">{layer.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-white">{count}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                    visible
                  </p>
                  {summary ? (
                    <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                      {summary.entityCount} total
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="surface-panel-soft p-4">
        <p className="eyebrow mb-2">Source registry</p>
        <p className="text-sm text-white">{sourceCount} source records available</p>
        <p className="mt-2 body-sm">
          Layer counts reflect the merged U.S. toxin map response, with database-backed official layers taking precedence when available.
        </p>
      </div>

      <div className="grid gap-3">
        {explorerGroupCategories.map((category) => (
          <div key={category.key} className="surface-panel-soft p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm text-white">{category.title}</p>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.accent }}
              />
            </div>
            <p className="body-sm">{category.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
