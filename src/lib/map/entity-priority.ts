import type { ExplorerEntity, ExplorerVisibleEntity } from "@/types/explorer";

const selectionEvidenceBoost: Record<ExplorerEntity["evidenceType"], number> = {
  "Direct Measurement": 180,
  "Screening Signal": 120,
  Proxy: 70,
  "Literature Evidence": 36,
  "Editorial Case Study": 18,
};

const selectionConfidenceBoost: Record<ExplorerEntity["confidenceLevel"], number> = {
  High: 32,
  Moderate: 18,
  Low: 8,
};

const selectionSourceBoosts: Partial<Record<string, number>> = {
  "usgs-pfas": 60,
  "atsdr-pfas": 56,
  "atsdr-pfas-sites": 56,
  "epa-npdes": 52,
  "usgs-pharma": 44,
  "epa-sems": 38,
  "epa-tri": 28,
  "epa-echo": 22,
  "epa-frs": 8,
};

function getLayerSelectionBoost(entity: ExplorerEntity) {
  if (entity.layerId === "pfas-sites") return 48;
  if (entity.layerId === "wastewater-sites") return 40;
  if (entity.layerId === "hazardous-sites") return entity.sourceIds.includes("epa-sems") ? 34 : 20;
  if (entity.layerId === "legal-markers") return entity.sourceIds.includes("epa-echo") ? 28 : 16;
  if (entity.layerId === "industrial-sites") return entity.sourceIds.includes("epa-tri") ? 18 : 0;
  if (entity.layerId === "power-plants") return 8;
  if (entity.layerId === "air-toxics-regions") return 4;
  return 0;
}

function getSourceSelectionBoost(entity: ExplorerEntity) {
  return Math.min(
    entity.sourceIds.reduce((sum, sourceId) => sum + (selectionSourceBoosts[sourceId] ?? 0), 0),
    110,
  );
}

function getDetailSelectionBoost(entity: ExplorerEntity) {
  let boost = 0;

  if (entity.chemicalHighlights.length > 0) {
    boost += 12;
  }

  if (entity.chemicalMarkers.length > 0) {
    boost += 8;
  }

  if ((entity.sourceStats?.length ?? 0) >= 3) {
    boost += 8;
  }

  if (entity.officialSignals.length >= 2) {
    boost += 8;
  }

  return boost;
}

function getAggregatePenalty(entity: ExplorerVisibleEntity) {
  return entity.isAggregate ? 160 : 0;
}

export function getEntitySelectionPriority(entity: ExplorerVisibleEntity) {
  return (
    selectionEvidenceBoost[entity.evidenceType] +
    selectionConfidenceBoost[entity.confidenceLevel] +
    getLayerSelectionBoost(entity) +
    getSourceSelectionBoost(entity) +
    getDetailSelectionBoost(entity) -
    getAggregatePenalty(entity)
  );
}

export function compareEntitiesBySelectionPriority(
  left: ExplorerVisibleEntity,
  right: ExplorerVisibleEntity,
) {
  return (
    getEntitySelectionPriority(right) - getEntitySelectionPriority(left) ||
    right.officialSignals.length - left.officialSignals.length ||
    (right.sourceStats?.length ?? 0) - (left.sourceStats?.length ?? 0) ||
    right.title.localeCompare(left.title)
  );
}

export function getEntitySelectionPointSize(entity: ExplorerVisibleEntity, isSelected: boolean) {
  if (entity.isAggregate) {
    return isSelected ? 16 : 14;
  }

  if (isSelected) {
    return 12;
  }

  const priority = getEntitySelectionPriority(entity);
  if (priority >= 250) return 9;
  if (priority >= 180) return 8;
  return 7;
}
