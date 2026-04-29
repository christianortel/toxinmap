import { getLayerDefinition } from "@/lib/map/layer-registry";
import { compareEntitiesBySelectionPriority, getEntitySelectionPriority } from "@/lib/map/entity-priority";
import { getDistanceMiles } from "@/lib/data/geo";
import type {
  ExplorerCameraBand,
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
  cameraBand: ExplorerCameraBand;
  focusCoordinates: [number, number] | null;
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
  options: Omit<VisibleEntityOptions, "cameraBand" | "selectedEntityId" | "focusCoordinates">,
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

const directPointCaps: Record<ExplorerCameraBand, Partial<Record<ExplorerLayerId, number>>> = {
  national: {
    "industrial-sites": 40,
    "legal-markers": 48,
    "hazardous-sites": 52,
    "power-plants": 24,
    "wastewater-sites": 28,
    "pfas-sites": 22,
  },
  regional: {
    "industrial-sites": 220,
    "legal-markers": 190,
    "hazardous-sites": 180,
    "power-plants": 80,
    "wastewater-sites": 84,
    "pfas-sites": 96,
  },
  local: {},
};

const aggregateCaps: Record<ExplorerCameraBand, Partial<Record<ExplorerLayerId, number>>> = {
  national: {
    "industrial-sites": 120,
    "legal-markers": 95,
    "hazardous-sites": 90,
    "power-plants": 36,
    "wastewater-sites": 42,
    "pfas-sites": 24,
  },
  regional: {
    "industrial-sites": 560,
    "legal-markers": 360,
    "hazardous-sites": 280,
    "power-plants": 110,
    "wastewater-sites": 128,
    "pfas-sites": 144,
  },
  local: {},
};

const broadRegionCaps: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<Record<ExplorerLayerId, number>>
> = {
  national: {
    "air-toxics-regions": 10,
    "reproductive-regions": 4,
    "sentinel-species": 4,
  },
  regional: {
    "air-toxics-regions": 12,
    "reproductive-regions": 4,
    "sentinel-species": 4,
  },
};

const layerClusterCellOverrides: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<Record<ExplorerLayerId, number>>
> = {
  national: {
    "industrial-sites": 6,
    "legal-markers": 6,
    "hazardous-sites": 7,
    "power-plants": 8,
    "wastewater-sites": 10,
    "pfas-sites": 6,
    "air-toxics-regions": 12,
  },
  regional: {
    "industrial-sites": 3,
    "legal-markers": 3,
    "hazardous-sites": 4,
    "power-plants": 6,
    "wastewater-sites": 8,
    "pfas-sites": 4,
    "air-toxics-regions": 10,
  },
};

const broadBandLayerMinimums: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<Record<ExplorerLayerId, number>>
> = {
  national: {
    "industrial-sites": 4,
    "legal-markers": 4,
    "power-plants": 2,
    "wastewater-sites": 6,
    "pfas-sites": 3,
    "air-toxics-regions": 4,
  },
  regional: {
    "industrial-sites": 10,
    "legal-markers": 4,
    "hazardous-sites": 1,
    "power-plants": 3,
    "wastewater-sites": 6,
    "pfas-sites": 6,
    "air-toxics-regions": 4,
  },
};

const broadBandLayerMaximums: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<Record<ExplorerLayerId, number>>
> = {
  national: {
    "industrial-sites": 10,
    "legal-markers": 8,
    "hazardous-sites": 0,
    "power-plants": 3,
    "wastewater-sites": 12,
    "pfas-sites": 5,
    "air-toxics-regions": 6,
    "reproductive-regions": 2,
    "sentinel-species": 2,
  },
  regional: {
    "industrial-sites": 20,
    "legal-markers": 8,
    "hazardous-sites": 1,
    "power-plants": 5,
    "wastewater-sites": 8,
    "pfas-sites": 10,
    "air-toxics-regions": 6,
    "reproductive-regions": 3,
    "sentinel-species": 3,
  },
};

const broadBandLayerDiversityRules: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<
    Record<
      ExplorerLayerId,
      {
        cellDegrees: number;
        maxPerBucket: number;
      }
    >
  >
> = {
  national: {
    "pfas-sites": {
      cellDegrees: 12,
      maxPerBucket: 1,
    },
  },
  regional: {
    "pfas-sites": {
      cellDegrees: 8,
      maxPerBucket: 3,
    },
  },
};

const broadBandLayerSourceFamilyRules: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<
    Record<
      ExplorerLayerId,
      {
        families: Array<{
          key: string;
          sourceIds: string[];
          min: number;
          max: number;
        }>;
      }
    >
  >
> = {
  national: {
    "pfas-sites": {
      families: [
        {
          key: "usgs-pfas-tapwater",
          sourceIds: ["usgs-pfas-tapwater"],
          min: 3,
          max: 4,
        },
        {
          key: "atsdr-pfas-sites",
          sourceIds: ["atsdr-pfas-sites"],
          min: 1,
          max: 2,
        },
      ],
    },
  },
  regional: {
    "pfas-sites": {
      families: [
        {
          key: "usgs-pfas-tapwater",
          sourceIds: ["usgs-pfas-tapwater"],
          min: 6,
          max: 8,
        },
        {
          key: "atsdr-pfas-sites",
          sourceIds: ["atsdr-pfas-sites"],
          min: 1,
          max: 3,
        },
      ],
    },
  },
};

const broadBandDirectSourceFamilyPreserveRules: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<
    Record<
      ExplorerLayerId,
      Array<{
        sourceIds: string[];
        count: number;
      }>
    >
  >
> = {
  national: {
    "pfas-sites": [
      {
        sourceIds: ["atsdr-pfas-sites"],
        count: 1,
      },
    ],
  },
  regional: {
    "pfas-sites": [
      {
        sourceIds: ["atsdr-pfas-sites"],
        count: 2,
      },
    ],
  },
};

const broadBandLayerExactCoordinateRules: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<
    Record<
      ExplorerLayerId,
      {
        precision: number;
        maxPerCoordinate: number;
      }
    >
  >
> = {
  national: {
    "pfas-sites": {
      precision: 4,
      maxPerCoordinate: 1,
    },
  },
  regional: {
    "pfas-sites": {
      precision: 4,
      maxPerCoordinate: 1,
    },
  },
};

const cameraBandConfig: Record<
  ExplorerCameraBand,
  {
    clusterCell: number;
    directPriorityFloor: number;
    maxVisible: number;
    focusRadiusMiles: number;
  }
> = {
  national: {
    clusterCell: 15,
    directPriorityFloor: 235,
    maxVisible: 44,
    focusRadiusMiles: Number.POSITIVE_INFINITY,
  },
  regional: {
    clusterCell: 5,
    directPriorityFloor: 195,
    maxVisible: 72,
    focusRadiusMiles: 1450,
  },
  local: {
    clusterCell: 0,
    directPriorityFloor: 0,
    maxVisible: Number.POSITIVE_INFINITY,
    focusRadiusMiles: 120,
  },
};

export function getCameraBandFocusRadiusMiles(cameraBand: ExplorerCameraBand) {
  return cameraBandConfig[cameraBand].focusRadiusMiles;
}

const localDistancePenaltyPerMile = 1.5;
const localScoreMateriality = 4;
const localDistanceMaterialityMiles = 3;
const localVisibleMax = 160;

const localLayerMaximums: Partial<Record<ExplorerLayerId, number>> = {
  "industrial-sites": 72,
  "wastewater-sites": 56,
  "pfas-sites": 10,
  "hazardous-sites": 8,
  "legal-markers": 4,
  "power-plants": 4,
  "air-toxics-regions": 1,
  "reproductive-regions": 1,
  "sentinel-species": 1,
};

function getFocusedLocalInvestigationBoost(
  entity: ExplorerEntity,
  distanceMiles: number,
) {
  if (entity.layerId === "pfas-sites") {
    return distanceMiles <= 90 ? 120 : 80;
  }

  if (entity.layerId === "wastewater-sites") {
    return distanceMiles <= 70 ? 92 : 60;
  }

  if (entity.layerId === "hazardous-sites") {
    return 36;
  }

  if (entity.layerId === "legal-markers") {
    return 28;
  }

  if (entity.layerId === "industrial-sites") {
    return entity.sourceIds.includes("epa-tri") ? -14 : -24;
  }

  return 0;
}

function getLocalUniquenessKey(entity: ExplorerEntity) {
  if (entity.geometryType !== "point") {
    return null;
  }

  switch (entity.layerId) {
    case "industrial-sites":
    case "wastewater-sites":
    case "hazardous-sites":
    case "power-plants":
    case "legal-markers": {
      const [lon, lat] = entity.coordinates;
      return `${entity.layerId}:${entity.title.trim().toLowerCase()}:${lon.toFixed(3)}:${lat.toFixed(3)}`;
    }
    default:
      return null;
  }
}

function entityMatchesCameraFocus(
  entity: ExplorerEntity,
  cameraBand: ExplorerCameraBand,
  focusCoordinates: [number, number] | null,
  selectedEntityId: string | null,
) {
  if (cameraBand === "national" || !focusCoordinates) {
    return true;
  }

  if (entity.id === selectedEntityId) {
    return true;
  }

  const config = cameraBandConfig[cameraBand];
  const distanceMiles = getDistanceMiles(focusCoordinates, entity.coordinates);
  if (entity.geometryType === "region") {
    const regionBufferMiles = (entity.radiusKm ?? 0) * 0.621371 * 0.8;
    return distanceMiles <= config.focusRadiusMiles + regionBufferMiles;
  }

  return distanceMiles <= config.focusRadiusMiles;
}

function applyPerLayerCap(
  entities: ExplorerVisibleEntity[],
  caps: Partial<Record<ExplorerLayerId, number>>,
) {
  const perLayerCount = new Map<ExplorerLayerId, number>();
  const accepted: ExplorerVisibleEntity[] = [];

  for (const entity of entities) {
    const cap = caps[entity.layerId];
    if (cap === undefined) {
      accepted.push(entity);
      continue;
    }

    const currentCount = perLayerCount.get(entity.layerId) ?? 0;
    if (currentCount >= cap) {
      continue;
    }

    perLayerCount.set(entity.layerId, currentCount + 1);
    accepted.push(entity);
  }

  return accepted;
}

const broadBandPriorityMateriality = 24;
const broadBandDistanceMaterialityMiles = 25;

function getNumericSourceStat(entity: ExplorerVisibleEntity, label: string) {
  const rawValue = entity.sourceStats?.find((entry) => entry.label === label)?.value;
  if (!rawValue) {
    return null;
  }

  const normalized = Number.parseFloat(String(rawValue).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(normalized) ? normalized : null;
}

function getNumericOfficialSignalValue(entity: ExplorerVisibleEntity, pattern: RegExp) {
  for (const signal of entity.officialSignals) {
    const match = signal.match(pattern);
    if (!match) {
      continue;
    }

    const normalized = Number.parseFloat(match[1].replace(/[^0-9.-]+/g, ""));
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return null;
}

function getLegalFederalCaseCount(entity: ExplorerVisibleEntity) {
  return getNumericOfficialSignalValue(entity, /ICIS FE&C federal case count:\s*([0-9]+)/i) ?? 0;
}

function getAirRegionLegalOverlap(entity: ExplorerVisibleEntity) {
  return getNumericSourceStat(entity, "Legal overlap") ?? 0;
}

function buildLegalClusterSignals(
  representative: ExplorerVisibleEntity,
  aggregateCount: number,
  maxFederalCases: number,
) {
  const officialSignals = [`Aggregated legal markers: ${aggregateCount}`];

  if (maxFederalCases > 0) {
    officialSignals.push(`Highest ICIS FE&C federal case count in cluster: ${maxFederalCases}`);
  }

  if (representative.signalFamilies.includes("wastewater")) {
    officialSignals.push("Wastewater-linked legal context is included in this cluster.");
  }

  if (representative.signalFamilies.includes("air-toxics")) {
    officialSignals.push("Air-toxics-linked legal context is included in this cluster.");
  }

  const sourceStats = [{ label: "Clustered legal markers", value: String(aggregateCount) }];
  if (maxFederalCases > 0) {
    sourceStats.push({ label: "Max federal cases", value: String(maxFederalCases) });
  }

  return {
    summary: `Broad-band legal context aggregated from ${aggregateCount} ECHO enforcement markers in this cluster.`,
    officialSignals,
    sourceStats,
  };
}

function getBroadBandPfasChemistryBoost(
  entity: ExplorerVisibleEntity,
  cameraBand: Exclude<ExplorerCameraBand, "local">,
) {
  if (entity.layerId !== "pfas-sites") {
    return 0;
  }

  const highlights = new Set(entity.chemicalHighlights);
  const hasGenX = highlights.has("GenX");
  const hasPfos = highlights.has("PFOS");
  const hasPfoa = highlights.has("PFOA");

  let boost = 0;

  if (hasGenX) {
    boost += cameraBand === "regional" ? 40 : 32;
  }

  if (hasPfos && hasPfoa) {
    boost += cameraBand === "regional" ? 30 : 24;
  } else if (hasPfos || hasPfoa) {
    boost += cameraBand === "regional" ? 18 : 14;
  }

  return boost;
}

function getBroadBandHazardQualityBoost(
  entity: ExplorerVisibleEntity,
  cameraBand: Exclude<ExplorerCameraBand, "local">,
) {
  if (entity.layerId !== "hazardous-sites") {
    return 0;
  }

  let boost = 0;
  const triIds = getNumericSourceStat(entity, "TRI ids") ?? 0;
  const programs = getNumericSourceStat(entity, "Programs") ?? 0;
  const federalCases = getNumericSourceStat(entity, "Federal cases") ?? 0;

  if (entity.sourceIds.includes("epa-tri")) {
    boost += cameraBand === "regional" ? 92 : 76;
  }

  if (triIds > 0) {
    boost += cameraBand === "regional" ? 54 : 42;
  }

  if (federalCases > 0) {
    boost += cameraBand === "regional" ? 34 : 26;
  }

  if (programs >= 4) {
    boost += cameraBand === "regional" ? 18 : 14;
  } else if (programs >= 3) {
    boost += cameraBand === "regional" ? 8 : 6;
  }

  if (entity.signalFamilies.includes("legal-pressure")) {
    boost += cameraBand === "regional" ? 18 : 12;
  }

  if (entity.signalFamilies.includes("wastewater")) {
    boost += cameraBand === "regional" ? 10 : 8;
  }

  return boost;
}

function getBroadBandLegalQualityBoost(
  entity: ExplorerVisibleEntity,
  cameraBand: Exclude<ExplorerCameraBand, "local">,
) {
  if (entity.layerId !== "legal-markers") {
    return 0;
  }

  let boost = 0;
  const federalCases =
    getNumericOfficialSignalValue(entity, /ICIS FE&C federal case count:\s*([0-9]+)/i) ?? 0;
  const aggregateCount = entity.aggregateCount ?? 1;

  if (federalCases >= 4) {
    boost += cameraBand === "regional" ? 92 : 74;
  } else if (federalCases >= 2) {
    boost += cameraBand === "regional" ? 72 : 56;
  } else if (federalCases >= 1) {
    boost += cameraBand === "regional" ? 48 : 36;
  } else {
    boost -= cameraBand === "regional" ? 22 : 16;
  }

  if (aggregateCount >= 12) {
    boost += cameraBand === "regional" ? 18 : 12;
  } else if (aggregateCount >= 5) {
    boost += cameraBand === "regional" ? 10 : 8;
  }

  if (entity.signalFamilies.includes("wastewater")) {
    boost += cameraBand === "regional" ? 12 : 8;
  }

  if (entity.signalFamilies.includes("air-toxics")) {
    boost += cameraBand === "regional" ? 8 : 6;
  }

  return boost;
}

function getBroadBandAirRegionQualityBoost(
  entity: ExplorerVisibleEntity,
  cameraBand: Exclude<ExplorerCameraBand, "local">,
) {
  if (entity.layerId !== "air-toxics-regions") {
    return 0;
  }

  let boost = 0;
  const triAirFacilities = getNumericSourceStat(entity, "TRI air facilities") ?? 0;
  const legalOverlap = getAirRegionLegalOverlap(entity);
  const powerFacilities = getNumericSourceStat(entity, "Power facilities") ?? 0;
  const clusteredRecords = getNumericSourceStat(entity, "Clustered records") ?? 0;
  const hasEcho = entity.sourceIds.includes("epa-echo");

  if (legalOverlap >= 500) {
    boost += cameraBand === "regional" ? 48 : 38;
  } else if (legalOverlap >= 100) {
    boost += cameraBand === "regional" ? 28 : 22;
  } else if (legalOverlap >= 25) {
    boost += cameraBand === "regional" ? 12 : 8;
  } else if (legalOverlap <= 0) {
    boost -= cameraBand === "regional" ? 34 : 24;
  } else {
    boost -= cameraBand === "regional" ? 8 : 6;
  }

  if (triAirFacilities >= 400) {
    boost += cameraBand === "regional" ? 26 : 20;
  } else if (triAirFacilities >= 250) {
    boost += cameraBand === "regional" ? 16 : 12;
  }

  if (hasEcho) {
    boost += cameraBand === "regional" ? 18 : 14;
  } else {
    boost -= cameraBand === "regional" ? 14 : 10;
  }

  if (clusteredRecords >= 1000) {
    boost += cameraBand === "regional" ? 12 : 8;
  } else if (clusteredRecords >= 500) {
    boost += cameraBand === "regional" ? 6 : 4;
  }

  if (powerFacilities >= 10 && legalOverlap > 0) {
    boost += cameraBand === "regional" ? 10 : 8;
  } else if (powerFacilities <= 0) {
    boost -= cameraBand === "regional" ? 4 : 2;
  }

  if (entity.signalFamilies.includes("legacy-hazard")) {
    boost += legalOverlap > 0
      ? cameraBand === "regional" ? 8 : 6
      : cameraBand === "regional" ? 2 : 1;
  }

  return boost;
}

function passesBroadBandQualityGate(entity: ExplorerVisibleEntity) {
  if (entity.layerId === "air-toxics-regions") {
    const legalOverlap = getAirRegionLegalOverlap(entity);
    const hasEcho = entity.sourceIds.includes("epa-echo");
    if (!hasEcho || legalOverlap < 50) {
      return false;
    }
  }

  return true;
}

function getBroadBandSelectionPriority(
  entity: ExplorerVisibleEntity,
  cameraBand: Exclude<ExplorerCameraBand, "local">,
) {
  let priority = getEntitySelectionPriority(entity);

  if (entity.layerId === "wastewater-sites") {
    if (entity.sourceIds.includes("epa-npdes")) {
      priority += cameraBand === "regional" ? 120 : 108;
    }

    if (entity.sourceIds.includes("usgs-pharma")) {
      priority -= cameraBand === "regional" ? 56 : 44;
    }
  }

  if (entity.layerId === "pfas-sites") {
    if (entity.sourceIds.includes("atsdr-pfas-sites")) {
      priority += cameraBand === "regional" ? 96 : 84;
    }

    if (entity.sourceIds.includes("usgs-pfas-tapwater")) {
      priority += cameraBand === "regional" ? 16 : 12;
    }

    if (entity.isAggregate) {
      priority -= cameraBand === "regional" ? 72 : 60;
    }

    priority += getBroadBandPfasChemistryBoost(entity, cameraBand);
  }

  if (entity.layerId === "industrial-sites" && entity.sourceIds.includes("epa-tri")) {
    priority += cameraBand === "regional" ? 18 : 12;
  }

  priority += getBroadBandLegalQualityBoost(entity, cameraBand);
  priority += getBroadBandAirRegionQualityBoost(entity, cameraBand);
  priority += getBroadBandHazardQualityBoost(entity, cameraBand);

  return priority;
}

function compareEntitiesForBroadBandFocus(
  left: ExplorerVisibleEntity,
  right: ExplorerVisibleEntity,
  focusCoordinates: [number, number] | null,
  cameraBand: Exclude<ExplorerCameraBand, "local">,
) {
  const priorityDelta =
    getBroadBandSelectionPriority(right, cameraBand) -
    getBroadBandSelectionPriority(left, cameraBand);
  if (priorityDelta !== 0) {
    if (
      focusCoordinates &&
      left.layerId === right.layerId &&
      Math.abs(priorityDelta) <= broadBandPriorityMateriality
    ) {
      const leftDistance = getDistanceMiles(focusCoordinates, left.coordinates);
      const rightDistance = getDistanceMiles(focusCoordinates, right.coordinates);
      if (Math.abs(leftDistance - rightDistance) > broadBandDistanceMaterialityMiles) {
        return leftDistance - rightDistance;
      }
    }

    return priorityDelta;
  }

  if (focusCoordinates && left.layerId === right.layerId) {
    const leftDistance = getDistanceMiles(focusCoordinates, left.coordinates);
    const rightDistance = getDistanceMiles(focusCoordinates, right.coordinates);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
  }

  return compareEntitiesBySelectionPriority(left, right);
}

function clusterEntities(
  entities: ExplorerEntity[],
  activeYear: number,
  selectedEntityId: string | null,
  cameraBand: Exclude<ExplorerCameraBand, "local">,
  focusCoordinates: [number, number] | null,
): ExplorerVisibleEntity[] {
  const config = cameraBandConfig[cameraBand];
  const clusterCell = config.clusterCell;
  const preservePriority = config.directPriorityFloor;
  const clusters = new Map<string, ExplorerVisibleEntity>();
  const regionCaps = broadRegionCaps[cameraBand];
  const regionEntities = applyPerLayerCap(
    entities
      .filter((entity) => entity.geometryType === "region")
      .sort((left, right) =>
        compareEntitiesForBroadBandFocus(left, right, focusCoordinates, cameraBand),
      ),
    regionCaps,
  );
  const pointEntities = entities.filter((entity) => entity.geometryType === "point");
  const rankedPointEntities = pointEntities.sort((left, right) =>
    compareEntitiesForBroadBandFocus(left, right, focusCoordinates, cameraBand),
  );

  const rawSelected = pointEntities.filter((entity) => entity.id === selectedEntityId);
  const directFamilyPreserveRules = broadBandDirectSourceFamilyPreserveRules[cameraBand];
  const directFamilyPreservedPoints: ExplorerVisibleEntity[] = [];
  const directFamilyPreservedIds = new Set<string>();

  for (const [layerId, rules] of Object.entries(directFamilyPreserveRules) as Array<
    [ExplorerLayerId, Array<{ sourceIds: string[]; count: number }> | undefined]
  >) {
    if (!rules) {
      continue;
    }

    for (const rule of rules) {
      let addedForRule = 0;
      for (const entity of rankedPointEntities) {
        if (entity.id === selectedEntityId || directFamilyPreservedIds.has(entity.id)) {
          continue;
        }

        if (entity.layerId !== layerId) {
          continue;
        }

        if (!rule.sourceIds.some((sourceId) => entity.sourceIds.includes(sourceId))) {
          continue;
        }

        directFamilyPreservedPoints.push(entity);
        directFamilyPreservedIds.add(entity.id);
        addedForRule += 1;
        if (addedForRule >= rule.count) {
          break;
        }
      }
    }
  }

  const preservedPoints = applyPerLayerCap(
    rankedPointEntities
      .filter(
        (entity) =>
          entity.id !== selectedEntityId &&
          !directFamilyPreservedIds.has(entity.id) &&
          getEntitySelectionPriority(entity) >= preservePriority,
      ),
    directPointCaps[cameraBand],
  );
  const preservedPointIds = new Set(
    [...directFamilyPreservedPoints, ...preservedPoints].map((entity) => entity.id),
  );
  const clusterCandidates = pointEntities.filter(
    (entity) => entity.id !== selectedEntityId && !preservedPointIds.has(entity.id),
  );

  for (const entity of clusterCandidates) {
    const bucketCell = layerClusterCellOverrides[cameraBand]?.[entity.layerId] ?? clusterCell;
    const bucketLon = Math.round(entity.coordinates[0] / bucketCell) * bucketCell;
    const bucketLat = Math.round(entity.coordinates[1] / bucketCell) * bucketCell;
    const key = `${entity.layerId}:${bucketLon}:${bucketLat}`;
    const existing = clusters.get(key);

    if (existing) {
      const currentAggregateCount = existing.aggregateCount ?? 1;
      const currentAggregateIds = [...(existing.aggregateIds ?? [])];
      const currentRelatedCaseStudyIds = [...existing.relatedCaseStudyIds];
      const currentSourceIds = [...existing.sourceIds];
      const currentSignalFamilies = [...existing.signalFamilies];
      const currentChemicalMarkers = [...existing.chemicalMarkers];
      const currentChemicalHighlights = [...existing.chemicalHighlights];

      if (compareEntitiesForBroadBandFocus(entity, existing, focusCoordinates, cameraBand) < 0) {
        Object.assign(existing, {
          ...entity,
          id: existing.id,
          title: existing.title,
          summary: existing.summary,
          whyThisAppears: existing.whyThisAppears,
          category: existing.category,
          uncertaintyNote: existing.uncertaintyNote,
          aggregateCount: currentAggregateCount,
          aggregateIds: currentAggregateIds,
          isAggregate: true,
        });
      }

      existing.aggregateCount = (existing.aggregateCount ?? 1) + 1;
      existing.aggregateIds = [...(existing.aggregateIds ?? []), entity.id];
      existing.relatedCaseStudyIds = Array.from(
        new Set([...currentRelatedCaseStudyIds, ...entity.relatedCaseStudyIds]),
      );
      existing.sourceIds = Array.from(new Set([...existing.sourceIds, ...entity.sourceIds]));
      existing.signalFamilies = Array.from(
        new Set([...currentSignalFamilies, ...entity.signalFamilies]),
      );
      existing.chemicalMarkers = Array.from(
        new Set([...currentChemicalMarkers, ...entity.chemicalMarkers]),
      );
      existing.chemicalHighlights = Array.from(
        new Set([...currentChemicalHighlights, ...entity.chemicalHighlights]),
      );
      existing.sourceIds = Array.from(new Set([...currentSourceIds, ...entity.sourceIds]));

      if (existing.layerId === "legal-markers") {
        const maxFederalCases = Math.max(
          getNumericSourceStat(existing, "Max federal cases") ?? 0,
          getLegalFederalCaseCount(entity),
          getLegalFederalCaseCount(existing),
        );
        Object.assign(
          existing,
          buildLegalClusterSignals(existing, existing.aggregateCount ?? 1, maxFederalCases),
        );
      }
      continue;
    }

    const layerLabel = getLayerDefinition(entity.layerId)?.label ?? entity.category;
    clusters.set(key, {
      ...entity,
      id: `cluster-${key}-${activeYear}`,
      title: `${layerLabel} cluster`,
      summary: "Aggregated wide-zoom signal used to keep the map readable while preserving stronger nearby records as individual points.",
      whyThisAppears:
        "At wider zoom levels, lower-priority nearby markers are aggregated so the map stays readable without hiding the strongest source-backed records.",
      aggregateCount: 1,
      aggregateIds: [entity.id],
      isAggregate: true,
      category: "Clustered context",
      subcategory: entity.subcategory,
      uncertaintyNote:
        "Clusters are a visual aggregation aid. Open a closer view or search for a specific marker to inspect the underlying records.",
    });

    const created = clusters.get(key);
    if (created && created.layerId === "legal-markers") {
      Object.assign(
        created,
        buildLegalClusterSignals(created, created.aggregateCount ?? 1, getLegalFederalCaseCount(entity)),
      );
    }
  }

  const rankedClusters = applyPerLayerCap(
    Array.from(clusters.values()).sort((left, right) => {
      const priorityComparison = compareEntitiesForBroadBandFocus(
        left,
        right,
        focusCoordinates,
        cameraBand,
      );
      if (priorityComparison !== 0) {
        return priorityComparison;
      }

      return (right.aggregateCount ?? 1) - (left.aggregateCount ?? 1);
    }),
    aggregateCaps[cameraBand],
  );

  const combined = [
    ...regionEntities,
    ...rawSelected,
    ...directFamilyPreservedPoints,
    ...preservedPoints,
    ...rankedClusters,
  ].sort((left, right) => compareEntitiesForBroadBandFocus(left, right, focusCoordinates, cameraBand));

  return balanceBroadBandVisibleEntities(combined, cameraBand, config.maxVisible);
}

function balanceBroadBandVisibleEntities(
  entities: ExplorerVisibleEntity[],
  cameraBand: Exclude<ExplorerCameraBand, "local">,
  maxVisible: number,
) {
  const minimums = broadBandLayerMinimums[cameraBand];
  const maximums = broadBandLayerMaximums[cameraBand];
  const diversityRules = broadBandLayerDiversityRules[cameraBand];
  const sourceFamilyRules = broadBandLayerSourceFamilyRules[cameraBand];
  const exactCoordinateRules = broadBandLayerExactCoordinateRules[cameraBand];
  const selected = new Map<string, ExplorerVisibleEntity>();
  const perLayerCount = new Map<ExplorerLayerId, number>();
  const perLayerBucketCount = new Map<string, number>();
  const perLayerSourceFamilyCount = new Map<string, number>();
  const perLayerCoordinateCount = new Map<string, number>();

  function getDiversityBucketKey(entity: ExplorerVisibleEntity) {
    const rule = diversityRules[entity.layerId];
    if (!rule || entity.geometryType !== "point") {
      return null;
    }

    const bucketLon = Math.round(entity.coordinates[0] / rule.cellDegrees) * rule.cellDegrees;
    const bucketLat = Math.round(entity.coordinates[1] / rule.cellDegrees) * rule.cellDegrees;
    return `${entity.layerId}:${bucketLon}:${bucketLat}`;
  }

  function getSourceFamilyKey(entity: ExplorerVisibleEntity) {
    const rule = sourceFamilyRules[entity.layerId];
    if (!rule) {
      return null;
    }

    const matchingFamily = rule.families.find((family) =>
      family.sourceIds.some((sourceId) => entity.sourceIds.includes(sourceId)),
    );
    if (!matchingFamily) {
      return null;
    }

    return `${entity.layerId}:${matchingFamily.key}`;
  }

  function getSourceFamilyRule(entity: ExplorerVisibleEntity) {
    const rule = sourceFamilyRules[entity.layerId];
    if (!rule) {
      return null;
    }

    return (
      rule.families.find((family) =>
        family.sourceIds.some((sourceId) => entity.sourceIds.includes(sourceId)),
      ) ?? null
    );
  }

  function getExactCoordinateKey(entity: ExplorerVisibleEntity) {
    const rule = exactCoordinateRules[entity.layerId];
    if (!rule || entity.geometryType !== "point") {
      return null;
    }

    const [lon, lat] = entity.coordinates;
    return `${entity.layerId}:${lon.toFixed(rule.precision)}:${lat.toFixed(rule.precision)}`;
  }

  function canAdd(entity: ExplorerVisibleEntity) {
    if (selected.has(entity.id)) {
      return false;
    }

    if (!passesBroadBandQualityGate(entity)) {
      return false;
    }

    const familyRule = getSourceFamilyRule(entity);
    const familyKey = getSourceFamilyKey(entity);
    const coordinateRule = exactCoordinateRules[entity.layerId];
    const coordinateKey = getExactCoordinateKey(entity);
    const maxPerLayer = maximums[entity.layerId];
    if (maxPerLayer === undefined) {
      if (
        familyRule &&
        familyKey &&
        (perLayerSourceFamilyCount.get(familyKey) ?? 0) >= familyRule.max
      ) {
        return false;
      }

      if (
        coordinateRule &&
        coordinateKey &&
        (perLayerCoordinateCount.get(coordinateKey) ?? 0) >= coordinateRule.maxPerCoordinate
      ) {
        return false;
      }

      const rule = diversityRules[entity.layerId];
      if (!rule) {
        return true;
      }

      const bucketKey = getDiversityBucketKey(entity);
      if (!bucketKey) {
        return true;
      }

      return (perLayerBucketCount.get(bucketKey) ?? 0) < rule.maxPerBucket;
    }

    if ((perLayerCount.get(entity.layerId) ?? 0) >= maxPerLayer) {
      return false;
    }

    if (
      familyRule &&
      familyKey &&
      (perLayerSourceFamilyCount.get(familyKey) ?? 0) >= familyRule.max
    ) {
      return false;
    }

    if (
      coordinateRule &&
      coordinateKey &&
      (perLayerCoordinateCount.get(coordinateKey) ?? 0) >= coordinateRule.maxPerCoordinate
    ) {
      return false;
    }

    const rule = diversityRules[entity.layerId];
    if (!rule) {
      return true;
    }

    const bucketKey = getDiversityBucketKey(entity);
    if (!bucketKey) {
      return true;
    }

    return (perLayerBucketCount.get(bucketKey) ?? 0) < rule.maxPerBucket;
  }

  function addEntity(entity: ExplorerVisibleEntity) {
    if (!canAdd(entity)) {
      return false;
    }

    selected.set(entity.id, entity);
    perLayerCount.set(entity.layerId, (perLayerCount.get(entity.layerId) ?? 0) + 1);
    const bucketKey = getDiversityBucketKey(entity);
    if (bucketKey) {
      perLayerBucketCount.set(bucketKey, (perLayerBucketCount.get(bucketKey) ?? 0) + 1);
    }
    const familyKey = getSourceFamilyKey(entity);
    if (familyKey) {
      perLayerSourceFamilyCount.set(
        familyKey,
        (perLayerSourceFamilyCount.get(familyKey) ?? 0) + 1,
      );
    }
    const coordinateKey = getExactCoordinateKey(entity);
    if (coordinateKey) {
      perLayerCoordinateCount.set(
        coordinateKey,
        (perLayerCoordinateCount.get(coordinateKey) ?? 0) + 1,
      );
    }
    return true;
  }

  for (const [layerId, minimumCount] of Object.entries(minimums) as Array<
    [ExplorerLayerId, number | undefined]
  >) {
    if (!minimumCount || minimumCount <= 0) {
      continue;
    }

    let addedForLayer = 0;
    for (const entity of entities) {
      if (entity.layerId !== layerId) {
        continue;
      }

      if (!addEntity(entity)) {
        continue;
      }

      addedForLayer += 1;
      if (addedForLayer >= minimumCount) {
        break;
      }
    }
  }

  for (const [layerId, familyRule] of Object.entries(sourceFamilyRules) as Array<
    [
      ExplorerLayerId,
      {
        families: Array<{
          key: string;
          sourceIds: string[];
          min: number;
          max: number;
        }>;
      } | undefined,
    ]
  >) {
    if (!familyRule) {
      continue;
    }

    for (const family of familyRule.families) {
      let addedForFamily = 0;
      for (const entity of entities) {
        if (entity.layerId !== layerId) {
          continue;
        }

        if (!family.sourceIds.some((sourceId) => entity.sourceIds.includes(sourceId))) {
          continue;
        }

        if (!addEntity(entity)) {
          continue;
        }

        addedForFamily += 1;
        if (addedForFamily >= family.min) {
          break;
        }
      }
    }
  }

  for (const entity of entities) {
    if (selected.size >= maxVisible) {
      break;
    }

    addEntity(entity);
  }

  return Array.from(selected.values())
    .sort(compareEntitiesBySelectionPriority)
    .slice(0, maxVisible);
}

function compareEntitiesForFocusedLocalView(
  left: ExplorerEntity,
  right: ExplorerEntity,
  focusCoordinates: [number, number] | null,
) {
  const leftIsPoint = left.geometryType === "point";
  const rightIsPoint = right.geometryType === "point";
  if (leftIsPoint !== rightIsPoint) {
    return leftIsPoint ? -1 : 1;
  }

  if (focusCoordinates) {
    const leftPriority = getEntitySelectionPriority(left);
    const rightPriority = getEntitySelectionPriority(right);
    const leftDistance = getDistanceMiles(focusCoordinates, left.coordinates);
    const rightDistance = getDistanceMiles(focusCoordinates, right.coordinates);
    const leftLocalScore =
      leftPriority +
      getFocusedLocalInvestigationBoost(left, leftDistance) -
      leftDistance * localDistancePenaltyPerMile;
    const rightLocalScore =
      rightPriority +
      getFocusedLocalInvestigationBoost(right, rightDistance) -
      rightDistance * localDistancePenaltyPerMile;

    if (Math.abs(leftLocalScore - rightLocalScore) > localScoreMateriality) {
      return rightLocalScore - leftLocalScore;
    }

    if (Math.abs(leftDistance - rightDistance) > localDistanceMaterialityMiles) {
      return leftDistance - rightDistance;
    }
  }

  const priorityComparison = compareEntitiesBySelectionPriority(left, right);
  if (priorityComparison !== 0) {
    return priorityComparison;
  }

  return left.title.localeCompare(right.title);
}

function limitLocalRegionContext(
  entities: ExplorerEntity[],
  focusCoordinates: [number, number] | null,
) {
  const regionLayerCaps: Partial<Record<ExplorerLayerId, number>> = {
    "air-toxics-regions": 1,
    "reproductive-regions": 1,
    "sentinel-species": 1,
  };
  const layerCounts = new Map<ExplorerLayerId, number>();
  const accepted: ExplorerEntity[] = [];

  const ranked = [...entities].sort((left, right) =>
    compareEntitiesForFocusedLocalView(left, right, focusCoordinates),
  );

  for (const entity of ranked) {
    if (entity.geometryType !== "region") {
      accepted.push(entity);
      continue;
    }

    const cap = regionLayerCaps[entity.layerId];
    if (cap === undefined) {
      accepted.push(entity);
      continue;
    }

    const currentCount = layerCounts.get(entity.layerId) ?? 0;
    if (currentCount >= cap) {
      continue;
    }

    layerCounts.set(entity.layerId, currentCount + 1);
    accepted.push(entity);
  }

  return accepted;
}

function balanceFocusedLocalEntities(entities: ExplorerVisibleEntity[]) {
  const openingWindowSize = 12;
  const openingLayerMaximums: Partial<Record<ExplorerLayerId, number>> = {
    "pfas-sites": 3,
    "wastewater-sites": 3,
    "industrial-sites": 5,
    "hazardous-sites": 2,
    "legal-markers": 2,
  };
  const requiredOpeningLayers: ExplorerLayerId[] = [
    "pfas-sites",
    "wastewater-sites",
    "industrial-sites",
  ];
  const selected = new Set<string>();
  const acceptedEntities: ExplorerVisibleEntity[] = [];
  const openingLayerCounts = new Map<ExplorerLayerId, number>();
  const layerCounts = new Map<ExplorerLayerId, number>();
  const uniquenessKeys = new Set<string>();

  function tryAdd(entity: ExplorerVisibleEntity) {
    if (selected.has(entity.id)) {
      return false;
    }

    const isOpeningWindow = acceptedEntities.length < openingWindowSize;

    if (isOpeningWindow) {
      const openingCap = openingLayerMaximums[entity.layerId];
      if (openingCap !== undefined && (openingLayerCounts.get(entity.layerId) ?? 0) >= openingCap) {
        return false;
      }
    } else {
      const layerCap = localLayerMaximums[entity.layerId];
      if (layerCap !== undefined && (layerCounts.get(entity.layerId) ?? 0) >= layerCap) {
        return false;
      }
    }

    const uniquenessKey = getLocalUniquenessKey(entity);
    if (uniquenessKey && uniquenessKeys.has(uniquenessKey)) {
      return false;
    }

    selected.add(entity.id);
    acceptedEntities.push(entity);
    openingLayerCounts.set(entity.layerId, (openingLayerCounts.get(entity.layerId) ?? 0) + 1);
    layerCounts.set(entity.layerId, (layerCounts.get(entity.layerId) ?? 0) + 1);
    if (uniquenessKey) {
      uniquenessKeys.add(uniquenessKey);
    }
    return true;
  }

  for (const layerId of requiredOpeningLayers) {
    const entity = entities.find((candidate) => candidate.layerId === layerId);
    if (!entity) {
      continue;
    }

    if (acceptedEntities.length >= openingWindowSize) {
      break;
    }

    tryAdd(entity);
  }

  for (const entity of entities) {
    if (acceptedEntities.length >= localVisibleMax) {
      break;
    }

    tryAdd(entity);
  }

  return acceptedEntities;
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
    }) &&
    entityMatchesCameraFocus(
      entity,
      options.cameraBand,
      options.focusCoordinates,
      options.selectedEntityId,
    ),
  );

  if (options.cameraBand !== "local") {
    return clusterEntities(
      filtered,
      options.activeYear,
      options.selectedEntityId,
      options.cameraBand,
      options.focusCoordinates,
    );
  }

  return balanceFocusedLocalEntities(
    limitLocalRegionContext(filtered, options.focusCoordinates).sort((left, right) =>
      compareEntitiesForFocusedLocalView(left, right, options.focusCoordinates),
    ),
  );
}
