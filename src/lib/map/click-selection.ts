import { getDistanceMiles } from "@/lib/data/geo";
import { getEntitySelectionPriority } from "@/lib/map/entity-priority";
import type { ExplorerCameraBand, ExplorerVisibleEntity } from "@/types/explorer";

type DenseClickSelectionOptions = {
  clickedEntity: ExplorerVisibleEntity;
  visibleEntities: ExplorerVisibleEntity[];
  cameraBand: ExplorerCameraBand;
};

const denseClickUpgradeableLayers = new Set<ExplorerVisibleEntity["layerId"]>([
  "industrial-sites",
  "power-plants",
  "air-toxics-regions",
  "reproductive-regions",
  "sentinel-species",
]);

const denseClickRadiusMiles: Partial<Record<ExplorerCameraBand, number>> = {
  regional: 10,
  local: 8,
};

const denseClickOverridePriorityDelta = 24;

export function resolveDenseClickSelection({
  clickedEntity,
  visibleEntities,
  cameraBand,
}: DenseClickSelectionOptions) {
  if (clickedEntity.isAggregate) {
    return clickedEntity;
  }

  if (!denseClickUpgradeableLayers.has(clickedEntity.layerId)) {
    return clickedEntity;
  }

  const candidateRadius = denseClickRadiusMiles[cameraBand];
  if (!candidateRadius) {
    return clickedEntity;
  }

  const pointCandidates = visibleEntities
    .filter((entity) => !entity.isAggregate && entity.geometryType === "point")
    .map((entity) => ({
      entity,
      distanceFromClicked: getDistanceMiles(clickedEntity.coordinates, entity.coordinates),
      selectionPriority: getEntitySelectionPriority(entity),
    }))
    .filter((candidate) => candidate.distanceFromClicked <= candidateRadius);

  if (pointCandidates.length === 0) {
    return clickedEntity;
  }

  const clickedPriority = getEntitySelectionPriority(clickedEntity);
  const clickedCandidate =
    pointCandidates.find((candidate) => candidate.entity.id === clickedEntity.id) ?? null;
  const rankedCandidates = [...pointCandidates].sort((left, right) => {
    const priorityDelta = right.selectionPriority - left.selectionPriority;
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const clickedDistanceDelta = left.distanceFromClicked - right.distanceFromClicked;
    if (Math.abs(clickedDistanceDelta) > 0.05) {
      return clickedDistanceDelta;
    }

    return left.entity.title.localeCompare(right.entity.title);
  });
  const strongestCandidate = rankedCandidates[0];

  if (strongestCandidate.entity.id === clickedEntity.id) {
    return clickedEntity;
  }

  if (strongestCandidate.selectionPriority < clickedPriority + denseClickOverridePriorityDelta) {
    return clickedCandidate?.entity ?? clickedEntity;
  }

  return strongestCandidate.entity;
}
