export {};

import type { CaseStudyRecord } from "../../src/types/data";
import type { ExplorerEntity, ExplorerSearchResult } from "../../src/types/explorer";

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
): Promise<ExplorerEntity[]> {
  return fetchJson<ExplorerEntity[]>(
    baseUrl,
    `/api/entities?layerId=${encodeURIComponent(layerId)}&limit=${limit}`,
  );
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  const [searchModule, caseStudies, industrialEntities, pfasEntities, wastewaterEntities, hazardousEntities, legalEntities, powerPlantEntities] = await Promise.all([
    import("../../src/lib/map/search"),
    fetchJson<CaseStudyRecord[]>(baseUrl, "/api/case-studies"),
    fetchLayerEntities(baseUrl, "industrial-sites", 1000),
    fetchLayerEntities(baseUrl, "pfas-sites", 2000),
    fetchLayerEntities(baseUrl, "wastewater-sites", 4000),
    fetchLayerEntities(baseUrl, "hazardous-sites", 2000),
    fetchLayerEntities(baseUrl, "legal-markers", 1000),
    fetchLayerEntities(baseUrl, "power-plants", 500),
  ]);
  const entities = [
    ...industrialEntities,
    ...pfasEntities,
    ...wastewaterEntities,
    ...hazardousEntities,
    ...legalEntities,
    ...powerPlantEntities,
  ];
  const { getExplorerSearchResults } = searchModule as {
    getExplorerSearchResults: (
      query: string,
      entities: ExplorerEntity[],
      caseStudies: CaseStudyRecord[],
    ) => ExplorerSearchResult[];
  };

  const pfasResults = getExplorerSearchResults("PFAS", entities, caseStudies);
  if (!pfasResults.length) {
    throw new Error('Expected "PFAS" search to return at least one result.');
  }

  const pfasTopEntity = entities.find((entity) => entity.id === pfasResults[0]?.entityId);
  if (!pfasTopEntity || pfasTopEntity.layerId !== "pfas-sites") {
    throw new Error('Expected "PFAS" search to rank a PFAS site first.');
  }

  const genxResults = getExplorerSearchResults("GenX", entities, caseStudies);
  if (!genxResults.length) {
    throw new Error('Expected "GenX" search to return at least one result.');
  }

  const genxTopEntity = entities.find((entity) => entity.id === genxResults[0]?.entityId);
  if (
    !genxTopEntity ||
    !genxTopEntity.sourceIds.some((sourceId) => sourceId === "usgs-pfas" || sourceId === "atsdr-pfas")
  ) {
    throw new Error(
      'Expected "GenX" search to rank a USGS- or ATSDR-backed PFAS record first.',
    );
  }

  const cleanupResults = getExplorerSearchResults("cleanup", entities, caseStudies).slice(0, 3);
  if (
    !cleanupResults.some((result) => {
      const entity = entities.find((candidate) => candidate.id === result.entityId);
      return entity?.sourceIds.includes("epa-sems");
    })
  ) {
    throw new Error(
      'Expected top "cleanup" search results to include an EPA SEMS-backed hazardous-site record.',
    );
  }

  const wastewaterResults = getExplorerSearchResults("wastewater", entities, caseStudies).slice(0, 3);
  if (
    !wastewaterResults.some((result) => {
      const entity = entities.find((candidate) => candidate.id === result.entityId);
      return entity?.layerId === "wastewater-sites";
    })
  ) {
    throw new Error(
      'Expected top "wastewater" search results to include a wastewater-site record before lower-value generic matches.',
    );
  }

  console.log("PASS search ranking validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        pfasTop: {
          title: pfasResults[0]?.title,
          matchType: pfasResults[0]?.matchType,
          score: pfasResults[0]?.score,
        },
        genxTop: {
          title: genxResults[0]?.title,
          matchType: genxResults[0]?.matchType,
          score: genxResults[0]?.score,
        },
        cleanupTop: cleanupResults.map((result) => ({
          title: result.title,
          score: result.score,
        })),
        wastewaterTop: wastewaterResults.map((result) => ({
          title: result.title,
          score: result.score,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL search ranking validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
