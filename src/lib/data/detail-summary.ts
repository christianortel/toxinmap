import { getChemicalMarkerLabel } from "@/lib/data/chemistry";
import type { ExplorerEntityDetail, ExplorerEntitySourceStat } from "@/types/explorer";
import type { SourceRegistryEntry } from "@/types/sources";

const detailSourcePriority: Partial<Record<string, number>> = {
  "usgs-pfas": 90,
  "atsdr-pfas": 86,
  "epa-npdes": 84,
  "usgs-pharma": 78,
  "epa-sems": 74,
  "epa-tri": 66,
  "epa-echo": 58,
  "epa-frs": 36,
};

const detailStatPriority: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /^Permit$/i, score: 92 },
  { pattern: /^Status$/i, score: 90 },
  { pattern: /^Water body$/i, score: 88 },
  { pattern: /^Pollutants$/i, score: 86 },
  { pattern: /^Hazard class$/i, score: 84 },
  { pattern: /^Federal cases$/i, score: 82 },
  { pattern: /^TRI ids$/i, score: 80 },
  { pattern: /^Generation class$/i, score: 76 },
  { pattern: /^Programs$/i, score: 74 },
  { pattern: /^Detections$/i, score: 72 },
  { pattern: /^Classes present$/i, score: 70 },
  { pattern: /^Facility type$/i, score: 68 },
  { pattern: /^Scale$/i, score: 66 },
  { pattern: /^NAICS$/i, score: 62 },
];

const detailSignalPriority: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /Permit status:/i, score: 100 },
  { pattern: /Clean Water Act status:/i, score: 96 },
  { pattern: /Receiving water:/i, score: 94 },
  { pattern: /Cleanup programs:/i, score: 92 },
  { pattern: /Hazard class:/i, score: 90 },
  { pattern: /ICIS FE&C federal case count:/i, score: 88 },
  { pattern: /TRI-linked ids:/i, score: 86 },
  { pattern: /Generation class:/i, score: 82 },
  { pattern: /Major facility/i, score: 78 },
  { pattern: /Programs linked:/i, score: 74 },
];

const statHelperRules: Array<{ pattern: RegExp; helper: string }> = [
  {
    pattern: /^Permit$/i,
    helper: "Use this identifier to trace the record in the permitting system.",
  },
  {
    pattern: /^Design flow$/i,
    helper: "Treatment capacity helps size the wastewater pathway context.",
  },
  {
    pattern: /^Status$/i,
    helper: "Current regulatory or operating status changes how urgent the record may be.",
  },
  {
    pattern: /^Water body$/i,
    helper: "Receiving-water context helps connect a facility or outfall to downstream concern.",
  },
  {
    pattern: /^Pollutants$/i,
    helper: "These are the reported pollutant categories tied to the source record.",
  },
  {
    pattern: /^Hazard class$/i,
    helper: "Hazard class tells you what kind of cleanup or legacy site context this represents.",
  },
  {
    pattern: /^Federal cases$/i,
    helper: "Federal case count can indicate enforcement or compliance pressure around the site.",
  },
  {
    pattern: /^TRI ids$/i,
    helper: "TRI identifiers link this facility footprint to reported toxic-release disclosures.",
  },
  {
    pattern: /^Generation class$/i,
    helper: "Generation class helps interpret the facility type and likely infrastructure role.",
  },
  {
    pattern: /^Programs$/i,
    helper: "Linked programs show which regulatory systems recognize this place.",
  },
  {
    pattern: /^Detections$/i,
    helper: "Detection count is a screening clue, not a complete exposure history.",
  },
  {
    pattern: /^PFAS sum$/i,
    helper: "Summed PFAS concentration from the source sample; compare cautiously across datasets.",
  },
  {
    pattern: /^Total releases$/i,
    helper: "Reported TRI release quantity for the facility record, not a full exposure estimate.",
  },
  {
    pattern: /^TRI year$/i,
    helper: "Reporting year for the TRI disclosure tied to this facility.",
  },
  {
    pattern: /^Classes present$/i,
    helper: "Chemical classes help group the concern before reading individual compounds.",
  },
  {
    pattern: /^Facility type$/i,
    helper: "Facility type explains the role this place plays in the local toxin system.",
  },
  {
    pattern: /^Scale$/i,
    helper: "Scale helps separate local records from broader contextual overlays.",
  },
  {
    pattern: /^NAICS$/i,
    helper: "NAICS identifies the industrial sector associated with this facility.",
  },
];

const contextSectionOrder = [
  { key: "legalHistoricalContext", title: "Legal / historical context" },
  { key: "emergingConcerns", title: "Emerging concerns" },
  { key: "wildlifeSentinelContext", title: "Wildlife sentinel context" },
  { key: "reproductiveHealthContext", title: "Reproductive-health context" },
] as const;

function getPatternPriority(value: string, priorities: Array<{ pattern: RegExp; score: number }>) {
  for (const entry of priorities) {
    if (entry.pattern.test(value)) {
      return entry.score;
    }
  }

  return 0;
}

function sortSourceIds(sourceIds: string[]) {
  return [...sourceIds].sort(
    (left, right) =>
      (detailSourcePriority[right] ?? 0) - (detailSourcePriority[left] ?? 0) ||
      left.localeCompare(right),
  );
}

function sortSources(sources: SourceRegistryEntry[], sourceIds: string[]) {
  const rankedSourceIds = sortSourceIds(sourceIds);
  const sourceOrder = new Map(rankedSourceIds.map((sourceId, index) => [sourceId, index]));

  return [...sources].sort(
    (left, right) =>
      (sourceOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (sourceOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name),
  );
}

function sortStats(sourceStats: ExplorerEntitySourceStat[]) {
  return [...sourceStats].sort(
    (left, right) =>
      getPatternPriority(right.label, detailStatPriority) -
        getPatternPriority(left.label, detailStatPriority) ||
      left.label.localeCompare(right.label),
  );
}

function sortSignals(officialSignals: string[]) {
  return [...officialSignals].sort(
    (left, right) =>
      getPatternPriority(right, detailSignalPriority) - 
        getPatternPriority(left, detailSignalPriority) ||
      left.localeCompare(right),
  );
}

function getStatHelper(label: string) {
  return (
    statHelperRules.find((entry) => entry.pattern.test(label))?.helper ??
    "Primary record field from the source data used to interpret this point."
  );
}

function buildMeasurementBoundary(detail: ExplorerEntityDetail) {
  switch (detail.evidenceType) {
    case "Direct Measurement":
      return "This record includes direct monitoring or sampling evidence. It still does not establish personal exposure by itself.";
    case "Proxy":
      return "This is pathway or facility context. It indicates plausible pressure or transport, not a measured exposure concentration.";
    case "Screening Signal":
      return "This is a screening signal. Treat it as a prioritization clue that needs confirmation from stronger source records.";
    case "Literature Evidence":
      return "This is literature-backed context. It supports interpretation, not a site-specific exposure diagnosis.";
    case "Editorial Case Study":
      return "This is editorial synthesis. It connects public records and reporting, not a standalone measurement.";
    default:
      return "This record should be interpreted with its evidence type and uncertainty note.";
  }
}

function buildPrimaryFacts(detail: ExplorerEntityDetail, rankedStats: ExplorerEntitySourceStat[]) {
  const statFacts = rankedStats.slice(0, 4).map((stat) => ({
    label: stat.label,
    value: stat.value,
    helper: getStatHelper(stat.label),
  }));

  if (statFacts.length >= 3) {
    return statFacts;
  }

  const fallbackFacts = [
    {
      label: "Evidence",
      value: detail.evidenceType,
      helper: buildMeasurementBoundary(detail),
    },
    {
      label: "Confidence",
      value: detail.confidenceLevel,
      helper: detail.uncertaintyNote,
    },
    {
      label: "Location",
      value: detail.locationLabel,
      helper: "Mapped location associated with this source-backed record.",
    },
  ];

  return [...statFacts, ...fallbackFacts].slice(0, 4);
}

function buildReadFirst(detail: ExplorerEntityDetail, rankedSources: SourceRegistryEntry[]) {
  const strongestSource = rankedSources[0] ?? null;
  const sourceLine = strongestSource
    ? `${strongestSource.shortName} backs this record as ${strongestSource.sourceType.toLowerCase()} lineage.`
    : detail.sourceIds.length
      ? `Source lineage: ${detail.sourceIds.slice(0, 3).join(", ")}.`
      : "Source lineage is not available for this record.";

  return {
    what: `${detail.category}${detail.subcategory ? ` / ${detail.subcategory}` : ""}`,
    why: detail.whyThisAppears,
    source: sourceLine,
    measuredVsInferred: buildMeasurementBoundary(detail),
  };
}

function buildSourceActions(rankedSources: SourceRegistryEntry[]) {
  return rankedSources
    .filter((source) => Boolean(source.externalUrl))
    .slice(0, 3)
    .map((source) => ({
      id: source.id,
      label: `Open ${source.shortName}`,
      href: source.externalUrl,
      sourceType: source.sourceType,
      helper: source.originSite ?? source.methodologicalUse,
    }));
}

export type EntityDetailSummary = ReturnType<typeof buildEntityDetailSummary>;

export function buildEntityDetailSummary(detail: ExplorerEntityDetail) {
  const rankedSourceIds = sortSourceIds(detail.sourceIds);
  const rankedSources = sortSources(detail.sources, detail.sourceIds);
  const rankedStats = sortStats(detail.sourceStats ?? []);
  const rankedSignals = sortSignals(detail.officialSignals);
  const chemistrySpotlight = [
    ...detail.chemicalHighlights,
    ...detail.chemicalMarkers
      .map((marker) => getChemicalMarkerLabel(marker))
      .filter((label) => !detail.chemicalHighlights.includes(label)),
  ].slice(0, 4);

  const contextSections = contextSectionOrder
    .map((entry) => ({
      key: entry.key,
      title: entry.title,
      items: detail[entry.key],
    }))
    .filter((entry) => entry.items.length > 0);

  return {
    rankedSourceIds,
    rankedSources,
    readFirst: buildReadFirst(detail, rankedSources),
    sourceActions: buildSourceActions(rankedSources),
    chemistrySpotlight,
    primaryFacts: buildPrimaryFacts(detail, rankedStats),
    primarySignals: rankedSignals.slice(0, 4),
    primaryStats: rankedStats.slice(0, 4),
    secondaryStats: rankedStats.slice(4),
    contextSections,
  };
}
