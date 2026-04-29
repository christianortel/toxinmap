export {};

import { access } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  defaultHomeMapEntitiesLayerIds,
  defaultMapEntitiesGroups,
  getDefaultHomeMapEntitiesSearchParams,
  getMapEntitiesCacheFilePath,
  getMapEntitiesCacheKey,
} from "@/lib/data/map-entities-cache";
import { parseMapEntitiesQuery } from "@/lib/data/query-params";
import type { ExplorerVisibleEntity } from "@/types/explorer";

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const query = parseMapEntitiesQuery(getDefaultHomeMapEntitiesSearchParams());
  const cacheKey = getMapEntitiesCacheKey(query, {
    groups: [...defaultMapEntitiesGroups],
    layers: [...defaultHomeMapEntitiesLayerIds],
  });
  const cachePath = await getMapEntitiesCacheFilePath(cacheKey);
  const routePath = `/api/map-entities?${getDefaultHomeMapEntitiesSearchParams().toString()}`;

  try {
    await access(cachePath);
  } catch {
    throw new Error(`Expected home atlas cache file to exist before first request: ${cachePath}`);
  }

  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${routePath}`);
  const elapsedMs = Math.round(performance.now() - startedAt);
  if (!response.ok) {
    throw new Error(`Expected ${routePath} to return 200, received ${response.status}`);
  }

  const visibleEntities = (await response.json()) as ExplorerVisibleEntity[];
  if (!Array.isArray(visibleEntities) || visibleEntities.length === 0) {
    throw new Error("Expected the home atlas cache-backed route to return visible entities.");
  }

  const grouped = visibleEntities.reduce(
    (counts, entity) => {
      counts[entity.layerId] = (counts[entity.layerId] ?? 0) + 1;
      return counts;
    },
    {} as Partial<Record<ExplorerVisibleEntity["layerId"], number>>,
  );

  if (visibleEntities.length < 40) {
    throw new Error(
      `Expected the broad-band home atlas to stay meaningfully populated after caching, received only ${visibleEntities.length} visible markers.`,
    );
  }

  if ((grouped["industrial-sites"] ?? 0) < 12) {
    throw new Error(
      `Expected the broad-band home atlas to keep at least 12 industrial overview markers, received ${grouped["industrial-sites"] ?? 0}.`,
    );
  }

  if ((grouped["pfas-sites"] ?? 0) < 6) {
    throw new Error(
      `Expected the broad-band home atlas to keep at least 6 PFAS markers, received ${grouped["pfas-sites"] ?? 0}.`,
    );
  }

  if ((grouped["legal-markers"] ?? 0) < 4) {
    throw new Error(
      `Expected the broad-band home atlas to keep at least 4 legal markers once the DB-backed legal layer is preferred, received ${grouped["legal-markers"] ?? 0}.`,
    );
  }

  if ((grouped["wastewater-sites"] ?? 0) < 4) {
    throw new Error(
      `Expected the broad-band home atlas to keep at least 4 wastewater investigation entry points, received ${grouped["wastewater-sites"] ?? 0}.`,
    );
  }

  if ((grouped["legal-markers"] ?? 0) > 8) {
    throw new Error(
      `Expected the broad-band home atlas to keep legal markers at or below 8 markers, received ${grouped["legal-markers"] ?? 0}.`,
    );
  }

  if ((grouped["wastewater-sites"] ?? 0) > 8) {
    throw new Error(
      `Expected the broad-band home atlas to keep wastewater markers at or below 8 markers, received ${grouped["wastewater-sites"] ?? 0}.`,
    );
  }

  if ((grouped["air-toxics-regions"] ?? 0) > 6) {
    throw new Error(
      `Expected the broad-band home atlas to keep air-toxics regions at or below 6 markers, received ${grouped["air-toxics-regions"] ?? 0}.`,
    );
  }

  if ((grouped["hazardous-sites"] ?? 0) > 1) {
    throw new Error(
      `Expected the broad-band home atlas to keep hazardous-sites at or below 1 marker, received ${grouped["hazardous-sites"] ?? 0}.`,
    );
  }

  const legalMarkers = visibleEntities.filter((entity) => entity.layerId === "legal-markers");
  const legalMarkersWithoutEcho = legalMarkers.filter((entity) => !entity.sourceIds.includes("epa-echo"));
  if (legalMarkersWithoutEcho.length > 0) {
    throw new Error(
      `Expected broad-band legal markers to be sourced from the DB-backed ECHO legal layer, but ${legalMarkersWithoutEcho.length} markers were missing epa-echo lineage.`,
    );
  }

  const legalMarkersWithClusterSignals = legalMarkers.filter((entity) =>
    entity.officialSignals.some((signal) => signal.startsWith("Aggregated legal markers:")),
  );
  if (legalMarkersWithClusterSignals.length !== legalMarkers.length) {
    throw new Error(
      `Expected every broad-band legal marker to expose aggregated legal-cluster context instead of generic representative metadata, but only ${legalMarkersWithClusterSignals.length} of ${legalMarkers.length} markers carried aggregated legal signals.`,
    );
  }

  const legalMarkersWithStrongAggregation = legalMarkers.filter(
    (entity) => (entity.aggregateCount ?? 1) >= 5,
  );
  if (legalMarkersWithStrongAggregation.length < 4) {
    throw new Error(
      `Expected the broad-band home atlas to include at least 4 materially aggregated legal context markers, received ${legalMarkersWithStrongAggregation.length}.`,
    );
  }

  const legalMarkersWithWastewaterContext = legalMarkers.filter((entity) =>
    entity.officialSignals.some((signal) => signal.includes("Wastewater-linked legal context")),
  );
  if (legalMarkersWithWastewaterContext.length < 1) {
    throw new Error(
      "Expected the broad-band home atlas to include at least one legal cluster that explicitly carries wastewater-linked enforcement context.",
    );
  }

  if ((grouped["industrial-sites"] ?? 0) <= (grouped["wastewater-sites"] ?? 0)) {
    throw new Error(
      `Expected industrial overview markers to outnumber wastewater markers in the broad-band home atlas, received industrial=${grouped["industrial-sites"] ?? 0}, wastewater=${grouped["wastewater-sites"] ?? 0}.`,
    );
  }

  const concreteEntryCount =
    (grouped["industrial-sites"] ?? 0) +
    (grouped["pfas-sites"] ?? 0) +
    (grouped["wastewater-sites"] ?? 0);
  const contextEntryCount =
    (grouped["legal-markers"] ?? 0) +
    (grouped["air-toxics-regions"] ?? 0);
  if (concreteEntryCount <= contextEntryCount) {
    throw new Error(
      `Expected concrete industrial/PFAS/wastewater entry points to outnumber contextual legal/air overlays in the broad-band home atlas, received concrete=${concreteEntryCount}, context=${contextEntryCount}.`,
    );
  }

  const wastewaterMarkers = visibleEntities.filter((entity) => entity.layerId === "wastewater-sites");
  const wastewaterNpdesMarkers = wastewaterMarkers.filter((entity) =>
    entity.sourceIds.includes("epa-npdes"),
  );
  if (wastewaterNpdesMarkers.length < 2) {
    throw new Error(
      `Expected the broad-band home atlas to keep at least 2 actionable NPDES wastewater markers, received ${wastewaterNpdesMarkers.length}.`,
    );
  }

  const hazardousMarkers = visibleEntities.filter((entity) => entity.layerId === "hazardous-sites");
  const semsHazardousMarkers = hazardousMarkers.filter((entity) =>
    entity.sourceIds.includes("epa-sems"),
  );
  if (hazardousMarkers.length > 0 && semsHazardousMarkers.length !== hazardousMarkers.length) {
    throw new Error(
      `Expected any broad-band hazardous opening marker to come from epa-sems-backed cleanup context, but only ${semsHazardousMarkers.length} of ${hazardousMarkers.length} hazardous markers carried epa-sems lineage.`,
    );
  }

  const airToxicsRegions = visibleEntities.filter((entity) => entity.layerId === "air-toxics-regions");
  const airToxicsRegionsWithLegalOverlap = airToxicsRegions.filter((entity) => {
    const legalOverlap =
      Number.parseFloat(
        String(entity.sourceStats?.find((entry) => entry.label === "Legal overlap")?.value ?? "0").replace(
          /[^0-9.-]+/g,
          "",
        ),
      ) || 0;
    return legalOverlap > 0;
  });
  const airToxicsRegionsWithStrongLegalOverlap = airToxicsRegions.filter((entity) => {
    const legalOverlap =
      Number.parseFloat(
        String(entity.sourceStats?.find((entry) => entry.label === "Legal overlap")?.value ?? "0").replace(
          /[^0-9.-]+/g,
          "",
        ),
      ) || 0;
    return legalOverlap >= 50;
  });
  if (airToxicsRegionsWithLegalOverlap.length < 2) {
    throw new Error(
      `Expected the broad-band home atlas to include at least 2 air-toxics regions with explicit legal-overlap context, received ${airToxicsRegionsWithLegalOverlap.length}.`,
    );
  }
  if (airToxicsRegionsWithStrongLegalOverlap.length !== airToxicsRegions.length) {
    throw new Error(
      `Expected opening air-toxics regions to carry materially useful legal-overlap context (>= 50), but only ${airToxicsRegionsWithStrongLegalOverlap.length} of ${airToxicsRegions.length} regions met that bar.`,
    );
  }

  const airToxicsRegionsWithoutLegalOverlap = airToxicsRegions.filter((entity) => {
    const legalOverlap =
      Number.parseFloat(
        String(entity.sourceStats?.find((entry) => entry.label === "Legal overlap")?.value ?? "0").replace(
          /[^0-9.-]+/g,
          "",
        ),
      ) || 0;
    return legalOverlap <= 0;
  });
  if (airToxicsRegionsWithoutLegalOverlap.length > 0) {
    throw new Error(
      `Expected opening air-toxics regions to carry explicit legal-overlap context once stronger DB-backed rows are available, but found zero-overlap regions: ${airToxicsRegionsWithoutLegalOverlap.map((entity) => entity.title).join(", ")}.`,
    );
  }

  const airToxicsRegionsWithoutEcho = airToxicsRegions.filter(
    (entity) => !entity.sourceIds.includes("epa-echo"),
  );
  if (airToxicsRegionsWithoutEcho.length > 0) {
    throw new Error(
      `Expected opening air-toxics regions to retain ECHO-backed legal/regulatory context, but found non-ECHO regions: ${airToxicsRegionsWithoutEcho.map((entity) => entity.title).join(", ")}.`,
    );
  }

  const weakHazardousMarkers = hazardousMarkers.filter((entity) => {
    const triIds =
      Number.parseFloat(
        String(entity.sourceStats?.find((entry) => entry.label === "TRI ids")?.value ?? "0").replace(
          /[^0-9.-]+/g,
          "",
        ),
      ) || 0;
    const programs =
      Number.parseFloat(
        String(entity.sourceStats?.find((entry) => entry.label === "Programs")?.value ?? "0").replace(
          /[^0-9.-]+/g,
          "",
        ),
      ) || 0;
    const federalCases =
      Number.parseFloat(
        String(
          entity.sourceStats?.find((entry) => entry.label === "Federal cases")?.value ?? "0",
        ).replace(/[^0-9.-]+/g, ""),
      ) || 0;

    return !entity.sourceIds.includes("epa-tri") && triIds <= 0 && federalCases <= 0 && programs < 4;
  });
  if (weakHazardousMarkers.length > 0) {
    throw new Error(
      `Expected any broad-band hazardous opening marker to carry stronger cleanup context than a generic SEMS-only site, but found weak hazard markers: ${weakHazardousMarkers.map((entity) => entity.title).join(", ")}.`,
    );
  }

  const pfasMarkers = visibleEntities.filter((entity) => entity.layerId === "pfas-sites");
  const pfasBuckets = new Map<string, number>();
  const pfasCoordinateCounts = new Map<string, number>();
  const pfasUsgsMarkers = pfasMarkers.filter((entity) =>
    entity.sourceIds.includes("usgs-pfas-tapwater"),
  );
  const pfasAtsdrMarkers = pfasMarkers.filter((entity) =>
    entity.sourceIds.includes("atsdr-pfas-sites"),
  );
  const pfasAggregateMarkers = pfasMarkers.filter((entity) => entity.isAggregate);
  const chemistryRichPfasMarkers = pfasMarkers.filter((entity) =>
    ["PFOS", "PFOA", "GenX"].some((chemistry) => entity.chemicalHighlights.includes(chemistry)),
  );
  for (const entity of pfasMarkers) {
    const bucketLon = Math.round(entity.coordinates[0] / 8) * 8;
    const bucketLat = Math.round(entity.coordinates[1] / 8) * 8;
    const bucketKey = `${bucketLon},${bucketLat}`;
    pfasBuckets.set(bucketKey, (pfasBuckets.get(bucketKey) ?? 0) + 1);

    const coordinateKey = `${entity.coordinates[0].toFixed(4)},${entity.coordinates[1].toFixed(4)}`;
    pfasCoordinateCounts.set(
      coordinateKey,
      (pfasCoordinateCounts.get(coordinateKey) ?? 0) + 1,
    );
  }

  if (pfasBuckets.size < 4) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to span at least 4 regional diversity buckets, received ${pfasBuckets.size}.`,
    );
  }

  const largestPfasBucket = Math.max(...pfasBuckets.values());
  if (largestPfasBucket > 3) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to cap any one 8-degree bucket at 3 markers, received ${largestPfasBucket}.`,
    );
  }

  if (pfasUsgsMarkers.length < 6) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to preserve at least 6 direct-measurement USGS tap-water markers, received ${pfasUsgsMarkers.length}.`,
    );
  }

  if (pfasUsgsMarkers.length > 8) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to reserve room for non-USGS site context and cap USGS tap-water markers at 8, received ${pfasUsgsMarkers.length}.`,
    );
  }

  if (pfasAtsdrMarkers.length < 1) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to include at least 1 ATSDR PFAS site-context marker, received ${pfasAtsdrMarkers.length}.`,
    );
  }

  if (chemistryRichPfasMarkers.length < 3) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to include at least 3 chemistry-rich PFAS markers carrying PFOS, PFOA, or GenX, received ${chemistryRichPfasMarkers.length}.`,
    );
  }

  if (pfasAggregateMarkers.length > 0) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to use concrete point markers when source-backed PFAS points exist, received ${pfasAggregateMarkers.length} aggregate PFAS markers.`,
    );
  }

  const largestCoordinateDuplicate = Math.max(...pfasCoordinateCounts.values());
  if (largestCoordinateDuplicate > 1) {
    throw new Error(
      `Expected the broad-band home atlas PFAS slice to avoid exact-coordinate duplicates, received ${largestCoordinateDuplicate} markers on the same PFAS coordinate.`,
    );
  }

  if (elapsedMs > 8000) {
    throw new Error(
      `Expected first home atlas request on a fresh process to stay under 8000ms using the persistent cache, received ${elapsedMs}ms.`,
    );
  }

  console.log("PASS home atlas cache validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        routePath,
        cachePath,
        visibleEntities: visibleEntities.length,
        grouped,
        legalMarkersWithClusterSignals: legalMarkersWithClusterSignals.length,
        legalMarkersWithStrongAggregation: legalMarkersWithStrongAggregation.length,
        legalMarkersWithWastewaterContext: legalMarkersWithWastewaterContext.length,
        hazardousSites: hazardousMarkers.length,
        hazardousTitles: hazardousMarkers.map((entity) => entity.title),
        airToxicsRegionsWithLegalOverlap: airToxicsRegionsWithLegalOverlap.length,
        airToxicsRegionsWithStrongLegalOverlap: airToxicsRegionsWithStrongLegalOverlap.length,
        airToxicsRegionsWithoutLegalOverlap: airToxicsRegionsWithoutLegalOverlap.length,
        airToxicsRegionsWithoutEcho: airToxicsRegionsWithoutEcho.length,
        pfasSourceFamilies: {
          usgsTapwater: pfasUsgsMarkers.length,
          atsdrSites: pfasAtsdrMarkers.length,
        },
        pfasAggregates: pfasAggregateMarkers.length,
        pfasChemistryRich: chemistryRichPfasMarkers.length,
        pfasCoordinateCounts: Object.fromEntries(pfasCoordinateCounts),
        pfasBuckets: Object.fromEntries(pfasBuckets),
        elapsedMs,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL home atlas cache validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
