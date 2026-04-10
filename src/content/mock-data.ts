import { mockCaseStudies } from "@/data/mock/case-studies";
import {
  featuredStats as methodologyFeaturedStats,
  methodologySections as methodologySectionRecords,
  timelineStops as methodologyTimelineStops,
  warningCategories as methodologyWarningCategories,
} from "@/data/mock/methodology";
import { mockSources } from "@/data/mock/sources";
import type {
  CaseStudyRecord,
  EvidenceType,
  FeaturedStat,
  MethodologySection,
  TimelineStop,
  WarningCategory,
} from "@/types/data";
import type { SourceRegistryEntry, SourceType } from "@/types/sources";

export type LayerGroup = WarningCategory["key"];
export type EvidenceKind = EvidenceType;
export type CaseStudy = CaseStudyRecord;
export type SourceRecord = SourceRegistryEntry;
export type { FeaturedStat, MethodologySection, TimelineStop, WarningCategory, SourceType };

export const warningCategories: WarningCategory[] = methodologyWarningCategories;
export const featuredStats: FeaturedStat[] = methodologyFeaturedStats;
export const caseStudies: CaseStudy[] = mockCaseStudies;
export const methodologySections: MethodologySection[] = methodologySectionRecords;
export const timelineStops: TimelineStop[] = methodologyTimelineStops;
export const sourceRegistry: SourceRecord[] = mockSources;

export const editorialBlocks = [
  {
    eyebrow: "A public-interest lens",
    title: "Not every warning arrives through the same institution.",
    body:
      "Some signals appear first in monitoring, some in wildlife, some in litigation, and some in bodies of literature that never become everyday public maps. DOWNSTREAM is designed to hold those categories apart while still letting them be seen together.",
  },
  {
    eyebrow: "Scientific caution",
    title: "Overlap is not causation.",
    body:
      "The product is intentionally explicit about uncertainty, missingness, and the difference between evidence classes. It is designed to support careful investigation, not mechanistic overclaiming.",
  },
];
