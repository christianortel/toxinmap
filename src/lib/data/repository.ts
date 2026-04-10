import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { explorerLayerDefinitions } from "@/content/explorer-data";
import { db } from "@/db/client";
import {
  hazardousSites,
  industrialSites,
  pfasSites,
  powerPlants,
  sentinelSpeciesRecords,
  sourceRegistry,
  toxicReleaseRecords,
  wastewaterSites,
} from "@/db/schema";
import { mockCaseStudies } from "@/data/mock/case-studies";
import { mockEntities } from "@/data/mock/entities";
import { mockGeographies } from "@/data/mock/geographies";
import { timelineStops, warningCategories } from "@/data/mock/methodology";
import { mockSources } from "@/data/mock/sources";
import {
  asSourceStats,
  asStringArray,
  buildLocationLabel,
  formatSourceDate,
  fromDatabaseConfidence,
  fromDatabaseEvidenceType,
  fromDatabaseGeographicLevel,
  fromDatabaseProgramTier,
  fromDatabaseSourceLifecycle,
  fromDatabaseSourceType,
  sanitizeExplorerTags,
  sanitizeChemicalHighlights,
  sanitizeChemicalMarkers,
  sanitizeSignalFamilies,
  withExplorerDefaults,
} from "@/lib/data/adapters";
import { ensureSourceRegistrySeeded } from "@/lib/data/bootstrap";
import {
  getChemicalMarkerLabel,
  getSignalFamilyLabel,
} from "@/lib/data/chemistry";
import { getDistanceMiles } from "@/lib/data/geo";
import type {
  ParsedCaseStudyQuery,
  ParsedEntityQuery,
  ParsedNearbyQuery,
  ParsedSourceQuery,
} from "@/lib/data/query-params";
import { getLayerDefinition } from "@/lib/map/layer-registry";
import type { CaseStudyRecord, EvidenceType, LayerGroup } from "@/types/data";
import type {
  ExplorerEntity,
  ExplorerEntityDetail,
  ExplorerNearbyResponse,
  ExplorerReleaseRecord,
} from "@/types/explorer";
import type { SourceRegistryEntry } from "@/types/sources";

type DatabaseEntityRow = {
  id: number;
  slug: string | null;
  title: string;
  layerGroup: LayerGroup;
  category: string | null;
  subcategory: string | null;
  summary: string | null;
  notes: string | null;
  sourceIds: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  sourceUpdatedAt: Date | null;
  evidenceType: string;
  confidenceLevel: string;
  metadata: Record<string, unknown>;
  latitude: number | null;
  longitude: number | null;
  dateLabel: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  locationLabel: string;
};

type EntityQuery = ParsedEntityQuery;
type CaseStudyQuery = ParsedCaseStudyQuery;
type SourceQuery = ParsedSourceQuery;

const gracefulDatabaseFallback = process.env.NODE_ENV !== "production";

function isDatabaseReady() {
  return Boolean(db);
}

function getFallbackSources(query: SourceQuery = {}) {
  return mockSources.filter((source) => {
    if (query.sourceId && source.id !== query.sourceId) return false;
    if (query.layerGroup && !source.layerGroups.includes(query.layerGroup)) return false;
    return true;
  });
}

function getFallbackCaseStudies(query: CaseStudyQuery = {}) {
  return mockCaseStudies.filter((study) => {
    if (query.category && study.category !== query.category) return false;
    if (query.tag && !study.tags.includes(query.tag)) return false;
    if (query.sourceId && !study.sourceIds.includes(query.sourceId)) return false;
    return true;
  });
}

function entityMatchesQuery(entity: ExplorerEntity, query: EntityQuery = {}) {
  if (query.layerGroup && entity.layerGroup !== query.layerGroup) return false;
  if (query.evidenceType && entity.evidenceType !== query.evidenceType) return false;
  if (query.category && entity.category !== query.category) return false;
  if (query.sourceId && !entity.sourceIds.includes(query.sourceId)) return false;
  if (query.relatedCaseStudyId && !entity.relatedCaseStudyIds.includes(query.relatedCaseStudyId)) {
    return false;
  }
  if (query.year && (entity.yearStart > query.year || entity.yearEnd < query.year)) return false;
  return true;
}

async function withDatabaseFallback<T>(callback: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!isDatabaseReady()) {
    return fallback();
  }

  try {
    return await callback();
  } catch (error) {
    if (!gracefulDatabaseFallback) {
      throw error;
    }

    return fallback();
  }
}

function readMetadata(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function readMetadataNumber(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" ? value : null;
}

function buildExplorerEntityFromDatabase(row: DatabaseEntityRow, layerId: ExplorerEntity["layerId"]) {
  const relatedCaseStudyIds = asStringArray(row.metadata?.relatedCaseStudyIds);
  const officialSignals = asStringArray(row.metadata?.officialSignals);
  const emergingConcerns = asStringArray(row.metadata?.emergingConcerns);
  const wildlifeSentinelContext = asStringArray(row.metadata?.wildlifeSentinelContext);
  const reproductiveHealthContext = asStringArray(row.metadata?.reproductiveHealthContext);
  const legalHistoricalContext = asStringArray(row.metadata?.legalHistoricalContext);
  const uncertaintyNote =
    readMetadata(row.metadata, "uncertaintyNote") ??
    row.notes ??
    "Database-backed facility context remains partial and should be read alongside the evidence class shown here.";

  return withExplorerDefaults({
    id: row.slug ?? `${layerId}-${row.id}`,
    slug: row.slug ?? undefined,
    title: row.title,
    coordinates: [row.longitude ?? 0, row.latitude ?? 0],
    layerGroup: row.layerGroup,
    layerId,
    category: row.category ?? explorerLayerDefinitions.find((layer) => layer.id === layerId)?.category ?? "Context",
    subcategory:
      row.subcategory ??
      explorerLayerDefinitions.find((layer) => layer.id === layerId)?.subcategory ??
      "Database-backed context",
    locationLabel: row.locationLabel || "United States",
    summary:
      row.summary ??
      readMetadata(row.metadata, "summary") ??
      "A database-backed atlas entity generated from official or curated source records.",
    whyThisAppears:
      readMetadata(row.metadata, "whyThisAppears") ??
      row.notes ??
      "This appears because the source record contributes official or source-aware context to the atlas.",
    dateLabel:
      row.dateLabel ??
      (row.yearStart && row.yearEnd ? `${row.yearStart}-${row.yearEnd}` : row.yearStart?.toString() ?? "Current"),
    yearStart: row.yearStart ?? readMetadataNumber(row.metadata, "yearStart") ?? 1990,
    yearEnd: row.yearEnd ?? readMetadataNumber(row.metadata, "yearEnd") ?? new Date().getUTCFullYear(),
    evidenceType: fromDatabaseEvidenceType(row.evidenceType),
    confidenceLevel: fromDatabaseConfidence(row.confidenceLevel),
    tags: sanitizeExplorerTags(row.metadata?.tags),
    signalFamilies: sanitizeSignalFamilies(row.metadata?.signalFamilies),
    chemicalMarkers: sanitizeChemicalMarkers(row.metadata?.chemicalMarkers),
    chemicalHighlights: sanitizeChemicalHighlights(row.metadata?.chemicalHighlights),
    sourceIds: row.sourceIds,
    relatedCaseStudyIds,
    officialSignals,
    emergingConcerns,
    wildlifeSentinelContext,
    reproductiveHealthContext,
    legalHistoricalContext,
    uncertaintyNote,
    sourceStats: asSourceStats(row.metadata?.sourceStats),
  });
}

async function getDatabaseSources(query: SourceQuery = {}) {
  if (!db) return [];

  await ensureSourceRegistrySeeded();

  const filters = [];
  if (query.sourceId) {
    filters.push(eq(sourceRegistry.slug, query.sourceId));
  }

  const rows = await db
    .select()
    .from(sourceRegistry)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(sourceRegistry.name);

  return rows
    .map((row) => ({
      id: row.slug,
      slug: row.slug,
      name: row.name,
      shortName: row.shortName,
      sourceType: fromDatabaseSourceType(row.sourceType),
      lifecycle: fromDatabaseSourceLifecycle(row.lifecycle),
      programTier: fromDatabaseProgramTier(row.programTier),
      layerGroups: row.layerGroups as LayerGroup[],
      supportedEvidence: row.supportedEvidence.map((value) =>
        fromDatabaseEvidenceType(String(value)),
      ) as EvidenceType[],
      description: row.description,
      geographicScope: row.geographicScope,
      geographicLevel: fromDatabaseGeographicLevel(row.geographicLevel),
      spatialResolution: row.spatialResolution,
      updateCadence: row.updateCadence,
      completenessTags: row.completenessTags,
      caveats: row.caveats,
      confidenceNote: row.confidenceNote,
      methodologicalUse: row.methodologicalUse,
      originSite: row.originSite ?? undefined,
      upstreamDatasets: row.upstreamDatasets ?? [],
      downloadability:
        row.downloadability === "public-download" ||
        row.downloadability === "downloadable-with-caveats" ||
        row.downloadability === "reference-only"
          ? row.downloadability
          : undefined,
      ingestionMethod:
        row.ingestionMethod === "direct-ingest" ||
        row.ingestionMethod === "derived-from-methodology" ||
        row.ingestionMethod === "reference-only"
          ? row.ingestionMethod
          : undefined,
      externalUrl: row.externalUrl,
      sourceUpdatedAt: formatSourceDate(row.sourceUpdatedAt),
    }))
    .filter((source) => {
      if (query.layerGroup && !source.layerGroups.includes(query.layerGroup)) return false;
      return true;
    });
}

async function getDatabaseIndustrialEntities() {
  if (!db) return [];

  const rows = await db
    .select({
      id: industrialSites.id,
      slug: industrialSites.slug,
      title: industrialSites.facilityName,
      layerGroup: industrialSites.layerGroup,
      category: industrialSites.category,
      subcategory: industrialSites.subcategory,
      summary: industrialSites.summary,
      notes: industrialSites.notes,
      sourceIds: industrialSites.sourceIds,
      sourceName: industrialSites.sourceName,
      sourceUrl: industrialSites.sourceUrl,
      sourceUpdatedAt: industrialSites.sourceUpdatedAt,
      evidenceType: industrialSites.evidenceType,
      confidenceLevel: industrialSites.confidenceLevel,
      metadata: industrialSites.metadata,
      latitude: sql<number | null>`ST_Y(${industrialSites.location})`,
      longitude: sql<number | null>`ST_X(${industrialSites.location})`,
      dateLabel: industrialSites.dateRangeLabel,
      yearStart: industrialSites.activeYear,
      yearEnd: industrialSites.activeYear,
      locationLabel: sql<string>`COALESCE(${industrialSites.metadata}->>'locationLabel', ${industrialSites.metadata}->>'city', '')`,
    })
    .from(industrialSites)
    .where(sql`${industrialSites.location} IS NOT NULL`)
    .orderBy(industrialSites.facilityName);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) =>
      buildExplorerEntityFromDatabase(
        {
          ...row,
          locationLabel: row.locationLabel || buildLocationLabel([row.sourceName]),
        },
        "industrial-sites",
      ),
    );
}

async function getDatabasePowerPlantEntities() {
  if (!db) return [];

  const rows = await db
    .select({
      id: powerPlants.id,
      slug: powerPlants.slug,
      title: powerPlants.plantName,
      layerGroup: powerPlants.layerGroup,
      category: powerPlants.category,
      subcategory: powerPlants.subcategory,
      summary: powerPlants.summary,
      notes: powerPlants.notes,
      sourceIds: powerPlants.sourceIds,
      sourceName: powerPlants.sourceName,
      sourceUrl: powerPlants.sourceUrl,
      sourceUpdatedAt: powerPlants.sourceUpdatedAt,
      evidenceType: powerPlants.evidenceType,
      confidenceLevel: powerPlants.confidenceLevel,
      metadata: powerPlants.metadata,
      latitude: sql<number | null>`ST_Y(${powerPlants.location})`,
      longitude: sql<number | null>`ST_X(${powerPlants.location})`,
      dateLabel: sql<string | null>`${powerPlants.activeYear}::text`,
      yearStart: powerPlants.activeYear,
      yearEnd: powerPlants.activeYear,
      locationLabel: sql<string>`COALESCE(${powerPlants.metadata}->>'locationLabel', '')`,
    })
    .from(powerPlants)
    .where(sql`${powerPlants.location} IS NOT NULL`)
    .orderBy(powerPlants.plantName);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => buildExplorerEntityFromDatabase(row, "power-plants"));
}

async function getDatabaseHazardousEntities() {
  if (!db) return [];

  const rows = await db
    .select({
      id: hazardousSites.id,
      slug: hazardousSites.slug,
      title: hazardousSites.siteName,
      layerGroup: hazardousSites.layerGroup,
      category: hazardousSites.category,
      subcategory: hazardousSites.subcategory,
      summary: hazardousSites.summary,
      notes: hazardousSites.notes,
      sourceIds: hazardousSites.sourceIds,
      sourceName: hazardousSites.sourceName,
      sourceUrl: hazardousSites.sourceUrl,
      sourceUpdatedAt: hazardousSites.sourceUpdatedAt,
      evidenceType: hazardousSites.evidenceType,
      confidenceLevel: hazardousSites.confidenceLevel,
      metadata: hazardousSites.metadata,
      latitude: sql<number | null>`ST_Y(ST_Centroid(${hazardousSites.boundary}))`,
      longitude: sql<number | null>`ST_X(ST_Centroid(${hazardousSites.boundary}))`,
      dateLabel: sql<string | null>`${hazardousSites.remediationYear}::text`,
      yearStart: hazardousSites.remediationYear,
      yearEnd: hazardousSites.remediationYear,
      locationLabel: sql<string>`COALESCE(${hazardousSites.metadata}->>'locationLabel', '')`,
    })
    .from(hazardousSites)
    .where(sql`${hazardousSites.boundary} IS NOT NULL`)
    .orderBy(hazardousSites.siteName);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => buildExplorerEntityFromDatabase(row, "hazardous-sites"));
}

async function getDatabasePfasEntities() {
  if (!db) return [];

  const rows = await db
    .select({
      id: pfasSites.id,
      slug: pfasSites.slug,
      title: pfasSites.siteName,
      layerGroup: pfasSites.layerGroup,
      category: pfasSites.category,
      subcategory: pfasSites.subcategory,
      summary: pfasSites.summary,
      notes: pfasSites.notes,
      sourceIds: pfasSites.sourceIds,
      sourceName: pfasSites.sourceName,
      sourceUrl: pfasSites.sourceUrl,
      sourceUpdatedAt: pfasSites.sourceUpdatedAt,
      evidenceType: pfasSites.evidenceType,
      confidenceLevel: pfasSites.confidenceLevel,
      metadata: pfasSites.metadata,
      latitude: sql<number | null>`ST_Y(${pfasSites.location})`,
      longitude: sql<number | null>`ST_X(${pfasSites.location})`,
      dateLabel: sql<string | null>`${pfasSites.observedYear}::text`,
      yearStart: pfasSites.observedYear,
      yearEnd: pfasSites.observedYear,
      locationLabel: sql<string>`COALESCE(${pfasSites.metadata}->>'locationLabel', '')`,
    })
    .from(pfasSites)
    .where(sql`${pfasSites.location} IS NOT NULL`)
    .orderBy(pfasSites.siteName);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => buildExplorerEntityFromDatabase(row, "pfas-sites"));
}

async function getDatabaseWastewaterEntities() {
  if (!db) return [];

  const rows = await db
    .select({
      id: wastewaterSites.id,
      slug: wastewaterSites.slug,
      title: wastewaterSites.facilityName,
      layerGroup: wastewaterSites.layerGroup,
      category: wastewaterSites.category,
      subcategory: wastewaterSites.subcategory,
      summary: wastewaterSites.summary,
      notes: wastewaterSites.notes,
      sourceIds: wastewaterSites.sourceIds,
      sourceName: wastewaterSites.sourceName,
      sourceUrl: wastewaterSites.sourceUrl,
      sourceUpdatedAt: wastewaterSites.sourceUpdatedAt,
      evidenceType: wastewaterSites.evidenceType,
      confidenceLevel: wastewaterSites.confidenceLevel,
      metadata: wastewaterSites.metadata,
      latitude: sql<number | null>`ST_Y(${wastewaterSites.outfallLocation})`,
      longitude: sql<number | null>`ST_X(${wastewaterSites.outfallLocation})`,
      dateLabel: sql<string | null>`${wastewaterSites.observedYear}::text`,
      yearStart: wastewaterSites.observedYear,
      yearEnd: wastewaterSites.observedYear,
      locationLabel: sql<string>`COALESCE(${wastewaterSites.metadata}->>'locationLabel', '')`,
    })
    .from(wastewaterSites)
    .where(sql`${wastewaterSites.outfallLocation} IS NOT NULL`)
    .orderBy(wastewaterSites.facilityName);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => buildExplorerEntityFromDatabase(row, "wastewater-sites"));
}

async function getDatabaseSentinelEntities() {
  if (!db) return [];

  const rows = await db
    .select({
      id: sentinelSpeciesRecords.id,
      slug: sentinelSpeciesRecords.slug,
      title: sentinelSpeciesRecords.speciesName,
      layerGroup: sentinelSpeciesRecords.layerGroup,
      category: sentinelSpeciesRecords.category,
      subcategory: sentinelSpeciesRecords.subcategory,
      summary: sentinelSpeciesRecords.summary,
      notes: sentinelSpeciesRecords.notes,
      sourceIds: sentinelSpeciesRecords.sourceIds,
      sourceName: sentinelSpeciesRecords.sourceName,
      sourceUrl: sentinelSpeciesRecords.sourceUrl,
      sourceUpdatedAt: sentinelSpeciesRecords.sourceUpdatedAt,
      evidenceType: sentinelSpeciesRecords.evidenceType,
      confidenceLevel: sentinelSpeciesRecords.confidenceLevel,
      metadata: sentinelSpeciesRecords.metadata,
      latitude: sql<number | null>`ST_Y(${sentinelSpeciesRecords.location})`,
      longitude: sql<number | null>`ST_X(${sentinelSpeciesRecords.location})`,
      dateLabel: sql<string | null>`${sentinelSpeciesRecords.recordYear}::text`,
      yearStart: sentinelSpeciesRecords.recordYear,
      yearEnd: sentinelSpeciesRecords.recordYear,
      locationLabel: sql<string>`COALESCE(${sentinelSpeciesRecords.metadata}->>'locationLabel', '')`,
    })
    .from(sentinelSpeciesRecords)
    .where(sql`${sentinelSpeciesRecords.location} IS NOT NULL`)
    .orderBy(sentinelSpeciesRecords.speciesName);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => buildExplorerEntityFromDatabase(row, "sentinel-species"));
}

async function getDatabaseEntities() {
  const entityCollections = await Promise.all([
    getDatabaseIndustrialEntities(),
    getDatabasePowerPlantEntities(),
    getDatabaseHazardousEntities(),
    getDatabasePfasEntities(),
    getDatabaseWastewaterEntities(),
    getDatabaseSentinelEntities(),
  ]);

  return entityCollections.flat();
}

async function getMergedEntities(query: EntityQuery = {}) {
  const databaseEntities = await withDatabaseFallback(
    async () => getDatabaseEntities(),
    () => [] as ExplorerEntity[],
  );

  const databaseLayerIds = new Set(databaseEntities.map((entity) => entity.layerId));
  const fallbackEntities = mockEntities.filter((entity) => !databaseLayerIds.has(entity.layerId));
  const merged = [...databaseEntities, ...fallbackEntities];

  return merged.filter((entity) => entityMatchesQuery(entity, query));
}

async function getIndustrialEntityReleaseRecords(entityId: string) {
  if (!db) return [];

  const site = await db
    .select({ id: industrialSites.id })
    .from(industrialSites)
    .where(or(eq(industrialSites.slug, entityId), sql`${industrialSites.id}::text = ${entityId}`))
    .limit(1);

  const siteId = site[0]?.id;
  if (!siteId) return [];

  const rows = await db
    .select({
      id: toxicReleaseRecords.id,
      chemicalName: toxicReleaseRecords.chemicalName,
      reportingYear: toxicReleaseRecords.reportingYear,
      quantityKg: toxicReleaseRecords.quantityKg,
      releaseMedium: toxicReleaseRecords.releaseMedium,
      sourceIds: toxicReleaseRecords.sourceIds,
    })
    .from(toxicReleaseRecords)
    .where(eq(toxicReleaseRecords.siteId, siteId))
    .orderBy(desc(toxicReleaseRecords.reportingYear), desc(toxicReleaseRecords.quantityKg))
    .limit(5);

  return rows.map<ExplorerReleaseRecord>((row) => ({
    id: `tri-record-${row.id}`,
    chemicalName: row.chemicalName,
    reportingYear: row.reportingYear,
    quantityKg: row.quantityKg ? Number(row.quantityKg) : null,
    releaseMedium: row.releaseMedium,
    sourceId: row.sourceIds[0] ?? null,
  }));
}

async function getGeographyContextSignals() {
  return [] as string[];
}

export function getGeographies() {
  return mockGeographies;
}

export function getWarningCategories() {
  return warningCategories;
}

export function getTimelineStops() {
  return timelineStops;
}

export async function getSources(query: SourceQuery = {}) {
  return withDatabaseFallback(
    async () => {
      const databaseSources = await getDatabaseSources(query);
      return databaseSources.length ? databaseSources : getFallbackSources(query);
    },
    () => getFallbackSources(query),
  );
}

export async function getSourceById(sourceId: string) {
  const sources = await getSources({ sourceId });
  return sources[0] ?? null;
}

export async function getSourcesByIds(sourceIds: string[]) {
  const sources = await getSources();
  const sourceMap = new Map(sources.map((source) => [source.id, source]));

  return sourceIds
    .map((sourceId) => sourceMap.get(sourceId))
    .filter((source): source is SourceRegistryEntry => Boolean(source));
}

export async function getCaseStudies(query: CaseStudyQuery = {}) {
  return getFallbackCaseStudies(query);
}

export async function getCaseStudyBySlug(slug: string) {
  return mockCaseStudies.find((study) => study.slug === slug) ?? null;
}

export async function getEntities(query: EntityQuery = {}) {
  return getMergedEntities(query);
}

export async function getEntityById(id: string) {
  const entities = await getMergedEntities();
  return entities.find((entity) => entity.id === id) ?? null;
}

export async function getEntityDetail(id: string): Promise<ExplorerEntityDetail | null> {
  const entity = await getEntityById(id);
  if (!entity) return null;

  const [sources, relatedCaseStudies, releaseRecords, contextSignals] = await Promise.all([
    getSourcesByIds(entity.sourceIds),
    Promise.resolve(
      entity.relatedCaseStudyIds
        .map((caseStudySlug) => mockCaseStudies.find((study) => study.slug === caseStudySlug))
        .filter((study): study is CaseStudyRecord => Boolean(study)),
    ),
    withDatabaseFallback(
      async () => getIndustrialEntityReleaseRecords(id),
      () => [] as ExplorerReleaseRecord[],
    ),
    withDatabaseFallback(async () => getGeographyContextSignals(), () => [] as string[]),
  ]);

  const databaseBackedLayerIds = new Set(
    (await withDatabaseFallback(async () => getDatabaseEntities(), () => [] as ExplorerEntity[])).map(
      (record) => record.layerId,
    ),
  );

  return {
    ...entity,
    legalHistoricalContext: Array.from(
      new Set([...entity.legalHistoricalContext, ...contextSignals]),
    ),
    sources,
    relatedCaseStudies,
    releaseRecords,
    backend: databaseBackedLayerIds.has(entity.layerId) ? "database" : "mock",
  };
}

function entityMatchesNearbyQuery(entity: ExplorerEntity, query: ParsedNearbyQuery) {
  if (query.groups?.length && !query.groups.includes(entity.layerGroup)) {
    return false;
  }

  if (query.layers?.length && !query.layers.includes(entity.layerId)) {
    return false;
  }

  if (query.chips?.length && !query.chips.every((chip) => entity.tags.includes(chip))) {
    return false;
  }

  if (query.year && (entity.yearStart > query.year || entity.yearEnd < query.year)) {
    return false;
  }

  return true;
}

const nearbyEvidencePriority: Record<ExplorerEntity["evidenceType"], number> = {
  "Direct Measurement": 0,
  "Screening Signal": 1,
  Proxy: 2,
  "Literature Evidence": 3,
  "Editorial Case Study": 4,
};

const nearbyConfidencePriority: Record<ExplorerEntity["confidenceLevel"], number> = {
  High: 0,
  Moderate: 1,
  Low: 2,
};

const nearbyLayerGroupPriority: Record<ExplorerEntity["layerGroup"], number> = {
  official: 0,
  emerging: 1,
  legal: 2,
  wildlife: 3,
  reproductive: 4,
};

const nearbyThemeLabels: Record<ExplorerEntity["tags"][number], string> = {
  downstream: "Downstream pathway pressure",
  "drinking-water": "Drinking-water relevance",
  "community-pressure": "Community pressure",
  "wildlife-anomaly": "Wildlife anomaly context",
  "fertility-context": "Fertility and reproductive context",
  litigation: "Litigation and enforcement pressure",
};

function getNearbyPriorityScore(
  entity: ExplorerEntity,
  distanceMiles: number,
  radiusMiles: number,
) {
  const normalizedDistance = Math.min(distanceMiles / Math.max(radiusMiles, 1), 1);

  return (
    nearbyEvidencePriority[entity.evidenceType] * 100 +
    nearbyConfidencePriority[entity.confidenceLevel] * 25 +
    nearbyLayerGroupPriority[entity.layerGroup] * 15 +
    normalizedDistance * 10
  );
}

function getNearbyRankingReason(entity: ExplorerEntity, distanceMiles: number) {
  const roundedDistance = Math.max(1, Math.round(distanceMiles));

  if (entity.evidenceType === "Direct Measurement") {
    return `${entity.confidenceLevel} confidence direct record within ${roundedDistance} miles.`;
  }

  if (entity.evidenceType === "Screening Signal") {
    return `Screening-level risk context within ${roundedDistance} miles.`;
  }

  if (entity.evidenceType === "Proxy") {
    return `Official pathway context within ${roundedDistance} miles.`;
  }

  if (entity.evidenceType === "Literature Evidence") {
    return `Research-backed concern zone within ${roundedDistance} miles.`;
  }

  return `Documented public-interest warning signal within ${roundedDistance} miles.`;
}

function buildNearbySummaryLines(
  themeCounts: Array<{ theme: ExplorerEntity["tags"][number]; label: string; count: number }>,
  evidenceCounts: Array<{ evidenceType: ExplorerEntity["evidenceType"]; count: number }>,
  sourceCounts: Array<{ sourceId: string; label: string; count: number }>,
  signalFamilyCounts: Array<{ id: string; label: string; count: number }>,
  chemicalMarkerCounts: Array<{ id: ExplorerEntity["chemicalMarkers"][number]; label: string; count: number }>,
  chemicalHighlightCounts: Array<{ label: ExplorerEntity["chemicalHighlights"][number]; count: number }>,
) {
  const lines: string[] = [];
  const topTheme = themeCounts[0];
  const topEvidence = evidenceCounts[0];
  const topSource = sourceCounts[0];
  const topSignalFamily = signalFamilyCounts[0];
  const topChemicalMarker = chemicalMarkerCounts[0];
  const topChemicalHighlight = chemicalHighlightCounts[0];

  if (topSignalFamily) {
    lines.push(`${topSignalFamily.label} is the strongest nearby contaminant and pathway family in view.`);
  }

  if (topChemicalMarker) {
    lines.push(`${topChemicalMarker.label} is the strongest nearby chemistry marker in this radius.`);
  }

  if (topChemicalHighlight) {
    lines.push(`${topChemicalHighlight.label} is the strongest named chemical spotlight in this view.`);
  }

  if (topTheme) {
    lines.push(`${topTheme.label} is the strongest nearby theme in the current radius.`);
  }

  if (topEvidence) {
    if (topEvidence.evidenceType === "Direct Measurement") {
      lines.push("Nearby visibility is led by direct records rather than only screening or editorial context.");
    } else if (topEvidence.evidenceType === "Screening Signal") {
      lines.push("Nearby visibility leans toward screening-level risk context, which should be treated as prioritization rather than proof.");
    } else if (topEvidence.evidenceType === "Proxy") {
      lines.push("Nearby visibility is currently led by pathway and facility context rather than direct local measurements.");
    }
  }

  if (topSource) {
    lines.push(`${topSource.label} contributes the largest source-family share in this view.`);
  }

  return lines.slice(0, 3);
}

export async function getNearbyEntities(
  query: ParsedNearbyQuery & { label?: string },
): Promise<ExplorerNearbyResponse> {
  const entities = await getMergedEntities();
  const center: [number, number] = [query.lng, query.lat];

  const nearbyResults = entities
    .filter((entity) => entityMatchesNearbyQuery(entity, query))
    .map((entity) => ({
      entity,
      distanceMiles: getDistanceMiles(center, entity.coordinates),
    }))
    .filter((result) => result.distanceMiles <= query.radiusMiles)
    .map((result) => ({
      ...result,
      priorityScore: getNearbyPriorityScore(result.entity, result.distanceMiles, query.radiusMiles),
      whyRanked: getNearbyRankingReason(result.entity, result.distanceMiles),
    }))
    .sort(
      (left, right) =>
        left.priorityScore - right.priorityScore || left.distanceMiles - right.distanceMiles,
    );

  const groupedCounts = Array.from(
    nearbyResults.reduce((accumulator, result) => {
      const label = getLayerDefinition(result.entity.layerId)?.label ?? result.entity.category;
      const existing = accumulator.get(result.entity.layerId);
      accumulator.set(result.entity.layerId, {
        id: result.entity.layerId,
        label,
        count: (existing?.count ?? 0) + 1,
      });
      return accumulator;
    }, new Map<string, { id: string; label: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count);

  const evidenceCounts = Array.from(
    nearbyResults.reduce((accumulator, result) => {
      accumulator.set(
        result.entity.evidenceType,
        (accumulator.get(result.entity.evidenceType) ?? 0) + 1,
      );
      return accumulator;
    }, new Map<ExplorerEntity["evidenceType"], number>()),
  )
    .map(([evidenceType, count]) => ({
      evidenceType,
      count,
    }))
    .sort(
      (left, right) =>
        nearbyEvidencePriority[left.evidenceType] - nearbyEvidencePriority[right.evidenceType],
    );

  const nearbySourceIds = Array.from(
    new Set(nearbyResults.flatMap((result) => result.entity.sourceIds)),
  );
  const nearbySources = await getSourcesByIds(nearbySourceIds);
  const nearbySourceMap = new Map(nearbySources.map((source) => [source.id, source]));
  const sourceCounts = Array.from(
    nearbyResults.reduce((accumulator, result) => {
      for (const sourceId of result.entity.sourceIds) {
        const existing = accumulator.get(sourceId);
        accumulator.set(sourceId, {
          sourceId,
          label: nearbySourceMap.get(sourceId)?.shortName ?? nearbySourceMap.get(sourceId)?.name ?? sourceId,
          count: (existing?.count ?? 0) + 1,
        });
      }
      return accumulator;
    }, new Map<string, { sourceId: string; label: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const themeCounts = Array.from(
    nearbyResults.reduce((accumulator, result) => {
      for (const tag of result.entity.tags) {
        const existing = accumulator.get(tag);
        accumulator.set(tag, {
          theme: tag,
          label: nearbyThemeLabels[tag],
          count: (existing?.count ?? 0) + 1,
        });
      }
      return accumulator;
    }, new Map<ExplorerEntity["tags"][number], { theme: ExplorerEntity["tags"][number]; label: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const signalFamilyCounts = Array.from(
    nearbyResults.reduce((accumulator, result) => {
      for (const family of result.entity.signalFamilies) {
        const existing = accumulator.get(family);
        accumulator.set(family, {
          id: family,
          label: getSignalFamilyLabel(family),
          count: (existing?.count ?? 0) + 1,
        });
      }
      return accumulator;
    }, new Map<string, { id: string; label: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const chemicalMarkerCounts = Array.from(
    nearbyResults.reduce((accumulator, result) => {
      for (const marker of result.entity.chemicalMarkers) {
        const existing = accumulator.get(marker);
        accumulator.set(marker, {
          id: marker,
          label: getChemicalMarkerLabel(marker),
          count: (existing?.count ?? 0) + 1,
        });
      }
      return accumulator;
    }, new Map<ExplorerEntity["chemicalMarkers"][number], { id: ExplorerEntity["chemicalMarkers"][number]; label: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const chemicalHighlightCounts = Array.from(
    nearbyResults.reduce((accumulator, result) => {
      for (const highlight of result.entity.chemicalHighlights) {
        accumulator.set(highlight, (accumulator.get(highlight) ?? 0) + 1);
      }
      return accumulator;
    }, new Map<ExplorerEntity["chemicalHighlights"][number], number>()),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 8);

  const summaryLines = buildNearbySummaryLines(
    themeCounts,
    evidenceCounts,
    sourceCounts,
    signalFamilyCounts,
    chemicalMarkerCounts,
    chemicalHighlightCounts,
  );

  return {
    center: {
      label: query.label ?? "Selected area",
      coordinates: center,
      radiusMiles: query.radiusMiles,
    },
    total: nearbyResults.length,
    groupedCounts,
    evidenceCounts,
    sourceCounts,
    signalFamilyCounts,
    chemicalMarkerCounts,
    chemicalHighlightCounts,
    themeCounts,
    summaryLines,
    headlineResults: nearbyResults.slice(0, 3),
    results: nearbyResults.slice(0, 10),
  };
}

export async function getLayerSummaries() {
  const entities = await getMergedEntities();

  return explorerLayerDefinitions.map((layer) => {
    const layerEntities = entities.filter((entity) => entity.layerId === layer.id);

    return {
      ...layer,
      entityCount: layerEntities.length,
      sourceIds: [...new Set(layerEntities.flatMap((entity) => entity.sourceIds))],
      coverageRange: layerEntities.length
        ? `${Math.min(...layerEntities.map((entity) => entity.yearStart))}-${Math.max(
            ...layerEntities.map((entity) => entity.yearEnd),
          )}`
        : "N/A",
    };
  });
}

export async function getRepositoryHealth() {
  return {
    databaseConfigured: isDatabaseReady(),
    sourceRegistrySeeded: isDatabaseReady()
      ? Number(
          (
            await withDatabaseFallback(
              async () => {
                const [{ total }] = await db!.select({ total: count() }).from(sourceRegistry);
                return total;
              },
              async () => 0,
            )
          ) ?? 0,
        ) > 0
      : false,
  };
}
