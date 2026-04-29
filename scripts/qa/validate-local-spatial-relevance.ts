export {};

import type { ExplorerVisibleEntity } from "../../src/types/explorer";

const LOCAL_POINT_RADIUS_MILES = 130;

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

function getDistanceMiles(origin: [number, number], destination: [number, number]) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const [originLng, originLat] = origin;
  const [destinationLng, destinationLat] = destination;
  const latitudeDelta = toRadians(destinationLat - originLat);
  const longitudeDelta = toRadians(destinationLng - originLng);
  const startLatitude = toRadians(originLat);
  const endLatitude = toRadians(destinationLat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMiles * angularDistance;
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const capeFearCenter: [number, number] = [-78.88, 34.98];
  const params = new URLSearchParams({
    year: "2024",
    cameraBand: "local",
    centerLng: capeFearCenter[0].toString(),
    centerLat: capeFearCenter[1].toString(),
    groups: "official,emerging,legal",
  });

  const localView = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    `/api/map-entities?${params.toString()}`,
  );

  const pointRecords = localView
    .filter((entity) => entity.geometryType === "point")
    .map((entity) => ({
      ...entity,
      milesFromCenter: getDistanceMiles(capeFearCenter, entity.coordinates),
    }));

  const distantPoints = pointRecords.filter(
    (entity) => entity.milesFromCenter > LOCAL_POINT_RADIUS_MILES,
  );
  const distantWastewater = distantPoints.filter((entity) => entity.layerId === "wastewater-sites");

  if (pointRecords.length < 20) {
    throw new Error(`Expected a useful local point set, found only ${pointRecords.length} point records.`);
  }

  if (!pointRecords.some((entity) => entity.layerId === "pfas-sites")) {
    throw new Error("Expected local focused view to retain PFAS point records.");
  }

  if (!pointRecords.some((entity) => entity.layerId === "wastewater-sites")) {
    throw new Error("Expected local focused view to retain wastewater point records.");
  }

  if (distantWastewater.length > 0) {
    throw new Error(
      `Expected focused local wastewater records to stay within ${LOCAL_POINT_RADIUS_MILES} miles, found ${distantWastewater[0].id} at ${distantWastewater[0].milesFromCenter.toFixed(1)} miles.`,
    );
  }

  if (distantPoints.length > 0) {
    throw new Error(
      `Expected all focused local point records to stay within ${LOCAL_POINT_RADIUS_MILES} miles, found ${distantPoints[0].id} at ${distantPoints[0].milesFromCenter.toFixed(1)} miles.`,
    );
  }

  const farthestPoint = pointRecords.reduce((farthest, entity) => {
    if (!farthest || entity.milesFromCenter > farthest.milesFromCenter) {
      return entity;
    }

    return farthest;
  }, null as (ExplorerVisibleEntity & { milesFromCenter: number }) | null);

  console.log("PASS local spatial relevance validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        center: capeFearCenter,
        pointCount: pointRecords.length,
        farthestPoint:
          farthestPoint === null
            ? null
            : {
                id: farthestPoint.id,
                layerId: farthestPoint.layerId,
                title: farthestPoint.title,
                milesFromCenter: Number(farthestPoint.milesFromCenter.toFixed(1)),
              },
        topFive: localView.slice(0, 5).map((entity) => ({
          id: entity.id,
          layerId: entity.layerId,
          title: entity.title,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL local spatial relevance validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
