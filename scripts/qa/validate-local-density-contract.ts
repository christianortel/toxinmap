export {};

import type { ExplorerVisibleEntity } from "@/types/explorer";

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

function getLocalUniquenessKey(entity: ExplorerVisibleEntity) {
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

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const params = new URLSearchParams({
    year: "2024",
    cameraBand: "local",
    centerLng: "-78.88",
    centerLat: "34.98",
    groups: "official,emerging,legal",
  });

  const localView = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    `/api/map-entities?${params.toString()}`,
  );

  if (localView.length > 160) {
    throw new Error(`Expected local view to stay capped at 160 visible records, received ${localView.length}.`);
  }

  if (localView.length < 80) {
    throw new Error(`Expected local view to keep enough detail for investigation, received only ${localView.length} records.`);
  }

  const layerCounts = new Map<string, number>();
  for (const entity of localView) {
    layerCounts.set(entity.layerId, (layerCounts.get(entity.layerId) ?? 0) + 1);
  }

  const industrialCount = layerCounts.get("industrial-sites") ?? 0;
  const wastewaterCount = layerCounts.get("wastewater-sites") ?? 0;
  const pfasCount = layerCounts.get("pfas-sites") ?? 0;

  if (industrialCount > 72) {
    throw new Error(`Expected industrial local cap <= 72, received ${industrialCount}.`);
  }

  if (wastewaterCount > 56) {
    throw new Error(`Expected wastewater local cap <= 56, received ${wastewaterCount}.`);
  }

  if (pfasCount > 10) {
    throw new Error(`Expected PFAS local cap <= 10, received ${pfasCount}.`);
  }

  const topTen = localView.slice(0, 10);
  const topLayers = new Set(topTen.map((entity) => entity.layerId));
  if (!topLayers.has("pfas-sites") || !topLayers.has("wastewater-sites") || !topLayers.has("industrial-sites")) {
    throw new Error("Expected local top results to preserve PFAS, wastewater, and industrial entry points.");
  }

  const uniquenessCounts = new Map<string, number>();
  for (const entity of localView) {
    const key = getLocalUniquenessKey(entity);
    if (!key) {
      continue;
    }

    uniquenessCounts.set(key, (uniquenessCounts.get(key) ?? 0) + 1);
  }

  const duplicateKeys = Array.from(uniquenessCounts.entries()).filter(([, count]) => count > 1);
  if (duplicateKeys.length > 0) {
    throw new Error(`Expected local view to dedupe same-site facility variants, found duplicate key ${duplicateKeys[0]?.[0]}.`);
  }

  console.log("PASS local density contract");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        visible: localView.length,
        grouped: Object.fromEntries(Array.from(layerCounts.entries()).sort((left, right) => right[1] - left[1])),
        topTen: topTen.map((entity) => ({
          id: entity.id,
          title: entity.title,
          layerId: entity.layerId,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL local density contract");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
