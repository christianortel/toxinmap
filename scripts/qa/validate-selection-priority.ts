export {};

import { compareEntitiesBySelectionPriority, getEntitySelectionPriority } from "../../src/lib/map/entity-priority";
import type { ExplorerEntity } from "../../src/types/explorer";

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchLayerEntities(
  baseUrl: string,
  layerId: string,
  limit: number,
  sourceId?: string,
) {
  const params = new URLSearchParams({
    layerId,
    limit: String(limit),
  });
  if (sourceId) {
    params.set("sourceId", sourceId);
  }

  return fetchJson<ExplorerEntity[]>(baseUrl, `/api/entities?${params.toString()}`);
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const [usgsPfasEntities, wastewaterEntities, hazardousEntities, triIndustrialEntities, powerPlantEntities, capeFearCandidates] =
    await Promise.all([
      fetchLayerEntities(baseUrl, "pfas-sites", 2000, "usgs-pfas"),
      fetchLayerEntities(baseUrl, "wastewater-sites", 4000),
      fetchLayerEntities(baseUrl, "hazardous-sites", 2000, "epa-sems"),
      fetchLayerEntities(baseUrl, "industrial-sites", 1000, "epa-tri"),
      fetchLayerEntities(baseUrl, "power-plants", 500),
      fetchJson<ExplorerEntity[]>(
        baseUrl,
        "/api/map-entities?year=2025&cameraBand=local&centerLat=34.98&centerLng=-78.88&groups=official,emerging,legal&layers=industrial-sites,air-toxics-regions,power-plants,hazardous-sites,pfas-sites,wastewater-sites,legal-markers",
      ),
    ]);
  const pfasEntity = usgsPfasEntities.find((entity) => entity.sourceIds.includes("usgs-pfas"));
  const wastewaterEntity = wastewaterEntities.find((entity) => entity.sourceIds.includes("epa-npdes"));
  const hazardousCleanupEntity = hazardousEntities.find((entity) => entity.sourceIds.includes("epa-sems"));
  const triIndustrialEntity = triIndustrialEntities.find((entity) => entity.sourceIds.includes("epa-tri"));
  const genericProxyEntity = powerPlantEntities.find(
    (entity) => entity.layerId === "power-plants" && entity.sourceIds.length === 1 && entity.sourceIds[0] === "epa-frs",
  );

  if (!pfasEntity || !wastewaterEntity || !hazardousCleanupEntity || !triIndustrialEntity || !genericProxyEntity) {
    throw new Error("Expected live entities to include PFAS, wastewater, cleanup hazard, TRI industrial, and generic proxy samples.");
  }

  const pfasPriority = getEntitySelectionPriority(pfasEntity);
  const wastewaterPriority = getEntitySelectionPriority(wastewaterEntity);
  const hazardousCleanupPriority = getEntitySelectionPriority(hazardousCleanupEntity);
  const triIndustrialPriority = getEntitySelectionPriority(triIndustrialEntity);
  const genericProxyPriority = getEntitySelectionPriority(genericProxyEntity);

  if (pfasPriority <= genericProxyPriority) {
    throw new Error("Expected PFAS selection priority to outrank a broad proxy record.");
  }

  if (wastewaterPriority <= genericProxyPriority) {
    throw new Error("Expected wastewater selection priority to outrank a broad proxy record.");
  }

  if (hazardousCleanupPriority <= genericProxyPriority) {
    throw new Error("Expected cleanup hazard selection priority to outrank a broad proxy record.");
  }

  if (triIndustrialPriority <= genericProxyPriority) {
    throw new Error("Expected TRI-linked industrial selection priority to outrank a broad proxy record.");
  }

  const topCapeFear = [...capeFearCandidates].sort(compareEntitiesBySelectionPriority)[0];
  if (!topCapeFear) {
    throw new Error("Expected at least one Cape Fear candidate for selection-priority validation.");
  }

  if (
    topCapeFear.layerId !== "pfas-sites" &&
    !(topCapeFear.layerId === "hazardous-sites" && topCapeFear.sourceIds.includes("epa-sems")) &&
    !(topCapeFear.layerId === "wastewater-sites" && topCapeFear.sourceIds.includes("epa-npdes"))
  ) {
    throw new Error(
      "Expected dense Cape Fear selection priority to surface a PFAS, cleanup hazard, or wastewater record before broad footprint rows.",
    );
  }

  console.log("PASS selection priority validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        priorities: {
          pfas: pfasPriority,
          wastewater: wastewaterPriority,
          hazardousCleanup: hazardousCleanupPriority,
          triIndustrial: triIndustrialPriority,
          genericProxy: genericProxyPriority,
        },
        topCapeFear: {
          id: topCapeFear.id,
          title: topCapeFear.title,
          layerId: topCapeFear.layerId,
          sourceIds: topCapeFear.sourceIds,
          priority: getEntitySelectionPriority(topCapeFear),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL selection priority validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
