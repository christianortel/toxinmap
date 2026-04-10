import type { InferInsertModel } from "drizzle-orm";
import { sourceRegistry } from "@/db/schema";
import type {
  ConfidenceLevel,
  EvidenceType,
  GeographicLevel,
  LayerGroup,
} from "@/types/data";
import type {
  ExplorerChemicalHighlight,
  ExplorerChemicalMarker,
  ExplorerEntity,
  ExplorerEntitySourceStat,
  ExplorerFilterChip,
  ExplorerSignalFamily,
} from "@/types/explorer";
import type {
  SourceLifecycle,
  SourceProgramTier,
  SourceRegistryEntry,
  SourceType,
} from "@/types/sources";

const evidenceTypeToDatabaseMap: Record<EvidenceType, string> = {
  "Direct Measurement": "direct_measurement",
  Proxy: "proxy",
  "Screening Signal": "screening_signal",
  "Literature Evidence": "literature_evidence",
  "Editorial Case Study": "editorial_case_study",
};

const evidenceTypeFromDatabaseMap = Object.fromEntries(
  Object.entries(evidenceTypeToDatabaseMap).map(([label, key]) => [key, label]),
) as Record<string, EvidenceType>;

const confidenceToDatabaseMap: Record<ConfidenceLevel, string> = {
  Low: "low",
  Moderate: "moderate",
  High: "high",
};

const confidenceFromDatabaseMap = Object.fromEntries(
  Object.entries(confidenceToDatabaseMap).map(([label, key]) => [key, label]),
) as Record<string, ConfidenceLevel>;

const sourceTypeToDatabaseMap: Record<SourceType, string> = {
  "Federal Registry": "federal_registry",
  "Federal Research": "federal_research",
  "Academic Literature": "academic_literature",
  Journalism: "journalism",
  "Global Statistical": "global_statistical",
  "Global Infrastructure": "global_infrastructure",
  "Hydrology Framework": "hydrology_framework",
};

const sourceTypeFromDatabaseMap = Object.fromEntries(
  Object.entries(sourceTypeToDatabaseMap).map(([label, key]) => [key, label]),
) as Record<string, SourceType>;

const sourceLifecycleToDatabaseMap: Record<SourceLifecycle, string> = {
  "active-mock": "active_mock",
  planned: "planned",
};

const sourceLifecycleFromDatabaseMap = Object.fromEntries(
  Object.entries(sourceLifecycleToDatabaseMap).map(([label, key]) => [key, label]),
) as Record<string, SourceLifecycle>;

const programTierToDatabaseMap: Record<SourceProgramTier, string> = {
  "US V1 Core": "us_v1_core",
  "Global / V2 Planned": "global_v2_planned",
  "Literature / Editorial": "literature_editorial",
};

const programTierFromDatabaseMap = Object.fromEntries(
  Object.entries(programTierToDatabaseMap).map(([label, key]) => [key, label]),
) as Record<string, SourceProgramTier>;

const geographicLevelToDatabaseMap: Record<GeographicLevel, string> = {
  facility: "facility",
  site: "site",
  watershed: "watershed",
  county: "county",
  state: "state",
  regional: "regional",
  national: "national",
  global: "global",
  "literature-cluster": "literature_cluster",
};

const geographicLevelFromDatabaseMap = Object.fromEntries(
  Object.entries(geographicLevelToDatabaseMap).map(([label, key]) => [key, label]),
) as Record<string, GeographicLevel>;

export function toDatabaseEvidenceType(value: EvidenceType) {
  return evidenceTypeToDatabaseMap[value];
}

export function fromDatabaseEvidenceType(value: string | null | undefined): EvidenceType {
  return evidenceTypeFromDatabaseMap[value ?? ""] ?? "Proxy";
}

export function toDatabaseConfidence(value: ConfidenceLevel) {
  return confidenceToDatabaseMap[value];
}

export function fromDatabaseConfidence(value: string | null | undefined): ConfidenceLevel {
  return confidenceFromDatabaseMap[value ?? ""] ?? "Moderate";
}

export function toDatabaseSourceType(value: SourceType) {
  return sourceTypeToDatabaseMap[value];
}

export function fromDatabaseSourceType(value: string | null | undefined): SourceType {
  return sourceTypeFromDatabaseMap[value ?? ""] ?? "Federal Registry";
}

export function toDatabaseSourceLifecycle(value: SourceLifecycle) {
  return sourceLifecycleToDatabaseMap[value];
}

export function fromDatabaseSourceLifecycle(value: string | null | undefined): SourceLifecycle {
  return sourceLifecycleFromDatabaseMap[value ?? ""] ?? "planned";
}

export function toDatabaseProgramTier(value: SourceProgramTier) {
  return programTierToDatabaseMap[value];
}

export function fromDatabaseProgramTier(value: string | null | undefined): SourceProgramTier {
  return programTierFromDatabaseMap[value ?? ""] ?? "US V1 Core";
}

export function toDatabaseGeographicLevel(value: GeographicLevel) {
  return geographicLevelToDatabaseMap[value];
}

export function fromDatabaseGeographicLevel(value: string | null | undefined): GeographicLevel {
  return geographicLevelFromDatabaseMap[value ?? ""] ?? "facility";
}

export function formatSourceDate(value: Date | string | null | undefined) {
  if (!value) return "Planned";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Planned";
  return date.toISOString().slice(0, 10);
}

export function buildSourceRegistryInsertValue(
  source: SourceRegistryEntry,
): InferInsertModel<typeof sourceRegistry> {
  return {
    slug: source.slug,
    name: source.name,
    shortName: source.shortName,
    sourceType: toDatabaseSourceType(source.sourceType) as
      | "federal_registry"
      | "federal_research"
      | "academic_literature"
      | "journalism"
      | "global_statistical"
      | "global_infrastructure"
      | "hydrology_framework",
    lifecycle: toDatabaseSourceLifecycle(source.lifecycle) as "active_mock" | "planned",
    programTier: toDatabaseProgramTier(source.programTier) as
      | "us_v1_core"
      | "global_v2_planned"
      | "literature_editorial",
    layerGroups: source.layerGroups,
    supportedEvidence: source.supportedEvidence.map(toDatabaseEvidenceType),
    geographicScope: source.geographicScope,
    geographicLevel: toDatabaseGeographicLevel(source.geographicLevel) as
      | "facility"
      | "site"
      | "watershed"
      | "county"
      | "state"
      | "regional"
      | "national"
      | "global"
      | "literature_cluster",
    spatialResolution: source.spatialResolution,
    updateCadence: source.updateCadence,
    completenessTags: source.completenessTags,
    description: source.description,
    caveats: source.caveats,
    confidenceNote: source.confidenceNote,
    methodologicalUse: source.methodologicalUse,
    originSite: source.originSite ?? null,
    upstreamDatasets: source.upstreamDatasets ?? [],
    downloadability: source.downloadability ?? null,
    ingestionMethod: source.ingestionMethod ?? null,
    externalUrl: source.externalUrl,
    sourceUpdatedAt: source.sourceUpdatedAt ? new Date(source.sourceUpdatedAt) : null,
  };
}

export function buildLocationLabel(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function asSourceStats(value: unknown): ExplorerEntitySourceStat[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = "label" in item && typeof item.label === "string" ? item.label : null;
      const renderedValue = "value" in item && typeof item.value === "string" ? item.value : null;
      return label && renderedValue ? { label, value: renderedValue } : null;
    })
    .filter((item): item is ExplorerEntitySourceStat => Boolean(item));
}

export function sanitizeExplorerTags(value: unknown): ExplorerFilterChip[] {
  const allowed = new Set<ExplorerFilterChip>([
    "community-pressure",
    "downstream",
    "drinking-water",
    "fertility-context",
    "litigation",
    "wildlife-anomaly",
  ]);

  return asStringArray(value).filter((tag): tag is ExplorerFilterChip =>
    allowed.has(tag as ExplorerFilterChip),
  );
}

export function sanitizeSignalFamilies(value: unknown): ExplorerSignalFamily[] {
  const allowed = new Set<ExplorerSignalFamily>([
    "pfas",
    "wastewater",
    "air-toxics",
    "petrochemical",
    "legacy-hazard",
    "pharmaceuticals",
    "plastics",
    "power-combustion",
    "wildlife-sentinel",
    "reproductive-context",
    "legal-pressure",
  ]);

  return asStringArray(value).filter((family): family is ExplorerSignalFamily =>
    allowed.has(family as ExplorerSignalFamily),
  );
}

export function sanitizeChemicalMarkers(value: unknown): ExplorerChemicalMarker[] {
  const allowed = new Set<ExplorerChemicalMarker>([
    "pfas",
    "petrochemical-volatiles",
    "chlorinated-solvents",
    "pharmaceuticals",
    "plasticizers",
    "combustion-pollutants",
    "wastewater-indicators",
    "metals",
    "legacy-industrial-mixtures",
  ]);

  return asStringArray(value).filter((marker): marker is ExplorerChemicalMarker =>
    allowed.has(marker as ExplorerChemicalMarker),
  );
}

export function sanitizeChemicalHighlights(value: unknown): ExplorerChemicalHighlight[] {
  return Array.from(
    new Set(
      asStringArray(value)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

export function withExplorerDefaults(
  partial: Partial<ExplorerEntity> &
    Pick<
      ExplorerEntity,
      | "id"
      | "title"
      | "coordinates"
      | "layerGroup"
      | "layerId"
      | "category"
      | "subcategory"
      | "locationLabel"
      | "summary"
      | "whyThisAppears"
      | "dateLabel"
      | "yearStart"
      | "yearEnd"
      | "evidenceType"
      | "confidenceLevel"
      | "uncertaintyNote"
    >,
) {
  return {
    geometryType: "point" as const,
    tags: [],
    signalFamilies: [],
    chemicalMarkers: [],
    chemicalHighlights: [],
    sourceIds: [],
    relatedCaseStudyIds: [],
    officialSignals: [],
    emergingConcerns: [],
    wildlifeSentinelContext: [],
    reproductiveHealthContext: [],
    legalHistoricalContext: [],
    ...partial,
  };
}

export function groupToDefaultLayerId(group: LayerGroup) {
  if (group === "official") return "industrial-sites";
  if (group === "emerging") return "pfas-sites";
  if (group === "wildlife") return "sentinel-species";
  if (group === "reproductive") return "reproductive-regions";
  return "legal-markers";
}
