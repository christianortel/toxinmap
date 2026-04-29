export {};

import type { ExplorerVisibleEntity } from "../../src/types/explorer";

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

function buildMapEntitiesPath(
  cameraBand: "national" | "regional" | "local",
  center: [number, number],
) {
  const params = new URLSearchParams({
    year: "2024",
    cameraBand,
    centerLng: center[0].toString(),
    centerLat: center[1].toString(),
    groups: "official,emerging,legal",
  });

  return `/api/map-entities?${params.toString()}`;
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const capeFearCenter: [number, number] = [-78.88, 34.98];

  const national = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    buildMapEntitiesPath("national", capeFearCenter),
  );
  const regional = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    buildMapEntitiesPath("regional", capeFearCenter),
  );
  const local = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    buildMapEntitiesPath("local", capeFearCenter),
  );

  if (!national.some((entity) => entity.isAggregate)) {
    throw new Error("Expected national drilldown view to include aggregate markers.");
  }

  if (regional.length <= national.length) {
    throw new Error("Expected regional drilldown view to expose more records than national view.");
  }

  if (local.some((entity) => entity.isAggregate)) {
    throw new Error("Expected local drilldown view to resolve aggregates into concrete records.");
  }

  if (!regional.some((entity) => entity.layerId === "pfas-sites")) {
    throw new Error("Expected regional drilldown view to include PFAS records near the focused area.");
  }

  const regionalPfas = regional.filter((entity) => entity.layerId === "pfas-sites");
  const nearestRegionalPfasMiles = Math.min(
    ...regionalPfas.map((entity) => getDistanceMiles(capeFearCenter, entity.coordinates)),
  );

  if (nearestRegionalPfasMiles > 150) {
    throw new Error(
      `Expected regional drilldown PFAS visibility to stay close to Cape Fear, but nearest PFAS marker was ${nearestRegionalPfasMiles.toFixed(1)} miles away.`,
    );
  }

  if (!local.some((entity) => entity.layerId === "wastewater-sites")) {
    throw new Error("Expected local drilldown view to include wastewater records near the focused area.");
  }

  if (!local.some((entity) => entity.layerId === "industrial-sites")) {
    throw new Error("Expected local drilldown view to keep at least one concrete industrial record near the focused area.");
  }

  if (!local.some((entity) => entity.layerId === "pfas-sites")) {
    throw new Error("Expected local drilldown view to surface at least one concrete PFAS record near the focused area.");
  }

  if (local.length < 20) {
    throw new Error(`Expected local drilldown view to expose useful detail, found only ${local.length} records.`);
  }

  console.log("PASS zoom drilldown validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        center: capeFearCenter,
        national: {
          visible: national.length,
          aggregates: national.filter((entity) => entity.isAggregate).length,
        },
        regional: {
          visible: regional.length,
          aggregates: regional.filter((entity) => entity.isAggregate).length,
          nearestPfasMiles: Number(nearestRegionalPfasMiles.toFixed(1)),
        },
        local: {
          visible: local.length,
          aggregates: local.filter((entity) => entity.isAggregate).length,
          topLayers: local.slice(0, 10).map((entity) => ({
            id: entity.id,
            layerId: entity.layerId,
            title: entity.title,
          })),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL zoom drilldown validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
