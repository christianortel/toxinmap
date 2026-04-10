import type {
  ExplorerChemicalMarker,
  ExplorerEntity,
  ExplorerSearchResult,
  ExplorerSignalFamily,
} from "@/types/explorer";

export const chemistrySeparator = " / ";

export const signalFamilyLabels: Record<ExplorerSignalFamily, string> = {
  pfas: "PFAS and fluorochemical signals",
  wastewater: "Wastewater and discharge pathways",
  "air-toxics": "Air-toxics and emissions screening",
  petrochemical: "Petrochemical and industrial release context",
  "legacy-hazard": "Legacy hazardous-site pressure",
  pharmaceuticals: "Pharmaceutical and microcontaminant context",
  plastics: "Plastics-associated chemical context",
  "power-combustion": "Power and combustion infrastructure",
  "wildlife-sentinel": "Wildlife sentinel warning signals",
  "reproductive-context": "Reproductive and fertility context",
  "legal-pressure": "Legal and enforcement pressure",
};

export const signalFamilyShortLabels: Record<ExplorerSignalFamily, string> = {
  pfas: "PFAS",
  wastewater: "Wastewater",
  "air-toxics": "Air toxics",
  petrochemical: "Petrochemical",
  "legacy-hazard": "Legacy hazard",
  pharmaceuticals: "Pharmaceuticals",
  plastics: "Plastics context",
  "power-combustion": "Power",
  "wildlife-sentinel": "Wildlife",
  "reproductive-context": "Reproductive",
  "legal-pressure": "Legal",
};

export const chemicalMarkerLabels: Record<ExplorerChemicalMarker, string> = {
  pfas: "PFAS",
  "petrochemical-volatiles": "Petrochemical volatiles",
  "chlorinated-solvents": "Chlorinated solvents",
  pharmaceuticals: "Pharmaceuticals",
  plasticizers: "Plasticizers and bisphenols",
  "combustion-pollutants": "Combustion pollutants",
  "wastewater-indicators": "Wastewater indicators",
  metals: "Metals and metal compounds",
  "legacy-industrial-mixtures": "Legacy industrial mixtures",
};

const chemicalMarkerSearchTerms: Record<ExplorerChemicalMarker, string[]> = {
  pfas: ["pfas", "forever chemicals", "perfluoroalkyl", "polyfluoroalkyl"],
  "petrochemical-volatiles": ["petrochemical", "volatile", "voc", "benzene", "toluene", "xylene"],
  "chlorinated-solvents": ["chlorinated", "solvents", "tce", "pce", "vinyl chloride", "trichloroethylene"],
  pharmaceuticals: ["pharmaceuticals", "drug residues", "medication", "carbamazepine", "fluoxetine"],
  plasticizers: ["plasticizers", "bisphenol", "bpa", "phthalates", "microplastics"],
  "combustion-pollutants": ["combustion", "soot", "particulate", "pm2.5", "nox", "sulfur dioxide"],
  "wastewater-indicators": ["wastewater", "effluent", "sewage", "discharge", "outfall"],
  metals: ["metals", "lead", "mercury", "arsenic", "cadmium", "chromium"],
  "legacy-industrial-mixtures": ["legacy", "mixtures", "superfund", "industrial contamination", "hazardous waste"],
};

export const chemicalQuickSearches = [
  { query: "PFAS", label: "PFAS" },
  { query: "PFOA", label: "PFOA" },
  { query: "PFOS", label: "PFOS" },
  { query: "GenX", label: "GenX" },
  { query: "Benzene", label: "Benzene" },
  { query: "Vinyl chloride", label: "Vinyl chloride" },
  { query: "Phthalates", label: "Phthalates" },
  { query: "Carbamazepine", label: "Carbamazepine" },
] as const;

function formatChemistryList(values: string[], limit = 2) {
  return values.slice(0, limit).join(chemistrySeparator);
}

export function getSignalFamilyLabel(
  family: ExplorerSignalFamily,
  options?: { compact?: boolean },
) {
  return options?.compact ? signalFamilyShortLabels[family] : signalFamilyLabels[family];
}

export function getChemicalMarkerLabel(marker: ExplorerChemicalMarker) {
  return chemicalMarkerLabels[marker];
}

export function getChemicalMarkerSearchTerms(marker: ExplorerChemicalMarker) {
  return chemicalMarkerSearchTerms[marker];
}

export function getChemicalSearchMatch(
  entity: ExplorerEntity,
  query: string,
): {
  score: number;
  subtitle: string;
  context: string;
  matchType: ExplorerSearchResult["matchType"];
} | null {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return null;

  const matchedHighlights = entity.chemicalHighlights.filter((highlight) =>
    highlight.toLowerCase().includes(normalizedQuery),
  );

  if (matchedHighlights.length) {
    return {
      score: matchedHighlights.some((highlight) => highlight.toLowerCase() === normalizedQuery)
        ? 160
        : 110,
      subtitle: `Chemical match / ${formatChemistryList(matchedHighlights)}`,
      context: `Matched named chemistry: ${matchedHighlights.slice(0, 3).join(", ")}`,
      matchType: "chemical",
    };
  }

  const matchedMarkers = entity.chemicalMarkers.filter((marker) => {
    const label = chemicalMarkerLabels[marker].toLowerCase();
    const aliases = chemicalMarkerSearchTerms[marker];
    return (
      label.includes(normalizedQuery) ||
      aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery))
    );
  });

  if (matchedMarkers.length) {
    const labels = matchedMarkers.map((marker) => chemicalMarkerLabels[marker]);
    return {
      score: matchedMarkers.some((marker) =>
        chemicalMarkerSearchTerms[marker].some((alias) => alias.toLowerCase() === normalizedQuery),
      )
        ? 95
        : 90,
      subtitle: `Chemistry family / ${formatChemistryList(labels)}`,
      context: `Matched chemistry family: ${labels.join(", ")}`,
      matchType: "chemical",
    };
  }

  return null;
}

export function formatChemicalHighlights(
  highlights: ExplorerEntity["chemicalHighlights"],
  limit = 2,
) {
  return formatChemistryList(highlights, limit);
}
