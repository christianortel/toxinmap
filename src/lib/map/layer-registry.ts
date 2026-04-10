import { explorerLayerDefinitions } from "@/content/explorer-data";
import type {
  ExplorerLayerGroup,
  ExplorerLayerId,
} from "@/types/explorer";

export const layerRegistry = explorerLayerDefinitions;

export function getLayerDefinition(layerId: ExplorerLayerId) {
  return layerRegistry.find((layer) => layer.id === layerId);
}

export function getLayersForGroup(group: ExplorerLayerGroup) {
  return layerRegistry.filter((layer) => layer.group === group);
}

export function getDefaultLayerIds() {
  return layerRegistry.filter((layer) => layer.visibleByDefault).map((layer) => layer.id);
}
