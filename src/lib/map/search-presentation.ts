import type { ExplorerSearchResult } from "@/types/explorer";

export function getExplorerSearchMatchLabel(result: ExplorerSearchResult) {
  if (result.kind === "case-study") {
    return "Case study";
  }

  switch (result.matchType) {
    case "chemical":
      return "Chemical";
    case "location":
      return "Location";
    case "entity":
      return "Record";
    default:
      return "Mapped signal";
  }
}

export function getExplorerSearchResultInsightBadges(result: ExplorerSearchResult) {
  const values = [
    result.layerShortLabel ?? result.layerLabel,
    result.evidenceType,
    result.sourceHint,
    result.chemistryHint ?? result.systemHint,
  ].filter(Boolean) as string[];

  return Array.from(new Set(values)).slice(0, 4);
}

export function getExplorerSearchResultActionLabel(result: ExplorerSearchResult) {
  if (!result.entityId) {
    return "Open";
  }

  return result.coordinates ? "Fly to" : "Select";
}
