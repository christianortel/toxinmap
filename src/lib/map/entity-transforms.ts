import { getLayerDefinition } from "@/lib/map/layer-registry";
import type {
  ExplorerEntity,
  ExplorerFilterChip,
  ExplorerLayerId,
  ExplorerVisibleEntity,
} from "@/types/explorer";

type VisibleEntityOptions = {
  activeGroups: string[];
  activeLayerIds: ExplorerLayerId[];
  activeYear: number;
  activeFilterChips: ExplorerFilterChip[];
  cameraHeight: number;
  selectedEntityId: string | null;
};

export function getEntityById(entities: ExplorerEntity[], entityId: string | null | undefined) {
  if (!entityId) return null;
  return entities.find((entity) => entity.id === entityId) ?? null;
}

export function getEntitiesForCaseStudy(entities: ExplorerEntity[], caseStudyId: string) {
  return entities.filter((entity) => entity.relatedCaseStudyIds.includes(caseStudyId));
}

function entityMatchesFilters(
  entity: ExplorerEntity,
  options: Omit<VisibleEntityOptions, "cameraHeight" | "selectedEntityId">,
) {
  const layer = getLayerDefinition(entity.layerId);
  const matchesChips =
    options.activeFilterChips.length === 0 ||
    options.activeFilterChips.every((chip) => entity.tags.includes(chip));

  return (
    options.activeGroups.includes(entity.layerGroup) &&
    options.activeLayerIds.includes(entity.layerId) &&
    Boolean(layer) &&
    entity.yearStart <= options.activeYear &&
    entity.yearEnd >= options.activeYear &&
    matchesChips
  );
}

function clusterEntities(
  entities: ExplorerEntity[],
  activeYear: number,
  selectedEntityId: string | null,
): ExplorerVisibleEntity[] {
  const clusterCell = 11;
  const clusters = new Map<string, ExplorerVisibleEntity>();
  const regionEntities = entities.filter((entity) => entity.geometryType === "region");
  const pointEntities = entities.filter((entity) => entity.geometryType === "point");

  const rawSelected = pointEntities.filter((entity) => entity.id === selectedEntityId);
  const clusterCandidates = pointEntities.filter((entity) => entity.id !== selectedEntityId);

  for (const entity of clusterCandidates) {
    const bucketLon = Math.round(entity.coordinates[0] / clusterCell) * clusterCell;
    const bucketLat = Math.round(entity.coordinates[1] / clusterCell) * clusterCell;
    const key = `${entity.layerGroup}:${bucketLon}:${bucketLat}`;
    const existing = clusters.get(key);

    if (existing) {
      existing.aggregateCount = (existing.aggregateCount ?? 1) + 1;
      existing.aggregateIds = [...(existing.aggregateIds ?? []), entity.id];
      existing.relatedCaseStudyIds = Array.from(
        new Set([...existing.relatedCaseStudyIds, ...entity.relatedCaseStudyIds]),
      );
      continue;
    }

    clusters.set(key, {
      ...entity,
      id: `cluster-${key}-${activeYear}`,
      title: `${entity.layerGroup} cluster`,
      summary: "Aggregated wide-zoom signal used to keep the globe readable at continental scale.",
      whyThisAppears:
        "At wide zoom levels, similar nearby markers are aggregated so the globe remains calm and readable.",
      aggregateCount: 1,
      aggregateIds: [entity.id],
      isAggregate: true,
      category: "Clustered context",
      subcategory: entity.subcategory,
      uncertaintyNote:
        "Clusters are a visual aggregation aid. Open a closer view or search for a specific marker to inspect the underlying records.",
    });
  }

  return [...regionEntities, ...rawSelected, ...Array.from(clusters.values())];
}

export function getVisibleExplorerEntities(
  entities: ExplorerEntity[],
  options: VisibleEntityOptions,
): ExplorerVisibleEntity[] {
  const filtered = entities.filter((entity) =>
    entityMatchesFilters(entity, {
      activeGroups: options.activeGroups,
      activeLayerIds: options.activeLayerIds,
      activeYear: options.activeYear,
      activeFilterChips: options.activeFilterChips,
    }),
  );

  if (options.cameraHeight > 5_400_000) {
    return clusterEntities(filtered, options.activeYear, options.selectedEntityId);
  }

  return filtered;
}
