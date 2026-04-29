import { Cartesian3, Math as CesiumMath } from "cesium";
import type { ExplorerEntity, ExplorerVisibleEntity } from "@/types/explorer";

export const EARTH_RADIUS_METERS = 6_371_000;

export const HOME_VIEW = {
  lng: -96.2,
  lat: 37.9,
  height: 3_900_000,
  headingDeg: 6,
  pitchDeg: -52,
};

const MIN_CLOSE_INSPECTION_HEIGHT = 220_000;
const MAX_GLOBE_OVERVIEW_HEIGHT = 6_200_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function interpolate(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function clampCameraHeight(height: number) {
  return clamp(height, MIN_CLOSE_INSPECTION_HEIGHT, MAX_GLOBE_OVERVIEW_HEIGHT);
}

export function getCameraZoomProgress(height: number) {
  const normalized =
    (clampCameraHeight(height) - MIN_CLOSE_INSPECTION_HEIGHT) /
    (MAX_GLOBE_OVERVIEW_HEIGHT - MIN_CLOSE_INSPECTION_HEIGHT);
  return clamp(normalized, 0, 1);
}

export function getZoomScaledPointMultiplier(height: number) {
  return interpolate(0.78, 1.16, getCameraZoomProgress(height));
}

export function getZoomScaledAltitudeMultiplier(height: number) {
  return interpolate(0.34, 0.94, getCameraZoomProgress(height));
}

export function getCameraPointResolution(height: number, cameraBand: "national" | "regional" | "local") {
  if (height <= 500_000) {
    return 18;
  }

  if (height <= 1_300_000) {
    return 14;
  }

  if (cameraBand === "national") {
    return 7;
  }

  return 10;
}

export const HOME_CAMERA = {
  destination: Cartesian3.fromDegrees(HOME_VIEW.lng, HOME_VIEW.lat, HOME_VIEW.height),
  orientation: {
    heading: CesiumMath.toRadians(HOME_VIEW.headingDeg),
    pitch: CesiumMath.toRadians(HOME_VIEW.pitchDeg),
    roll: 0,
  },
  duration: 2.1,
};

export function buildEntityFocusState(entity: ExplorerEntity | ExplorerVisibleEntity) {
  const isAggregate = "isAggregate" in entity && !!entity.isAggregate;
  const height = isAggregate
    ? 2_600_000
    : entity.geometryType === "region"
      ? clamp(Math.max((entity.radiusKm ?? 120) * 4_800, 520_000), 520_000, 1_800_000)
      : 420_000;

  return {
    lng: entity.coordinates[0],
    lat: entity.coordinates[1],
    height,
    pitchDeg: entity.geometryType === "region" ? -66 : -38,
    duration: isAggregate ? 1.8 : 2.2,
  };
}

export function buildEntityCameraFocus(entity: ExplorerEntity | ExplorerVisibleEntity) {
  const focusState = buildEntityFocusState(entity);

  return {
    destination: Cartesian3.fromDegrees(focusState.lng, focusState.lat, focusState.height),
    orientation: {
      heading: CesiumMath.toRadians(HOME_VIEW.headingDeg),
      pitch: CesiumMath.toRadians(focusState.pitchDeg),
      roll: 0,
    },
    duration: focusState.duration,
  };
}

export function classifyCameraHeight(height: number) {
  if (height > 5_200_000) return "national";
  if (height > 1_300_000) return "regional";
  return "local";
}
