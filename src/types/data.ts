export type LayerGroup =
  | "official"
  | "emerging"
  | "wildlife"
  | "reproductive"
  | "legal";

export type EvidenceType =
  | "Direct Measurement"
  | "Proxy"
  | "Screening Signal"
  | "Literature Evidence"
  | "Editorial Case Study";

export type ConfidenceLevel = "Low" | "Moderate" | "High";

export type GeographicLevel =
  | "facility"
  | "site"
  | "watershed"
  | "county"
  | "state"
  | "regional"
  | "national"
  | "global"
  | "literature-cluster";

export type UpdateCadence =
  | "daily"
  | "monthly"
  | "quarterly"
  | "annual"
  | "periodic"
  | "irregular"
  | "static"
  | "planned";

export type CompletenessTag =
  | "partial-coverage"
  | "literature-context"
  | "research-context"
  | "screening-only"
  | "proxy-only"
  | "planned-placeholder"
  | "editorial-synthesis"
  | "not-population-diagnostic";

export type EvidenceKey =
  | "direct_measurement"
  | "proxy"
  | "screening_signal"
  | "literature_evidence"
  | "editorial_case_study";

export type WarningCategory = {
  key: LayerGroup;
  title: string;
  summary: string;
  accent: string;
};

export type FeaturedStat = {
  label: string;
  value: string;
  context: string;
};

export type MethodologySection = {
  id: string;
  title: string;
  layerType: EvidenceType;
  measures: string;
  doesNotMeasure: string;
  caution: string;
  examples: string[];
};

export type MethodologyNarrativeBlock = {
  eyebrow: string;
  title: string;
  body: string;
};

export type TimelineStop = {
  label: string;
  year: number;
  summary: string;
};

export type GeographyRecord = {
  id: string;
  slug: string;
  name: string;
  geographicLevel: GeographicLevel;
  countryCode: string;
  stateCode?: string;
  summary: string;
};

export type CaseStudyRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  location: string;
  region: string;
  coordinates: [number, number];
  dateRangeLabel: string;
  category: string;
  summary: string;
  whyItMatters: string;
  methodologyNote: string;
  evidenceMix: EvidenceType[];
  confidenceLevel: ConfidenceLevel;
  keySignals: string[];
  keyFindings: string[];
  narrative: string[];
  tags: string[];
  sourceIds: string[];
  relatedEntityIds: string[];
  hero: {
    eyebrow: string;
    imageHint: string;
  };
};
