import type {
  CompletenessTag,
  EvidenceType,
  GeographicLevel,
  LayerGroup,
  UpdateCadence,
} from "@/types/data";

export type SourceType =
  | "Federal Registry"
  | "Federal Research"
  | "Academic Literature"
  | "Journalism"
  | "Global Statistical"
  | "Global Infrastructure"
  | "Hydrology Framework";

export type SourceLifecycle = "active-mock" | "planned";

export type SourceProgramTier =
  | "US V1 Core"
  | "Global / V2 Planned"
  | "Literature / Editorial";

export type SourceImplementationRole =
  | "primary-operational"
  | "methodology-reference"
  | "reference-benchmark";

export type SourceRegistryEntry = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  sourceType: SourceType;
  lifecycle: SourceLifecycle;
  programTier: SourceProgramTier;
  layerGroups: LayerGroup[];
  supportedEvidence: EvidenceType[];
  description: string;
  geographicScope: string;
  geographicLevel: GeographicLevel;
  spatialResolution: string;
  updateCadence: UpdateCadence;
  completenessTags: CompletenessTag[];
  caveats: string[];
  confidenceNote: string;
  methodologicalUse: string;
  externalUrl: string;
  sourceUpdatedAt: string;
  originSite?: string;
  upstreamDatasets?: string[];
  downloadability?: "public-download" | "downloadable-with-caveats" | "reference-only";
  ingestionMethod?: "direct-ingest" | "derived-from-methodology" | "reference-only";
  implementationRole?: SourceImplementationRole;
  mimicContributions?: string[];
};
