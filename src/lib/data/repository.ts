import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { explorerLayerDefinitions } from "@/content/explorer-data";
import { db } from "@/db/client";
import {
  hazardousSites,
  healthConcernContext,
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
import {
  buildDerivedContextEntitiesFromBaseEntities,
  getEtlFileEntities,
  getEtlFileEntitiesForLayers,
  getEtlFileIndustrialReleaseRecords,
} from "@/lib/data/etl-file-repository";
import { getDistanceMiles } from "@/lib/data/geo";
import type {
  ParsedCaseStudyQuery,
  ParsedEntityQuery,
  ParsedMapEntitiesQuery,
  ParsedNearbyQuery,
  ParsedSourceQuery,
} from "@/lib/data/query-params";
import {
  getCameraBandFocusRadiusMiles,
  getVisibleExplorerEntities,
} from "@/lib/map/entity-transforms";
import { getLayerDefinition } from "@/lib/map/layer-registry";
import type { CaseStudyRecord, EvidenceType, LayerGroup } from "@/types/data";
import type {
  ExplorerCameraBand,
  ExplorerCoverageNote,
  ExplorerEntity,
  ExplorerEntityDetail,
  ExplorerLayerId,
  ExplorerNearbyResponse,
  ExplorerReleaseRecord,
  ExplorerVisibleEntity,
} from "@/types/explorer";
import type { SourceRegistryEntry } from "@/types/sources";

type LayerSourcePreference = "database" | "etl-file" | "mock" | "none";

type DerivedLayerStatus = {
  preferredSource: LayerSourcePreference;
  databaseRows: number;
  etlRows: number;
  note: string;
};

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

type DatabaseEntityFocusOptions = {
  cameraBand: ExplorerCameraBand;
  focusCoordinates: [number, number] | null;
  selectedEntityId: string | null;
};

type ToxinmapRepositoryCache = typeof globalThis & {
  __toxinmapDatabaseEntitiesCache?: Promise<ExplorerEntity[]>;
  __toxinmapDatabaseEntitiesLoadedAt?: number;
  __toxinmapDatabaseDerivedEntitiesCache?: Promise<ExplorerEntity[]>;
  __toxinmapDatabaseDerivedEntitiesLoadedAt?: number;
  __toxinmapMergedEntitiesCache?: Promise<ExplorerEntity[]>;
  __toxinmapMergedEntitiesLoadedAt?: number;
};

type EntityQuery = ParsedEntityQuery;
type CaseStudyQuery = ParsedCaseStudyQuery;
type SourceQuery = ParsedSourceQuery;

const gracefulDatabaseFallback =
  process.env.NODE_ENV !== "production" ||
  process.env.TOXINMAP_ALLOW_DATABASE_FALLBACK === "true";

function getToxinmapRepositoryCache() {
  return globalThis as ToxinmapRepositoryCache;
}

function isDatabaseReady() {
  return Boolean(db);
}

function getRepositoryCacheTtlMs() {
  return 30_000;
}

function getMapEntityFocusOptions(query: ParsedMapEntitiesQuery): DatabaseEntityFocusOptions {
  return {
    cameraBand: query.cameraBand,
    focusCoordinates:
      query.centerLng !== undefined && query.centerLat !== undefined
        ? [query.centerLng, query.centerLat]
        : null,
    selectedEntityId: query.selectedEntityId ?? null,
  };
}

function combineSqlFilters(...filters: Array<ReturnType<typeof sql> | undefined>) {
  const present = filters.filter((filter): filter is ReturnType<typeof sql> => Boolean(filter));
  if (present.length === 0) {
    return undefined;
  }

  if (present.length === 1) {
    return present[0];
  }

  return and(...present);
}

function buildFocusedGeometryPredicate(
  geometrySql: ReturnType<typeof sql>,
  slugSql: ReturnType<typeof sql> | null,
  options?: DatabaseEntityFocusOptions,
) {
  if (
    !options ||
    options.cameraBand === "national" ||
    !options.focusCoordinates ||
    !Number.isFinite(getCameraBandFocusRadiusMiles(options.cameraBand))
  ) {
    return undefined;
  }

  const [centerLng, centerLat] = options.focusCoordinates;
  const radiusMiles = getCameraBandFocusRadiusMiles(options.cameraBand);
  const latDegrees = radiusMiles / 69;
  const cosLat = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2);
  const lonDegrees = radiusMiles / (69 * cosLat);
  const focusEnvelope = sql`ST_MakeEnvelope(${centerLng - lonDegrees}, ${centerLat - latDegrees}, ${centerLng + lonDegrees}, ${centerLat + latDegrees}, 4326)`;
  const withinFocus = sql`(${geometrySql}) && ${focusEnvelope}`;

  if (!options.selectedEntityId || !slugSql) {
    return withinFocus;
  }

  return sql`(${withinFocus} OR ${slugSql} = ${options.selectedEntityId})`;
}

const broadScaleDatabaseLayerLimits: Record<
  Exclude<ExplorerCameraBand, "local">,
  Partial<Record<ExplorerLayerId, number>>
> = {
  national: {
    "industrial-sites": 12_000,
    "legal-markers": 1_500,
    "hazardous-sites": 900,
    "power-plants": 180,
    "pfas-sites": 500,
    "wastewater-sites": 320,
  },
  regional: {
    "industrial-sites": 30_000,
    "legal-markers": 4_000,
    "hazardous-sites": 1_800,
    "power-plants": 300,
    "pfas-sites": 900,
    "wastewater-sites": 520,
  },
};

function getDatabaseBroadScaleLimit(
  layerId: ExplorerLayerId,
  options?: DatabaseEntityFocusOptions,
) {
  if (!options || options.cameraBand === "local" || options.selectedEntityId) {
    return null;
  }

  return broadScaleDatabaseLayerLimits[options.cameraBand]?.[layerId] ?? null;
}

function buildBroadScalePriorityScore(
  sourceIdsSql: ReturnType<typeof sql>,
  evidenceTypeSql: ReturnType<typeof sql>,
  confidenceLevelSql: ReturnType<typeof sql>,
) {
  return sql<number>`
    (
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["usgs-pfas"]'::jsonb THEN 150 ELSE 0 END +
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["atsdr-pfas"]'::jsonb THEN 145 ELSE 0 END +
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["epa-npdes"]'::jsonb THEN 135 ELSE 0 END +
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["usgs-pharma"]'::jsonb THEN 120 ELSE 0 END +
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["epa-sems"]'::jsonb THEN 115 ELSE 0 END +
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["epa-tri"]'::jsonb THEN 110 ELSE 0 END +
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["epa-echo"]'::jsonb THEN 90 ELSE 0 END +
      CASE WHEN coalesce(${sourceIdsSql}, '[]'::jsonb) @> '["epa-frs"]'::jsonb THEN 20 ELSE 0 END +
      CASE
        WHEN ${evidenceTypeSql} = 'direct_measurement' THEN 40
        WHEN ${evidenceTypeSql} = 'screening_signal' THEN 28
        WHEN ${evidenceTypeSql} = 'literature_evidence' THEN 20
        WHEN ${evidenceTypeSql} = 'proxy' THEN 12
        ELSE 0
      END +
      CASE
        WHEN ${confidenceLevelSql} = 'high' THEN 18
        WHEN ${confidenceLevelSql} = 'moderate' THEN 10
        ELSE 0
      END
    )
  `;
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
  if (query.layerId && entity.layerId !== query.layerId) return false;
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

function getPersistentContextYearEnd(year: number | null | undefined) {
  const currentYear = new Date().getUTCFullYear();
  if (typeof year !== "number" || !Number.isFinite(year)) {
    return currentYear;
  }

  return Math.max(year, currentYear);
}

function getPersistentContextYearStart(year: number | null | undefined) {
  const currentYear = new Date().getUTCFullYear();
  const defaultStartYear = currentYear - 1;
  if (typeof year !== "number" || !Number.isFinite(year)) {
    return defaultStartYear;
  }

  return Math.min(year, defaultStartYear);
}

function getPersistentContextDateLabel(
  startYear: number | null | undefined,
  endYear: number | null | undefined,
) {
  const normalizedStart = getPersistentContextYearStart(startYear);
  const normalizedEnd = getPersistentContextYearEnd(endYear ?? startYear);
  return normalizedStart === normalizedEnd
    ? String(normalizedEnd)
    : `${normalizedStart}-${normalizedEnd}`;
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
      implementationRole:
        row.ingestionMethod === "direct-ingest"
          ? "primary-operational"
          : row.ingestionMethod === "derived-from-methodology"
            ? "methodology-reference"
            : row.ingestionMethod === "reference-only"
              ? "reference-benchmark"
              : undefined,
      externalUrl: row.externalUrl,
      sourceUpdatedAt: formatSourceDate(row.sourceUpdatedAt),
    }))
    .filter((source) => {
      if (query.layerGroup && !source.layerGroups.includes(query.layerGroup)) return false;
      return true;
    });
}

async function getDatabaseIndustrialEntities(options?: DatabaseEntityFocusOptions) {
  if (!db) return [];

  const focusPredicate = buildFocusedGeometryPredicate(
    sql`${industrialSites.location}`,
    sql`${industrialSites.slug}`,
    options,
  );
  const broadScaleLimit = getDatabaseBroadScaleLimit("industrial-sites", options);

  const baseQuery = db
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
    .where(combineSqlFilters(sql`${industrialSites.location} IS NOT NULL`, focusPredicate));
  const rows = await (broadScaleLimit
    ? baseQuery
        .orderBy(
          desc(
            buildBroadScalePriorityScore(
              sql`${industrialSites.sourceIds}`,
              sql`${industrialSites.evidenceType}`,
              sql`${industrialSites.confidenceLevel}`,
            ),
          ),
          industrialSites.id,
        )
        .limit(broadScaleLimit)
    : baseQuery);

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

async function getDatabasePowerPlantEntities(options?: DatabaseEntityFocusOptions) {
  if (!db) return [];

  const focusPredicate = buildFocusedGeometryPredicate(
    sql`${powerPlants.location}`,
    sql`${powerPlants.slug}`,
    options,
  );
  const broadScaleLimit = getDatabaseBroadScaleLimit("power-plants", options);

  const baseQuery = db
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
    .where(combineSqlFilters(sql`${powerPlants.location} IS NOT NULL`, focusPredicate));
  const rows = await (broadScaleLimit
    ? baseQuery
        .orderBy(
          desc(
            buildBroadScalePriorityScore(
              sql`${powerPlants.sourceIds}`,
              sql`${powerPlants.evidenceType}`,
              sql`${powerPlants.confidenceLevel}`,
            ),
          ),
          powerPlants.id,
        )
        .limit(broadScaleLimit)
    : baseQuery);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => buildExplorerEntityFromDatabase(row, "power-plants"));
}

async function getDatabaseHazardousEntities(options?: DatabaseEntityFocusOptions) {
  if (!db) return [];

  const focusPredicate = buildFocusedGeometryPredicate(
    sql`ST_Centroid(${hazardousSites.boundary})`,
    sql`${hazardousSites.slug}`,
    options,
  );
  const broadScaleLimit = getDatabaseBroadScaleLimit("hazardous-sites", options);

  const baseQuery = db
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
    .where(combineSqlFilters(sql`${hazardousSites.boundary} IS NOT NULL`, focusPredicate));
  const rows = await (broadScaleLimit
    ? baseQuery
        .orderBy(
          desc(
            buildBroadScalePriorityScore(
              sql`${hazardousSites.sourceIds}`,
              sql`${hazardousSites.evidenceType}`,
              sql`${hazardousSites.confidenceLevel}`,
            ),
          ),
          hazardousSites.id,
        )
        .limit(broadScaleLimit)
    : baseQuery);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => {
      const yearStart = getPersistentContextYearStart(row.yearStart);
      const yearEnd = getPersistentContextYearEnd(row.yearEnd ?? row.yearStart);
      return buildExplorerEntityFromDatabase(
        {
          ...row,
          dateLabel: getPersistentContextDateLabel(yearStart, yearEnd),
          yearStart,
          yearEnd,
        },
        "hazardous-sites",
      );
    });
}

async function getDatabasePfasEntities(options?: DatabaseEntityFocusOptions) {
  if (!db) return [];

  const focusPredicate = buildFocusedGeometryPredicate(
    sql`${pfasSites.location}`,
    sql`${pfasSites.slug}`,
    options,
  );
  const broadScaleLimit = getDatabaseBroadScaleLimit("pfas-sites", options);

  const baseQuery = db
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
    .where(combineSqlFilters(sql`${pfasSites.location} IS NOT NULL`, focusPredicate));
  const rows = await (broadScaleLimit
    ? baseQuery
        .orderBy(
          desc(
            buildBroadScalePriorityScore(
              sql`${pfasSites.sourceIds}`,
              sql`${pfasSites.evidenceType}`,
              sql`${pfasSites.confidenceLevel}`,
            ),
          ),
          pfasSites.id,
        )
        .limit(broadScaleLimit)
    : baseQuery);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) =>
      buildExplorerEntityFromDatabase(
        {
          ...row,
          yearEnd: getPersistentContextYearEnd(row.yearEnd ?? row.yearStart),
        },
        "pfas-sites",
      ),
    );
}

async function getDatabaseWastewaterEntities(options?: DatabaseEntityFocusOptions) {
  if (!db) return [];

  const focusPredicate = buildFocusedGeometryPredicate(
    sql`${wastewaterSites.outfallLocation}`,
    sql`${wastewaterSites.slug}`,
    options,
  );
  const broadScaleLimit = getDatabaseBroadScaleLimit("wastewater-sites", options);

  const baseQuery = db
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
    .where(combineSqlFilters(sql`${wastewaterSites.outfallLocation} IS NOT NULL`, focusPredicate));
  const rows = await (broadScaleLimit
    ? baseQuery
        .orderBy(
          desc(
            buildBroadScalePriorityScore(
              sql`${wastewaterSites.sourceIds}`,
              sql`${wastewaterSites.evidenceType}`,
              sql`${wastewaterSites.confidenceLevel}`,
            ),
          ),
          wastewaterSites.id,
        )
        .limit(broadScaleLimit)
    : baseQuery);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) =>
      buildExplorerEntityFromDatabase(
        {
          ...row,
          yearEnd: getPersistentContextYearEnd(row.yearEnd ?? row.yearStart),
        },
        "wastewater-sites",
      ),
    );
}

async function getDatabaseLegalEntities(options?: DatabaseEntityFocusOptions) {
  if (!db) return [];

  const legalCaseYear = sql<number | null>`
    nullif(
      substring(coalesce(${healthConcernContext.slug}, ${healthConcernContext.title}) from '[0-9]{4}'),
      ''
    )::integer
  `;
  const focusPredicate = buildFocusedGeometryPredicate(
    sql`${industrialSites.location}`,
    sql`${healthConcernContext.slug}`,
    options,
  );
  const broadScaleLimit = getDatabaseBroadScaleLimit("legal-markers", options);

  const baseQuery = db
    .select({
      id: healthConcernContext.id,
      slug: healthConcernContext.slug,
      title: healthConcernContext.title,
      layerGroup: healthConcernContext.layerGroup,
      category: healthConcernContext.category,
      subcategory: healthConcernContext.subcategory,
      summary: healthConcernContext.summary,
      notes: healthConcernContext.notes,
      sourceIds: healthConcernContext.sourceIds,
      sourceName: healthConcernContext.sourceName,
      sourceUrl: healthConcernContext.sourceUrl,
      sourceUpdatedAt: healthConcernContext.sourceUpdatedAt,
      evidenceType: healthConcernContext.evidenceType,
      confidenceLevel: healthConcernContext.confidenceLevel,
      metadata: sql<Record<string, unknown>>`
        jsonb_set(
          jsonb_set(
            coalesce(${industrialSites.metadata}, '{}'::jsonb) || coalesce(${healthConcernContext.metadata}, '{}'::jsonb),
            '{locationLabel}',
            to_jsonb(
              coalesce(
                nullif(${industrialSites.metadata}->>'locationLabel', ''),
                nullif(${industrialSites.metadata}->>'city', ''),
                ${healthConcernContext.metadata}->>'frsId',
                'United States'
              )
            ),
            true
          ),
          '{sourceStats}',
          coalesce(
            ${healthConcernContext.metadata}->'sourceStats',
            '[]'::jsonb
          ),
          true
        )
      `,
      latitude: sql<number | null>`ST_Y(${industrialSites.location})`,
      longitude: sql<number | null>`ST_X(${industrialSites.location})`,
      dateLabel: sql<string | null>`coalesce(${legalCaseYear}::text, ${industrialSites.dateRangeLabel}, ${industrialSites.activeYear}::text, 'Current')`,
      yearStart: sql<number | null>`coalesce(${legalCaseYear}, ${industrialSites.activeYear})`,
      yearEnd: sql<number | null>`coalesce(${legalCaseYear}, ${industrialSites.activeYear})`,
      locationLabel: sql<string>`
        coalesce(
          nullif(${industrialSites.metadata}->>'locationLabel', ''),
          nullif(${industrialSites.metadata}->>'city', ''),
          ${healthConcernContext.metadata}->>'frsId',
          'United States'
        )
      `,
    })
    .from(healthConcernContext)
    .innerJoin(
      industrialSites,
      sql`${industrialSites.slug} = concat('frs-', ${healthConcernContext.metadata}->>'frsId')`,
    )
    .where(
      combineSqlFilters(
        sql`${industrialSites.location} IS NOT NULL`,
        eq(healthConcernContext.layerGroup, "legal"),
        focusPredicate,
      ),
    );
  const rows = await (broadScaleLimit
    ? baseQuery
        .orderBy(
          desc(
            buildBroadScalePriorityScore(
              sql`${healthConcernContext.sourceIds}`,
              sql`${healthConcernContext.evidenceType}`,
              sql`${healthConcernContext.confidenceLevel}`,
            ),
          ),
          desc(legalCaseYear),
          healthConcernContext.id,
        )
        .limit(broadScaleLimit)
    : baseQuery);

  return rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => buildExplorerEntityFromDatabase(row, "legal-markers"));
}

async function getDatabaseSentinelEntities(options?: DatabaseEntityFocusOptions) {
  if (!db) return [];

  const focusPredicate = buildFocusedGeometryPredicate(
    sql`${sentinelSpeciesRecords.location}`,
    sql`${sentinelSpeciesRecords.slug}`,
    options,
  );

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
    .where(combineSqlFilters(sql`${sentinelSpeciesRecords.location} IS NOT NULL`, focusPredicate));

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
    getDatabaseLegalEntities(),
    getDatabaseSentinelEntities(),
  ]);

  return entityCollections.flat();
}

const mapDatabasePrimaryLayerIds = new Set<ExplorerLayerId>([
  "industrial-sites",
  "power-plants",
  "hazardous-sites",
  "pfas-sites",
  "wastewater-sites",
]);

const mapDatabaseDerivedLayerIds = new Set<ExplorerLayerId>([
  "air-toxics-regions",
  "reproductive-regions",
]);
const mapDatabaseMergedLayerIds = new Set<ExplorerLayerId>(["legal-markers"]);
const mapEtlPrimaryLayerIds = new Set<ExplorerLayerId>(["sentinel-species"]);
const mapContextDependencyDatabaseLayerIds: ExplorerLayerId[] = [
  "industrial-sites",
  "power-plants",
  "hazardous-sites",
  "pfas-sites",
  "wastewater-sites",
  "legal-markers",
];

async function getDatabaseEntitiesForMapQuery(
  layerIds: ExplorerLayerId[],
  options: DatabaseEntityFocusOptions,
) {
  const requested = new Set(layerIds);
  const tasks: Array<Promise<ExplorerEntity[]>> = [];

  if (requested.has("industrial-sites")) {
    tasks.push(getDatabaseIndustrialEntities(options));
  }
  if (requested.has("power-plants")) {
    tasks.push(getDatabasePowerPlantEntities(options));
  }
  if (requested.has("hazardous-sites")) {
    tasks.push(getDatabaseHazardousEntities(options));
  }
  if (requested.has("pfas-sites")) {
    tasks.push(getDatabasePfasEntities(options));
  }
  if (requested.has("wastewater-sites")) {
    tasks.push(getDatabaseWastewaterEntities(options));
  }
  if (requested.has("legal-markers")) {
    tasks.push(getDatabaseLegalEntities(options));
  }

  if (tasks.length === 0) {
    return [] as ExplorerEntity[];
  }

  return (await Promise.all(tasks)).flat();
}

async function getDatabaseDerivedContextEntities(layerIds: ExplorerLayerId[]) {
  const requestedDerivedLayerIds = layerIds.filter((layerId) =>
    mapDatabaseDerivedLayerIds.has(layerId),
  );
  if (!requestedDerivedLayerIds.length) {
    return [] as ExplorerEntity[];
  }

  const databaseEntities = await getCachedDatabaseEntities();
  return buildDerivedContextEntitiesFromBaseEntities(databaseEntities, requestedDerivedLayerIds);
}

export async function getDatabaseEntitiesForMapQueryForTesting(
  layerIds: ExplorerLayerId[],
  options: DatabaseEntityFocusOptions,
) {
  return getDatabaseEntitiesForMapQuery(layerIds, options);
}

async function getMapBaseEntities(query: ParsedMapEntitiesQuery) {
  const activeLayerIds = query.layers ?? explorerLayerDefinitions.map((layer) => layer.id);
  const focusOptions = getMapEntityFocusOptions(query);
  const mockFallbackEntities = mockEntities.filter((entity) => activeLayerIds.includes(entity.layerId));
  const requestedDatabaseDerivedLayerIds = activeLayerIds.filter((layerId) =>
    mapDatabaseDerivedLayerIds.has(layerId),
  );
  const requestedContextLayerIds = activeLayerIds.filter((layerId) =>
    mapEtlPrimaryLayerIds.has(layerId),
  );
  const requestedContextSupplementLayerIds: ExplorerLayerId[] = requestedContextLayerIds.length
    ? ["legal-markers"]
    : [];
  const requestedDatabaseLayerIds = activeLayerIds.filter(
    (layerId) => mapDatabasePrimaryLayerIds.has(layerId) || mapDatabaseMergedLayerIds.has(layerId),
  );
  const contextDependencyLayerIds =
    requestedContextLayerIds.length || requestedDatabaseDerivedLayerIds.length
    ? mapContextDependencyDatabaseLayerIds
    : [];
  const requestedFastDatabaseLayerIds = Array.from(
    new Set([...requestedDatabaseLayerIds, ...contextDependencyLayerIds]),
  );
  let databaseEntities: ExplorerEntity[] = [];
  let databaseDerivedEntities: ExplorerEntity[] = [];
  let databaseFastPathReady = false;

    if (requestedFastDatabaseLayerIds.length && isDatabaseReady()) {
      try {
        databaseEntities = await getDatabaseEntitiesForMapQuery(
          requestedFastDatabaseLayerIds,
          focusOptions,
        );
        databaseFastPathReady = true;
      } catch (error) {
        if (!gracefulDatabaseFallback) {
          throw error;
        }

        console.error(
          "Map database fast path fell back to ETL/base context",
          JSON.stringify(
            {
              requestedFastDatabaseLayerIds,
              cameraBand: focusOptions.cameraBand,
              focusCoordinates: focusOptions.focusCoordinates,
              selectedEntityId: focusOptions.selectedEntityId,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
          ),
        );
      }
    }

  let etlEntities: ExplorerEntity[] = [];
  if (databaseFastPathReady) {
    databaseDerivedEntities = requestedDatabaseDerivedLayerIds.length
      ? buildDerivedContextEntitiesFromBaseEntities(
          databaseEntities,
          requestedDatabaseDerivedLayerIds,
        )
      : [];
    const contextSupplementLayerIds = [...new Set<ExplorerLayerId>(requestedContextSupplementLayerIds)];
    const etlLegalSupplementEntities =
      contextSupplementLayerIds.length
      ? await getEtlFileEntitiesForLayers(
          contextSupplementLayerIds,
        )
      : [];
    const contextSourceEntities = [
      ...new Map(
        [...databaseEntities, ...databaseDerivedEntities, ...etlLegalSupplementEntities].map((entity) => [
          entity.id,
          entity,
        ]),
      ).values(),
    ];
    const derivedContextEntities = requestedContextLayerIds.length
      ? buildDerivedContextEntitiesFromBaseEntities(
          contextSourceEntities,
          requestedContextLayerIds,
        )
      : [];
    etlEntities = [...etlLegalSupplementEntities, ...derivedContextEntities];
  } else {
    const requestedEtlLayerIds = activeLayerIds.filter(
      (layerId) =>
        mapEtlPrimaryLayerIds.has(layerId) ||
        mapDatabaseDerivedLayerIds.has(layerId) ||
        mapDatabasePrimaryLayerIds.has(layerId) ||
        mapDatabaseMergedLayerIds.has(layerId),
    );
    etlEntities = requestedEtlLayerIds.length
      ? await getEtlFileEntitiesForLayers(requestedEtlLayerIds)
      : [];
  }

  if (requestedFastDatabaseLayerIds.length === 0 || !databaseFastPathReady) {
    const takenIds = new Set(etlEntities.map((entity) => entity.id));
    const suppressedFallbackLayers = new Set<ExplorerEntity["layerId"]>(
      etlEntities.map((entity) => entity.layerId),
    );
    return [
      ...etlEntities,
      ...mockFallbackEntities.filter(
        (entity) => !takenIds.has(entity.id) && !suppressedFallbackLayers.has(entity.layerId),
      ),
    ];
  }

  const includeDatabaseIds = new Set<ExplorerLayerId>(
    activeLayerIds.filter(
      (layerId) =>
        mapDatabasePrimaryLayerIds.has(layerId) ||
        mapDatabaseMergedLayerIds.has(layerId) ||
        mapDatabaseDerivedLayerIds.has(layerId),
    ),
  );
  const includeEtlIds = new Set<ExplorerLayerId>(
    activeLayerIds.filter(
      (layerId) => mapEtlPrimaryLayerIds.has(layerId) || mapDatabaseMergedLayerIds.has(layerId),
    ),
  );
  const databaseEntitiesToKeep = databaseEntities.filter((entity) => includeDatabaseIds.has(entity.layerId));
  const databaseDerivedEntitiesToKeep = databaseDerivedEntities.filter((entity) =>
    includeDatabaseIds.has(entity.layerId),
  );
  const etlEntitiesToKeep = etlEntities.filter((entity) => {
    if (!includeEtlIds.has(entity.layerId)) {
      return false;
    }

    if (entity.layerId !== "legal-markers") {
      return true;
    }

    return !includeDatabaseIds.has("legal-markers");
  });

  const takenIds = new Set(
    [...databaseEntitiesToKeep, ...databaseDerivedEntitiesToKeep, ...etlEntitiesToKeep].map(
      (entity) => entity.id,
    ),
  );
  const suppressedFallbackLayers = new Set<ExplorerEntity["layerId"]>(
    [...databaseEntitiesToKeep, ...databaseDerivedEntitiesToKeep, ...etlEntitiesToKeep].map(
      (entity) => entity.layerId,
    ),
  );

  return [
    ...databaseEntitiesToKeep,
    ...databaseDerivedEntitiesToKeep,
    ...etlEntitiesToKeep,
    ...mockFallbackEntities.filter(
      (entity) => !takenIds.has(entity.id) && !suppressedFallbackLayers.has(entity.layerId),
    ),
  ];
}

async function getCachedDatabaseEntities() {
  const cache = getToxinmapRepositoryCache();
  const cacheTtlMs = getRepositoryCacheTtlMs();
  const now = Date.now();

  if (
    !cache.__toxinmapDatabaseEntitiesCache ||
    !cache.__toxinmapDatabaseEntitiesLoadedAt ||
    now - cache.__toxinmapDatabaseEntitiesLoadedAt > cacheTtlMs
  ) {
    cache.__toxinmapDatabaseEntitiesCache = withDatabaseFallback(
      async () => getDatabaseEntities(),
      () => [] as ExplorerEntity[],
    );
    cache.__toxinmapDatabaseEntitiesLoadedAt = now;
  }

  return cache.__toxinmapDatabaseEntitiesCache;
}

async function getCachedDatabaseDerivedEntities() {
  const cache = getToxinmapRepositoryCache();
  const cacheTtlMs = getRepositoryCacheTtlMs();
  const now = Date.now();

  if (
    !cache.__toxinmapDatabaseDerivedEntitiesCache ||
    !cache.__toxinmapDatabaseDerivedEntitiesLoadedAt ||
    now - cache.__toxinmapDatabaseDerivedEntitiesLoadedAt > cacheTtlMs
  ) {
    cache.__toxinmapDatabaseDerivedEntitiesCache = withDatabaseFallback(
      async () =>
        getDatabaseDerivedContextEntities([
          "air-toxics-regions",
          "reproductive-regions",
        ]),
      () => [] as ExplorerEntity[],
    );
    cache.__toxinmapDatabaseDerivedEntitiesLoadedAt = now;
  }

  return cache.__toxinmapDatabaseDerivedEntitiesCache;
}

function countEntitiesByLayer(entities: ExplorerEntity[]) {
  return entities.reduce(
    (counts, entity) => {
      counts[entity.layerId] = (counts[entity.layerId] ?? 0) + 1;
      return counts;
    },
    {} as Partial<Record<ExplorerEntity["layerId"], number>>,
  );
}

function getPreferredEntitySourceByLayer(
  databaseEntities: ExplorerEntity[],
  fileEntities: ExplorerEntity[],
) {
  const databaseLayerCounts = countEntitiesByLayer(databaseEntities);
  const fileLayerCounts = countEntitiesByLayer(fileEntities);
  const layerIds = new Set<ExplorerEntity["layerId"]>([
    ...Object.keys(databaseLayerCounts),
    ...Object.keys(fileLayerCounts),
  ] as ExplorerEntity["layerId"][]);

  const preferredByLayer = {} as Partial<
    Record<ExplorerEntity["layerId"], "database" | "etl-file" | "none">
  >;

  for (const layerId of layerIds) {
    const databaseCount = databaseLayerCounts[layerId] ?? 0;
    const fileCount = fileLayerCounts[layerId] ?? 0;

    if (databaseCount > 0 && databaseCount >= fileCount) {
      preferredByLayer[layerId] = "database";
      continue;
    }

    if (fileCount > 0) {
      preferredByLayer[layerId] = "etl-file";
      continue;
    }

    if (databaseCount > 0) {
      preferredByLayer[layerId] = "database";
      continue;
    }

    preferredByLayer[layerId] = "none";
  }

  return preferredByLayer;
}

async function buildMergedEntities() {
  const databaseEntities = await getCachedDatabaseEntities();
  const databaseDerivedEntities = await getCachedDatabaseDerivedEntities();
  const fileEntities = await getEtlFileEntities();
  const preferredByLayer = getPreferredEntitySourceByLayer(
    [...databaseEntities, ...databaseDerivedEntities],
    fileEntities,
  );
  const legalDatabaseEntities = databaseEntities.filter((entity) => entity.layerId === "legal-markers");
  const preferredDatabaseEntities = databaseEntities.filter(
    (entity) => entity.layerId !== "legal-markers" && preferredByLayer[entity.layerId] === "database",
  );
  const preferredDatabaseDerivedEntities = databaseDerivedEntities.filter(
    (entity) => preferredByLayer[entity.layerId] === "database",
  );
  const preferredFileEntities = fileEntities.filter(
    (entity) => entity.layerId !== "legal-markers" && preferredByLayer[entity.layerId] !== "database",
  );
  const preferredLegalEntities =
    preferredByLayer["legal-markers"] === "database"
      ? legalDatabaseEntities
      : fileEntities.filter((entity) => entity.layerId === "legal-markers");
  const takenIds = new Set(
    [
      ...preferredDatabaseEntities,
      ...preferredDatabaseDerivedEntities,
      ...preferredFileEntities,
      ...preferredLegalEntities,
    ].map(
      (entity) => entity.id,
    ),
  );
  const suppressedFallbackLayers = new Set<ExplorerEntity["layerId"]>(
    Object.entries(preferredByLayer)
      .filter(([, source]) => source !== "none")
      .map(([layerId]) => layerId as ExplorerEntity["layerId"]),
  );

  const fallbackEntities = mockEntities.filter(
    (entity) => !takenIds.has(entity.id) && !suppressedFallbackLayers.has(entity.layerId),
  );
  return [
    ...preferredDatabaseEntities,
    ...preferredDatabaseDerivedEntities,
    ...preferredLegalEntities,
    ...preferredFileEntities,
    ...fallbackEntities,
  ];
}

function hasEntityQueryFilters(query: EntityQuery = {}) {
  return Boolean(
    query.layerGroup ||
      query.layerId ||
      query.evidenceType ||
      query.category ||
      query.sourceId ||
      query.relatedCaseStudyId ||
      query.year ||
      query.limit,
  );
}

async function getMergedEntities(query: EntityQuery = {}) {
  const cache = getToxinmapRepositoryCache();
  const mergedEntityCacheTtlMs = getRepositoryCacheTtlMs();
  const now = Date.now();

  if (
    !cache.__toxinmapMergedEntitiesCache ||
    !cache.__toxinmapMergedEntitiesLoadedAt ||
    now - cache.__toxinmapMergedEntitiesLoadedAt > mergedEntityCacheTtlMs
  ) {
    cache.__toxinmapMergedEntitiesCache = buildMergedEntities();
    cache.__toxinmapMergedEntitiesLoadedAt = now;
  }

  const merged = await cache.__toxinmapMergedEntitiesCache;

  if (!hasEntityQueryFilters(query)) {
    return merged;
  }

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
  const entities = await getMergedEntities(query);
  return query.limit ? entities.slice(0, query.limit) : entities;
}

export async function getVisibleMapEntities(
  query: ParsedMapEntitiesQuery,
): Promise<ExplorerVisibleEntity[]> {
  const entities = await getMapBaseEntities(query);

  return getVisibleExplorerEntities(entities, {
    activeGroups: query.groups ?? ["official", "emerging", "legal"],
    activeLayerIds: query.layers ?? explorerLayerDefinitions.map((layer) => layer.id),
    activeYear: query.year ?? new Date().getFullYear(),
    activeFilterChips: query.chips ?? [],
    cameraBand: query.cameraBand,
    focusCoordinates:
      query.centerLng !== undefined && query.centerLat !== undefined
        ? [query.centerLng, query.centerLat]
        : null,
    selectedEntityId: query.selectedEntityId ?? null,
  });
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
      async () => getEtlFileIndustrialReleaseRecords(id),
    ),
    withDatabaseFallback(async () => getGeographyContextSignals(), () => [] as string[]),
  ]);

  const databaseBackedIds = new Set(
    [...(await getCachedDatabaseEntities()), ...(await getCachedDatabaseDerivedEntities())].map(
      (record) => record.id,
    ),
  );
  const etlFileBackedIds = new Set((await getEtlFileEntities()).map((record) => record.id));

  return {
    ...entity,
    legalHistoricalContext: Array.from(
      new Set([...entity.legalHistoricalContext, ...contextSignals]),
    ),
    sources,
    relatedCaseStudies,
    releaseRecords,
    backend: databaseBackedIds.has(entity.id)
      ? "database"
      : etlFileBackedIds.has(entity.id)
        ? "etl-file"
        : "mock",
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

const nearbySourceSpecificityBonus: Partial<Record<string, number>> = {
  "usgs-pfas": 55,
  "atsdr-pfas": 50,
  "epa-npdes": 48,
  "usgs-pharma": 44,
  "epa-sems": 38,
  "epa-tri": 34,
  "epa-echo": 24,
  "epa-frs": 10,
};

const nearbyThemeLabels: Record<ExplorerEntity["tags"][number], string> = {
  downstream: "Downstream pathway pressure",
  "drinking-water": "Drinking-water relevance",
  "community-pressure": "Community pressure",
  "wildlife-anomaly": "Wildlife anomaly context",
  "fertility-context": "Fertility and reproductive context",
  litigation: "Litigation and enforcement pressure",
};

const nearbySystemDefinitions = [
  {
    id: "industrial-pressure",
    label: "Industrial release footprint",
    description: "Facilities and source zones that anchor nearby industrial toxic pressure.",
    matches: (entity: ExplorerEntity) =>
      entity.layerId === "industrial-sites" || entity.layerId === "air-toxics-regions",
  },
  {
    id: "regulatory-pressure",
    label: "Regulatory and legal pressure",
    description: "Federal enforcement, compliance, and historical pressure markers near this area.",
    matches: (entity: ExplorerEntity) =>
      entity.layerId === "legal-markers" || entity.tags.includes("litigation"),
  },
  {
    id: "wastewater-pathway",
    label: "Wastewater and downstream pathway",
    description: "Permits, outfalls, and wastewater-linked transport signals that matter downstream.",
    matches: (entity: ExplorerEntity) =>
      entity.layerId === "wastewater-sites" ||
      entity.signalFamilies.includes("wastewater") ||
      entity.chemicalMarkers.includes("wastewater-indicators"),
  },
  {
    id: "pfas-system",
    label: "PFAS investigation and sampling",
    description: "PFAS site investigations and sampling-backed drinking-water relevance.",
    matches: (entity: ExplorerEntity) =>
      entity.layerId === "pfas-sites" ||
      entity.signalFamilies.includes("pfas") ||
      entity.chemicalMarkers.includes("pfas"),
  },
  {
    id: "direct-sampling",
    label: "Direct sampling evidence",
    description: "Nearby records that come from direct monitoring or site sampling rather than only proxies.",
    matches: (entity: ExplorerEntity) => entity.evidenceType === "Direct Measurement",
  },
  {
    id: "hazard-legacy",
    label: "Legacy hazard and cleanup",
    description: "Hazard, remediation, and long-tail industrial legacy context around the area.",
    matches: (entity: ExplorerEntity) =>
      entity.layerId === "hazardous-sites" ||
      entity.signalFamilies.includes("legacy-hazard"),
  },
] as const;

function getNearbyLayerSpecificityBonus(entity: ExplorerEntity) {
  if (entity.layerId === "pfas-sites") {
    return entity.evidenceType === "Direct Measurement" ? 54 : 46;
  }

  if (entity.layerId === "wastewater-sites") {
    return entity.sourceIds.includes("epa-npdes") ? 48 : 42;
  }

  if (entity.layerId === "hazardous-sites") {
    return entity.sourceIds.includes("epa-sems") ? 34 : 22;
  }

  if (entity.layerId === "legal-markers") {
    return entity.sourceIds.includes("epa-echo") ? 28 : 18;
  }

  if (entity.layerId === "industrial-sites") {
    return entity.sourceIds.includes("epa-tri") ? 22 : 4;
  }

  if (entity.layerId === "power-plants") {
    return 10;
  }

  if (entity.layerId === "air-toxics-regions") {
    return 6;
  }

  return 0;
}

function getNearbySourceSpecificityBonus(entity: ExplorerEntity) {
  const total = entity.sourceIds.reduce(
    (sum, sourceId) => sum + (nearbySourceSpecificityBonus[sourceId] ?? 0),
    0,
  );

  return Math.min(total, 90);
}

function getNearbyDetailBonus(entity: ExplorerEntity) {
  let bonus = 0;

  if (entity.chemicalHighlights.length > 0) {
    bonus += 10;
  }

  if (entity.chemicalMarkers.length >= 2) {
    bonus += 6;
  }

  if ((entity.sourceStats?.length ?? 0) >= 3) {
    bonus += 8;
  }

  if (entity.officialSignals.length >= 2) {
    bonus += 6;
  }

  return bonus;
}

function getNearbyProxyPenalty(entity: ExplorerEntity) {
  if (entity.evidenceType !== "Proxy") {
    return 0;
  }

  if (entity.layerId === "industrial-sites" && !entity.sourceIds.includes("epa-tri")) {
    return 26;
  }

  if (entity.layerId === "power-plants") {
    return 18;
  }

  if (entity.layerId === "air-toxics-regions") {
    return 16;
  }

  return 8;
}

function getNearbyPriorityScore(
  entity: ExplorerEntity,
  distanceMiles: number,
  radiusMiles: number,
) {
  const normalizedDistance = Math.min(distanceMiles / Math.max(radiusMiles, 1), 1);
  const specificityBonus =
    getNearbyLayerSpecificityBonus(entity) +
    getNearbySourceSpecificityBonus(entity) +
    getNearbyDetailBonus(entity);
  const proxyPenalty = getNearbyProxyPenalty(entity);

  return (
    nearbyEvidencePriority[entity.evidenceType] * 140 +
    nearbyConfidencePriority[entity.confidenceLevel] * 30 +
    nearbyLayerGroupPriority[entity.layerGroup] * 18 +
    normalizedDistance * 18 +
    proxyPenalty -
    specificityBonus
  );
}

function getNearbyRankingReason(entity: ExplorerEntity, distanceMiles: number) {
  const roundedDistance = Math.max(1, Math.round(distanceMiles));
  const sourceLabel =
    entity.sourceIds.includes("usgs-pfas")
      ? "USGS PFAS sampling"
      : entity.sourceIds.includes("atsdr-pfas")
        ? "ATSDR PFAS site"
        : entity.sourceIds.includes("epa-npdes")
          ? "NPDES wastewater record"
          : entity.sourceIds.includes("usgs-pharma")
            ? "USGS pharmaceutical sampling"
            : entity.sourceIds.includes("epa-sems")
              ? "EPA cleanup-linked hazard record"
              : entity.sourceIds.includes("epa-tri")
                ? "TRI-linked release record"
                : entity.sourceIds.includes("epa-echo")
                  ? "ECHO regulatory record"
                  : "Mapped toxin record";

  if (entity.sourceIds.includes("usgs-pfas")) {
    return `${sourceLabel} within ${roundedDistance} miles with ${entity.confidenceLevel.toLowerCase()} confidence direct sampling context.`;
  }

  if (entity.sourceIds.includes("atsdr-pfas")) {
    return `${sourceLabel} within ${roundedDistance} miles with documented investigation context and ${entity.confidenceLevel.toLowerCase()} confidence.`;
  }

  if (entity.sourceIds.includes("epa-npdes")) {
    return `${sourceLabel} within ${roundedDistance} miles with permit and downstream pathway context.`;
  }

  if (entity.sourceIds.includes("usgs-pharma")) {
    return `${sourceLabel} within ${roundedDistance} miles with direct detection context for wastewater-linked compounds.`;
  }

  if (entity.sourceIds.includes("epa-sems")) {
    return `${sourceLabel} within ${roundedDistance} miles with cleanup-program lineage and legacy hazard context.`;
  }

  if (entity.sourceIds.includes("epa-tri")) {
    return `${sourceLabel} within ${roundedDistance} miles with reported industrial release context.`;
  }

  if (entity.sourceIds.includes("epa-echo") && entity.layerId === "legal-markers") {
    return `${sourceLabel} within ${roundedDistance} miles with active compliance and enforcement context.`;
  }

  if (entity.evidenceType === "Direct Measurement") {
    return `${sourceLabel} within ${roundedDistance} miles with ${entity.confidenceLevel.toLowerCase()} confidence direct evidence.`;
  }

  if (entity.evidenceType === "Screening Signal") {
    return `${sourceLabel} within ${roundedDistance} miles with screening-level prioritization context.`;
  }

  if (entity.evidenceType === "Proxy") {
    return `${sourceLabel} within ${roundedDistance} miles with official pathway and facility context.`;
  }

  if (entity.evidenceType === "Literature Evidence") {
    return `${sourceLabel} within ${roundedDistance} miles with literature-backed concern context.`;
  }

  return `${sourceLabel} within ${roundedDistance} miles with documented public-interest warning context.`;
}

function buildNearbySummaryLines(
  systemCounts: Array<{ id: string; label: string; description: string; count: number }>,
  themeCounts: Array<{ theme: ExplorerEntity["tags"][number]; label: string; count: number }>,
  evidenceCounts: Array<{ evidenceType: ExplorerEntity["evidenceType"]; count: number }>,
  sourceCounts: Array<{ sourceId: string; label: string; count: number }>,
  signalFamilyCounts: Array<{ id: string; label: string; count: number }>,
  chemicalMarkerCounts: Array<{ id: ExplorerEntity["chemicalMarkers"][number]; label: string; count: number }>,
  chemicalHighlightCounts: Array<{ label: ExplorerEntity["chemicalHighlights"][number]; count: number }>,
) {
  const lines: string[] = [];
  const topSystem = systemCounts[0];
  const industrialSystem = systemCounts.find((entry) => entry.id === "industrial-pressure");
  const regulatorySystem = systemCounts.find((entry) => entry.id === "regulatory-pressure");
  const wastewaterSystem = systemCounts.find((entry) => entry.id === "wastewater-pathway");
  const pfasSystem = systemCounts.find((entry) => entry.id === "pfas-system");
  const directSamplingSystem = systemCounts.find((entry) => entry.id === "direct-sampling");
  const topTheme = themeCounts[0];
  const topEvidence = evidenceCounts[0];
  const topSource = sourceCounts[0];
  const topSignalFamily = signalFamilyCounts[0];
  const topChemicalMarker = chemicalMarkerCounts[0];
  const topChemicalHighlight = chemicalHighlightCounts[0];

  if (industrialSystem && regulatorySystem) {
    const overlapCount = Math.min(industrialSystem.count, regulatorySystem.count);
    if (overlapCount > 0) {
      lines.push(
        "Industrial facilities and regulatory pressure overlap in this radius, so the nearby story is not just infrastructure but also active public-interest oversight.",
      );
    }
  }

  if (wastewaterSystem && pfasSystem) {
    const overlapCount = Math.min(wastewaterSystem.count, pfasSystem.count);
    if (overlapCount > 0) {
      lines.push(
        "Wastewater pathway signals and PFAS investigations appear together here, which raises the importance of downstream and drinking-water context in this view.",
      );
    }
  }

  if (directSamplingSystem?.count) {
    if (topEvidence?.evidenceType === "Direct Measurement") {
      lines.push("Direct sampling records are materially present here, so this radius is not relying only on proxy infrastructure and screening signals.");
    } else {
      lines.push("Direct sampling exists in this radius, but proxy and regulatory records still dominate the visible story.");
    }
  }

  if (topSystem) {
    lines.push(`${topSystem.label} is the dominant nearby toxin system in the current radius.`);
  }

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

function isOfficialPfasEntity(entity: ExplorerEntity) {
  return (
    entity.layerId === "pfas-sites" &&
    entity.sourceIds.some((sourceId) => sourceId === "usgs-pfas" || sourceId === "atsdr-pfas")
  );
}

function isGenxHighlightedEntity(entity: ExplorerEntity) {
  const genxPattern = /\bgenx\b/i;
  return (
    entity.chemicalHighlights.some((highlight) => genxPattern.test(highlight)) ||
    entity.officialSignals.some((signal) => genxPattern.test(signal)) ||
    entity.sourceStats?.some((entry) => genxPattern.test(entry.label)) === true
  );
}

function isCapeFearChemoursFacility(entity: ExplorerEntity) {
  if (entity.layerId !== "industrial-sites") {
    return false;
  }

  const title = entity.title.toLowerCase();
  const location = entity.locationLabel.toLowerCase();
  return (
    location.includes("fayetteville, nc") &&
    (title.includes("chemours") ||
      title.includes("dupont fayetteville") ||
      title.includes("fayetteville works"))
  );
}

function formatCoverageDistance(distanceMiles: number) {
  return `${distanceMiles.toFixed(1)} miles`;
}

function buildNearbyCoverageNotes(
  entities: ExplorerEntity[],
  center: [number, number],
  query: ParsedNearbyQuery,
): ExplorerCoverageNote[] {
  const chemoursFacilityCandidates = entities
    .filter(isCapeFearChemoursFacility)
    .map((entity) => ({
      entity,
      distanceMiles: getDistanceMiles(center, entity.coordinates),
    }))
    .filter((entry) => entry.distanceMiles <= Math.max(query.radiusMiles, 75))
    .sort((left, right) => left.distanceMiles - right.distanceMiles);

  const chemoursFacility = chemoursFacilityCandidates[0]?.entity;
  if (!chemoursFacility) {
    return [];
  }

  const officialPfasCandidates = entities
    .filter(isOfficialPfasEntity)
    .map((entity) => ({
      entity,
      distanceFromFocusMiles: getDistanceMiles(center, entity.coordinates),
      distanceFromChemoursMiles: getDistanceMiles(chemoursFacility.coordinates, entity.coordinates),
    }))
    .sort(
      (left, right) =>
        left.distanceFromChemoursMiles - right.distanceFromChemoursMiles ||
        left.distanceFromFocusMiles - right.distanceFromFocusMiles,
    );

  const nearestOfficialPfas = officialPfasCandidates[0];
  const nearestOfficialGenx = officialPfasCandidates.find((candidate) =>
    isGenxHighlightedEntity(candidate.entity),
  );

  if (!nearestOfficialPfas) {
    return [
      {
        id: "chemours-pfas-coverage-gap",
        title: "Chemours PFAS coverage is limited",
        body: `This focus includes ${chemoursFacility.title}, but the current official PFAS inputs do not include a geocoded PFAS sample or documented-site row near that facility. The nearby PFAS story here should be read as source-coverage-limited rather than PFAS-free.`,
      },
    ];
  }

  const genxSegment = nearestOfficialGenx
    ? ` The nearest loaded official GenX-bearing sample is ${nearestOfficialGenx.entity.title}, ${formatCoverageDistance(nearestOfficialGenx.distanceFromChemoursMiles)} from that facility.`
    : " No loaded official GenX-bearing PFAS sample is currently present near that facility in the official source set.";

  return [
    {
      id: "chemours-pfas-coverage-gap",
      title: "Chemours PFAS coverage is limited",
      body: `This focus includes ${chemoursFacility.title}, but the nearest loaded official PFAS record to that facility is ${nearestOfficialPfas.entity.title}, ${formatCoverageDistance(nearestOfficialPfas.distanceFromChemoursMiles)} away.${genxSegment} Current official PFAS inputs do not include a closer geocoded Chemours-edge sample/site here.`,
    },
  ];
}

export async function getNearbyEntities(
  query: ParsedNearbyQuery & { label?: string },
): Promise<ExplorerNearbyResponse> {
  const entities = await getMergedEntities();
  const center: [number, number] = [query.lng, query.lat];
  const nearbyCandidates = entities.filter((entity) => entityMatchesNearbyQuery(entity, query));

  const nearbyResults = nearbyCandidates
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

  const systemCounts = nearbySystemDefinitions
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      count: nearbyResults.filter((result) => definition.matches(result.entity)).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

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
    systemCounts,
    themeCounts,
    evidenceCounts,
    sourceCounts,
    signalFamilyCounts,
    chemicalMarkerCounts,
    chemicalHighlightCounts,
  );
  const coverageNotes = buildNearbyCoverageNotes(nearbyCandidates, center, query);

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
    systemCounts,
    signalFamilyCounts,
    chemicalMarkerCounts,
    chemicalHighlightCounts,
    themeCounts,
    coverageNotes,
    summaryLines,
    headlineResults: nearbyResults.slice(0, 3),
    results: nearbyResults.slice(0, 10),
  };
}

export async function getLayerSummaries() {
  const entities = await getMergedEntities();
  const repositoryHealth = await getRepositoryHealth();
  const preferredSourceByLayerId: Partial<Record<ExplorerLayerId, LayerSourcePreference>> = {
    "industrial-sites": repositoryHealth.preferredCoreLayerSource.industrialSites,
    "pfas-sites": repositoryHealth.preferredCoreLayerSource.pfasSites,
    "wastewater-sites": repositoryHealth.preferredCoreLayerSource.wastewaterSites,
    "power-plants": repositoryHealth.preferredSupplementalLayerSource.powerPlants,
    "hazardous-sites": repositoryHealth.preferredSupplementalLayerSource.hazardousSites,
    "legal-markers": repositoryHealth.preferredMergedLayerSource.legalMarkers,
    "air-toxics-regions": repositoryHealth.preferredDerivedLayerSource.airToxicsRegions,
    "reproductive-regions": repositoryHealth.preferredDerivedLayerSource.reproductiveRegions,
    "sentinel-species": repositoryHealth.preferredDerivedLayerSource.sentinelSpecies,
  };
  const sourceTruthNoteByLayerId: Partial<Record<ExplorerLayerId, string>> = {
    "air-toxics-regions": repositoryHealth.derivedLayerStatus.airToxicsRegions.note,
    "reproductive-regions": repositoryHealth.derivedLayerStatus.reproductiveRegions.note,
    "sentinel-species": repositoryHealth.derivedLayerStatus.sentinelSpecies.note,
  };

  return explorerLayerDefinitions.map((layer) => {
    const layerEntities = entities.filter((entity) => entity.layerId === layer.id);
    let minYear = Number.POSITIVE_INFINITY;
    let maxYear = Number.NEGATIVE_INFINITY;

    for (const entity of layerEntities) {
      minYear = Math.min(minYear, entity.yearStart);
      maxYear = Math.max(maxYear, entity.yearEnd);
    }

    return {
      ...layer,
      entityCount: layerEntities.length,
      sourceIds: [...new Set(layerEntities.flatMap((entity) => entity.sourceIds))],
      preferredSource: preferredSourceByLayerId[layer.id] ?? "mock",
      sourceTruthNote: sourceTruthNoteByLayerId[layer.id] ?? null,
      coverageRange:
        layerEntities.length && Number.isFinite(minYear) && Number.isFinite(maxYear)
          ? `${minYear}-${maxYear}`
          : "N/A",
    };
  });
}

export async function getRepositoryHealth() {
  const etlFileEntities = await getEtlFileEntities();
  const databaseDerivedEntities = await getCachedDatabaseDerivedEntities();
  const etlLayerCounts = countEntitiesByLayer(etlFileEntities);
  const databaseDerivedLayerCounts = countEntitiesByLayer(databaseDerivedEntities);
  const databaseCoreCounts = isDatabaseReady()
    ? await withDatabaseFallback(
        async () => {
          const [
            [{ industrialCount }],
            [{ toxicReleaseCount }],
            [{ pfasCount }],
            [{ wastewaterCount }],
            [{ powerPlantCount }],
            [{ hazardousSiteCount }],
            [{ legalMarkerCount }],
            [{ sentinelSpeciesCount }],
            [{ sourceCount }],
          ] = await Promise.all([
            db!
              .select({ industrialCount: count() })
              .from(industrialSites)
              .where(sql`${industrialSites.location} IS NOT NULL`),
            db!.select({ toxicReleaseCount: count() }).from(toxicReleaseRecords),
            db!
              .select({ pfasCount: count() })
              .from(pfasSites)
              .where(sql`${pfasSites.location} IS NOT NULL`),
            db!
              .select({ wastewaterCount: count() })
              .from(wastewaterSites)
              .where(sql`${wastewaterSites.outfallLocation} IS NOT NULL`),
            db!
              .select({ powerPlantCount: count() })
              .from(powerPlants)
              .where(sql`${powerPlants.location} IS NOT NULL`),
            db!
              .select({ hazardousSiteCount: count() })
              .from(hazardousSites)
              .where(sql`${hazardousSites.boundary} IS NOT NULL`),
            db!.select({ legalMarkerCount: count() }).from(healthConcernContext),
            db!
              .select({ sentinelSpeciesCount: count() })
              .from(sentinelSpeciesRecords)
              .where(sql`${sentinelSpeciesRecords.location} IS NOT NULL`),
            db!.select({ sourceCount: count() }).from(sourceRegistry),
          ]);

          return {
            industrialSites: Number(industrialCount ?? 0),
            toxicReleaseRecords: Number(toxicReleaseCount ?? 0),
            pfasSites: Number(pfasCount ?? 0),
            wastewaterSites: Number(wastewaterCount ?? 0),
            powerPlants: Number(powerPlantCount ?? 0),
            hazardousSites: Number(hazardousSiteCount ?? 0),
            legalMarkers: Number(legalMarkerCount ?? 0),
            sentinelSpecies: Number(sentinelSpeciesCount ?? 0),
            sourceRegistry: Number(sourceCount ?? 0),
          };
        },
        async () => ({
          industrialSites: 0,
          toxicReleaseRecords: 0,
          pfasSites: 0,
          wastewaterSites: 0,
          powerPlants: 0,
          hazardousSites: 0,
          legalMarkers: 0,
          sentinelSpecies: 0,
          sourceRegistry: 0,
        }),
      )
    : {
        industrialSites: 0,
        toxicReleaseRecords: 0,
        pfasSites: 0,
        wastewaterSites: 0,
        powerPlants: 0,
        hazardousSites: 0,
        legalMarkers: 0,
        sentinelSpecies: 0,
        sourceRegistry: 0,
      };

  const preferredCoreLayerSource = {
    industrialSites:
      databaseCoreCounts.industrialSites > 0 &&
      databaseCoreCounts.industrialSites >= (etlLayerCounts["industrial-sites"] ?? 0)
        ? "database"
        : (etlLayerCounts["industrial-sites"] ?? 0) > 0
          ? "etl-file"
          : "none",
    pfasSites:
      databaseCoreCounts.pfasSites > 0 &&
      databaseCoreCounts.pfasSites >= (etlLayerCounts["pfas-sites"] ?? 0)
        ? "database"
        : (etlLayerCounts["pfas-sites"] ?? 0) > 0
          ? "etl-file"
          : "none",
    wastewaterSites:
      databaseCoreCounts.wastewaterSites > 0 &&
      databaseCoreCounts.wastewaterSites >= (etlLayerCounts["wastewater-sites"] ?? 0)
        ? "database"
        : (etlLayerCounts["wastewater-sites"] ?? 0) > 0
          ? "etl-file"
          : "none",
  } as const;

  const preferredSupplementalLayerSource = {
    powerPlants:
      databaseCoreCounts.powerPlants > 0 &&
      databaseCoreCounts.powerPlants >= (etlLayerCounts["power-plants"] ?? 0)
        ? "database"
        : (etlLayerCounts["power-plants"] ?? 0) > 0
          ? "etl-file"
          : "none",
    hazardousSites:
      databaseCoreCounts.hazardousSites > 0 &&
      databaseCoreCounts.hazardousSites >= (etlLayerCounts["hazardous-sites"] ?? 0)
        ? "database"
        : (etlLayerCounts["hazardous-sites"] ?? 0) > 0
          ? "etl-file"
          : "none",
  } as const;

  const preferredMergedLayerSource = {
    legalMarkers:
      databaseCoreCounts.legalMarkers > 0 &&
      databaseCoreCounts.legalMarkers >= (etlLayerCounts["legal-markers"] ?? 0)
        ? "database"
        : (etlLayerCounts["legal-markers"] ?? 0) > 0
          ? "etl-file"
          : "none",
  } as const;

  const derivedLayerStatus: Record<
    "airToxicsRegions" | "reproductiveRegions" | "sentinelSpecies",
    DerivedLayerStatus
  > = {
    airToxicsRegions: {
      preferredSource:
        (databaseDerivedLayerCounts["air-toxics-regions"] ?? 0) > 0
          ? "database"
          : (etlLayerCounts["air-toxics-regions"] ?? 0) > 0
            ? "etl-file"
            : "none",
      databaseRows: databaseDerivedLayerCounts["air-toxics-regions"] ?? 0,
      etlRows: etlLayerCounts["air-toxics-regions"] ?? 0,
      note:
        (databaseDerivedLayerCounts["air-toxics-regions"] ?? 0) > 0
          ? "Air-toxics regions are now synthesized from DB-backed industrial, power, hazardous, and legal context instead of relying on ETL-only regional overlays."
          : "No dedicated DB-backed air-toxics region table or modeled-region synthesis path exists yet, so this layer remains ETL-backed.",
    },
    reproductiveRegions: {
      preferredSource:
        (databaseDerivedLayerCounts["reproductive-regions"] ?? 0) > 0
          ? "database"
          : (etlLayerCounts["reproductive-regions"] ?? 0) > 0
            ? "etl-file"
            : "none",
      databaseRows: databaseDerivedLayerCounts["reproductive-regions"] ?? 0,
      etlRows: etlLayerCounts["reproductive-regions"] ?? 0,
      note:
        (databaseDerivedLayerCounts["reproductive-regions"] ?? 0) > 0
          ? "Reproductive regions are now synthesized from DB-backed PFAS, wastewater, industrial, hazardous, legal, and air-toxics context instead of relying on ETL-only regional overlays."
          : "Reproductive regions are still derived from ETL-backed environmental context; the repo does not yet have a DB-backed regional reproductive synthesis path.",
    },
    sentinelSpecies: {
      preferredSource:
        (etlLayerCounts["sentinel-species"] ?? 0) > 0
          ? "etl-file"
          : "none",
      databaseRows: 0,
      etlRows: etlLayerCounts["sentinel-species"] ?? 0,
      note:
        "Wildlife sentinel visibility remains ETL-backed because the current DB-backed contamination-system inputs still do not yield atlas-ready ecological-warning regions, and the sentinel_species_records table has no geocoded rows.",
    },
  };

  const preferredDerivedLayerSource = {
    airToxicsRegions: derivedLayerStatus.airToxicsRegions.preferredSource,
    reproductiveRegions: derivedLayerStatus.reproductiveRegions.preferredSource,
    sentinelSpecies: derivedLayerStatus.sentinelSpecies.preferredSource,
  } as const;

  return {
    databaseConfigured: isDatabaseReady(),
    etlFileEntityCount: etlFileEntities.length,
    sourceRegistrySeeded: databaseCoreCounts.sourceRegistry > 0,
    databaseCoreCounts,
    etlLayerCounts: {
      industrialSites: etlLayerCounts["industrial-sites"] ?? 0,
      pfasSites: etlLayerCounts["pfas-sites"] ?? 0,
      wastewaterSites: etlLayerCounts["wastewater-sites"] ?? 0,
      powerPlants: etlLayerCounts["power-plants"] ?? 0,
      hazardousSites: etlLayerCounts["hazardous-sites"] ?? 0,
      legalMarkers: etlLayerCounts["legal-markers"] ?? 0,
      airToxicsRegions: etlLayerCounts["air-toxics-regions"] ?? 0,
      reproductiveRegions: etlLayerCounts["reproductive-regions"] ?? 0,
      sentinelSpecies: etlLayerCounts["sentinel-species"] ?? 0,
    },
    preferredCoreLayerSource,
    preferredSupplementalLayerSource,
    preferredMergedLayerSource,
    preferredDerivedLayerSource,
    derivedLayerStatus,
  };
}
