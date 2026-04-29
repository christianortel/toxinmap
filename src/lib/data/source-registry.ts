import { mockSources } from "@/data/mock/sources";
import { layerGroupLabels } from "@/lib/data/evidence";
import type { LayerGroup } from "@/types/data";
import type {
  SourceImplementationRole,
  SourceProgramTier,
  SourceRegistryEntry,
  SourceType,
} from "@/types/sources";

export const sourceTypeDescriptions: Record<SourceType, string> = {
  "Federal Registry": "Operational government registry or administrative system.",
  "Federal Research": "Federal research or monitoring context, often incomplete by design.",
  "Academic Literature": "Published scientific literature or synthesized study context.",
  Journalism: "Editorial reporting, document review, and case-file synthesis.",
  "Global Statistical": "Population-scale statistical context with limited local specificity.",
  "Global Infrastructure": "Global infrastructure context rather than direct exposure measurement.",
  "Hydrology Framework": "Spatial hydrology or basin geometry used for downstream logic.",
};

export const sourceImplementationRoleLabels: Record<SourceImplementationRole, string> = {
  "primary-operational": "Primary operational source",
  "methodology-reference": "Methodology-derived reference",
  "reference-benchmark": "Reference and QA benchmark",
};

export const sourceImplementationRoleDescriptions: Record<SourceImplementationRole, string> = {
  "primary-operational":
    "This source is part of the intended live toxinmap data pipeline when public downloads and ETL are available.",
  "methodology-reference":
    "This source shapes toxinmap behavior, categories, and layer logic, but toxinmap rebuilds the map from upstream official or citable datasets where possible.",
  "reference-benchmark":
    "This source is used to cross-check scope, coverage, taxonomy, and public readability rather than as a default ingest path.",
};

export const programTierOrder: SourceProgramTier[] = [
  "US V1 Core",
  "Literature / Editorial",
  "Global / V2 Planned",
];

export function getSourceMap() {
  return Object.fromEntries(mockSources.map((source) => [source.id, source]));
}

export function getSourcesGroupedByTier(entries: SourceRegistryEntry[]) {
  return programTierOrder
    .map((tier) => ({
      tier,
      title:
        tier === "US V1 Core"
          ? "U.S. core architecture"
          : tier === "Literature / Editorial"
            ? "Literature and editorial scaffolding"
            : "Global and V2 placeholders",
      description:
        tier === "US V1 Core"
          ? "Primary source families planned for early U.S. launch logic."
          : tier === "Literature / Editorial"
            ? "Carefully labeled context layers where formal public spatial coverage is incomplete."
            : "Future-facing structures kept visible so the data model can scale without redesign.",
      entries: entries.filter((entry) => entry.programTier === tier),
    }))
    .filter((group) => group.entries.length > 0);
}

export function getSourceLayerGroupSummary(entry: SourceRegistryEntry) {
  return entry.layerGroups.map((group) => layerGroupLabels[group]).join(", ");
}

export function getSourcesForLayerGroup(entries: SourceRegistryEntry[], layerGroup: LayerGroup) {
  return entries.filter((entry) => entry.layerGroups.includes(layerGroup));
}
