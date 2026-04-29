export {};

type ExplorerEntity = {
  id: string;
  layerId: string;
  title: string;
  sourceIds: string[];
};

type LayerSummary = {
  id: string;
  entityCount: number;
};

type HealthResponse = {
  totalEntities?: number;
  totalLayers?: number;
  repository?: {
    preferredDerivedLayerSource?: {
      airToxicsRegions?: "database" | "etl-file" | "mock" | "none";
      reproductiveRegions?: "database" | "etl-file" | "mock" | "none";
      sentinelSpecies?: "database" | "etl-file" | "mock" | "none";
    };
    derivedLayerStatus?: {
      airToxicsRegions?: { preferredSource: "database" | "etl-file" | "mock" | "none"; databaseRows: number; etlRows: number; note: string };
      reproductiveRegions?: { preferredSource: "database" | "etl-file" | "mock" | "none"; databaseRows: number; etlRows: number; note: string };
      sentinelSpecies?: { preferredSource: "database" | "etl-file" | "mock" | "none"; databaseRows: number; etlRows: number; note: string };
    };
  };
};

type ExplorerEntityDetail = {
  id: string;
  backend: "database" | "etl-file" | "mock";
  sourceIds: string[];
  sourceStats?: Array<{ label: string; value: string }>;
  officialSignals: string[];
  uncertaintyNote: string;
  reproductiveHealthContext?: string[];
  wildlifeSentinelContext?: string[];
};

type ExplorerNearbyResponse = {
  total: number;
  systemCounts: Array<{ id: string; label: string; description: string; count: number }>;
  summaryLines: string[];
  headlineResults: Array<{
    entity: {
      id: string;
      layerId: string;
      sourceIds: string[];
    };
    whyRanked: string;
  }>;
};

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      if (!response.ok) {
        throw new Error(`Expected ${path} to return 200, received ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Failed to fetch ${path}: ${lastMessage}`);
}

async function waitForApiHealth(baseUrl: string) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health probe returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`API health probe failed: ${lastMessage}`);
}

function expectBackend(
  detail: ExplorerEntityDetail,
  allowedBackends: Array<ExplorerEntityDetail["backend"]>,
  context: string,
) {
  if (!allowedBackends.includes(detail.backend)) {
    throw new Error(
      `Expected ${context} backend to be one of ${allowedBackends.join(", ")}, received "${detail.backend}".`,
    );
  }
}

function hasSourceStat(detail: ExplorerEntityDetail, labels: string[]) {
  const sourceStats = detail.sourceStats ?? [];
  return labels.some((label) => sourceStats.some((entry) => entry.label === label));
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  await waitForApiHealth(baseUrl);

  const [health, layerSummaries, legalEntities, wastewaterEntities, pfasEntities, hazardousSemsEntities, industrialEntities] =
    await Promise.all([
      fetchJson<HealthResponse>(baseUrl, "/api/health"),
      fetchJson<LayerSummary[]>(baseUrl, "/api/layers"),
      fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=legal-markers&limit=25"),
      fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=wastewater-sites&limit=5000"),
      fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=pfas-sites&limit=2000"),
      fetchJson<ExplorerEntity[]>(
        baseUrl,
        "/api/entities?layerId=hazardous-sites&sourceId=epa-sems&limit=2000",
      ),
      fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=industrial-sites&limit=1000"),
    ]);

  const groupedCounts = layerSummaries.reduce<Record<string, number>>((accumulator, layer) => {
    accumulator[layer.id] = layer.entityCount;
    return accumulator;
  }, {});

  const preferredDerivedLayerSource = health.repository?.preferredDerivedLayerSource;
  if (!preferredDerivedLayerSource) {
    throw new Error("Expected /api/health to expose preferred derived-layer source status.");
  }

  if (preferredDerivedLayerSource.airToxicsRegions !== "database") {
    throw new Error(
      `Expected air-toxics-regions preferred source to be "database", received "${preferredDerivedLayerSource.airToxicsRegions}".`,
    );
  }

  if (preferredDerivedLayerSource.reproductiveRegions !== "database") {
    throw new Error(
      `Expected reproductive-regions preferred source to be "database", received "${preferredDerivedLayerSource.reproductiveRegions}".`,
    );
  }

  if (preferredDerivedLayerSource.sentinelSpecies !== "etl-file") {
    throw new Error(
      `Expected sentinel-species preferred source to remain "etl-file", received "${preferredDerivedLayerSource.sentinelSpecies}".`,
    );
  }

  const legalMarkerCount = groupedCounts["legal-markers"] ?? 0;
  if (legalMarkerCount < 1000) {
    throw new Error(
      `Expected at least 1000 legal markers after the ECHO/FRS join, found ${legalMarkerCount}.`,
    );
  }

  const industrialSiteCount = groupedCounts["industrial-sites"] ?? 0;
  if (industrialSiteCount < 1000) {
    throw new Error(
      `Expected at least 1000 industrial-sites after the FRS/TRI ETL file merge, found ${industrialSiteCount}.`,
    );
  }

  const wastewaterSiteCount = groupedCounts["wastewater-sites"] ?? 0;
  if (wastewaterSiteCount < 1000) {
    throw new Error(
      `Expected at least 1000 wastewater-sites after the NPDES and USGS pharma ETL merge, found ${wastewaterSiteCount}.`,
    );
  }

  const pfasSiteCount = groupedCounts["pfas-sites"] ?? 0;
  if (pfasSiteCount < 20) {
    throw new Error(
      `Expected at least 20 pfas-sites after the ATSDR and USGS PFAS ETL merge, found ${pfasSiteCount}.`,
    );
  }

  const airToxicsRegionCount = groupedCounts["air-toxics-regions"] ?? 0;
  if (airToxicsRegionCount < 12) {
    throw new Error(
      `Expected at least 12 air-toxics regions after modeled burden synthesis, found ${airToxicsRegionCount}.`,
    );
  }

  const powerPlantCount = groupedCounts["power-plants"] ?? 0;
  if (powerPlantCount < 150) {
    throw new Error(
      `Expected at least 150 mapped power-plants after generation-facility synthesis, found ${powerPlantCount}.`,
    );
  }

  const hazardousSiteCount = groupedCounts["hazardous-sites"] ?? 0;
  if (hazardousSiteCount < 1000) {
    throw new Error(
      `Expected at least 1000 ETL-backed hazardous-sites after cleanup-footprint synthesis, found ${hazardousSiteCount}.`,
    );
  }

  const reproductiveRegionCount = groupedCounts["reproductive-regions"] ?? 0;
  if (reproductiveRegionCount < 4) {
    throw new Error(
      `Expected at least 4 reproductive research-context regions after regional synthesis, found ${reproductiveRegionCount}.`,
    );
  }

  const sentinelSpeciesCount = groupedCounts["sentinel-species"] ?? 0;
  if (sentinelSpeciesCount < 2) {
    throw new Error(
      `Expected at least 2 wildlife sentinel regions after ecological-warning synthesis, found ${sentinelSpeciesCount}.`,
    );
  }

  const hazardousSemsCount = hazardousSemsEntities.length;
  if (hazardousSemsCount < 100) {
    throw new Error(
      `Expected at least 100 hazardous-sites with explicit EPA SEMS cleanup lineage, found ${hazardousSemsCount}.`,
    );
  }

  const atsdrPfasCount = pfasEntities.filter((entity) => entity.id.startsWith("atsdr-")).length;
  if (atsdrPfasCount < 10) {
    throw new Error(
      `Expected at least 10 ATSDR-backed PFAS entities after geocoding enrichment, found ${atsdrPfasCount}.`,
    );
  }

  const usgsPfasCount = pfasEntities.filter((entity) => entity.id.startsWith("usgs-pfas-")).length;
  if (usgsPfasCount === 0) {
    throw new Error("Expected the PFAS layer to retain at least one USGS-backed PFAS entity.");
  }

  const npdesWastewaterCount = wastewaterEntities.filter((entity) => entity.id.startsWith("npdes-")).length;
  if (npdesWastewaterCount === 0) {
    throw new Error("Expected wastewater layer to include at least one ETL-backed NPDES entity.");
  }

  const pharmaWastewaterCount = wastewaterEntities.filter((entity) => entity.id.startsWith("usgs-pharma-")).length;
  if (pharmaWastewaterCount === 0) {
    throw new Error("Expected wastewater layer to include at least one ETL-backed USGS pharma entity.");
  }

  const npdesWastewater = wastewaterEntities.find((entity) => entity.id.startsWith("npdes-"));
  if (!npdesWastewater) {
    throw new Error("Expected at least one NPDES wastewater entity in the live API payload.");
  }

  const npdesWastewaterDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(npdesWastewater.id)}`,
  );
  expectBackend(npdesWastewaterDetail, ["database", "etl-file"], "NPDES wastewater detail");

  if (!npdesWastewaterDetail.sourceIds.includes("epa-npdes")) {
    throw new Error('Expected NPDES wastewater detail to include source id "epa-npdes".');
  }

  if (!hasSourceStat(npdesWastewaterDetail, ["Permit", "Water body"])) {
    throw new Error('Expected NPDES wastewater detail to expose permit or water-body source stats.');
  }

  if (
    !npdesWastewaterDetail.officialSignals.some((entry) =>
      /(Permit status:|NPDES permit and outfall context)/i.test(entry),
    )
  ) {
    throw new Error("Expected NPDES wastewater detail to include NPDES permit context.");
  }

  const pharmaWastewater = wastewaterEntities.find((entity) => entity.id.startsWith("usgs-pharma-"));
  if (!pharmaWastewater) {
    throw new Error("Expected at least one USGS pharma wastewater entity in the live API payload.");
  }

  const pharmaWastewaterDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(pharmaWastewater.id)}`,
  );
  expectBackend(pharmaWastewaterDetail, ["database", "etl-file"], "USGS pharma wastewater detail");

  if (!pharmaWastewaterDetail.sourceIds.includes("usgs-pharma")) {
    throw new Error('Expected USGS pharma wastewater detail to include source id "usgs-pharma".');
  }

  if (!hasSourceStat(pharmaWastewaterDetail, ["Detections", "Pharma detects"])) {
    throw new Error('Expected USGS pharma wastewater detail to expose detection-oriented source stats.');
  }

  if (
    !pharmaWastewaterDetail.officialSignals.some((entry) =>
      /(Classes present:|surface-water sampling site)/i.test(entry),
    )
  ) {
    throw new Error("Expected USGS pharma wastewater detail to include sampling or class-level official context.");
  }

  const nearbySummary = await fetchJson<ExplorerNearbyResponse>(
    baseUrl,
    "/api/nearby?lat=34.22&lng=-78.75&radius=200&groups=official,emerging,legal",
  );
  if (nearbySummary.total === 0) {
    throw new Error("Expected nearby API to return at least one mapped result for the smoke radius.");
  }

  if (!nearbySummary.systemCounts.length) {
    throw new Error("Expected nearby API to return integrated toxin-system counts.");
  }

  if (!nearbySummary.systemCounts.some((entry) => entry.id === "industrial-pressure")) {
    throw new Error('Expected nearby system counts to include the "industrial-pressure" system.');
  }

  if (!nearbySummary.systemCounts.some((entry) => entry.id === "regulatory-pressure")) {
    throw new Error('Expected nearby system counts to include the "regulatory-pressure" system.');
  }

  if (!nearbySummary.summaryLines.length) {
    throw new Error("Expected nearby API to return at least one integrated summary line.");
  }

  if (!nearbySummary.headlineResults.length) {
    throw new Error("Expected nearby API to return at least one headline nearby result.");
  }

  const strongNearbySources = new Set([
    "usgs-pfas",
    "atsdr-pfas",
    "epa-npdes",
    "usgs-pharma",
    "epa-sems",
    "epa-tri",
    "epa-echo",
  ]);
  const headlineStrongRecord = nearbySummary.headlineResults.find((result) =>
    result.entity.sourceIds.some((sourceId) => strongNearbySources.has(sourceId)),
  );
  if (!headlineStrongRecord) {
    throw new Error(
      "Expected at least one nearby headline result to be led by a source-specific PFAS, wastewater, cleanup, TRI, or ECHO record.",
    );
  }

  if (
    !nearbySummary.headlineResults.some((result) =>
      /(sampling|investigation|wastewater|cleanup|release|regulatory)/i.test(result.whyRanked),
    )
  ) {
    throw new Error(
      "Expected nearby headline ranking reasons to describe source-specific context instead of only generic pathway wording.",
    );
  }

  const airToxicsEntity = (
    await fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=air-toxics-regions&limit=20")
  )[0];
  if (!airToxicsEntity) {
    throw new Error("Expected at least one air-toxics region in the live API payload.");
  }

  const airToxicsDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(airToxicsEntity.id)}`,
  );
  if (airToxicsDetail.backend !== "database") {
    throw new Error(
      `Expected air-toxics detail backend to be "database", received "${airToxicsDetail.backend}".`,
    );
  }

  if (!airToxicsDetail.sourceStats?.some((entry) => entry.label === "TRI air facilities")) {
    throw new Error('Expected air-toxics detail to expose a "TRI air facilities" source stat.');
  }

  if (!airToxicsDetail.sourceStats?.some((entry) => entry.label === "Reported air releases")) {
    throw new Error('Expected air-toxics detail to expose a "Reported air releases" source stat.');
  }

  if (!airToxicsDetail.officialSignals.some((entry) => entry.includes("TRI air-linked facilities"))) {
    throw new Error("Expected air-toxics detail to include TRI air facility contribution context.");
  }

  if (!airToxicsDetail.uncertaintyNote.includes("modeled burden region")) {
    throw new Error("Expected air-toxics detail uncertainty note to keep the layer framed as modeled burden context.");
  }

  const reproductiveEntity = (
    await fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=reproductive-regions&limit=20")
  )[0];
  if (!reproductiveEntity) {
    throw new Error("Expected at least one reproductive-context region in the live API payload.");
  }

  const reproductiveDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(reproductiveEntity.id)}`,
  );
  if (reproductiveDetail.backend !== "database") {
    throw new Error(
      `Expected reproductive-context detail backend to be "database", received "${reproductiveDetail.backend}".`,
    );
  }

  if (!reproductiveDetail.sourceIds.includes("plastic-health-map-paper")) {
    throw new Error('Expected reproductive-context detail to include source id "plastic-health-map-paper".');
  }

  if (!reproductiveDetail.sourceStats?.some((entry) => entry.label === "PFAS-linked records")) {
    throw new Error('Expected reproductive-context detail to expose a "PFAS-linked records" source stat.');
  }

  if (
    !reproductiveDetail.reproductiveHealthContext?.some((entry: string) =>
      /literature-backed reproductive and endocrine context/i.test(entry),
    )
  ) {
    throw new Error(
      "Expected reproductive-context detail to include explicit literature-backed reproductive-health framing.",
    );
  }

  if (!/proof of local reproductive harm|direct measured human outcome/i.test(reproductiveDetail.uncertaintyNote)) {
    throw new Error("Expected reproductive-context uncertainty note to avoid overclaiming local health measurement.");
  }

  const sentinelEntity = (
    await fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=sentinel-species&limit=20")
  )[0];
  if (!sentinelEntity) {
    throw new Error("Expected at least one wildlife sentinel region in the live API payload.");
  }

  const sentinelDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(sentinelEntity.id)}`,
  );
  if (sentinelDetail.backend !== "etl-file") {
    throw new Error(
      `Expected sentinel-species detail backend to be "etl-file", received "${sentinelDetail.backend}".`,
    );
  }

  if (!sentinelDetail.sourceIds.includes("literature-sentinel")) {
    throw new Error('Expected sentinel-species detail to include source id "literature-sentinel".');
  }

  if (!sentinelDetail.sourceIds.includes("usgs-hydrography")) {
    throw new Error('Expected sentinel-species detail to include source id "usgs-hydrography".');
  }

  if (!sentinelDetail.sourceStats?.some((entry) => entry.label === "Hazard-linked records")) {
    throw new Error('Expected sentinel-species detail to expose a "Hazard-linked records" source stat.');
  }

  if (
    !sentinelDetail.wildlifeSentinelContext?.some((entry: string) =>
      /literature-backed wildlife sentinel context/i.test(entry),
    )
  ) {
    throw new Error("Expected sentinel-species detail to include explicit wildlife-sentinel literature framing.");
  }

  if (!/ecological-warning lens|direct wildlife count|human harm/i.test(sentinelDetail.uncertaintyNote)) {
    throw new Error("Expected sentinel-species uncertainty note to avoid overclaiming species or human outcomes.");
  }

  const powerPlantEntity = (
    await fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=power-plants&limit=20")
  )[0];
  if (!powerPlantEntity) {
    throw new Error("Expected at least one power-plant entity in the live API payload.");
  }

  const powerPlantDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(powerPlantEntity.id)}`,
  );
  if (powerPlantDetail.backend !== "database") {
    throw new Error(
      `Expected power-plant detail backend to be "database", received "${powerPlantDetail.backend}".`,
    );
  }

  if (!powerPlantDetail.sourceIds.includes("epa-frs")) {
    throw new Error('Expected power-plant detail to include source id "epa-frs".');
  }

  if (!powerPlantDetail.sourceStats?.some((entry) => entry.label === "Generation class")) {
    throw new Error('Expected power-plant detail to expose a "Generation class" source stat.');
  }

  if (!powerPlantDetail.officialSignals.some((entry) => entry.includes("Generation class:"))) {
    throw new Error("Expected power-plant detail to include generation-class official signal context.");
  }

  const hazardousEntity =
    hazardousSemsEntities[0] ??
    (
      await fetchJson<ExplorerEntity[]>(baseUrl, "/api/entities?layerId=hazardous-sites&limit=20")
    )[0];
  if (!hazardousEntity) {
    throw new Error("Expected at least one hazardous-site entity in the live API payload.");
  }

  const hazardousDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(hazardousEntity.id)}`,
  );
  if (hazardousDetail.backend !== "database") {
    throw new Error(
      `Expected hazardous-site detail backend to be "database", received "${hazardousDetail.backend}".`,
    );
  }

  if (!hazardousDetail.sourceIds.includes("epa-frs")) {
    throw new Error('Expected hazardous-site detail to include source id "epa-frs".');
  }

  if (!hazardousDetail.sourceStats?.some((entry) => entry.label === "Hazard class")) {
    throw new Error('Expected hazardous-site detail to expose a "Hazard class" source stat.');
  }

  if (!hazardousDetail.officialSignals.some((entry) => entry.includes("Hazard class:"))) {
    throw new Error("Expected hazardous-site detail to include hazard-class official signal context.");
  }

  const legalMarker = legalEntities[0];
  if (!legalMarker) {
    throw new Error("Expected at least one legal marker in the live API payload.");
  }

  const legalMarkerDetail = await fetchJson<ExplorerEntityDetail>(
    baseUrl,
    `/api/entities/${encodeURIComponent(legalMarker.id)}`,
  );

  expectBackend(legalMarkerDetail, ["database"], "legal marker detail");

  if (!legalMarkerDetail.sourceIds.includes("epa-echo")) {
    throw new Error('Expected DB-backed legal marker detail to include source id "epa-echo".');
  }

  const industrialCandidates = industrialEntities.filter((entity) => entity.id.startsWith("frs-"));
  if (!industrialCandidates.length) {
    throw new Error("Expected at least one source-backed industrial footprint in the live API payload.");
  }

  let industrialEntity = industrialCandidates[0];
  let industrialDetail: ExplorerEntityDetail | null = null;

  const rankedIndustrialCandidates = [...industrialCandidates]
    .sort((left, right) => {
      const leftScore =
        (left.sourceIds.includes("epa-tri") ? 2 : 0) +
        (left.sourceIds.includes("epa-echo") ? 1 : 0);
      const rightScore =
        (right.sourceIds.includes("epa-tri") ? 2 : 0) +
        (right.sourceIds.includes("epa-echo") ? 1 : 0);
      return rightScore - leftScore;
    })
    .slice(0, 1000);

  for (const candidate of rankedIndustrialCandidates) {
    const detail = await fetchJson<ExplorerEntityDetail>(
      baseUrl,
      `/api/entities/${encodeURIComponent(candidate.id)}`,
    );
    if (
      ["database", "etl-file"].includes(detail.backend) &&
      hasSourceStat(detail, ["Programs", "Programs linked", "TRI year", "Total releases"])
    ) {
      industrialEntity = candidate;
      industrialDetail = detail;
      break;
    }
  }

  if (!industrialDetail) {
    throw new Error(
      "Expected at least one sampled industrial footprint detail record with either program-linkage or TRI release source stats within the first 1000 source-ranked DB-backed industrial records.",
    );
  }

  expectBackend(industrialDetail, ["database", "etl-file"], "industrial detail");

  if (!industrialDetail.sourceIds.includes("epa-frs")) {
    throw new Error('Expected industrial detail to include "epa-frs" lineage.');
  }

  if (!hasSourceStat(industrialDetail, ["Programs", "Programs linked", "TRI year", "Total releases"])) {
    throw new Error("Expected industrial detail to expose either program-linkage or TRI release source stats.");
  }

  if (
    !industrialDetail.officialSignals.some((entry) =>
      /(TRI-linked ids|TRI facility disclosure|Reported total releases|FRS registry match|EPA cross-program facility linkage)/i.test(entry),
    )
  ) {
    throw new Error("Expected industrial detail to include official facility or TRI linkage context.");
  }

  console.log("PASS live API validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        entities: health.totalEntities ?? null,
        layerCounts: groupedCounts,
        sampleLegalMarkerId: legalMarker.id,
        sampleLegalMarkerBackend: legalMarkerDetail.backend,
        sampleIndustrialId: industrialEntity.id,
        sampleIndustrialBackend: industrialDetail.backend,
        wastewater: {
          total: wastewaterSiteCount,
          npdes: npdesWastewaterCount,
          pharma: pharmaWastewaterCount,
        },
        pfas: {
          total: pfasSiteCount,
          atsdr: atsdrPfasCount,
          usgs: usgsPfasCount,
        },
        airToxicsRegions: airToxicsRegionCount,
        reproductiveRegions: reproductiveRegionCount,
        sentinelSpecies: sentinelSpeciesCount,
        powerPlants: powerPlantCount,
        hazardousSites: hazardousSiteCount,
        hazardousSemsSites: hazardousSemsCount,
        sampleWastewaterId: npdesWastewater.id,
        sampleWastewaterBackend: npdesWastewaterDetail.backend,
        samplePharmaWaterId: pharmaWastewater.id,
        samplePharmaWaterBackend: pharmaWastewaterDetail.backend,
        sampleAirToxicsId: airToxicsEntity.id,
        sampleAirToxicsBackend: airToxicsDetail.backend,
        sampleReproductiveId: reproductiveEntity.id,
        sampleReproductiveBackend: reproductiveDetail.backend,
        sampleSentinelId: sentinelEntity.id,
        sampleSentinelBackend: sentinelDetail.backend,
        samplePowerPlantId: powerPlantEntity.id,
        samplePowerPlantBackend: powerPlantDetail.backend,
        sampleHazardousId: hazardousEntity.id,
        sampleHazardousBackend: hazardousDetail.backend,
        nearbySystems: nearbySummary.systemCounts.slice(0, 3),
        nearbySummaryLines: nearbySummary.summaryLines,
        nearbyHeadlineResults: nearbySummary.headlineResults.map((result) => ({
          id: result.entity.id,
          layerId: result.entity.layerId,
          sourceIds: result.entity.sourceIds,
          whyRanked: result.whyRanked,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL live API validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
