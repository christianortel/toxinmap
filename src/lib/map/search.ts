import { getChemicalMarkerLabel, getChemicalSearchMatch } from "@/lib/data/chemistry";
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
      const score = Math.max(textScore, titleScore, locationScore, chemicalMatch?.score ?? 0);

      const subtitle =
        chemicalMatch?.subtitle ??
        (locationScore > textScore && locationScore > titleScore
          ? `Location match / ${entity.locationLabel}`
          : entity.locationLabel);

      const matchType: ExplorerSearchResult["matchType"] =
        chemicalMatch?.matchType ??
        (titleScore >= locationScore && titleScore >= textScore ? "entity" : "location");

      return {
        id: entity.id,
        title: entity.title,
        subtitle,
        kind: "entity" as const,
        matchType,
        matchContext: chemicalMatch?.context,
        entityId: entity.id,
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
        relatedCaseStudyId: study.slug,
        score,
      };
    })
    .filter((result) => result.score > 0);

  return [...entityResults, ...caseStudyResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
}
