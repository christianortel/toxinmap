import { Cartesian3, Math as CesiumMath } from "cesium";
import type { ExplorerEntity, ExplorerVisibleEntity } from "@/types/explorer";

export const HOME_CAMERA = {
  destination: Cartesian3.fromDegrees(-98.5, 38.2, 8_200_000),
  orientation: {
    heading: CesiumMath.toRadians(8),
    pitch: CesiumMath.toRadians(-52),
    roll: 0,
  },
  duration: 2.1,
};

export function buildEntityCameraFocus(entity: ExplorerEntity | ExplorerVisibleEntity) {
  const isAggregate = "isAggregate" in entity && !!entity.isAggregate;
  const height = isAggregate
    ? 5_200_000
    : entity.geometryType === "region"
      ? Math.max((entity.radiusKm ?? 120) * 8_000, 1_200_000)
      : 1_350_000;

  return {
    destination: Cartesian3.fromDegrees(entity.coordinates[0], entity.coordinates[1], height),
    orientation: {
      heading: CesiumMath.toRadians(8),
      pitch: CesiumMath.toRadians(entity.geometryType === "region" ? -62 : -48),
      roll: 0,
    },
    duration: isAggregate ? 1.8 : 2.2,
  };
}

export function classifyCameraHeight(height: number) {
  if (height > 10_500_000) return "national";
  if (height > 3_800_000) return "regional";
  return "local";
}
