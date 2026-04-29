import { mockCaseStudies } from "@/data/mock/case-studies";
import { mockEntities } from "@/data/mock/entities";
import { timelineStops, warningCategories } from "@/data/mock/methodology";
import { mockSources } from "@/data/mock/sources";
import type {
  ExplorerEntity,
  ExplorerFilterChip,
  ExplorerLayerDefinition,
  ExplorerTimelineRange,
} from "@/types/explorer";

export const explorerLayerDefinitions: ExplorerLayerDefinition[] = [
  {
    id: "industrial-sites",
    label: "Industrial sites",
    shortLabel: "Industry",
    group: "official",
    category: "Facility footprint",
    subcategory: "Industrial release context",
    accent: "var(--accent-industrial)",
    emphasis: "point",
    visibleByDefault: true,
    description: "Reported industrial facilities with release, permit, or emissions relevance.",
  },
  {
    id: "air-toxics-regions",
    label: "Air-toxics context",
    shortLabel: "Air risk",
    group: "emerging",
    category: "Modeled air-toxics context",
    subcategory: "Neighborhood risk screen",
    accent: "#d08b5c",
    emphasis: "region",
    visibleByDefault: true,
    description: "Modeled air-toxics context and source-screening zones inspired by official EPA methods.",
  },
  {
    id: "power-plants",
    label: "Power plants",
    shortLabel: "Power",
    group: "official",
    category: "Energy infrastructure",
    subcategory: "Combustion and discharge context",
    accent: "var(--accent-power)",
    emphasis: "point",
    visibleByDefault: true,
    description: "Power infrastructure used as official contamination context in selected basins.",
  },
  {
    id: "hazardous-sites",
    label: "Hazardous sites",
    shortLabel: "Hazard",
    group: "official",
    category: "Hazard registry",
    subcategory: "Legacy contamination sites",
    accent: "var(--accent-hazard)",
    emphasis: "point",
    visibleByDefault: true,
    description: "Hazardous and legacy sites that anchor historical contamination visibility.",
  },
  {
    id: "pfas-sites",
    label: "PFAS-related points",
    shortLabel: "PFAS",
    group: "emerging",
    category: "Emerging chemical hotspot",
    subcategory: "PFAS",
    accent: "var(--accent-water)",
    emphasis: "point",
    visibleByDefault: true,
    description: "PFAS detections, investigations, and industrial-emerging chemistry context.",
  },
  {
    id: "wastewater-sites",
    label: "Wastewater pathways",
    shortLabel: "Wastewater",
    group: "emerging",
    category: "Discharge pathway",
    subcategory: "Effluent and outfall context",
    accent: "var(--accent-wastewater)",
    emphasis: "point",
    visibleByDefault: true,
    description: "Wastewater and discharge-related sites that may connect upstream activity to downstream concern.",
  },
  {
    id: "sentinel-species",
    label: "Sentinel species markers",
    shortLabel: "Wildlife",
    group: "wildlife",
    category: "Sentinel record",
    subcategory: "Wildlife abnormality",
    accent: "var(--accent-bio)",
    emphasis: "point",
    visibleByDefault: true,
    description: "Wildlife signals that may act as ecological warning markers.",
  },
  {
    id: "reproductive-regions",
    label: "Reproductive-health regions",
    shortLabel: "Reproductive",
    group: "reproductive",
    category: "Population context",
    subcategory: "Regional trend lens",
    accent: "var(--accent-bio-soft)",
    emphasis: "region",
    visibleByDefault: true,
    description: "Regional context layers for reproductive-health indicators and study clusters.",
  },
  {
    id: "legal-markers",
    label: "Legal and historical markers",
    shortLabel: "Legal",
    group: "legal",
    category: "Pressure point",
    subcategory: "Litigation and enforcement",
    accent: "var(--accent-legal)",
    emphasis: "story",
    visibleByDefault: true,
    description:
      "Consent decrees, litigation, community-pressure markers, and curated documented warning anchors used as investigative context.",
  },
];

export const explorerEntities: ExplorerEntity[] = mockEntities;

const latestTimelineYear = timelineStops[timelineStops.length - 1]?.year ?? 2025;
const activeTimelineYear = latestTimelineYear;

export const explorerTimelineRange: ExplorerTimelineRange = {
  activeYear: activeTimelineYear,
  startYear: timelineStops[0]?.year ?? 1974,
  endYear: activeTimelineYear,
};

export const explorerFilterChips: { id: ExplorerFilterChip; label: string }[] = [
  { id: "downstream", label: "Downstream" },
  { id: "drinking-water", label: "Drinking water" },
  { id: "community-pressure", label: "Community pressure" },
  { id: "wildlife-anomaly", label: "Wildlife anomaly" },
  { id: "fertility-context", label: "Fertility context" },
  { id: "litigation", label: "Litigation" },
];

export const explorerSourceMap = Object.fromEntries(mockSources.map((source) => [source.id, source]));
export const explorerCaseStudyMap = Object.fromEntries(
  mockCaseStudies.map((study) => [study.slug, study]),
);
export const explorerGroupCategories = warningCategories;
