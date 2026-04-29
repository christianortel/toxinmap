import { layerRegistry } from "@/lib/map/layer-registry";
import type { ExplorerLegendItem, ExplorerVisibleEntity } from "@/types/explorer";

export function buildLegendItems(entities: ExplorerVisibleEntity[]): ExplorerLegendItem[] {
  return layerRegistry
    .map((layer) => {
      const count = entities.filter((entity) => entity.layerId === layer.id).reduce((sum, entity) => {
        return sum + (entity.aggregateCount ?? 1);
      }, 0);

      return {
        id: layer.id,
        label: layer.label,
        accent: layer.accent,
        count,
        description: layer.description,
      };
    })
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count);
}
