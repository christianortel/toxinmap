import {
  getCameraZoomProgress,
  getZoomScaledAltitudeMultiplier,
  getZoomScaledPointMultiplier,
} from "@/lib/map/camera";
import {
  compareEntitiesBySelectionPriority,
  getEntitySelectionPointSize,
} from "@/lib/map/entity-priority";
import { getLayerDefinition } from "@/lib/map/layer-registry";
import type { ExplorerCameraBand, ExplorerVisibleEntity } from "@/types/explorer";

export type GlobeRenderableEntity = ExplorerVisibleEntity & {
  lat: number;
  lng: number;
  pointColor: string;
  pointAltitude: number;
  pointRadius: number;
  localStackIndex?: number;
  localStackSize?: number;
};

export type LocalObjectRenderStyle = {
  coreRadius: number;
  haloRadius: number;
  hitRadius: number;
  detail: number;
  haloOpacity: number;
  emissiveIntensity: number;
  selectionBeaconRadius: number | null;
  selectionBeaconOpacity: number;
};

export type MapInspectionLabel = {
  id: string;
  entityId: string;
  lat: number;
  lng: number;
  altitude: number;
  text: string;
  color: string;
  size: number;
  isSelected: boolean;
};

export type MapInspectionLabelPresentation = {
  title: string;
  layerLabel: string;
  sourceLabel: string;
  evidenceLabel: string;
  confidenceLabel: string;
  selectedText: string;
  unselectedText: string;
};

type LayerPointStyle = {
  brighten: number;
  alpha: number;
  radiusMultiplier: number;
  altitudeBoost: number;
};

export type BuildGlobeRenderableEntitiesOptions = {
  cameraBand: ExplorerCameraBand;
  cameraHeight: number;
  selectedEntityId: string | null;
  resolveAccentColor?: (accent: string) => string;
};

const sourceShortLabels: Partial<Record<string, string>> = {
  "usgs-pfas": "USGS PFAS",
  "usgs-pfas-tapwater": "USGS PFAS",
  "atsdr-pfas": "ATSDR PFAS",
  "atsdr-pfas-sites": "ATSDR PFAS",
  "epa-npdes": "EPA NPDES",
  "epa-biosolids": "EPA Biosolids",
  "epa-sems": "EPA SEMS",
  "epa-tri": "EPA TRI",
  "epa-frs": "EPA FRS",
  "epa-echo": "EPA ECHO",
  "usgs-pharma": "USGS Water",
};

export const selectedInspectionLabelExclusionDistanceDegrees = 0.018;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function interpolate(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function mixColor(color: string, amount: number) {
  if (!color.startsWith("#")) {
    return color;
  }

  const normalized =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const blend = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * amount)));
  return `#${blend(red).toString(16).padStart(2, "0")}${blend(green).toString(16).padStart(2, "0")}${blend(blue).toString(16).padStart(2, "0")}`;
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("#")) {
    const normalized =
      color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return color;
}

function getLayerPointStyle(
  layerId: ExplorerVisibleEntity["layerId"],
  cameraBand: ExplorerCameraBand,
): LayerPointStyle {
  const broadScale = cameraBand === "national";

  switch (layerId) {
    case "pfas-sites":
      return {
        brighten: broadScale ? 0.34 : 0.22,
        alpha: broadScale ? 0.98 : 0.92,
        radiusMultiplier: broadScale ? 1.28 : 1.18,
        altitudeBoost: broadScale ? 0.014 : 0.008,
      };
    case "wastewater-sites":
      return {
        brighten: broadScale ? 0.28 : 0.18,
        alpha: broadScale ? 0.95 : 0.9,
        radiusMultiplier: broadScale ? 1.18 : 1.1,
        altitudeBoost: broadScale ? 0.01 : 0.006,
      };
    case "hazardous-sites":
      return {
        brighten: broadScale ? 0.24 : 0.16,
        alpha: broadScale ? 0.93 : 0.88,
        radiusMultiplier: broadScale ? 1.14 : 1.08,
        altitudeBoost: broadScale ? 0.008 : 0.004,
      };
    case "legal-markers":
      return {
        brighten: broadScale ? 0.16 : 0.1,
        alpha: broadScale ? 0.87 : 0.82,
        radiusMultiplier: broadScale ? 0.94 : 0.92,
        altitudeBoost: broadScale ? 0.016 : 0.01,
      };
    case "power-plants":
      return {
        brighten: broadScale ? 0.2 : 0.13,
        alpha: broadScale ? 0.86 : 0.82,
        radiusMultiplier: broadScale ? 1.02 : 0.98,
        altitudeBoost: broadScale ? 0.01 : 0.006,
      };
    case "industrial-sites":
      return {
        brighten: broadScale ? 0.08 : 0.05,
        alpha: broadScale ? 0.74 : 0.78,
        radiusMultiplier: broadScale ? 0.88 : 0.94,
        altitudeBoost: broadScale ? 0 : 0,
      };
    case "air-toxics-regions":
    case "reproductive-regions":
    case "sentinel-species":
      return {
        brighten: broadScale ? 0.14 : 0.08,
        alpha: broadScale ? 0.8 : 0.76,
        radiusMultiplier: broadScale ? 1 : 1,
        altitudeBoost: broadScale ? 0.004 : 0.002,
      };
    default:
      return {
        brighten: broadScale ? 0.18 : 0.12,
        alpha: broadScale ? 0.9 : 0.86,
        radiusMultiplier: 1,
        altitudeBoost: 0,
      };
  }
}

function getSourceShortLabel(entity: ExplorerVisibleEntity) {
  const strongestSource = entity.sourceIds.find((sourceId) => sourceShortLabels[sourceId]);
  return strongestSource
    ? sourceShortLabels[strongestSource] ?? strongestSource
    : entity.sourceIds[0] ?? "Source";
}

function getLayerShortLabel(entity: ExplorerVisibleEntity) {
  return getLayerDefinition(entity.layerId)?.shortLabel ?? entity.layerId;
}

function getEvidenceShortLabel(entity: ExplorerVisibleEntity) {
  switch (entity.evidenceType) {
    case "Direct Measurement":
      return "Direct evidence";
    case "Screening Signal":
      return "Screening signal";
    case "Literature Evidence":
      return "Literature signal";
    case "Editorial Case Study":
      return "Case-study context";
    case "Proxy":
    default:
      return "Proxy evidence";
  }
}

export function getMapInspectionLabelPresentation(
  entity: ExplorerVisibleEntity,
): MapInspectionLabelPresentation {
  const layerLabel = getLayerShortLabel(entity);
  const sourceLabel = getSourceShortLabel(entity);
  const evidenceLabel = getEvidenceShortLabel(entity);
  const confidenceLabel = `${entity.confidenceLevel} confidence`;

  return {
    title: entity.title,
    layerLabel,
    sourceLabel,
    evidenceLabel,
    confidenceLabel,
    selectedText: `${entity.title}\n${layerLabel} / ${sourceLabel}\n${evidenceLabel} / ${confidenceLabel}`,
    unselectedText: `${layerLabel}: ${entity.title}`,
  };
}

function getMapInspectionLabelText(entity: ExplorerVisibleEntity, isSelected: boolean) {
  const presentation = getMapInspectionLabelPresentation(entity);
  if (isSelected) {
    return presentation.selectedText;
  }

  return presentation.unselectedText;
}

function getSquaredCoordinateDistance(
  left: Pick<GlobeRenderableEntity, "lat" | "lng">,
  right: Pick<GlobeRenderableEntity, "lat" | "lng">,
) {
  const latDelta = left.lat - right.lat;
  const lngDelta = left.lng - right.lng;
  return latDelta * latDelta + lngDelta * lngDelta;
}

function isInsideSelectedInspectionLabelExclusionZone(
  entity: GlobeRenderableEntity,
  selectedEntity: GlobeRenderableEntity | null,
) {
  if (!selectedEntity) {
    return false;
  }

  return (
    getSquaredCoordinateDistance(entity, selectedEntity) <=
    selectedInspectionLabelExclusionDistanceDegrees * selectedInspectionLabelExclusionDistanceDegrees
  );
}

export function shouldRenderOnObjectLayer(
  entity: Pick<GlobeRenderableEntity, "geometryType" | "isAggregate">,
  cameraBand: ExplorerCameraBand,
) {
  return cameraBand === "local" && entity.geometryType === "point" && !entity.isAggregate;
}

export function buildGlobeRenderableEntities(
  entities: ExplorerVisibleEntity[],
  {
    cameraBand,
    cameraHeight,
    selectedEntityId,
    resolveAccentColor = (accent) => (accent.startsWith("var(") ? "#6cb6ff" : accent),
  }: BuildGlobeRenderableEntitiesOptions,
): GlobeRenderableEntity[] {
  const renderEntities = [...entities].sort(
    (left, right) => compareEntitiesBySelectionPriority(left, right) * -1,
  );
  const zoomPointMultiplier = getZoomScaledPointMultiplier(cameraHeight);
  const zoomAltitudeMultiplier = getZoomScaledAltitudeMultiplier(cameraHeight);

  return renderEntities.map((entity) => {
    const layerStyle = getLayerPointStyle(entity.layerId, cameraBand);
    const accent = resolveAccentColor(
      getLayerDefinition(entity.layerId)?.accent ?? "#6cb6ff",
    );
    const brightAccent = mixColor(accent, layerStyle.brighten);
    const isSelected = entity.id === selectedEntityId;
    const pointSize = getEntitySelectionPointSize(entity, isSelected);
    const pointRadius = entity.isAggregate
      ? cameraBand === "national"
        ? 0.028
        : cameraBand === "regional"
          ? 0.02
          : 0.014
      : Math.max(
          pointSize /
            (cameraBand === "national"
              ? 540
              : cameraBand === "regional"
                ? 760
                : 1100),
          entity.geometryType === "region"
            ? cameraBand === "local"
              ? 0.0075
              : cameraBand === "regional"
                ? 0.012
                : 0.018
            : cameraBand === "national"
              ? 0.01
              : cameraBand === "regional"
                ? 0.0075
                : 0.005,
        );
    const pointAltitude =
      entity.geometryType === "region"
        ? entity.isAggregate
          ? 0.028
          : cameraBand === "local"
            ? 0.004
            : cameraBand === "regional"
              ? 0.009
              : 0.014
        : entity.isAggregate
          ? 0.016
          : cameraBand === "national"
            ? 0.006
            : cameraBand === "regional"
              ? 0.004
              : 0.0018;

    return {
      ...entity,
      lat: entity.coordinates[1],
      lng: entity.coordinates[0],
      pointColor: withAlpha(brightAccent, isSelected ? 0.98 : layerStyle.alpha),
      pointAltitude: isSelected
        ? (pointAltitude + layerStyle.altitudeBoost) * zoomAltitudeMultiplier + 0.014
        : (pointAltitude + layerStyle.altitudeBoost) * zoomAltitudeMultiplier,
      pointRadius: isSelected
        ? pointRadius * layerStyle.radiusMultiplier * zoomPointMultiplier * 1.16
        : pointRadius * layerStyle.radiusMultiplier * zoomPointMultiplier,
    };
  });
}

export function splitGlobeRenderableEntities(
  entities: GlobeRenderableEntity[],
  cameraBand: ExplorerCameraBand,
) {
  const pointEntities: GlobeRenderableEntity[] = [];
  const objectEntities: GlobeRenderableEntity[] = [];

  for (const entity of entities) {
    if (shouldRenderOnObjectLayer(entity, cameraBand)) {
      objectEntities.push(entity);
      continue;
    }

    pointEntities.push(entity);
  }

  if (cameraBand !== "local" || objectEntities.length <= 1) {
    return {
      pointEntities,
      objectEntities,
    };
  }

  const grouped = new Map<string, GlobeRenderableEntity[]>();
  for (const entity of objectEntities) {
    const key = `${Math.round(entity.lng * 100) / 100}|${Math.round(entity.lat * 100) / 100}`;
    const group = grouped.get(key) ?? [];
    group.push(entity);
    grouped.set(key, group);
  }

  const stackedObjectEntities: GlobeRenderableEntity[] = [];
  for (const group of grouped.values()) {
    const orderedGroup = [...group].sort((left, right) => {
      if (left.layerId !== right.layerId) {
        return getLocalObjectLayerLift(right.layerId) - getLocalObjectLayerLift(left.layerId);
      }

      return left.title.localeCompare(right.title);
    });

    const centeredSlots = buildCenteredStackOffsets(orderedGroup.length);
    orderedGroup.forEach((entity, index) => {
      const layerLift = getLocalObjectLayerLift(entity.layerId);
      const stackLift = centeredSlots[index] * 0.0014;
      stackedObjectEntities.push({
        ...entity,
        pointAltitude: entity.pointAltitude + layerLift + stackLift,
        localStackIndex: centeredSlots[index],
        localStackSize: orderedGroup.length,
      });
    });
  }

  return {
    pointEntities,
    objectEntities: stackedObjectEntities,
  };
}

export function buildMapInspectionLabels(
  entities: GlobeRenderableEntity[],
  cameraBand: ExplorerCameraBand,
  selectedEntityId: string | null,
  maxLabels = 5,
): MapInspectionLabel[] {
  if (cameraBand !== "local") {
    return [];
  }

  const concreteEntities = entities.filter(
    (entity) => entity.geometryType === "point" && !entity.isAggregate,
  );

  if (!concreteEntities.length) {
    return [];
  }

  const selectedEntity = selectedEntityId
    ? concreteEntities.find((entity) => entity.id === selectedEntityId) ?? null
    : null;
  const labelBudget = Math.max(maxLabels, selectedEntity ? 1 : 0);
  const orderedCandidates = concreteEntities
    .filter((entity) => entity.id !== selectedEntityId)
    .sort(compareEntitiesBySelectionPriority)
    .filter((entity) => !isInsideSelectedInspectionLabelExclusionZone(entity, selectedEntity))
    .slice(0, Math.max(labelBudget - (selectedEntity ? 1 : 0), 0));
  const labeledEntities = selectedEntity
    ? [selectedEntity, ...orderedCandidates]
    : orderedCandidates.slice(0, labelBudget);

  return labeledEntities.map((entity) => {
    const isSelected = entity.id === selectedEntityId;

    return {
      id: `inspection-label-${entity.id}`,
      entityId: entity.id,
      lat: entity.lat,
      lng: entity.lng,
      altitude: entity.pointAltitude + (isSelected ? 0.036 : 0.028),
      text: getMapInspectionLabelText(entity, isSelected),
      color: isSelected ? "#f8fbff" : entity.pointColor,
      size: isSelected ? 0.9 : 0.68,
      isSelected,
    };
  });
}

export function getLocalObjectRadius(
  pointRadiusDegrees: number,
  globeRadius: number,
  cameraHeight: number,
  isSelected: boolean,
) {
  const zoomProgress = getCameraZoomProgress(cameraHeight);
  const convertedRadius = (pointRadiusDegrees * Math.PI) / 180 * globeRadius * 1.14;
  const radiusFloor = interpolate(0.024, 0.032, zoomProgress);
  const radiusCeiling = interpolate(0.046, 0.062, zoomProgress);
  const radius = clamp(convertedRadius, radiusFloor, radiusCeiling);

  return isSelected ? radius * 1.18 : radius;
}

export function getLocalObjectDetail(cameraHeight: number) {
  if (cameraHeight <= 420_000) {
    return 20;
  }

  if (cameraHeight <= 900_000) {
    return 16;
  }

  return 14;
}

export function getLocalObjectRenderStyle(
  entity: Pick<GlobeRenderableEntity, "layerId" | "pointRadius">,
  globeRadius: number,
  cameraHeight: number,
  isSelected: boolean,
): LocalObjectRenderStyle {
  const coreRadius = getLocalObjectRadius(entity.pointRadius, globeRadius, cameraHeight, isSelected);
  const detail = getLocalObjectDetail(cameraHeight);
  const zoomProgress = getCameraZoomProgress(cameraHeight);
  const layerHaloBoost = getLocalObjectHaloBoost(entity.layerId);
  const haloRadius = coreRadius + layerHaloBoost + interpolate(0.005, 0.008, zoomProgress);
  const hitRadius = haloRadius + interpolate(0.01, 0.014, zoomProgress);

  return {
    coreRadius,
    haloRadius,
    hitRadius,
    detail,
    haloOpacity: isSelected ? 0.26 : 0.11,
    emissiveIntensity: isSelected ? 0.34 : 0.19,
    selectionBeaconRadius: isSelected
      ? haloRadius + interpolate(0.008, 0.012, zoomProgress)
      : null,
    selectionBeaconOpacity: isSelected ? interpolate(0.18, 0.24, zoomProgress) : 0,
  };
}

function getLocalObjectLayerLift(layerId: ExplorerVisibleEntity["layerId"]) {
  switch (layerId) {
    case "pfas-sites":
      return 0.0046;
    case "wastewater-sites":
      return 0.0036;
    case "hazardous-sites":
      return 0.003;
    case "legal-markers":
      return 0.0026;
    case "power-plants":
      return 0.0022;
    case "industrial-sites":
      return 0.0016;
    default:
      return 0.0014;
  }
}

function getLocalObjectHaloBoost(layerId: ExplorerVisibleEntity["layerId"]) {
  switch (layerId) {
    case "pfas-sites":
      return 0.0062;
    case "wastewater-sites":
      return 0.0056;
    case "hazardous-sites":
      return 0.005;
    case "legal-markers":
      return 0.0046;
    case "power-plants":
      return 0.0044;
    case "industrial-sites":
      return 0.0042;
    default:
      return 0.004;
  }
}

function buildCenteredStackOffsets(count: number) {
  if (count <= 1) {
    return [0];
  }

  const offsets: number[] = [0];
  for (let step = 1; offsets.length < count; step += 1) {
    offsets.push(step);
    if (offsets.length < count) {
      offsets.push(step * -1);
    }
  }

  return offsets;
}
