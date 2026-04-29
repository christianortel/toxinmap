export {};

import type { ExplorerVisibleEntity } from "../../src/types/explorer";

type HealthResponse = {
  totalEntities: number;
};

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const [health, nationalView, regionalView] = await Promise.all([
    fetchJson<HealthResponse>(baseUrl, "/api/health"),
    fetchJson<ExplorerVisibleEntity[]>(
      baseUrl,
      "/api/map-entities?year=2025&cameraBand=national&centerLat=37.9&centerLng=-96.2&groups=official,emerging,legal&layers=industrial-sites,air-toxics-regions,power-plants,hazardous-sites,pfas-sites,wastewater-sites,sentinel-species,reproductive-regions,legal-markers",
    ),
    fetchJson<ExplorerVisibleEntity[]>(
      baseUrl,
      "/api/map-entities?year=2025&cameraBand=regional&centerLat=37.9&centerLng=-96.2&groups=official,emerging,legal&layers=industrial-sites,air-toxics-regions,power-plants,hazardous-sites,pfas-sites,wastewater-sites,sentinel-species,reproductive-regions,legal-markers",
    ),
  ]);

  const nationalAggregates = nationalView.filter((entity) => entity.isAggregate);
  const nationalRepresentative = nationalView.filter((entity) => !entity.isAggregate);

  if (nationalView.length >= health.totalEntities / 4) {
    throw new Error(
      `Expected national view to compress density materially; found ${nationalView.length} visible entities from ${health.totalEntities} total.`,
    );
  }

  if (!nationalAggregates.length) {
    throw new Error("Expected national view to include aggregate markers.");
  }

  if (!nationalRepresentative.some((entity) => entity.layerId === "pfas-sites")) {
    throw new Error("Expected national view to keep PFAS represented directly in the visible set.");
  }

  if (
    !nationalView.some(
      (entity) => entity.layerId === "legal-markers" && entity.sourceIds.includes("epa-echo"),
    )
  ) {
    throw new Error("Expected national view to keep legal marker context represented in the visible set.");
  }

  if (!nationalView.some((entity) => entity.layerId === "air-toxics-regions")) {
    throw new Error("Expected national view to keep regional air-toxics overlays represented.");
  }

  if (regionalView.length <= nationalView.length) {
    throw new Error("Expected regional view to expose more visible entities than national view.");
  }

  if (!regionalView.some((entity) => entity.layerId === "industrial-sites")) {
    throw new Error("Expected regional view to expose industrial overview markers.");
  }

  if (!regionalView.some((entity) => entity.layerId === "legal-markers")) {
    throw new Error("Expected regional view to expose legal marker context.");
  }

  console.log("PASS density legibility validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        totalEntities: health.totalEntities,
        nationalView: {
          visible: nationalView.length,
          aggregates: nationalAggregates.length,
          standalone: nationalView.filter((entity) => !entity.isAggregate).length,
          sampleVisible: nationalView.slice(0, 8).map((entity) => ({
            id: entity.id,
            layerId: entity.layerId,
            title: entity.title,
            sourceIds: entity.sourceIds,
            isAggregate: Boolean(entity.isAggregate),
          })),
        },
        regionalView: {
          visible: regionalView.length,
          aggregates: regionalView.filter((entity) => entity.isAggregate).length,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL density legibility validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
