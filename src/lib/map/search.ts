import {
  getChemicalMarkerLabel,
  getChemicalMarkerSearchTerms,
  getChemicalSearchMatch,
  getSignalFamilyLabel,
} from "@/lib/data/chemistry";
import { getLayerDefinition } from "@/lib/map/layer-registry";
import type { CaseStudyRecord } from "@/types/data";
import type { ExplorerEntity, ExplorerSearchResult } from "@/types/explorer";

function scoreText(haystack: string, needle: string) {
  const normalizedHaystack = haystack.toLowerCase();
  const normalizedNeedle = needle.toLowerCase().trim();

  if (!normalizedNeedle) return 0;
  if (normalizedHaystack === normalizedNeedle) return 100;
  if (normalizedHaystack.startsWith(normalizedNeedle)) return 70;
  if (normalizedHaystack.includes(normalizedNeedle)) return 45;

  const needleParts = normalizedNeedle.split(/\s+/).filter(Boolean);
  const partialMatches = needleParts.filter((part) => normalizedHaystack.includes(part)).length;
  return partialMatches * 12;
}

const searchSourceBoosts: Partial<Record<string, number>> = {
  "usgs-pfas": 42,
  "atsdr-pfas": 38,
  "epa-npdes": 34,
  "usgs-pharma": 32,
  "epa-sems": 28,
  "epa-tri": 24,
  "epa-echo": 18,
  "epa-frs": 6,
};

function getSourceSpecificityBoost(entity: ExplorerEntity) {
  return Math.min(
    entity.sourceIds.reduce((sum, sourceId) => sum + (searchSourceBoosts[sourceId] ?? 0), 0),
    70,
  );
}

function getLayerSpecificityBoost(entity: ExplorerEntity) {
  if (entity.layerId === "pfas-sites") {
    return 36;
  }

  if (entity.layerId === "wastewater-sites") {
    return 30;
  }

  if (entity.layerId === "hazardous-sites") {
    return entity.sourceIds.includes("epa-sems") ? 28 : 18;
  }

  if (entity.layerId === "legal-markers") {
    return entity.sourceIds.includes("epa-echo") ? 24 : 14;
  }

  if (entity.layerId === "industrial-sites") {
    return entity.sourceIds.includes("epa-tri") ? 14 : 0;
  }

  if (entity.layerId === "power-plants") {
    return 6;
  }

  return 0;
}

function getDetailRichnessBoost(entity: ExplorerEntity) {
  let boost = 0;

  if (entity.chemicalHighlights.length > 0) {
    boost += 10;
  }

  if (entity.chemicalMarkers.length > 0) {
    boost += 6;
  }

  if (entity.officialSignals.length >= 2) {
    boost += 5;
  }

  if ((entity.sourceStats?.length ?? 0) >= 3) {
    boost += 5;
  }

  return boost;
}

function getGenericFootprintPenalty(entity: ExplorerEntity, titleScore: number, locationScore: number) {
  if (entity.layerId === "industrial-sites" && !entity.sourceIds.includes("epa-tri")) {
    return locationScore > titleScore ? 26 : 18;
  }

  if (entity.layerId === "power-plants" && locationScore > titleScore) {
    return 10;
  }

  if (entity.layerId === "air-toxics-regions") {
    return 8;
  }

  return 0;
}

function getSearchReasonLabel(entity: ExplorerEntity) {
  if (entity.sourceIds.includes("usgs-pfas")) return "USGS PFAS sampling";
  if (entity.sourceIds.includes("atsdr-pfas")) return "ATSDR PFAS site";
  if (entity.sourceIds.includes("epa-npdes")) return "NPDES wastewater record";
  if (entity.sourceIds.includes("usgs-pharma")) return "USGS pharmaceutical sampling";
  if (entity.sourceIds.includes("epa-sems")) return "EPA cleanup-linked hazard record";
  if (entity.sourceIds.includes("epa-tri")) return "TRI-linked release record";
  if (entity.sourceIds.includes("epa-echo")) return "ECHO regulatory record";
  if (entity.sourceIds.includes("epa-frs")) return "EPA facility identity";
  return entity.category;
}

function getChemistryHint(entity: ExplorerEntity) {
  if (entity.chemicalHighlights.length > 0) {
    return entity.chemicalHighlights.slice(0, 2).join(" / ");
  }

  if (entity.chemicalMarkers.length > 0) {
    return entity.chemicalMarkers
      .slice(0, 2)
      .map((marker) => getChemicalMarkerLabel(marker))
      .join(" / ");
  }

  return undefined;
}

function getSystemHint(entity: ExplorerEntity) {
  const primaryFamily = entity.signalFamilies[0];
  return primaryFamily ? getSignalFamilyLabel(primaryFamily, { compact: true }) : undefined;
}

function getEntitySearchMetadata(
  entity: ExplorerEntity,
  sourceHint: string,
): Pick<
  ExplorerSearchResult,
  | "layerId"
  | "layerGroup"
  | "layerLabel"
  | "layerShortLabel"
  | "evidenceType"
  | "confidenceLevel"
  | "sourceIds"
  | "sourceHint"
  | "systemHint"
  | "chemistryHint"
  | "categoryHint"
> {
  const layer = getLayerDefinition(entity.layerId);

  return {
    layerId: entity.layerId,
    layerGroup: entity.layerGroup,
    layerLabel: layer?.label ?? entity.category,
    layerShortLabel: layer?.shortLabel ?? entity.category,
    evidenceType: entity.evidenceType,
    confidenceLevel: entity.confidenceLevel,
    sourceIds: entity.sourceIds.slice(0, 4),
    sourceHint,
    systemHint: getSystemHint(entity),
    chemistryHint: getChemistryHint(entity),
    categoryHint: entity.subcategory || entity.category,
  };
}

function queryMatchesMarker(query: string, marker: ExplorerEntity["chemicalMarkers"][number]) {
  const normalizedQuery = query.toLowerCase().trim();
  const markerLabel = getChemicalMarkerLabel(marker).toLowerCase();
  const aliases = getChemicalMarkerSearchTerms(marker);

  return (
    markerLabel.includes(normalizedQuery) ||
    aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery))
  );
}

function getQueryIntentBoost(query: string, entity: ExplorerEntity) {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return 0;

  if (queryMatchesMarker(normalizedQuery, "pfas")) {
    if (entity.layerId === "pfas-sites") return 110;
    if (entity.signalFamilies.includes("pfas")) return 54;
    if (entity.chemicalMarkers.includes("pfas")) return 28;
  }

  if (queryMatchesMarker(normalizedQuery, "wastewater-indicators")) {
    if (entity.layerId === "wastewater-sites") return 96;
    if (entity.signalFamilies.includes("wastewater")) return 44;
    if (entity.chemicalMarkers.includes("wastewater-indicators")) return 20;
  }

  if (
    normalizedQuery.includes("cleanup") ||
    normalizedQuery.includes("superfund") ||
    normalizedQuery.includes("hazard")
  ) {
    if (entity.layerId === "hazardous-sites" && entity.sourceIds.includes("epa-sems")) return 88;
    if (entity.layerId === "hazardous-sites") return 56;
    if (entity.signalFamilies.includes("legacy-hazard")) return 26;
  }

  if (
    normalizedQuery.includes("violation") ||
    normalizedQuery.includes("enforcement") ||
    normalizedQuery.includes("compliance") ||
    normalizedQuery.includes("lawsuit")
  ) {
    if (entity.layerId === "legal-markers") return 74;
    if (entity.sourceIds.includes("epa-echo")) return 34;
  }

  return 0;
}

export function getExplorerSearchResults(
  query: string,
  entities: ExplorerEntity[],
  caseStudies: CaseStudyRecord[],
): ExplorerSearchResult[] {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) return [];

  const entityResults = entities
    .map((entity) => {
      const chemicalMatch = getChemicalSearchMatch(entity, normalizedQuery);
      const haystack = [
        entity.title,
        entity.locationLabel,
        entity.category,
        entity.subcategory,
        entity.tags.join(" "),
        entity.chemicalHighlights.join(" "),
        entity.chemicalMarkers.map((marker) => getChemicalMarkerLabel(marker)).join(" "),
      ].join(" ");

      const textScore = scoreText(haystack, normalizedQuery);
      const titleScore = scoreText(entity.title, normalizedQuery) + 10;
      const locationScore = scoreText(entity.locationLabel, normalizedQuery);
      const baseScore = Math.max(textScore, titleScore, locationScore, chemicalMatch?.score ?? 0);
      const specificityBoost =
        getSourceSpecificityBoost(entity) +
        getLayerSpecificityBoost(entity) +
        getDetailRichnessBoost(entity) +
        getQueryIntentBoost(normalizedQuery, entity);
      const penalty = getGenericFootprintPenalty(entity, titleScore, locationScore);
      const score = baseScore + specificityBoost - penalty;
      const reasonLabel = getSearchReasonLabel(entity);

      const subtitle =
        chemicalMatch?.subtitle ??
        (locationScore > textScore && locationScore > titleScore
          ? `Location match / ${entity.locationLabel}`
          : `${entity.locationLabel} / ${reasonLabel}`);

      const matchType: ExplorerSearchResult["matchType"] =
        chemicalMatch?.matchType ??
        (titleScore >= locationScore && titleScore >= textScore ? "entity" : "location");

      const matchContext =
        chemicalMatch?.context ??
        (matchType === "entity"
          ? `${reasonLabel} / ${entity.evidenceType}`
          : locationScore > titleScore && locationScore > textScore
            ? `${reasonLabel} near ${entity.locationLabel}`
            : `${reasonLabel} / ${entity.subcategory}`);

      return {
        id: entity.id,
        title: entity.title,
        subtitle,
        kind: "entity" as const,
        matchType,
        matchContext,
        entityId: entity.id,
        coordinates: entity.coordinates,
        ...getEntitySearchMetadata(entity, reasonLabel),
        relatedCaseStudyId: entity.relatedCaseStudyIds[0],
        score,
      };
    })
    .filter((result) => result.score > 0);

  const caseStudyResults = caseStudies
    .map((study) => {
      const score = scoreText(
        [study.title, study.location, study.subtitle, study.category].join(" "),
        normalizedQuery,
      );
      const anchorEntity = entities.find((entity) =>
        entity.relatedCaseStudyIds.includes(study.slug),
      );
      const anchorSourceHint = anchorEntity ? getSearchReasonLabel(anchorEntity) : "Case study";

      return {
        id: `case-study-${study.slug}`,
        title: study.title,
        subtitle: study.location,
        kind: "case-study" as const,
        matchType: "case-study" as const,
        matchContext: anchorEntity?.chemicalHighlights.length
          ? `Related chemistry: ${anchorEntity.chemicalHighlights.slice(0, 2).join(", ")}`
          : undefined,
        entityId: anchorEntity?.id,
        coordinates: anchorEntity?.coordinates,
        ...(anchorEntity
          ? getEntitySearchMetadata(anchorEntity, anchorSourceHint)
          : {
              evidenceType: study.evidenceMix[0] ?? "Editorial Case Study",
              confidenceLevel: study.confidenceLevel,
              sourceIds: study.sourceIds.slice(0, 4),
              sourceHint: "Case study",
              systemHint: study.category,
              categoryHint: study.category,
            }),
        relatedCaseStudyId: study.slug,
        score,
      };
    })
    .filter((result) => result.score > 0);

  return [...entityResults, ...caseStudyResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
}
