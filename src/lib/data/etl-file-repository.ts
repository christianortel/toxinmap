import { readFile } from "node:fs/promises";
import path from "node:path";
import { csvParse } from "d3-dsv";
import { withExplorerDefaults } from "@/lib/data/adapters";
import type {
  ExplorerEntity,
  ExplorerLayerId,
  ExplorerReleaseRecord,
} from "@/types/explorer";

type CsvRow = Record<string, string>;

type TriAggregate = {
  id: string;
  title: string;
  coordinates: [number, number];
  locationLabel: string;
  year: number;
  sourceIds: string[];
  sector: string;
  medium: string;
  totalReleaseKg: number;
  topChemicals: Array<{ name: string; quantityKg: number }>;
  pfasFlag: boolean;
  stateCode: string;
};

type EchoFacilityContext = {
  sourceIds: string[];
  officialSignals: string[];
  emergingConcerns: string[];
  legalHistoricalContext: string[];
  caseCount: number | null;
};

type ToxinmapDataCache = typeof globalThis & {
  __toxinmapEtlEntitiesCache?: Promise<ExplorerEntity[]>;
  __toxinmapEtlLayerEntitiesCache?: Map<ExplorerLayerId, Promise<ExplorerEntity[]>>;
  __toxinmapTriAggregateCache?: Promise<{
    grouped: Map<string, TriAggregate>;
    releaseMap: Map<string, ExplorerReleaseRecord[]>;
  }>;
  __toxinmapUsgsPfasRowsCache?: Promise<CsvRow[]>;
  __toxinmapAtsdrPfasRowsCache?: Promise<CsvRow[]>;
  __toxinmapNpdesRowsCache?: Promise<CsvRow[]>;
  __toxinmapPharmaRowsCache?: Promise<CsvRow[]>;
  __toxinmapEchoRowsCache?: Promise<CsvRow[]>;
  __toxinmapFrsRowsCache?: Promise<CsvRow[]>;
  __toxinmapEchoFacilityContextCache?: Promise<Map<string, EchoFacilityContext>>;
  __toxinmapTriReleaseCache?: Promise<Map<string, ExplorerReleaseRecord[]>>;
};

function getToxinmapDataCache() {
  return globalThis as ToxinmapDataCache;
}

function getEtlLayerEntitiesCache() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapEtlLayerEntitiesCache ??= new Map();
  return cache.__toxinmapEtlLayerEntitiesCache;
}

function cleanedFile(...parts: string[]) {
  return path.join(process.cwd(), "scripts", "etl", "cleaned", ...parts);
}

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRegistryValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return trimmed.endsWith(".0") ? trimmed.slice(0, -2) : trimmed;
}

function normalizeRegistrySlug(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("frs-")) return trimmed;
  return `frs-${normalizeRegistryValue(trimmed.slice(4))}`;
}

function parseYear(value: string | undefined, fallback = new Date().getUTCFullYear()) {
  const parsed = parseNumber(value);
  return parsed ? Math.round(parsed) : fallback;
}

function getPersistentContextFallbackYearStart() {
  return new Date().getUTCFullYear() - 1;
}

function parsePythonList(value: string | undefined) {
  if (!value) return [] as string[];
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed.replace(/'/g, '"')) as string[];
  } catch {
    return trimmed
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((entry) => entry.trim().replace(/^'+|'+$/g, "").replace(/^"+|"+$/g, ""))
      .filter(Boolean);
  }
}

function parsePythonDict(value: string | undefined) {
  if (!value) return {} as Record<string, unknown>;
  const trimmed = value.trim();
  if (!trimmed) return {} as Record<string, unknown>;

  try {
    return JSON.parse(
      trimmed
        .replace(/'/g, '"')
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\bNone\b/g, "null"),
    ) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

async function readCsv(filePath: string) {
  try {
    const raw = await readFile(filePath, "utf8");
    return csvParse(raw) as CsvRow[];
  } catch {
    return [] as CsvRow[];
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function parseSourceStatNumber(entity: ExplorerEntity, label: string) {
  const rawValue = entity.sourceStats?.find((entry) => entry.label === label)?.value;
  if (!rawValue) return 0;
  const normalized = rawValue.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!normalized) return 0;
  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferChemicalMarkers(highlights: string[], medium: string, sector: string, pfasFlag: boolean) {
  const markers = new Set<ExplorerEntity["chemicalMarkers"][number]>();
  const loweredSector = sector.toLowerCase();
  const loweredHighlights = highlights.map((item) => item.toLowerCase());

  if (pfasFlag || loweredHighlights.some((item) => item.includes("pfas") || item.includes("pfoa") || item.includes("pfos") || item.includes("genx"))) {
    markers.add("pfas");
  }
  if (medium === "water") {
    markers.add("wastewater-indicators");
  }
  if (medium === "air") {
    markers.add("combustion-pollutants");
  }
  if (
    loweredSector.includes("chemical") ||
    loweredSector.includes("petroleum") ||
    loweredHighlights.some((item) => item.includes("benzene") || item.includes("styrene") || item.includes("butadiene"))
  ) {
    markers.add("petrochemical-volatiles");
  }
  if (
    loweredHighlights.some(
      (item) =>
        item.includes("carbamazepine") ||
        item.includes("metformin") ||
        item.includes("fluoxetine") ||
        item.includes("sulfamethoxazole"),
    )
  ) {
    markers.add("pharmaceuticals");
  }
  if (loweredHighlights.some((item) => item.includes("phthalate") || item.includes("bisphenol"))) {
    markers.add("plasticizers");
  }
  if (loweredHighlights.some((item) => item.includes("lead") || item.includes("mercury") || item.includes("chromium"))) {
    markers.add("metals");
  }

  return Array.from(markers);
}

function inferSignalFamilies(
  markers: ExplorerEntity["chemicalMarkers"],
  medium: string,
  tags: ExplorerEntity["tags"],
) {
  const families = new Set<ExplorerEntity["signalFamilies"][number]>();

  for (const marker of markers) {
    if (marker === "pfas") families.add("pfas");
    if (marker === "wastewater-indicators" || marker === "pharmaceuticals") families.add("wastewater");
    if (marker === "pharmaceuticals") families.add("pharmaceuticals");
    if (marker === "combustion-pollutants") families.add("air-toxics");
    if (marker === "petrochemical-volatiles" || marker === "plasticizers") families.add("petrochemical");
    if (marker === "plasticizers") families.add("plastics");
    if (marker === "metals" || marker === "chlorinated-solvents" || marker === "legacy-industrial-mixtures") {
      families.add("legacy-hazard");
    }
  }

  if (medium === "air") families.add("air-toxics");
  if (medium === "water") families.add("wastewater");
  if (tags.includes("litigation")) families.add("legal-pressure");

  return Array.from(families);
}

async function loadTriAggregates() {
  const rows = await readCsv(cleanedFile("epa-tri", "tri_basic_2024_US_normalized.csv"));
  const grouped = new Map<string, TriAggregate>();
  const releaseMap = new Map<string, ExplorerReleaseRecord[]>();

  for (const row of rows) {
    const slug = normalizeRegistrySlug(row.slug);
    const latitude = parseNumber(row.latitude);
    const longitude = parseNumber(row.longitude);
    const year = parseYear(row.year, 2024);

    if (!slug || latitude === null || longitude === null) continue;

    const chemicalName = row.chemical?.trim();
    const quantityKg = parseNumber(row.total_release_kg) ?? 0;
    const sourceIds = uniqueStrings(["epa-tri", row.frs_id ? "epa-frs" : null]);
    const medium = (row.dominant_release_medium?.trim().toLowerCase() || "air") as string;
    const sector = row.industry_sector?.trim() || "Industrial release context";
    const locationLabel = uniqueStrings([row.city, row.st]).join(", ");
    const existing = grouped.get(slug);

    const nextChemicals = existing?.topChemicals ?? [];
    if (chemicalName) {
      const found = nextChemicals.find((item) => item.name === chemicalName);
      if (found) {
        found.quantityKg += quantityKg;
      } else {
        nextChemicals.push({ name: chemicalName, quantityKg });
      }
    }

    grouped.set(slug, {
      id: slug,
      title: row.facility_name?.trim() || slug,
      coordinates: [longitude, latitude],
      locationLabel: locationLabel || "United States",
      year,
      sourceIds,
      sector,
      medium,
      totalReleaseKg: (existing?.totalReleaseKg ?? 0) + quantityKg,
      topChemicals: nextChemicals.sort((left, right) => right.quantityKg - left.quantityKg).slice(0, 6),
      pfasFlag: (row.pfas?.trim().toUpperCase() || "NO") === "YES",
      stateCode: row.st?.trim() || "",
    });

    const currentReleaseRows = releaseMap.get(slug) ?? [];
    if (chemicalName) {
      currentReleaseRows.push({
        id: `tri-${slug}-${chemicalName}-${year}`,
        chemicalName,
        reportingYear: year,
        quantityKg,
        releaseMedium: medium,
        sourceId: "epa-tri",
      });
      releaseMap.set(
        slug,
        currentReleaseRows
          .sort((left, right) => (right.quantityKg ?? 0) - (left.quantityKg ?? 0))
          .slice(0, 8),
      );
    }
  }

  return { grouped, releaseMap };
}

async function loadTriSourceRows() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapTriAggregateCache ??= loadTriAggregates();
  const aggregates = await cache.__toxinmapTriAggregateCache;
  cache.__toxinmapTriReleaseCache = Promise.resolve(aggregates.releaseMap);
  return aggregates;
}

async function loadUsgsPfasRows() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapUsgsPfasRowsCache ??= readCsv(
    cleanedFile("usgs-pfas", "usgs_pfas_tapwater_points.csv"),
  );
  return cache.__toxinmapUsgsPfasRowsCache;
}

async function loadAtsdrPfasRows() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapAtsdrPfasRowsCache ??= readCsv(
    path.join(
      process.cwd(),
      "scripts",
      "etl",
      "transforms",
      "atsdr-pfas",
      "atsdr_pfas_sites_load_rows.csv",
    ),
  );
  return cache.__toxinmapAtsdrPfasRowsCache;
}

async function loadNpdesRows() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapNpdesRowsCache ??= readCsv(
    cleanedFile("epa-npdes", "npdes_wastewater_context.csv"),
  );
  return cache.__toxinmapNpdesRowsCache;
}

async function loadPharmaRows() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapPharmaRowsCache ??= readCsv(
    cleanedFile("usgs-pharma", "great_lakes_pharma_sampling_sites.csv"),
  );
  return cache.__toxinmapPharmaRowsCache;
}

async function loadEchoRows() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapEchoRowsCache ??= readCsv(
    path.join(
      process.cwd(),
      "scripts",
      "etl",
      "transforms",
      "epa-echo",
      "icis_fec_facility_updates.csv",
    ),
  );
  return cache.__toxinmapEchoRowsCache;
}

async function loadFrsRows() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapFrsRowsCache ??= readCsv(cleanedFile("epa-frs", "frs_facility_crosswalk.csv"));
  return cache.__toxinmapFrsRowsCache;
}

async function loadEchoFacilityContext() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapEchoFacilityContextCache ??= loadEchoRows().then((rows) =>
    buildEchoFacilityContextMap(rows),
  );
  return cache.__toxinmapEchoFacilityContextCache;
}

function buildTriEntities(aggregates: Map<string, TriAggregate>) {
  return Array.from(aggregates.values()).map((record) => {
    const tags = uniqueStrings([
      record.medium === "water" ? "downstream" : null,
      record.medium === "water" ? "drinking-water" : null,
      record.medium === "air" ? "community-pressure" : null,
      record.pfasFlag ? "drinking-water" : null,
    ]) as ExplorerEntity["tags"];
    const chemicalHighlights = record.topChemicals.map((item) => item.name).slice(0, 3);
    const chemicalMarkers = inferChemicalMarkers(
      chemicalHighlights,
      record.medium,
      record.sector,
      record.pfasFlag,
    );
    const signalFamilies = inferSignalFamilies(chemicalMarkers, record.medium, tags);

    return withExplorerDefaults({
      id: record.id,
      title: record.title,
      geometryType: "point",
      coordinates: record.coordinates,
      layerGroup: "official",
      layerId: "industrial-sites",
      category: "Facility footprint",
      subcategory: record.sector,
      locationLabel: record.locationLabel,
      summary: `EPA TRI facility record with ${record.topChemicals.length} tracked chemical release entries in the current local ETL output.`,
      whyThisAppears:
        "This appears because the local EPA TRI normalization produced a facility-level release record that toxinmap can use before the database load is available.",
      dateLabel: `${record.year}`,
      yearStart: record.year,
      yearEnd: record.year,
      evidenceType: "Direct Measurement",
      confidenceLevel: "High",
      tags,
      signalFamilies,
      chemicalMarkers,
      chemicalHighlights,
      sourceIds: record.sourceIds,
      relatedCaseStudyIds: [],
      officialSignals: [
        "EPA TRI reported release context",
        `Dominant medium: ${record.medium}`,
      ],
      emergingConcerns: record.pfasFlag ? ["PFAS-tagged TRI reporting present in normalized output."] : [],
      wildlifeSentinelContext: [],
      reproductiveHealthContext: [],
      legalHistoricalContext: [],
      uncertaintyNote:
        "This ETL-backed point reflects normalized TRI facility reporting, not a complete exposure or transport history.",
      sourceStats: [
        { label: "Top chemicals", value: String(record.topChemicals.length) },
        { label: "Release total", value: `${Math.round(record.totalReleaseKg).toLocaleString()} kg` },
      ],
    });
  });
}

function markerHighlight(marker: ExplorerEntity["chemicalMarkers"][number]) {
  switch (marker) {
    case "pfas":
      return "PFAS";
    case "petrochemical-volatiles":
      return "Petrochemical releases";
    case "chlorinated-solvents":
      return "Chlorinated solvents";
    case "pharmaceuticals":
      return "Pharmaceuticals";
    case "plasticizers":
      return "Plasticizers";
    case "combustion-pollutants":
      return "Combustion pollutants";
    case "wastewater-indicators":
      return "Wastewater indicators";
    case "metals":
      return "Metals";
    case "legacy-industrial-mixtures":
      return "Industrial mixtures";
    default:
      return null;
  }
}

const strictPowerGenerationNaics = new Set(["221112", "221117"]);
const conditionalPowerGenerationNaics = new Set(["221118", "221119"]);
const powerGenerationNamePattern =
  /GENERATING STATION|POWER PLANT|ENERGY FACILITY|ENERGY CENTER|PEAKING PLANT|COGENERATION|COMBUSTION TURBINE|GENERATION/i;
const cleanupProgramPattern = /CERCL|CORRACTS|SEMS|UST/i;
const hazardNamePattern =
  /LANDFILL|SUPERFUND|DISPOSAL|HAZARDOUS|REMEDIATION|RECOVERY|BROWNSFIELD|DUMP|SALVAGE|INCINERAT|WASTE(?!WATER)|WASTE OIL|SCRAP/i;

function isPowerPlantRow(row: CsvRow) {
  const naicsCode = row.naics_code?.trim() || "";
  const facilityName = row.fac_name?.trim() || "";
  const latitude = parseNumber(row.latitude_measure);
  const longitude = parseNumber(row.longitude_measure);
  if (latitude === null || longitude === null) return false;

  return (
    strictPowerGenerationNaics.has(naicsCode) ||
    (conditionalPowerGenerationNaics.has(naicsCode) && powerGenerationNamePattern.test(facilityName))
  );
}

function powerGenerationClassLabel(row: CsvRow) {
  switch (row.naics_code?.trim()) {
    case "221112":
      return "Fossil-fuel electric generation";
    case "221117":
      return "Biomass electric generation";
    case "221118":
      return "Other electric generation";
    case "221119":
      return "Other generation context";
    default:
      return "Generation facility";
  }
}

function isHazardousSiteRow(row: CsvRow) {
  const latitude = parseNumber(row.latitude_measure);
  const longitude = parseNumber(row.longitude_measure);
  if (latitude === null || longitude === null) return false;

  const programs = row.program_acronyms?.trim() || "";
  const facilityName = row.fac_name?.trim() || "";
  const naicsCode = row.naics_code?.trim() || "";
  const triLinked = row.tri_ids?.trim() && row.tri_ids.trim() !== "[]";

  return (
    cleanupProgramPattern.test(programs) ||
    (naicsCode.startsWith("5621") ||
      naicsCode.startsWith("5622") ||
      naicsCode.startsWith("5629")) &&
      hazardNamePattern.test(facilityName) ||
    (hazardNamePattern.test(facilityName) && /RCRAINFO|TSCA|ICIS|AIR|NPDES|SEMS/i.test(programs)) ||
    (Boolean(triLinked) &&
      /RCRAINFO|TSCA|SEMS/i.test(programs) &&
      /CHEM|LANDFILL|WASTE(?!WATER)|DISPOSAL|RECOVERY|METAL|PETRO|PLANT/i.test(facilityName))
  );
}

function buildHazardousSiteEntities(
  rows: CsvRow[],
  triAggregates: Map<string, TriAggregate>,
  echoFacilityContext: Map<string, EchoFacilityContext>,
) {
  return rows
    .filter(isHazardousSiteRow)
    .map((row) => {
      const latitude = parseNumber(row.latitude_measure)!;
      const longitude = parseNumber(row.longitude_measure)!;
      const id = normalizeRegistrySlug(row.slug);
      const triAggregate = triAggregates.get(id);
      const echoContext = echoFacilityContext.get(id);
      const programAcronyms = parsePythonList(row.program_acronyms);
      const triIds = parsePythonList(row.tri_ids);
      const relatedCaseStudyIds = parsePythonList(row.related_case_studies);
      const hasCleanupProgram = programAcronyms.some((value) => cleanupProgramPattern.test(value));
      const hazardClass = hasCleanupProgram
        ? "Cleanup / legacy hazard site"
        : row.naics_code?.trim()?.startsWith("562")
          ? "Waste and disposal facility"
          : "Hazard-linked industrial site";
      const tags = uniqueStrings([
        "community-pressure",
        /NPDES/i.test(row.program_acronyms || "") ? "downstream" : null,
        echoContext ? "litigation" : null,
      ]) as ExplorerEntity["tags"];
      const chemicalMarkers = uniqueStrings([
        "legacy-industrial-mixtures",
        triAggregate?.medium === "air" ? "combustion-pollutants" : null,
        triAggregate?.medium === "water" ? "wastewater-indicators" : null,
        triAggregate?.topChemicals.some((item) =>
          /lead|mercury|chromium|arsenic/i.test(item.name),
        )
          ? "metals"
          : null,
        triAggregate?.topChemicals.some((item) =>
          /trichloro|perchloro|vinyl chloride/i.test(item.name),
        )
          ? "chlorinated-solvents"
          : null,
      ]) as ExplorerEntity["chemicalMarkers"];
      const chemicalHighlights = uniqueStrings([
        ...(triAggregate?.topChemicals.map((item) => item.name).slice(0, 3) ?? []),
        !triAggregate && hasCleanupProgram ? "Legacy hazard context" : null,
      ]);
      const signalFamilies = uniqueStrings([
        "legacy-hazard",
        triAggregate?.medium === "air" ? "air-toxics" : null,
        triAggregate?.medium === "water" ? "wastewater" : null,
        echoContext ? "legal-pressure" : null,
      ]) as ExplorerEntity["signalFamilies"];
      const sourceIds = uniqueStrings([
        "epa-frs",
        hasCleanupProgram ? "epa-sems" : null,
        triIds.length ? "epa-tri" : null,
        echoContext ? "epa-echo" : null,
      ]);
      const officialSignals = uniqueStrings([
        "EPA FRS hazard-linked facility identity",
        `Hazard class: ${hazardClass}`,
        `Programs linked: ${programAcronyms.length}`,
        programAcronyms.length ? `Cleanup programs: ${programAcronyms.slice(0, 4).join(", ")}` : null,
        triIds.length ? `TRI-linked ids: ${triIds.length}` : null,
        triAggregate
          ? `TRI normalized release total: ${Math.round(triAggregate.totalReleaseKg).toLocaleString()} kg`
          : null,
        ...(echoContext?.officialSignals ?? []),
      ]);
      const emergingConcerns = uniqueStrings([
        "Hazard and cleanup-linked sites can remain locally important long after a single emission snapshot stops making the risk legible.",
        hasCleanupProgram
          ? "Cleanup-program visibility is strong for legacy contamination geography, but present-day surrounding exposure still requires care."
          : null,
        ...(echoContext?.emergingConcerns ?? []),
      ]);
      const legalHistoricalContext = uniqueStrings([
        ...(echoContext?.legalHistoricalContext ?? []),
        hasCleanupProgram ? "Cleanup-program linkage indicates a legacy hazard or remediation footprint." : null,
      ]);

      return withExplorerDefaults({
        id: `hazard-${id}`,
        title: row.fac_name?.trim() || id,
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "official",
        layerId: "hazardous-sites",
        category: "Hazard registry",
        subcategory: hazardClass,
        locationLabel:
          row.location_label?.trim() ||
          uniqueStrings([row.fac_city, row.fac_state]).join(", ") ||
          "United States",
        summary: triAggregate
          ? "Hazard-linked site with cleanup / disposal context and TRI-linked industrial signals from the local ETL output."
          : "Hazard-linked site with cleanup or disposal context from the local ETL output.",
        whyThisAppears:
          "This appears because the current federal crosswalk already exposes legacy-hazard, disposal, and cleanup-program footprints that should remain visible in the toxin map even before a fuller database load.",
        dateLabel: "FRS current",
        yearStart: getPersistentContextFallbackYearStart(),
        yearEnd: new Date().getUTCFullYear(),
        evidenceType: "Proxy",
        confidenceLevel: "High",
        tags,
        signalFamilies,
        chemicalMarkers,
        chemicalHighlights,
        sourceIds,
        relatedCaseStudyIds,
        officialSignals,
        emergingConcerns,
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext,
        uncertaintyNote:
          "This ETL-backed hazard point is a cleanup, disposal, or legacy-hazard footprint marker, not a complete current exposure measurement.",
        sourceStats: [
          { label: "Hazard class", value: hazardClass },
          { label: "Programs", value: String(programAcronyms.length) },
          { label: "TRI ids", value: String(triIds.length) },
          ...(triAggregate
            ? [
                {
                  label: "Release total",
                  value: `${Math.round(triAggregate.totalReleaseKg).toLocaleString()} kg`,
                },
              ]
            : []),
          ...(echoContext?.caseCount !== null && echoContext?.caseCount !== undefined
            ? [{ label: "Federal cases", value: String(echoContext.caseCount) }]
            : []),
        ],
      });
    });
}

function buildFrsIndustrialEntities(
  rows: CsvRow[],
  triAggregates: Map<string, TriAggregate>,
  echoFacilityContext: Map<string, EchoFacilityContext>,
) {
  return rows
    .filter((row) => {
      const latitude = parseNumber(row.latitude_measure);
      const longitude = parseNumber(row.longitude_measure);
      const triIds = parsePythonList(row.tri_ids);
      return latitude !== null && longitude !== null && triIds.length > 0;
    })
    .map((row) => {
      const latitude = parseNumber(row.latitude_measure)!;
      const longitude = parseNumber(row.longitude_measure)!;
      const id = normalizeRegistrySlug(row.slug);
      const triAggregate = triAggregates.get(id);
      const echoContext = echoFacilityContext.get(id);
      const tags = parsePythonList(row.tags) as ExplorerEntity["tags"];
      const triIds = parsePythonList(row.tri_ids);
      const programAcronyms = parsePythonList(row.program_acronyms);
      const relatedCaseStudyIds = parsePythonList(row.related_case_studies);
      const chemicalMarkers = inferChemicalMarkers(
        [row.fac_name, row.naics_code].filter(Boolean) as string[],
        programAcronyms.some((value) => value.includes("NPDES")) ? "water" : "air",
        row.naics_code || row.fac_name || "Industrial facility",
        false,
      );
      const chemicalHighlights = uniqueStrings(
        chemicalMarkers
          .map(markerHighlight)
          .filter(
            (value): value is Exclude<ReturnType<typeof markerHighlight>, null> => value !== null,
          )
          .slice(0, 3),
      );
      const signalFamilies = inferSignalFamilies(
        chemicalMarkers,
        programAcronyms.some((value) => value.includes("NPDES")) ? "water" : "air",
        tags,
      );
      const sourceIds = uniqueStrings([
        "epa-frs",
        triIds.length ? "epa-tri" : null,
        echoContext ? "epa-echo" : null,
      ]);
      const officialSignals = uniqueStrings([
        "EPA FRS facility identity",
        triIds.length ? `TRI-linked ids: ${triIds.length}` : null,
        `Programs linked: ${programAcronyms.length}`,
        triAggregate
          ? `TRI normalized release total: ${Math.round(triAggregate.totalReleaseKg).toLocaleString()} kg`
          : null,
        ...(echoContext?.officialSignals ?? []),
      ]);
      const emergingConcerns = uniqueStrings([
        "FRS industrial footprints improve national facility visibility but are not direct release measurements on their own.",
        ...(echoContext?.emergingConcerns ?? []),
      ]);
      const legalHistoricalContext = uniqueStrings([
        ...(echoContext?.legalHistoricalContext ?? []),
        programAcronyms.some((value) => value.includes("ICIS"))
          ? "Cross-program regulatory linkage present through EPA facility systems."
          : null,
      ]);
      const sourceStats = [
        { label: "TRI ids", value: String(triIds.length) },
        { label: "Programs", value: String(programAcronyms.length) },
        ...(row.naics_code?.trim() ? [{ label: "NAICS", value: row.naics_code.trim() }] : []),
        ...(triAggregate
          ? [
              {
                label: "Release total",
                value: `${Math.round(triAggregate.totalReleaseKg).toLocaleString()} kg`,
              },
              {
                label: "Top chemicals",
                value: String(triAggregate.topChemicals.length),
              },
            ]
          : []),
        ...(echoContext?.caseCount !== null && echoContext?.caseCount !== undefined
          ? [{ label: "Federal cases", value: String(echoContext.caseCount) }]
          : []),
      ];

      return withExplorerDefaults({
        id,
        title: row.fac_name?.trim() || id,
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "official",
        layerId: "industrial-sites",
        category: "Facility footprint",
        subcategory: row.naics_code?.trim() ? `NAICS ${row.naics_code.trim()}` : "FRS industrial footprint",
        locationLabel: row.location_label?.trim() || uniqueStrings([row.fac_city, row.fac_state]).join(", ") || "United States",
        summary: triAggregate
          ? `EPA facility footprint with TRI-linked identity, ${triAggregate.topChemicals.length} tracked chemicals, and cross-program facility metadata from the local ETL output.`
          : "EPA FRS facility footprint with TRI-linked identity and cross-program facility metadata from the local ETL output.",
        whyThisAppears:
          "This appears because the FRS crosswalk shows a mappable facility with TRI-linked program identity, which broadens industrial coverage before the database load is available.",
        dateLabel: "FRS current",
        yearStart: new Date().getUTCFullYear(),
        yearEnd: new Date().getUTCFullYear(),
        evidenceType: "Proxy",
        confidenceLevel: "High",
        tags,
        signalFamilies,
        chemicalMarkers,
        chemicalHighlights,
        sourceIds,
        relatedCaseStudyIds,
        officialSignals,
        emergingConcerns,
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext,
        uncertaintyNote:
          "This ETL-backed industrial point is a cross-program facility footprint derived from FRS linkage, not a complete on-site release history.",
        sourceStats,
      });
    });
}

function buildPowerPlantEntities(
  rows: CsvRow[],
  triAggregates: Map<string, TriAggregate>,
  echoFacilityContext: Map<string, EchoFacilityContext>,
) {
  return rows
    .filter(isPowerPlantRow)
    .map((row) => {
      const latitude = parseNumber(row.latitude_measure)!;
      const longitude = parseNumber(row.longitude_measure)!;
      const id = normalizeRegistrySlug(row.slug);
      const triAggregate = triAggregates.get(id);
      const echoContext = echoFacilityContext.get(id);
      const programAcronyms = parsePythonList(row.program_acronyms);
      const triIds = parsePythonList(row.tri_ids);
      const relatedCaseStudyIds = parsePythonList(row.related_case_studies);
      const generationClass = powerGenerationClassLabel(row);
      const tags = uniqueStrings([
        "community-pressure",
        programAcronyms.some((value) => value.includes("NPDES")) ? "downstream" : null,
      ]) as ExplorerEntity["tags"];
      const chemicalMarkers = uniqueStrings([
        "combustion-pollutants",
        programAcronyms.some((value) => value.includes("NPDES")) ? "wastewater-indicators" : null,
      ]) as ExplorerEntity["chemicalMarkers"];
      const signalFamilies = uniqueStrings([
        "power-combustion",
        "air-toxics",
        programAcronyms.some((value) => value.includes("NPDES")) ? "wastewater" : null,
      ]) as ExplorerEntity["signalFamilies"];
      const sourceIds = uniqueStrings([
        "epa-frs",
        triIds.length ? "epa-tri" : null,
        echoContext ? "epa-echo" : null,
      ]);
      const officialSignals = uniqueStrings([
        "EPA FRS generation facility identity",
        `Generation class: ${generationClass}`,
        `Programs linked: ${programAcronyms.length}`,
        triIds.length ? `TRI-linked ids: ${triIds.length}` : null,
        triAggregate
          ? `TRI normalized release total: ${Math.round(triAggregate.totalReleaseKg).toLocaleString()} kg`
          : null,
        ...(echoContext?.officialSignals ?? []),
      ]);
      const emergingConcerns = uniqueStrings([
        "Generation-facility infrastructure should be read as source context, not a direct local exposure measurement.",
        programAcronyms.some((value) => value.includes("NPDES"))
          ? "Water-linked permits can matter downstream around cooling-water and discharge pathways."
          : null,
        ...(echoContext?.emergingConcerns ?? []),
      ]);
      const legalHistoricalContext = uniqueStrings([
        ...(echoContext?.legalHistoricalContext ?? []),
        echoContext ? "Regulatory context is available through the FRS / ECHO generation-facility join." : null,
      ]);

      return withExplorerDefaults({
        id: `power-${id}`,
        title: row.fac_name?.trim() || id,
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "official",
        layerId: "power-plants",
        category: "Energy infrastructure",
        subcategory: generationClass,
        locationLabel:
          row.location_label?.trim() ||
          uniqueStrings([row.fac_city, row.fac_state]).join(", ") ||
          "United States",
        summary: triAggregate
          ? `Generation facility footprint with TRI-linked release context and cross-program regulatory linkage from the local ETL output.`
          : `Generation facility footprint with FRS-linked power infrastructure context from the local ETL output.`,
        whyThisAppears:
          "This appears because the FRS crosswalk exposes mappable generation facilities that widen the toxin map beyond industrial plants without pretending they are all direct release records.",
        dateLabel: "FRS current",
        yearStart: new Date().getUTCFullYear(),
        yearEnd: new Date().getUTCFullYear(),
        evidenceType: "Proxy",
        confidenceLevel: "High",
        tags,
        signalFamilies,
        chemicalMarkers,
        chemicalHighlights: ["Combustion pollutants"],
        sourceIds,
        relatedCaseStudyIds,
        officialSignals,
        emergingConcerns,
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext,
        uncertaintyNote:
          "This ETL-backed power-facility point is a generation and permitting context marker, not a complete emission or exposure history.",
        sourceStats: [
          { label: "Generation class", value: generationClass },
          { label: "Programs", value: String(programAcronyms.length) },
          { label: "TRI ids", value: String(triIds.length) },
          ...(triAggregate
            ? [
                {
                  label: "Release total",
                  value: `${Math.round(triAggregate.totalReleaseKg).toLocaleString()} kg`,
                },
              ]
            : []),
          ...(echoContext?.caseCount !== null && echoContext?.caseCount !== undefined
            ? [{ label: "Federal cases", value: String(echoContext.caseCount) }]
            : []),
        ],
      });
    });
}

function buildAirToxicsRegionEntities(entities: ExplorerEntity[]) {
  const candidateEntities = entities.filter(
    (entity) =>
      entity.signalFamilies.includes("air-toxics") &&
      ["industrial-sites", "legal-markers", "power-plants", "hazardous-sites"].includes(entity.layerId),
  );

  const gridBuckets = new Map<
    string,
    {
      members: ExplorerEntity[];
      lonTotal: number;
      latTotal: number;
      weightedLonTotal: number;
      weightedLatTotal: number;
      weightTotal: number;
      cityLabels: string[];
      stateCodes: Set<string>;
      sourceIds: Set<string>;
      chemicalHighlights: Map<string, number>;
      chemicalMarkers: Map<ExplorerEntity["chemicalMarkers"][number], number>;
      sectorLabels: Map<string, number>;
      totalReleaseKg: number;
      triAirFacilities: number;
      industrialCount: number;
      powerCount: number;
      legalCount: number;
      cleanupCount: number;
      modeledScore: number;
    }
  >();

  for (const entity of candidateEntities) {
    const [longitude, latitude] = entity.coordinates;
    const latBucket = Math.round(latitude / 1.5);
    const lonBucket = Math.round(longitude / 1.5);
    const gridKey = `${latBucket}:${lonBucket}`;
    const releaseKg = parseSourceStatNumber(entity, "Release total");
    const hasTri = entity.sourceIds.includes("epa-tri");
    const hasEcho = entity.sourceIds.includes("epa-echo") || entity.layerId === "legal-markers";
    const hasSems = entity.sourceIds.includes("epa-sems") || entity.layerId === "hazardous-sites";
    const hasPower = entity.layerId === "power-plants";
    const weight =
      1 +
      Math.log10(releaseKg + 10) * 4 +
      (hasTri ? 8 : 0) +
      (hasPower ? 4 : 0) +
      (hasEcho ? 3 : 0) +
      (hasSems ? 2 : 0);
    const modeledContribution =
      releaseKg + (hasTri ? 20_000 : 0) + (hasEcho ? 7_500 : 0) + (hasPower ? 5_000 : 0) + (hasSems ? 3_500 : 0);
    const locationState = entity.locationLabel.split(",").at(-1)?.trim();
    const bucket = gridBuckets.get(gridKey) ?? {
      members: [],
      lonTotal: 0,
      latTotal: 0,
      weightedLonTotal: 0,
      weightedLatTotal: 0,
      weightTotal: 0,
      cityLabels: [],
      stateCodes: new Set<string>(),
      sourceIds: new Set<string>(),
      chemicalHighlights: new Map<string, number>(),
      chemicalMarkers: new Map<ExplorerEntity["chemicalMarkers"][number], number>(),
      sectorLabels: new Map<string, number>(),
      totalReleaseKg: 0,
      triAirFacilities: 0,
      industrialCount: 0,
      powerCount: 0,
      legalCount: 0,
      cleanupCount: 0,
      modeledScore: 0,
    };

    bucket.members.push(entity);
    bucket.lonTotal += longitude;
    bucket.latTotal += latitude;
    bucket.weightedLonTotal += longitude * weight;
    bucket.weightedLatTotal += latitude * weight;
    bucket.weightTotal += weight;
    bucket.cityLabels.push(entity.locationLabel);
    if (locationState) {
      bucket.stateCodes.add(locationState);
    }
    if (entity.layerId === "legal-markers" || hasEcho) {
      bucket.legalCount += 1;
    }
    if (hasSems) {
      bucket.cleanupCount += 1;
    }
    if (entity.layerId === "power-plants") {
      bucket.powerCount += 1;
    }
    if (entity.layerId === "industrial-sites") {
      bucket.industrialCount += 1;
    }
    if (hasTri) {
      bucket.triAirFacilities += 1;
    }
    bucket.totalReleaseKg += releaseKg;
    bucket.modeledScore += modeledContribution;

    for (const sourceId of entity.sourceIds) {
      bucket.sourceIds.add(sourceId);
    }

    if (entity.subcategory) {
      bucket.sectorLabels.set(entity.subcategory, (bucket.sectorLabels.get(entity.subcategory) ?? 0) + 1);
    }

    for (const highlight of entity.chemicalHighlights) {
      bucket.chemicalHighlights.set(
        highlight,
        (bucket.chemicalHighlights.get(highlight) ?? 0) + 1,
      );
    }

    for (const marker of entity.chemicalMarkers) {
      bucket.chemicalMarkers.set(
        marker,
        (bucket.chemicalMarkers.get(marker) ?? 0) + 1,
      );
    }

    gridBuckets.set(gridKey, bucket);
  }

  return Array.from(gridBuckets.entries())
    .map(([gridKey, bucket]) => {
      if (bucket.members.length < 12 || bucket.triAirFacilities < 4) return null;

      const centroid: [number, number] = [
        bucket.weightTotal > 0 ? bucket.weightedLonTotal / bucket.weightTotal : bucket.lonTotal / bucket.members.length,
        bucket.weightTotal > 0 ? bucket.weightedLatTotal / bucket.weightTotal : bucket.latTotal / bucket.members.length,
      ];
      const dominantLocation =
        Array.from(
          bucket.cityLabels.reduce((accumulator, label) => {
            accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
            return accumulator;
          }, new Map<string, number>()),
        ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "United States";
      const topHighlights = Array.from(bucket.chemicalHighlights.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([label]) => label);
      const topMarkers = Array.from(bucket.chemicalMarkers.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([marker]) => marker);
      const topSectors = Array.from(bucket.sectorLabels.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([label]) => label);
      const sourceIds = Array.from(bucket.sourceIds);

      return withExplorerDefaults({
        id: `air-hotspot-${gridKey.replace(":", "-")}`,
        title: `${dominantLocation} modeled air-toxics region`,
        geometryType: "region",
        coordinates: centroid,
        radiusKm: 135,
        layerGroup: "emerging",
        layerId: "air-toxics-regions",
        category: "Modeled air-toxics context",
        subcategory: "ETL-derived air release burden region",
        locationLabel: dominantLocation,
        summary: `Screening-level air-toxics region synthesized from ${bucket.triAirFacilities} TRI air-linked facilities, ${bucket.powerCount} generation records, and ${Math.round(bucket.totalReleaseKg).toLocaleString()} kg of reported releases in the current ETL-backed atlas output.`,
        whyThisAppears:
          "This appears because clustered TRI air-release geography, generation infrastructure, and legal-pressure overlap can expose modeled burden regions before a fuller national burden grid is loaded into the database.",
        dateLabel: "Current ETL view",
        yearStart: 2024,
        yearEnd: 2026,
        evidenceType: "Screening Signal",
        confidenceLevel: bucket.legalCount > 0 && bucket.totalReleaseKg >= 100_000 ? "High" : "Moderate",
        tags: ["community-pressure", ...(bucket.legalCount ? (["litigation"] as const) : [])],
        signalFamilies: uniqueStrings([
          "air-toxics",
          "petrochemical",
          bucket.powerCount ? "power-combustion" : null,
          bucket.legalCount ? "legal-pressure" : null,
          bucket.cleanupCount ? "legacy-hazard" : null,
        ]) as ExplorerEntity["signalFamilies"],
        chemicalMarkers: topMarkers,
        chemicalHighlights: topHighlights,
        sourceIds,
        relatedCaseStudyIds: Array.from(
          new Set(bucket.members.flatMap((entity) => entity.relatedCaseStudyIds)),
        ).slice(0, 4),
        officialSignals: uniqueStrings([
          `${bucket.triAirFacilities} TRI air-linked facilities contribute to this modeled region.`,
          `${Math.round(bucket.totalReleaseKg).toLocaleString()} kg of reported releases are represented across contributing records.`,
          bucket.legalCount > 0
            ? `${bucket.legalCount} legal-pressure records overlap this modeled air-toxics region.`
            : "No legal-pressure records currently overlap this modeled region in the ETL-backed view.",
          topSectors.length ? `Dominant sectors: ${topSectors.join(", ")}` : null,
        ]),
        emergingConcerns: uniqueStrings([
          "This is a screening-level modeled burden region synthesized from clustered facility geography and release context, not a direct neighborhood exposure measurement.",
          bucket.stateCodes.size > 1
            ? `This region spans ${bucket.stateCodes.size} state-level contexts, so local conditions still need site-specific reading.`
            : null,
        ]),
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext:
          bucket.legalCount > 0
            ? ["Legal and enforcement pressure overlaps this modeled air-toxics region."]
            : [],
        uncertaintyNote:
          "This is a source-backed modeled burden region derived from TRI-linked release geography and overlapping industrial systems, not a measured neighborhood dose map.",
        sourceStats: [
          { label: "TRI air facilities", value: String(bucket.triAirFacilities) },
          { label: "Reported air releases", value: `${Math.round(bucket.totalReleaseKg).toLocaleString()} kg` },
          { label: "Legal overlap", value: String(bucket.legalCount) },
          { label: "Power facilities", value: String(bucket.powerCount) },
          { label: "Clustered records", value: String(bucket.members.length) },
          { label: "States covered", value: String(bucket.stateCodes.size) },
        ],
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity))
    .sort(
      (left, right) =>
        parseSourceStatNumber(right, "Reported air releases") - parseSourceStatNumber(left, "Reported air releases") ||
        parseSourceStatNumber(right, "TRI air facilities") - parseSourceStatNumber(left, "TRI air facilities"),
    )
    .slice(0, 24);
}

function buildReproductiveRegionEntities(entities: ExplorerEntity[]) {
  const candidateEntities = entities.filter((entity) => {
    const relevantChemicalContext =
      entity.chemicalMarkers.includes("pfas") ||
      entity.chemicalMarkers.includes("plasticizers") ||
      entity.chemicalMarkers.includes("pharmaceuticals") ||
      entity.chemicalMarkers.includes("wastewater-indicators") ||
      entity.chemicalMarkers.includes("petrochemical-volatiles");
    const relevantSignalContext =
      entity.signalFamilies.includes("pfas") ||
      entity.signalFamilies.includes("wastewater") ||
      entity.signalFamilies.includes("petrochemical") ||
      entity.signalFamilies.includes("plastics");

    return (
      relevantChemicalContext &&
      relevantSignalContext &&
      ["industrial-sites", "pfas-sites", "wastewater-sites", "legal-markers", "power-plants", "air-toxics-regions"].includes(
        entity.layerId,
      )
    );
  });

  const regionBuckets = new Map<
    string,
    {
      members: ExplorerEntity[];
      weightedLonTotal: number;
      weightedLatTotal: number;
      weightTotal: number;
      locationLabels: Map<string, number>;
      sourceIds: Set<string>;
      relatedCaseStudyIds: Set<string>;
      chemicalHighlights: Map<string, number>;
      chemicalMarkers: Map<ExplorerEntity["chemicalMarkers"][number], number>;
      pfasCount: number;
      wastewaterCount: number;
      plasticsCount: number;
      petrochemicalCount: number;
      directSamplingCount: number;
      legalCount: number;
      industrialCount: number;
      score: number;
      yearStart: number;
      yearEnd: number;
    }
  >();

  for (const entity of candidateEntities) {
    const [longitude, latitude] = entity.coordinates;
    const latBucket = Math.round(latitude / 1.5);
    const lonBucket = Math.round(longitude / 1.5);
    const bucketKey = `${latBucket}:${lonBucket}`;
    const releaseKg = parseSourceStatNumber(entity, "Release total") + parseSourceStatNumber(entity, "Reported air releases");
    const pfasCount = entity.signalFamilies.includes("pfas") || entity.chemicalMarkers.includes("pfas") ? 1 : 0;
    const wastewaterCount =
      entity.signalFamilies.includes("wastewater") ||
      entity.chemicalMarkers.includes("wastewater-indicators") ||
      entity.chemicalMarkers.includes("pharmaceuticals")
        ? 1
        : 0;
    const plasticsCount =
      entity.signalFamilies.includes("plastics") || entity.chemicalMarkers.includes("plasticizers") ? 1 : 0;
    const petrochemicalCount =
      entity.signalFamilies.includes("petrochemical") || entity.chemicalMarkers.includes("petrochemical-volatiles")
        ? 1
        : 0;
    const directSamplingCount = entity.evidenceType === "Direct Measurement" ? 1 : 0;
    const legalCount = entity.sourceIds.includes("epa-echo") || entity.layerId === "legal-markers" ? 1 : 0;
    const industrialCount = ["industrial-sites", "power-plants", "air-toxics-regions"].includes(entity.layerId) ? 1 : 0;
    const weight =
      1 +
      pfasCount * 8 +
      wastewaterCount * 6 +
      plasticsCount * 6 +
      petrochemicalCount * 5 +
      directSamplingCount * 4 +
      legalCount * 2 +
      Math.log10(releaseKg + 10) * 3;
    const score =
      pfasCount * 40 +
      wastewaterCount * 28 +
      plasticsCount * 24 +
      petrochemicalCount * 22 +
      directSamplingCount * 18 +
      legalCount * 8 +
      industrialCount * 6 +
      Math.log10(releaseKg + 10) * 20;

    const bucket = regionBuckets.get(bucketKey) ?? {
      members: [],
      weightedLonTotal: 0,
      weightedLatTotal: 0,
      weightTotal: 0,
      locationLabels: new Map<string, number>(),
      sourceIds: new Set<string>(),
      relatedCaseStudyIds: new Set<string>(),
      chemicalHighlights: new Map<string, number>(),
      chemicalMarkers: new Map<ExplorerEntity["chemicalMarkers"][number], number>(),
      pfasCount: 0,
      wastewaterCount: 0,
      plasticsCount: 0,
      petrochemicalCount: 0,
      directSamplingCount: 0,
      legalCount: 0,
      industrialCount: 0,
      score: 0,
      yearStart: entity.yearStart,
      yearEnd: entity.yearEnd,
    };

    bucket.members.push(entity);
    bucket.weightedLonTotal += longitude * weight;
    bucket.weightedLatTotal += latitude * weight;
    bucket.weightTotal += weight;
    bucket.locationLabels.set(entity.locationLabel, (bucket.locationLabels.get(entity.locationLabel) ?? 0) + 1);
    bucket.pfasCount += pfasCount;
    bucket.wastewaterCount += wastewaterCount;
    bucket.plasticsCount += plasticsCount;
    bucket.petrochemicalCount += petrochemicalCount;
    bucket.directSamplingCount += directSamplingCount;
    bucket.legalCount += legalCount;
    bucket.industrialCount += industrialCount;
    bucket.score += score;
    bucket.yearStart = Math.min(bucket.yearStart, entity.yearStart);
    bucket.yearEnd = Math.max(bucket.yearEnd, entity.yearEnd);

    for (const sourceId of entity.sourceIds) {
      bucket.sourceIds.add(sourceId);
    }
    for (const caseStudyId of entity.relatedCaseStudyIds) {
      bucket.relatedCaseStudyIds.add(caseStudyId);
    }
    for (const marker of entity.chemicalMarkers) {
      bucket.chemicalMarkers.set(marker, (bucket.chemicalMarkers.get(marker) ?? 0) + 1);
    }
    for (const highlight of entity.chemicalHighlights) {
      bucket.chemicalHighlights.set(highlight, (bucket.chemicalHighlights.get(highlight) ?? 0) + 1);
    }

    regionBuckets.set(bucketKey, bucket);
  }

  return Array.from(regionBuckets.entries())
    .map(([bucketKey, bucket]) => {
      if (
        bucket.members.length < 6 ||
        bucket.directSamplingCount < 1 ||
        (bucket.pfasCount + bucket.plasticsCount + bucket.wastewaterCount + bucket.petrochemicalCount) < 4
      ) {
        return null;
      }

      const locationLabel =
        Array.from(bucket.locationLabels.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ??
        "United States";
      const coordinates: [number, number] = [
        bucket.weightTotal > 0 ? bucket.weightedLonTotal / bucket.weightTotal : 0,
        bucket.weightTotal > 0 ? bucket.weightedLatTotal / bucket.weightTotal : 0,
      ];
      const topMarkers = Array.from(bucket.chemicalMarkers.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([marker]) => marker);
      const topHighlights = Array.from(bucket.chemicalHighlights.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
        .map(([highlight]) => highlight);
      const sourceIds = uniqueStrings([
        ...Array.from(bucket.sourceIds),
        "plastic-health-map-paper",
        bucket.plasticsCount > 0 ? "ipen-plastic-map" : null,
      ]);
      const confidenceLevel: ExplorerEntity["confidenceLevel"] =
        bucket.directSamplingCount >= 2 && bucket.legalCount >= 1 && bucket.pfasCount >= 1 ? "High" : "Moderate";

      return withExplorerDefaults({
        id: `reproductive-region-${bucketKey.replace(":", "-")}`,
        title: `${locationLabel} reproductive and endocrine research context`,
        geometryType: "region",
        coordinates,
        radiusKm: 160,
        layerGroup: "reproductive",
        layerId: "reproductive-regions",
        category: "Reproductive research context",
        subcategory: "Endocrine-disruption literature region",
        locationLabel,
        summary: `Regional research-context layer synthesized from ${bucket.pfasCount} PFAS-linked, ${bucket.wastewaterCount} wastewater-linked, ${bucket.plasticsCount} plastics-linked, and ${bucket.petrochemicalCount} petrochemical-linked records in the current atlas output.`,
        whyThisAppears:
          "This appears because reproductive and endocrine concern is more honest to show as literature-backed regional context built from overlapping chemical and pathway systems, not as a direct local health measurement.",
        dateLabel: `${bucket.yearStart}-${bucket.yearEnd}`,
        yearStart: bucket.yearStart,
        yearEnd: bucket.yearEnd,
        evidenceType: "Literature Evidence",
        confidenceLevel,
        tags: uniqueStrings([
          "fertility-context",
          bucket.wastewaterCount > 0 ? "downstream" : null,
          bucket.pfasCount > 0 ? "drinking-water" : null,
          bucket.legalCount > 0 ? "community-pressure" : null,
        ]) as ExplorerEntity["tags"],
        signalFamilies: uniqueStrings([
          "reproductive-context",
          bucket.pfasCount > 0 ? "pfas" : null,
          bucket.wastewaterCount > 0 ? "wastewater" : null,
          bucket.petrochemicalCount > 0 ? "petrochemical" : null,
          bucket.plasticsCount > 0 ? "plastics" : null,
          bucket.legalCount > 0 ? "legal-pressure" : null,
        ]) as ExplorerEntity["signalFamilies"],
        chemicalMarkers: topMarkers,
        chemicalHighlights: topHighlights,
        sourceIds,
        relatedCaseStudyIds: Array.from(bucket.relatedCaseStudyIds).slice(0, 4),
        officialSignals: uniqueStrings([
          bucket.pfasCount > 0 ? `${bucket.pfasCount} PFAS-linked records contribute to this regional context.` : null,
          bucket.wastewaterCount > 0
            ? `${bucket.wastewaterCount} wastewater or pharmaceutical-pathway records contribute to this regional context.`
            : null,
          bucket.legalCount > 0 ? `${bucket.legalCount} legal or enforcement-linked records overlap this research-context region.` : null,
          `${bucket.directSamplingCount} direct-sampling records are present within the contributing signal stack.`,
        ]),
        emergingConcerns: uniqueStrings([
          bucket.plasticsCount > 0
            ? "Plastic-associated chemical literature can matter here, but it is being used as a taxonomy and concern framework rather than a direct local exposure map."
            : null,
          bucket.pfasCount > 0
            ? "PFAS persistence and drinking-water relevance increase the endocrine-disruption concern framing in this region."
            : null,
          bucket.petrochemicalCount > 0
            ? "Petrochemical and plasticizer overlap widens the mixture context beyond a single compound family."
            : null,
        ]),
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [
          "This region is a literature-backed reproductive and endocrine context layer, not a diagnosis or fertility measurement.",
          "It is meant to show where chemical systems that matter in reproductive-health literature overlap on the map.",
        ],
        legalHistoricalContext:
          bucket.legalCount > 0
            ? ["Legal and public-interest pressure overlaps this reproductive-context region."]
            : [],
        uncertaintyNote:
          "This layer is intentionally regional and literature-backed. It should not be read as proof of local reproductive harm, infertility prevalence, or a direct measured human outcome.",
        sourceStats: [
          { label: "PFAS-linked records", value: String(bucket.pfasCount) },
          { label: "Wastewater-linked records", value: String(bucket.wastewaterCount) },
          { label: "Plastic-associated records", value: String(bucket.plasticsCount) },
          { label: "Direct-sampling records", value: String(bucket.directSamplingCount) },
          { label: "Contributing records", value: String(bucket.members.length) },
        ],
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity))
    .sort(
      (left, right) =>
        parseSourceStatNumber(right, "Contributing records") - parseSourceStatNumber(left, "Contributing records") ||
        parseSourceStatNumber(right, "PFAS-linked records") - parseSourceStatNumber(left, "PFAS-linked records"),
    )
    .slice(0, 8);
}

function buildSentinelSpeciesEntities(entities: ExplorerEntity[]) {
  const candidateEntities = entities.filter((entity) => {
    const waterLinked =
      entity.tags.includes("downstream") ||
      entity.tags.includes("drinking-water") ||
      entity.signalFamilies.includes("wastewater") ||
      entity.signalFamilies.includes("pfas") ||
      entity.signalFamilies.includes("legacy-hazard");
    const sentinelRelevantLayer = ["pfas-sites", "wastewater-sites", "hazardous-sites", "legal-markers"].includes(
      entity.layerId,
    );
    return waterLinked && sentinelRelevantLayer;
  });

  const buckets = new Map<
    string,
    {
      members: ExplorerEntity[];
      weightedLonTotal: number;
      weightedLatTotal: number;
      weightTotal: number;
      locationLabels: Map<string, number>;
      sourceIds: Set<string>;
      relatedCaseStudyIds: Set<string>;
      chemicalHighlights: Map<string, number>;
      chemicalMarkers: Map<ExplorerEntity["chemicalMarkers"][number], number>;
      pfasCount: number;
      wastewaterCount: number;
      hazardCount: number;
      legalCount: number;
      directSamplingCount: number;
      yearStart: number;
      yearEnd: number;
    }
  >();

  for (const entity of candidateEntities) {
    const [longitude, latitude] = entity.coordinates;
    const latBucket = Math.round(latitude / 2);
    const lonBucket = Math.round(longitude / 2);
    const bucketKey = `${latBucket}:${lonBucket}`;
    const pfasCount = entity.signalFamilies.includes("pfas") || entity.chemicalMarkers.includes("pfas") ? 1 : 0;
    const wastewaterCount =
      entity.signalFamilies.includes("wastewater") ||
      entity.chemicalMarkers.includes("wastewater-indicators") ||
      entity.chemicalMarkers.includes("pharmaceuticals")
        ? 1
        : 0;
    const hazardCount =
      entity.signalFamilies.includes("legacy-hazard") ||
      entity.sourceIds.includes("epa-sems") ||
      entity.layerId === "hazardous-sites"
        ? 1
        : 0;
    const legalCount = entity.sourceIds.includes("epa-echo") || entity.layerId === "legal-markers" ? 1 : 0;
    const directSamplingCount = entity.evidenceType === "Direct Measurement" ? 1 : 0;
    const weight = 1 + pfasCount * 8 + wastewaterCount * 7 + hazardCount * 6 + directSamplingCount * 5 + legalCount * 2;

    const bucket = buckets.get(bucketKey) ?? {
      members: [],
      weightedLonTotal: 0,
      weightedLatTotal: 0,
      weightTotal: 0,
      locationLabels: new Map<string, number>(),
      sourceIds: new Set<string>(),
      relatedCaseStudyIds: new Set<string>(),
      chemicalHighlights: new Map<string, number>(),
      chemicalMarkers: new Map<ExplorerEntity["chemicalMarkers"][number], number>(),
      pfasCount: 0,
      wastewaterCount: 0,
      hazardCount: 0,
      legalCount: 0,
      directSamplingCount: 0,
      yearStart: entity.yearStart,
      yearEnd: entity.yearEnd,
    };

    bucket.members.push(entity);
    bucket.weightedLonTotal += longitude * weight;
    bucket.weightedLatTotal += latitude * weight;
    bucket.weightTotal += weight;
    bucket.locationLabels.set(entity.locationLabel, (bucket.locationLabels.get(entity.locationLabel) ?? 0) + 1);
    bucket.pfasCount += pfasCount;
    bucket.wastewaterCount += wastewaterCount;
    bucket.hazardCount += hazardCount;
    bucket.legalCount += legalCount;
    bucket.directSamplingCount += directSamplingCount;
    bucket.yearStart = Math.min(bucket.yearStart, entity.yearStart);
    bucket.yearEnd = Math.max(bucket.yearEnd, entity.yearEnd);

    for (const sourceId of entity.sourceIds) {
      bucket.sourceIds.add(sourceId);
    }
    for (const caseStudyId of entity.relatedCaseStudyIds) {
      bucket.relatedCaseStudyIds.add(caseStudyId);
    }
    for (const marker of entity.chemicalMarkers) {
      bucket.chemicalMarkers.set(marker, (bucket.chemicalMarkers.get(marker) ?? 0) + 1);
    }
    for (const highlight of entity.chemicalHighlights) {
      bucket.chemicalHighlights.set(highlight, (bucket.chemicalHighlights.get(highlight) ?? 0) + 1);
    }

    buckets.set(bucketKey, bucket);
  }

  return Array.from(buckets.entries())
    .map(([bucketKey, bucket]) => {
      if (bucket.members.length < 3 || bucket.directSamplingCount < 1 || (bucket.hazardCount + bucket.wastewaterCount + bucket.pfasCount) < 3) {
        return null;
      }

      const locationLabel =
        Array.from(bucket.locationLabels.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ??
        "United States";
      const coordinates: [number, number] = [
        bucket.weightTotal > 0 ? bucket.weightedLonTotal / bucket.weightTotal : 0,
        bucket.weightTotal > 0 ? bucket.weightedLatTotal / bucket.weightTotal : 0,
      ];
      const topMarkers = Array.from(bucket.chemicalMarkers.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([marker]) => marker);
      const topHighlights = Array.from(bucket.chemicalHighlights.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
        .map(([highlight]) => highlight);

      return withExplorerDefaults({
        id: bucket.relatedCaseStudyIds.has("great-lakes-sentinel-fish")
          ? "great-lakes-fish-sentinel"
          : `sentinel-region-${bucketKey.replace(":", "-")}`,
        title: `${locationLabel} wildlife sentinel context`,
        geometryType: "region",
        coordinates,
        radiusKm: 125,
        layerGroup: "wildlife",
        layerId: "sentinel-species",
        category: "Sentinel record",
        subcategory: "Ecological warning region",
        locationLabel,
        summary: `Ecological warning region synthesized from ${bucket.pfasCount} PFAS-linked, ${bucket.wastewaterCount} wastewater-linked, and ${bucket.hazardCount} hazard-linked records with direct-sampling presence in the current atlas output.`,
        whyThisAppears:
          "This appears because wildlife-sentinel concern is more defensible as literature-backed ecological warning context tied to real water, hazard, and PFAS systems than as a fake species-observation feed.",
        dateLabel: `${bucket.yearStart}-${bucket.yearEnd}`,
        yearStart: bucket.yearStart,
        yearEnd: bucket.yearEnd,
        evidenceType: "Literature Evidence",
        confidenceLevel:
          bucket.directSamplingCount >= 2 && bucket.hazardCount >= 1 ? "Moderate" : "Low",
        tags: uniqueStrings([
          "wildlife-anomaly",
          "downstream",
          bucket.legalCount > 0 ? "community-pressure" : null,
        ]) as ExplorerEntity["tags"],
        signalFamilies: uniqueStrings([
          "wildlife-sentinel",
          bucket.pfasCount > 0 ? "pfas" : null,
          bucket.wastewaterCount > 0 ? "wastewater" : null,
          bucket.hazardCount > 0 ? "legacy-hazard" : null,
          bucket.legalCount > 0 ? "legal-pressure" : null,
        ]) as ExplorerEntity["signalFamilies"],
        chemicalMarkers: topMarkers,
        chemicalHighlights: topHighlights,
        sourceIds: uniqueStrings([
          ...Array.from(bucket.sourceIds),
          "literature-sentinel",
          "usgs-hydrography",
        ]),
        relatedCaseStudyIds: Array.from(bucket.relatedCaseStudyIds).slice(0, 4),
        officialSignals: uniqueStrings([
          `${bucket.directSamplingCount} direct-sampling records contribute to this ecological warning region.`,
          bucket.pfasCount > 0 ? `${bucket.pfasCount} PFAS-linked records overlap the sentinel-context layer.` : null,
          bucket.wastewaterCount > 0
            ? `${bucket.wastewaterCount} wastewater-linked records overlap the sentinel-context layer.`
            : null,
          bucket.hazardCount > 0 ? `${bucket.hazardCount} hazard-linked records overlap the sentinel-context layer.` : null,
        ]),
        emergingConcerns: [
          "Ecological sentinel evidence can surface mixture stress before administrative human-facing maps become stable.",
          "Species coverage and study methods vary, so this layer is intentionally regional and literature-led.",
        ],
        wildlifeSentinelContext: [
          "This region is literature-backed wildlife sentinel context, not a direct species census or mortality feed.",
          "It highlights where aquatic ecosystem warning signals overlap with real contamination and cleanup systems.",
        ],
        reproductiveHealthContext: [],
        legalHistoricalContext:
          bucket.legalCount > 0
            ? ["Public-interest and enforcement pressure overlaps this ecological warning region."]
            : [],
        uncertaintyNote:
          "This layer should not be read as proof of human harm or a direct wildlife count. It is a regional ecological-warning lens built from literature framing and real contamination-system overlap.",
        sourceStats: [
          { label: "PFAS-linked records", value: String(bucket.pfasCount) },
          { label: "Wastewater-linked records", value: String(bucket.wastewaterCount) },
          { label: "Hazard-linked records", value: String(bucket.hazardCount) },
          { label: "Direct-sampling records", value: String(bucket.directSamplingCount) },
          { label: "Contributing records", value: String(bucket.members.length) },
        ],
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity))
    .sort(
      (left, right) =>
        parseSourceStatNumber(right, "Contributing records") - parseSourceStatNumber(left, "Contributing records") ||
        parseSourceStatNumber(right, "PFAS-linked records") - parseSourceStatNumber(left, "PFAS-linked records"),
    )
    .slice(0, 10);
}

function dedupeEntitiesById(entities: ExplorerEntity[]) {
  const seen = new Set<string>();
  const deduped: ExplorerEntity[] = [];

  for (const entity of entities) {
    if (seen.has(entity.id)) continue;
    seen.add(entity.id);
    deduped.push(entity);
  }

  return deduped;
}

function buildEchoFacilityContextMap(rows: CsvRow[]) {
  const context = new Map<string, EchoFacilityContext>();

  for (const row of rows) {
    const slug = normalizeRegistrySlug(row.slug);
    if (!slug) continue;

    const metadata = parsePythonDict(row.metadata);
    const sourceIds = parsePythonList(row.source_ids);
    const officialSignals = Array.isArray(metadata.officialSignals)
      ? (metadata.officialSignals as string[])
      : ["EPA ECHO compliance and enforcement context"];
    const emergingConcerns = Array.isArray(metadata.emergingConcerns)
      ? (metadata.emergingConcerns as string[])
      : ["Regulatory history should be read as public-interest context, not exposure proof."];
    const legalHistoricalContext = Array.isArray(metadata.legalHistoricalContext)
      ? (metadata.legalHistoricalContext as string[])
      : ["Federal enforcement context"];
    const sourceStats = Array.isArray(metadata.sourceStats)
      ? (metadata.sourceStats as Array<{ label?: unknown; value?: unknown }>)
      : [];
    const caseCountEntry = sourceStats.find((entry) => entry.label === "Federal cases");
    const caseCount = Number(caseCountEntry?.value);

    context.set(slug, {
      sourceIds,
      officialSignals,
      emergingConcerns,
      legalHistoricalContext,
      caseCount: Number.isFinite(caseCount) ? caseCount : null,
    });
  }

  return context;
}

function buildUsgsPfasEntities(rows: CsvRow[]) {
  const currentYear = new Date().getUTCFullYear();
  return rows
    .map((row) => {
      const latitude = parseNumber(row.latitude);
      const longitude = parseNumber(row.longitude);
      if (latitude === null || longitude === null) return null;

      const pfos = parseNumber(row.PFOS);
      const pfoa = parseNumber(row.PFOA);
      const genx = parseNumber(row.GENX_num);
      const highlights = uniqueStrings([
        pfos !== null && pfos > 0 ? "PFOS" : null,
        pfoa !== null && pfoa > 0 ? "PFOA" : null,
        genx !== null && genx > 0 ? "GenX" : null,
      ]);
      const chemicalHighlights = highlights.length ? highlights : ["PFAS"];
      const chemicalMarkers = inferChemicalMarkers(chemicalHighlights, "water", "PFAS sampling", true);
      const officialSignals = uniqueStrings([
        "USGS PFAS sampling context",
        genx !== null && genx > 0 ? `GenX detected at ${genx.toFixed(1)} ng/L` : null,
      ]);
      const sourceStats = [
        { label: "Detections", value: row.DETECTS?.trim() || "0" },
        { label: "PFAS sum", value: row.SUM_PFAS?.trim() ? `${row.SUM_PFAS.trim()} ng/L` : "N/A" },
        ...(genx !== null && genx > 0
          ? [{ label: "GenX", value: `${genx.toFixed(1)} ng/L` }]
          : []),
      ];

      return withExplorerDefaults({
        id: `usgs-pfas-${row.OBJECTID || row.Station_name?.trim() || `${latitude}-${longitude}`}`,
        title: row.Station_name?.trim() || "USGS PFAS sample site",
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "emerging",
        layerId: "pfas-sites",
        category: "PFAS sampling context",
        subcategory: row.Site_type?.trim() || "USGS PFAS site",
        locationLabel: row.Station_name?.trim() || "United States",
        summary: `USGS PFAS tap-water context site with ${row.DETECTS || "0"} reported PFAS detections in the local ETL output.`,
        whyThisAppears:
          "This appears because the USGS PFAS dashboard export provides a direct sampling context point that is suitable for map-level PFAS visibility.",
        dateLabel: row.SampleYear?.trim() || "Current",
        yearStart: parseYear(row.SampleYear),
        yearEnd: Math.max(parseYear(row.SampleYear), currentYear),
        evidenceType: "Direct Measurement",
        confidenceLevel: "Moderate",
        tags: ["drinking-water"],
        signalFamilies: inferSignalFamilies(chemicalMarkers, "water", ["drinking-water"]),
        chemicalMarkers,
        chemicalHighlights,
        sourceIds: ["usgs-pfas", "usgs-pfas-tapwater"],
        relatedCaseStudyIds: [],
        officialSignals,
        emergingConcerns: ["Sampling coverage is incomplete and should be read as targeted context."],
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext: [],
        uncertaintyNote:
          "USGS PFAS sample points reflect targeted research or supply sampling, not universal local drinking-water conditions.",
        sourceStats,
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity));
}

function buildAtsdrPfasEntities(rows: CsvRow[]) {
  const currentYear = new Date().getUTCFullYear();
  return rows
    .map((row) => {
      const latitude = parseNumber(row.latitude);
      const longitude = parseNumber(row.longitude);
      if (latitude === null || longitude === null) return null;

      const metadata = parsePythonDict(row.metadata);
      const tags = parsePythonList(row.tags) as ExplorerEntity["tags"];
      const sourceIds = parsePythonList(row.source_ids);
      const officialSignals = Array.isArray(metadata.officialSignals)
        ? (metadata.officialSignals as string[])
        : ["ATSDR documented PFAS site involvement"];
      const emergingConcerns = Array.isArray(metadata.emergingConcerns)
        ? (metadata.emergingConcerns as string[])
        : ["Coverage is limited to listed sites and documented federal activity."];

      return withExplorerDefaults({
        id: row.slug?.trim() || `atsdr-pfas-${latitude}-${longitude}`,
        title: row.site_name?.trim() || "ATSDR PFAS site",
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "emerging",
        layerId: "pfas-sites",
        category: row.category?.trim() || "PFAS documented site",
        subcategory: row.subcategory?.trim() || row.site_subtype?.trim() || "ATSDR PFAS site",
        locationLabel: row.site_name?.trim() || "United States",
        summary:
          row.summary?.trim() ||
          "ATSDR-listed PFAS site with geocoded location context from the current ETL output.",
        whyThisAppears:
          "This appears because the ATSDR PFAS sites table was normalized into ETL-backed site records and geocoded into mappable coordinates.",
        dateLabel: row.observed_year?.trim() || "Current",
        yearStart: parseYear(row.observed_year),
        yearEnd: Math.max(parseYear(row.observed_year), currentYear),
        evidenceType: "Screening Signal",
        confidenceLevel: "High",
        tags,
        signalFamilies: ["pfas"],
        chemicalMarkers: ["pfas"],
        chemicalHighlights: ["PFAS"],
        sourceIds: sourceIds.length ? sourceIds : ["atsdr-pfas-sites"],
        relatedCaseStudyIds: [],
        officialSignals,
        emergingConcerns,
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext: [],
        uncertaintyNote:
          String(metadata.uncertaintyNote || "") ||
          "Coordinates are inferred from site-name geocoding unless ATSDR publishes direct site coordinates.",
        sourceStats: [{ label: "Backend", value: "ATSDR ETL" }],
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity));
}

function buildWastewaterEntities(npdesRows: CsvRow[], pharmaRows: CsvRow[]) {
  const npdesEntities = npdesRows
    .map((row) => {
      const latitude = parseNumber(row.latitude83);
      const longitude = parseNumber(row.longitude83);
      if (latitude === null || longitude === null) return null;

      const tags = parsePythonList(row.tags) as ExplorerEntity["tags"];
      const pollutantHighlights = (row.lim_pollutant || "")
        .split(";")
        .map((entry) => entry.split(",")[0]?.trim())
        .filter(Boolean);
      const chemicalHighlights = uniqueStrings(
        pollutantHighlights.slice(0, 3),
      );
      const chemicalMarkers = inferChemicalMarkers(chemicalHighlights, "water", "Wastewater permit context", false);
      const pollutantCount = pollutantHighlights.length;
      const hasBiosolids = row.biosolids_flag?.trim().toUpperCase() === "Y";
      const sourceIds = uniqueStrings([
        "epa-npdes",
        hasBiosolids ? "epa-biosolids" : null,
      ]);
      const officialSignals = uniqueStrings([
        row.permit_status_desc?.trim() ? `Permit status: ${row.permit_status_desc.trim()}` : null,
        row.cwa_current_status?.trim() ? `Clean Water Act status: ${row.cwa_current_status.trim()}` : null,
        row.major_minor_flag?.trim() ? `${row.major_minor_flag.trim()} facility` : null,
        row.permit_components?.trim() ? `Permit component: ${row.permit_components.trim()}` : null,
        row.state_water_body_name?.trim() ? `Receiving water: ${row.state_water_body_name.trim()}` : null,
      ]);
      const emergingConcerns = uniqueStrings([
        "Permit and outfall context does not equal measured downstream concentration.",
        pollutantCount
          ? `${pollutantCount} monitored pollutant parameters are listed in the local permit context output.`
          : null,
        hasBiosolids
          ? "Biosolids handling is flagged for this wastewater facility."
          : null,
      ]);
      const legalHistoricalContext = uniqueStrings([
        row.cwp_current_viol?.trim() ? `Current violation flag: ${row.cwp_current_viol.trim()}` : null,
        row.cwp_date_last_inspection?.trim()
          ? `Last inspection: ${row.cwp_date_last_inspection.trim()}`
          : null,
        row.date_last_formal_ea?.trim()
          ? `Last formal action: ${row.date_last_formal_ea.trim()}`
          : null,
      ]);

      return withExplorerDefaults({
        id: `npdes-${row.external_permit_nmbr?.trim() || `${latitude}-${longitude}`}`,
        title: row.facility_name?.trim() || "Wastewater facility",
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "emerging",
        layerId: "wastewater-sites",
        category: "Wastewater pathway",
        subcategory: row.permit_type_desc?.trim() || "NPDES permit context",
        locationLabel: row.location_label?.trim() || uniqueStrings([row.city, row.state_code]).join(", "),
        summary: `EPA NPDES wastewater and outfall context for ${row.state_water_body_name?.trim() || "the linked receiving water"}, with ${pollutantCount || "0"} monitored pollutant parameters in the local permit output.`,
        whyThisAppears:
          "This appears because wastewater and outfall infrastructure are part of the practical downstream toxin map even before full DB-backed joins are available.",
        dateLabel: row.observed_year?.trim() || "Current",
        yearStart: parseYear(row.observed_year),
        yearEnd: Math.max(parseYear(row.observed_year), new Date().getUTCFullYear()),
        evidenceType: "Proxy",
        confidenceLevel: "High",
        tags,
        signalFamilies: inferSignalFamilies(chemicalMarkers, "water", tags),
        chemicalMarkers,
        chemicalHighlights,
        sourceIds,
        relatedCaseStudyIds: [],
        officialSignals,
        emergingConcerns,
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext,
        uncertaintyNote:
          "This ETL-backed wastewater point is a pathway and permit signal, not direct ambient-water chemistry proof.",
        sourceStats: [
          { label: "Permit", value: row.external_permit_nmbr?.trim() || "NPDES" },
          { label: "Status", value: row.permit_status_code?.trim() || "N/A" },
          ...(row.facility_type_desc?.trim()
            ? [{ label: "Facility type", value: row.facility_type_desc.trim() }]
            : []),
          ...(row.major_minor_flag?.trim()
            ? [{ label: "Scale", value: row.major_minor_flag.trim() }]
            : []),
          ...(row.state_water_body_name?.trim()
            ? [{ label: "Water body", value: row.state_water_body_name.trim() }]
            : []),
          ...(pollutantCount ? [{ label: "Pollutants", value: String(pollutantCount) }] : []),
          ...(parseNumber(row.dmr_pounds) !== null
            ? [{ label: "DMR pounds", value: Math.round(parseNumber(row.dmr_pounds)!).toLocaleString() }]
            : []),
          ...(hasBiosolids
            ? [{ label: "Biosolids", value: row.biosolids_permit_status_desc?.trim() || "Flagged" }]
            : []),
        ],
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity));

  const pharmaEntities = pharmaRows
    .map((row) => {
      const latitude = parseNumber(row.latitude);
      const longitude = parseNumber(row.longitude);
      if (latitude === null || longitude === null) return null;

      const classesPresent = parsePythonList(row.classes_present);
      const chemicalHighlights = parsePythonList(row.featured_compounds).slice(0, 3);
      const chemicalMarkers = inferChemicalMarkers(chemicalHighlights, "water", "USGS pharma sampling", false);
      const officialSignals = uniqueStrings([
        "USGS water-quality sampling context",
        row.river?.trim() ? `River: ${row.river.trim()}` : null,
        row.total_detection_events?.trim()
          ? `Detection events: ${row.total_detection_events.trim()}`
          : null,
        classesPresent.length ? `Classes present: ${classesPresent.join(", ")}` : null,
      ]);
      const emergingConcerns = uniqueStrings([
        "Research sampling points are intentionally sparse and should not be read as national coverage.",
        row.pharmaceutical_count?.trim()
          ? `${row.pharmaceutical_count.trim()} pharmaceutical compounds were detected in this local study output.`
          : null,
      ]);

      return withExplorerDefaults({
        id: `usgs-pharma-${row.siteid?.trim() || `${latitude}-${longitude}`}`,
        title: row.sitenm?.trim() || "USGS pharmaceutical sampling site",
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "emerging",
        layerId: "wastewater-sites",
        category: "Pharmaceuticals in water",
        subcategory: row.river?.trim() || "USGS sample site",
        locationLabel: row.location_label?.trim() || "United States",
        summary: `USGS sampling site with ${row.pharmaceutical_count || "0"} pharmaceutical compounds and ${row.wastewater_indicator_count || "0"} wastewater indicators in the local ETL output.`,
        whyThisAppears:
          "This appears because the USGS research output provides direct pharmaceutical and wastewater-indicator context that can inform the MVP before full database loading.",
        dateLabel: row.sample_year?.trim() || "Current",
        yearStart: parseYear(row.sample_year, 2019),
        yearEnd: parseYear(row.sample_year, 2019),
        evidenceType: "Direct Measurement",
        confidenceLevel: "Moderate",
        tags: ["downstream", "drinking-water"],
        signalFamilies: inferSignalFamilies(chemicalMarkers, "water", ["downstream", "drinking-water"]),
        chemicalMarkers,
        chemicalHighlights,
        sourceIds: ["usgs-pharma"],
        relatedCaseStudyIds: [],
        officialSignals,
        emergingConcerns,
        wildlifeSentinelContext: [],
        reproductiveHealthContext: [],
        legalHistoricalContext: [],
        uncertaintyNote:
          "This ETL-backed pharma point is direct sampling context from a limited study geography, not a universal river condition map.",
        sourceStats: [
          { label: "Pharma count", value: row.pharmaceutical_count?.trim() || "0" },
          { label: "WW indicators", value: row.wastewater_indicator_count?.trim() || "0" },
          ...(row.total_detection_events?.trim()
            ? [{ label: "Detections", value: row.total_detection_events.trim() }]
            : []),
          ...(classesPresent.length
            ? [{ label: "Classes", value: String(classesPresent.length) }]
            : []),
        ],
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity));

  return [...npdesEntities, ...pharmaEntities];
}

async function buildEtlEntities() {
  return getEtlFileEntitiesForLayers([
    "industrial-sites",
    "power-plants",
    "hazardous-sites",
    "pfas-sites",
    "wastewater-sites",
    "legal-markers",
    "air-toxics-regions",
    "sentinel-species",
    "reproductive-regions",
  ]);
}

function buildEchoLegalEntities(echoRows: CsvRow[], frsRows: CsvRow[]) {
  const frsBySlug = new Map(
    frsRows
      .filter((row) => row.slug && parseNumber(row.latitude_measure) !== null && parseNumber(row.longitude_measure) !== null)
      .map((row) => [row.slug.trim(), row]),
  );

  return echoRows
    .map((row) => {
      const slug = row.slug?.trim();
      if (!slug) return null;
      const frs = frsBySlug.get(slug);
      if (!frs) return null;

      const latitude = parseNumber(frs.latitude_measure);
      const longitude = parseNumber(frs.longitude_measure);
      if (latitude === null || longitude === null) return null;

      const metadata = parsePythonDict(row.metadata);
      const tags = parsePythonList(row.tags) as ExplorerEntity["tags"];
      const sourceIds = parsePythonList(row.source_ids);
      const officialSignals = Array.isArray(metadata.officialSignals)
        ? (metadata.officialSignals as string[])
        : ["EPA ECHO compliance and enforcement context"];
      const legalHistoricalContext = Array.isArray(metadata.legalHistoricalContext)
        ? (metadata.legalHistoricalContext as string[])
        : ["Federal enforcement context"];

      return withExplorerDefaults({
        id: `echo-${slug}`,
        title: row.facility_name?.trim() || slug,
        geometryType: "point",
        coordinates: [longitude, latitude],
        layerGroup: "legal",
        layerId: "legal-markers",
        category: row.category?.trim() || "Pressure point",
        subcategory: row.subcategory?.trim() || "Federal compliance and enforcement",
        locationLabel: row.location_label?.trim() || row.slug?.replace(/^frs-/, "") || "United States",
        summary:
          row.summary?.trim() ||
          "EPA ECHO ICIS FE&C facility update derived from normalized enforcement and compliance data.",
        whyThisAppears:
          "This appears because the local ECHO ETL produced a facility-linked compliance marker that could be joined to FRS coordinates.",
        dateLabel: row.date_range_label?.trim() || row.active_year?.trim() || "Current",
        yearStart: parseYear(row.active_year),
        yearEnd: parseYear(row.active_year),
        evidenceType: "Proxy",
        confidenceLevel: "Moderate",
        tags,
        signalFamilies: ["legal-pressure"],
        chemicalMarkers: ["legacy-industrial-mixtures"],
        chemicalHighlights: [],
        sourceIds: sourceIds.length ? sourceIds : ["epa-echo", "epa-frs"],
        relatedCaseStudyIds: parsePythonList(String(metadata.relatedCaseStudyIds ?? "")),
        officialSignals,
        emergingConcerns: Array.isArray(metadata.emergingConcerns)
          ? (metadata.emergingConcerns as string[])
          : ["Regulatory history should be read as public-interest context, not exposure proof."],
        wildlifeSentinelContext: Array.isArray(metadata.wildlifeSentinelContext)
          ? (metadata.wildlifeSentinelContext as string[])
          : [],
        reproductiveHealthContext: Array.isArray(metadata.reproductiveHealthContext)
          ? (metadata.reproductiveHealthContext as string[])
          : [],
        legalHistoricalContext,
        uncertaintyNote:
          String(metadata.uncertaintyNote || "") ||
          "Compliance history can matter greatly without acting as direct local contamination proof.",
        sourceStats: [{ label: "Backend", value: "ECHO / FRS join" }],
      });
    })
    .filter((entity): entity is ExplorerEntity => Boolean(entity));
}

export function buildDerivedContextEntitiesFromBaseEntities(
  baseEntities: ExplorerEntity[],
  layerIds: ExplorerLayerId[],
) {
  const requested = new Set(layerIds);
  const derivedEntities: ExplorerEntity[] = [];
  const shouldBuildAir =
    requested.has("air-toxics-regions") || requested.has("reproductive-regions");
  const airToxicsEntities = shouldBuildAir
    ? buildAirToxicsRegionEntities(baseEntities)
    : [];

  if (requested.has("air-toxics-regions")) {
    derivedEntities.push(...airToxicsEntities);
  }

  if (requested.has("sentinel-species")) {
    derivedEntities.push(...buildSentinelSpeciesEntities(baseEntities));
  }

  if (requested.has("reproductive-regions")) {
    derivedEntities.push(
      ...buildReproductiveRegionEntities([...baseEntities, ...airToxicsEntities]),
    );
  }

  return dedupeEntitiesById(derivedEntities);
}

async function getEtlLayerEntities(layerId: ExplorerLayerId): Promise<ExplorerEntity[]> {
  const layerCache = getEtlLayerEntitiesCache();
  const existing = layerCache.get(layerId);
  if (existing) {
    return existing;
  }

  const pending = (async () => {
    switch (layerId) {
      case "industrial-sites": {
        const [{ grouped: triGrouped }, frsRows, echoFacilityContext] = await Promise.all([
          loadTriSourceRows(),
          loadFrsRows(),
          loadEchoFacilityContext(),
        ]);
        return dedupeEntitiesById([
          ...buildTriEntities(triGrouped),
          ...buildFrsIndustrialEntities(
            frsRows,
            triGrouped,
            echoFacilityContext,
          ),
        ]);
      }
      case "power-plants": {
        const [{ grouped: triGrouped }, frsRows, echoFacilityContext] = await Promise.all([
          loadTriSourceRows(),
          loadFrsRows(),
          loadEchoFacilityContext(),
        ]);
        return buildPowerPlantEntities(
          frsRows,
          triGrouped,
          echoFacilityContext,
        );
      }
      case "hazardous-sites": {
        const [{ grouped: triGrouped }, frsRows, echoFacilityContext] = await Promise.all([
          loadTriSourceRows(),
          loadFrsRows(),
          loadEchoFacilityContext(),
        ]);
        return buildHazardousSiteEntities(
          frsRows,
          triGrouped,
          echoFacilityContext,
        );
      }
      case "pfas-sites":
        return dedupeEntitiesById([
          ...buildUsgsPfasEntities(await loadUsgsPfasRows()),
          ...buildAtsdrPfasEntities(await loadAtsdrPfasRows()),
        ]);
      case "wastewater-sites":
        return buildWastewaterEntities(await loadNpdesRows(), await loadPharmaRows());
      case "legal-markers":
        return buildEchoLegalEntities(await loadEchoRows(), await loadFrsRows());
      case "air-toxics-regions": {
        const baseEntities = (
          await Promise.all([
            getEtlLayerEntities("industrial-sites"),
            getEtlLayerEntities("power-plants"),
            getEtlLayerEntities("hazardous-sites"),
            getEtlLayerEntities("legal-markers"),
          ])
        ).flat();
        return buildAirToxicsRegionEntities(baseEntities);
      }
      case "sentinel-species": {
        const baseEntities = (
          await Promise.all([
            getEtlLayerEntities("pfas-sites"),
            getEtlLayerEntities("wastewater-sites"),
            getEtlLayerEntities("hazardous-sites"),
            getEtlLayerEntities("legal-markers"),
          ])
        ).flat();
        return buildSentinelSpeciesEntities(baseEntities);
      }
      case "reproductive-regions": {
        const [
          industrialEntities,
          powerPlantEntities,
          hazardousEntities,
          pfasEntities,
          wastewaterEntities,
          legalEntities,
          airToxicsEntities,
        ] = await Promise.all([
          getEtlLayerEntities("industrial-sites"),
          getEtlLayerEntities("power-plants"),
          getEtlLayerEntities("hazardous-sites"),
          getEtlLayerEntities("pfas-sites"),
          getEtlLayerEntities("wastewater-sites"),
          getEtlLayerEntities("legal-markers"),
          getEtlLayerEntities("air-toxics-regions"),
        ]);
        return buildReproductiveRegionEntities([
          ...industrialEntities,
          ...powerPlantEntities,
          ...hazardousEntities,
          ...pfasEntities,
          ...wastewaterEntities,
          ...legalEntities,
          ...airToxicsEntities,
        ]);
      }
      default:
        return [];
    }
  })();

  layerCache.set(layerId, pending);
  return pending;
}

export async function getEtlFileEntitiesForLayers(layerIds: ExplorerLayerId[]) {
  if (layerIds.length === 0) {
    return [] as ExplorerEntity[];
  }

  const entities = await Promise.all(
    Array.from(new Set(layerIds)).map((layerId) => getEtlLayerEntities(layerId)),
  );
  return dedupeEntitiesById(entities.flat());
}

export async function getEtlFileEntities() {
  const cache = getToxinmapDataCache();
  cache.__toxinmapEtlEntitiesCache ??= buildEtlEntities();
  return cache.__toxinmapEtlEntitiesCache;
}

export async function getEtlFileIndustrialReleaseRecords(entityId: string) {
  const cache = getToxinmapDataCache();
  cache.__toxinmapTriReleaseCache ??= loadTriAggregates().then(({ releaseMap }) => releaseMap);
  return (await cache.__toxinmapTriReleaseCache).get(entityId) ?? [];
}
