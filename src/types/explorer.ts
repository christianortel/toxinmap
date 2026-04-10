import type { ConfidenceLevel, EvidenceType, LayerGroup } from "@/types/data";
import type { CaseStudyRecord } from "@/types/data";
import type { SourceRegistryEntry } from "@/types/sources";

export type ExplorerLayerGroup = LayerGroup;

export type ExplorerEvidenceType = EvidenceType;

export type ExplorerConfidenceLevel = ConfidenceLevel;

export type ExplorerEntityGeometry = "point" | "region";

export type ExplorerLayerId =
  | "industrial-sites"
  | "air-toxics-regions"
  | "power-plants"
  | "hazardous-sites"
  | "pfas-sites"
  | "wastewater-sites"
  | "sentinel-species"
  | "reproductive-regions"
  | "legal-markers"
  | "cluster";

export type ExplorerFilterChip =
  | "downstream"
  | "drinking-water"
  | "community-pressure"
  | "wildlife-anomaly"
  | "fertility-context"
  | "litigation";

export type ExplorerSignalFamily =
  | "pfas"
  | "wastewater"
  | "air-toxics"
  | "petrochemical"
  | "legacy-hazard"
  | "pharmaceuticals"
  | "plastics"
  | "power-combustion"
  | "wildlife-sentinel"
  | "reproductive-context"
  | "legal-pressure";

export type ExplorerChemicalMarker =
  | "pfas"
  | "petrochemical-volatiles"
  | "chlorinated-solvents"
  | "pharmaceuticals"
  | "plasticizers"
  | "combustion-pollutants"
  | "wastewater-indicators"
  | "metals"
  | "legacy-industrial-mixtures";

export type ExplorerChemicalHighlight = string;

export type ExplorerTimelineRange = {
  activeYear: number;
  startYear: number;
  endYear: number;
};

export type ExplorerEntitySourceStat = {
  label: string;
  value: string;
};

export type ExplorerReleaseRecord = {
  id: string;
  chemicalName: string;
  reportingYear: number;
  quantityKg: number | null;
  releaseMedium: string | null;
  sourceId: string | null;
};

export type ExplorerEntity = {
  id: string;
  title: string;
  slug?: string;
  geometryType: ExplorerEntityGeometry;
  coordinates: [number, number];
  radiusKm?: number;
  layerGroup: ExplorerLayerGroup;
  layerId: ExplorerLayerId;
  category: string;
  subcategory: string;
  locationLabel: string;
  summary: string;
  whyThisAppears: string;
  dateLabel: string;
  yearStart: number;
  yearEnd: number;
  evidenceType: ExplorerEvidenceType;
  confidenceLevel: ExplorerConfidenceLevel;
  tags: ExplorerFilterChip[];
  signalFamilies: ExplorerSignalFamily[];
  chemicalMarkers: ExplorerChemicalMarker[];
  chemicalHighlights: ExplorerChemicalHighlight[];
  sourceIds: string[];
  relatedCaseStudyIds: string[];
  officialSignals: string[];
  emergingConcerns: string[];
  wildlifeSentinelContext: string[];
  reproductiveHealthContext: string[];
  legalHistoricalContext: string[];
  uncertaintyNote: string;
  sourceStats?: ExplorerEntitySourceStat[];
};

export type ExplorerVisibleEntity = ExplorerEntity & {
  aggregateCount?: number;
  aggregateIds?: string[];
  isAggregate?: boolean;
};

export type ExplorerEntityDetail = ExplorerEntity & {
  sources: SourceRegistryEntry[];
  relatedCaseStudies: CaseStudyRecord[];
  releaseRecords?: ExplorerReleaseRecord[];
  backend: "database" | "mock";
};

export type ExplorerLayerDefinition = {
  id: ExplorerLayerId;
  label: string;
  shortLabel: string;
  group: ExplorerLayerGroup;
  category: string;
  subcategory: string;
  accent: string;
  emphasis: "point" | "region" | "story";
  visibleByDefault: boolean;
  description: string;
};

export type ExplorerLegendItem = {
  id: string;
  label: string;
  accent: string;
  count: number;
  description: string;
};

export type ExplorerSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  kind: "entity" | "case-study";
  matchType?: "entity" | "location" | "chemical" | "case-study";
  matchContext?: string;
  entityId?: string;
  relatedCaseStudyId?: string;
  score: number;
};

export type ExplorerHoverState = {
  entityId: string | null;
  x: number;
  y: number;
};

export type ExplorerCameraTarget = {
  label: string;
  coordinates: [number, number];
  height?: number;
};

export type ExplorerNearbyFocus = {
  label: string;
  coordinates: [number, number];
  radiusMiles: number;
};

export type ExplorerNearbyResult = {
  entity: ExplorerEntity;
  distanceMiles: number;
  priorityScore: number;
  whyRanked: string;
};

export type ExplorerNearbyResponse = {
  center: ExplorerNearbyFocus;
  total: number;
  groupedCounts: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  evidenceCounts: Array<{
    evidenceType: ExplorerEvidenceType;
    count: number;
  }>;
  sourceCounts: Array<{
    sourceId: string;
    label: string;
    count: number;
  }>;
  signalFamilyCounts: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  chemicalMarkerCounts: Array<{
    id: ExplorerChemicalMarker;
    label: string;
    count: number;
  }>;
  chemicalHighlightCounts: Array<{
    label: ExplorerChemicalHighlight;
    count: number;
  }>;
  themeCounts: Array<{
    theme: ExplorerFilterChip;
    label: string;
    count: number;
  }>;
  summaryLines: string[];
  headlineResults: ExplorerNearbyResult[];
  results: ExplorerNearbyResult[];
};

export type ExplorerLocationMatch = {
  label: string;
  coordinates: [number, number];
  confidence: "high" | "moderate";
  source: string;
};
