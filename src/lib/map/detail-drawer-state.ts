import { getLayerDefinition } from "@/lib/map/layer-registry";
import {
  buildEntityDetailSummary,
  type EntityDetailSummary,
} from "@/lib/data/detail-summary";
import type { CaseStudyRecord } from "@/types/data";
import type {
  ExplorerEntity,
  ExplorerEntityDetail,
  ExplorerEntitySourceStat,
  ExplorerReleaseRecord,
} from "@/types/explorer";
import type { SourceRegistryEntry } from "@/types/sources";

export type DetailDrawerHeaderState = {
  isSelectedOnMap: boolean;
  layerLabel: string;
  layerAccent: string;
  groupLabel: string;
};

export const detailDrawerDisplayLimits = {
  contextItems: 3,
  secondaryStats: 4,
  releaseRecords: 2,
  sourceCards: 3,
  caseStudies: 2,
} as const;

export type DetailDrawerItemWindow<T> = {
  visible: T[];
  hidden: number;
  total: number;
  limit: number;
};

export type DetailDrawerContextSectionWindow = Omit<
  EntityDetailSummary["contextSections"][number],
  "items"
> & {
  items: DetailDrawerItemWindow<string>;
};

export type DetailDrawerDisplayState = {
  summary: EntityDetailSummary;
  officialSignals: DetailDrawerItemWindow<string>;
  contextSections: DetailDrawerContextSectionWindow[];
  secondaryStats: DetailDrawerItemWindow<ExplorerEntitySourceStat>;
  releaseRecords: DetailDrawerItemWindow<ExplorerReleaseRecord>;
  sources: DetailDrawerItemWindow<SourceRegistryEntry>;
  caseStudies: DetailDrawerItemWindow<CaseStudyRecord>;
};

const groupLabels: Record<ExplorerEntity["layerGroup"], string> = {
  official: "Official",
  emerging: "Emerging",
  wildlife: "Wildlife",
  reproductive: "Reproductive",
  legal: "Legal",
};

export function buildDetailDrawerHeaderState(
  entity: Pick<ExplorerEntity, "id" | "layerGroup" | "layerId">,
  selectedEntityId: string | null,
): DetailDrawerHeaderState {
  const layerDefinition = getLayerDefinition(entity.layerId);

  return {
    isSelectedOnMap: selectedEntityId === entity.id,
    layerLabel: layerDefinition?.shortLabel ?? entity.layerId,
    layerAccent: layerDefinition?.accent ?? "var(--foreground-soft)",
    groupLabel: groupLabels[entity.layerGroup] ?? entity.layerGroup,
  };
}

export function buildDetailDrawerItemWindow<T>(
  items: readonly T[] | null | undefined,
  limit: number,
): DetailDrawerItemWindow<T> {
  const safeItems = [...(items ?? [])];
  const visible = safeItems.slice(0, limit);

  return {
    visible,
    hidden: Math.max(safeItems.length - visible.length, 0),
    total: safeItems.length,
    limit,
  };
}

export function buildDetailDrawerDisplayState(
  detail: ExplorerEntityDetail,
): DetailDrawerDisplayState {
  const summary = buildEntityDetailSummary(detail);
  const sourceCards = summary.rankedSources.length ? summary.rankedSources : detail.sources;
  const officialSignals = summary.primarySignals.length
    ? summary.primarySignals
    : detail.officialSignals;

  return {
    summary,
    officialSignals: buildDetailDrawerItemWindow(
      officialSignals,
      detailDrawerDisplayLimits.contextItems,
    ),
    contextSections: summary.contextSections.map((section) => ({
      key: section.key,
      title: section.title,
      items: buildDetailDrawerItemWindow(section.items, detailDrawerDisplayLimits.contextItems),
    })),
    secondaryStats: buildDetailDrawerItemWindow(
      summary.secondaryStats,
      detailDrawerDisplayLimits.secondaryStats,
    ),
    releaseRecords: buildDetailDrawerItemWindow(
      detail.releaseRecords,
      detailDrawerDisplayLimits.releaseRecords,
    ),
    sources: buildDetailDrawerItemWindow(sourceCards, detailDrawerDisplayLimits.sourceCards),
    caseStudies: buildDetailDrawerItemWindow(
      detail.relatedCaseStudies,
      detailDrawerDisplayLimits.caseStudies,
    ),
  };
}
