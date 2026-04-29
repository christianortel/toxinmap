export {};

import { buildEntityDetailSummary } from "../../src/lib/data/detail-summary";
import {
  buildDetailDrawerDisplayState,
  detailDrawerDisplayLimits,
  type DetailDrawerItemWindow,
  type DetailDrawerDisplayState,
} from "../../src/lib/map/detail-drawer-state";
import type { ExplorerEntityDetail } from "../../src/types/explorer";

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

function requireReadFirst(summary: ReturnType<typeof buildEntityDetailSummary>, expected: {
  whatIncludes: string;
  sourceIncludes: string;
  measurementIncludes: string;
}) {
  if (!summary.readFirst.what.includes(expected.whatIncludes)) {
    throw new Error(
      `Expected read-first "what" to include ${expected.whatIncludes}, received ${summary.readFirst.what}.`,
    );
  }

  if (!summary.readFirst.source.includes(expected.sourceIncludes)) {
    throw new Error(
      `Expected read-first source to include ${expected.sourceIncludes}, received ${summary.readFirst.source}.`,
    );
  }

  if (!summary.readFirst.measuredVsInferred.includes(expected.measurementIncludes)) {
    throw new Error(
      `Expected read-first measured/inferred line to include ${expected.measurementIncludes}, received ${summary.readFirst.measuredVsInferred}.`,
    );
  }

  if (summary.readFirst.why.trim().length < 40) {
    throw new Error("Expected read-first why-it-matters line to contain useful explanatory copy.");
  }
}

function requireSourceAction(
  summary: ReturnType<typeof buildEntityDetailSummary>,
  expected: { sourceId: string; hrefIncludes: string },
) {
  const primaryAction = summary.sourceActions[0];

  if (!primaryAction) {
    throw new Error("Expected detail summary to expose at least one source action.");
  }

  if (primaryAction.id !== expected.sourceId) {
    throw new Error(
      `Expected primary source action ${expected.sourceId}, received ${primaryAction.id}.`,
    );
  }

  if (!primaryAction.href.includes(expected.hrefIncludes)) {
    throw new Error(
      `Expected primary source action href to include ${expected.hrefIncludes}, received ${primaryAction.href}.`,
    );
  }
}

function requirePrimaryFacts(
  summary: ReturnType<typeof buildEntityDetailSummary>,
  expected: { labelsInclude: string[]; helperIncludes?: string },
) {
  const labels = summary.primaryFacts.map((fact) => fact.label);

  for (const label of expected.labelsInclude) {
    if (!labels.includes(label)) {
      throw new Error(
        `Expected primary facts to include ${label}, received ${labels.join(", ")}.`,
      );
    }
  }

  if (summary.primaryFacts.some((fact) => fact.helper.trim().length < 30)) {
    throw new Error("Expected every primary fact to include useful helper copy.");
  }

  const helperIncludes = expected.helperIncludes;
  if (
    helperIncludes &&
    !summary.primaryFacts.some((fact) => fact.helper.includes(helperIncludes))
  ) {
    throw new Error(
      `Expected a primary fact helper to include ${helperIncludes}, received ${summary.primaryFacts
        .map((fact) => fact.helper)
        .join(" / ")}.`,
    );
  }
}

function requireWindowAccounting<T>(
  window: DetailDrawerItemWindow<T>,
  expected: { context: string; limit: number },
) {
  if (window.limit !== expected.limit) {
    throw new Error(
      `${expected.context}: expected limit ${expected.limit}, received ${window.limit}.`,
    );
  }

  if (window.visible.length > expected.limit) {
    throw new Error(`${expected.context}: expected visible items to stay capped.`);
  }

  if (window.total !== window.visible.length + window.hidden) {
    throw new Error(
      `${expected.context}: expected total to equal visible + hidden, received total=${window.total}, visible=${window.visible.length}, hidden=${window.hidden}.`,
    );
  }

  if (window.visible.length !== Math.min(window.total, expected.limit)) {
    throw new Error(
      `${expected.context}: expected visible length to match min(total, limit).`,
    );
  }

  if (window.total > expected.limit && window.hidden <= 0) {
    throw new Error(`${expected.context}: expected hidden count when total exceeds limit.`);
  }
}

function requireDisplayWindow(
  display: DetailDrawerDisplayState,
  expected: { primarySourceId: string; context: string },
) {
  requireWindowAccounting(display.sources, {
    context: `${expected.context} source cards`,
    limit: detailDrawerDisplayLimits.sourceCards,
  });
  requireWindowAccounting(display.secondaryStats, {
    context: `${expected.context} secondary stats`,
    limit: detailDrawerDisplayLimits.secondaryStats,
  });
  requireWindowAccounting(display.releaseRecords, {
    context: `${expected.context} release records`,
    limit: detailDrawerDisplayLimits.releaseRecords,
  });
  requireWindowAccounting(display.caseStudies, {
    context: `${expected.context} related case studies`,
    limit: detailDrawerDisplayLimits.caseStudies,
  });
  requireWindowAccounting(display.officialSignals, {
    context: `${expected.context} official signals`,
    limit: detailDrawerDisplayLimits.contextItems,
  });

  for (const section of display.contextSections) {
    requireWindowAccounting(section.items, {
      context: `${expected.context} ${section.title}`,
      limit: detailDrawerDisplayLimits.contextItems,
    });
  }

  if (display.sources.visible[0]?.id !== expected.primarySourceId) {
    throw new Error(
      `${expected.context}: expected first visible source card ${expected.primarySourceId}, received ${display.sources.visible[0]?.id ?? "none"}.`,
    );
  }

  if (display.summary.contextSections.length !== display.contextSections.length) {
    throw new Error(`${expected.context}: expected display context sections to match summary sections.`);
  }

  if (display.summary.primaryFacts.length > 4) {
    throw new Error(`${expected.context}: expected primary facts to stay capped at four.`);
  }
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  const fixtureIds = {
    pfas: "usgs-pfas-pfas-recon-nc-3-pub",
    hazard: "hazard-frs-110001968176",
    wastewater: "npdes-nc0065102-001",
    industrial: "frs-110000349766.0",
  };

  const [pfasDetail, hazardDetail, wastewaterDetail, industrialDetail] = await Promise.all(
    Object.values(fixtureIds).map((id) =>
      fetchJson<ExplorerEntityDetail>(baseUrl, `/api/entities/${encodeURIComponent(id)}`),
    ),
  );

  const pfasSummary = buildEntityDetailSummary(pfasDetail);
  const hazardSummary = buildEntityDetailSummary(hazardDetail);
  const wastewaterSummary = buildEntityDetailSummary(wastewaterDetail);
  const industrialSummary = buildEntityDetailSummary(industrialDetail);
  const pfasDisplay = buildDetailDrawerDisplayState(pfasDetail);
  const hazardDisplay = buildDetailDrawerDisplayState(hazardDetail);
  const wastewaterDisplay = buildDetailDrawerDisplayState(wastewaterDetail);
  const industrialDisplay = buildDetailDrawerDisplayState(industrialDetail);

  if (pfasSummary.rankedSources[0]?.id !== "usgs-pfas") {
    throw new Error("Expected PFAS detail summary to rank USGS PFAS lineage first.");
  }

  if (!pfasSummary.chemistrySpotlight.includes("PFAS")) {
    throw new Error('Expected PFAS detail summary to spotlight "PFAS".');
  }

  requireReadFirst(pfasSummary, {
    whatIncludes: "PFAS tap water sample",
    sourceIncludes: "USGS PFAS",
    measurementIncludes: "direct monitoring or sampling evidence",
  });
  requireSourceAction(pfasSummary, {
    sourceId: "usgs-pfas",
    hrefIncludes: "usgs.gov",
  });
  requirePrimaryFacts(pfasSummary, {
    labelsInclude: ["Evidence", "Confidence"],
    helperIncludes: "direct monitoring or sampling evidence",
  });
  requireDisplayWindow(pfasDisplay, {
    primarySourceId: "usgs-pfas",
    context: "PFAS detail display",
  });

  if (hazardSummary.rankedSources[0]?.id !== "epa-sems") {
    throw new Error("Expected cleanup hazard detail summary to rank EPA SEMS lineage first.");
  }

  if (!hazardSummary.primarySignals.some((signal) => signal.includes("Cleanup programs:"))) {
    throw new Error("Expected cleanup hazard detail summary to prioritize cleanup-program signals.");
  }

  requireReadFirst(hazardSummary, {
    whatIncludes: "Hazard registry",
    sourceIncludes: "EPA SEMS",
    measurementIncludes: "pathway or facility context",
  });
  requireSourceAction(hazardSummary, {
    sourceId: "epa-sems",
    hrefIncludes: "epa.gov",
  });
  requirePrimaryFacts(hazardSummary, {
    labelsInclude: ["Hazard class"],
    helperIncludes: "cleanup or legacy site context",
  });
  requireDisplayWindow(hazardDisplay, {
    primarySourceId: "epa-sems",
    context: "Hazard detail display",
  });

  if (wastewaterSummary.rankedSources[0]?.id !== "epa-npdes") {
    throw new Error("Expected wastewater detail summary to rank EPA NPDES lineage first.");
  }

  if (!wastewaterSummary.primaryStats.some((stat) => stat.label === "Permit")) {
    throw new Error('Expected wastewater detail summary to prioritize the "Permit" stat.');
  }

  requireReadFirst(wastewaterSummary, {
    whatIncludes: "Wastewater discharge context",
    sourceIncludes: "EPA NPDES",
    measurementIncludes: "pathway or facility context",
  });
  requireSourceAction(wastewaterSummary, {
    sourceId: "epa-npdes",
    hrefIncludes: "epa.gov",
  });
  requirePrimaryFacts(wastewaterSummary, {
    labelsInclude: ["Permit", "Design flow"],
    helperIncludes: "permitting system",
  });
  requireDisplayWindow(wastewaterDisplay, {
    primarySourceId: "epa-npdes",
    context: "Wastewater detail display",
  });

  if (industrialSummary.rankedSources[0]?.id !== "epa-tri") {
    throw new Error("Expected TRI industrial detail summary to rank EPA TRI lineage first.");
  }

  if (!industrialSummary.primarySignals.some((signal) => signal.includes("TRI facility disclosure"))) {
    throw new Error("Expected TRI industrial detail summary to prioritize TRI disclosure signals.");
  }

  requireReadFirst(industrialSummary, {
    whatIncludes: "Facility footprint",
    sourceIncludes: "EPA TRI",
    measurementIncludes: "direct monitoring or sampling evidence",
  });
  requireSourceAction(industrialSummary, {
    sourceId: "epa-tri",
    hrefIncludes: "epa.gov",
  });
  requirePrimaryFacts(industrialSummary, {
    labelsInclude: ["Evidence", "Confidence"],
    helperIncludes: "direct monitoring or sampling evidence",
  });
  requireDisplayWindow(industrialDisplay, {
    primarySourceId: "epa-tri",
    context: "Industrial detail display",
  });

  console.log("PASS detail summary validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        pfas: {
          readFirst: pfasSummary.readFirst,
          sourceActions: pfasSummary.sourceActions,
          primaryFacts: pfasSummary.primaryFacts,
          display: {
            officialSignals: pfasDisplay.officialSignals,
            contextSections: pfasDisplay.contextSections,
            sources: pfasDisplay.sources,
            secondaryStats: pfasDisplay.secondaryStats,
            releaseRecords: pfasDisplay.releaseRecords,
            caseStudies: pfasDisplay.caseStudies,
          },
          chemistrySpotlight: pfasSummary.chemistrySpotlight,
          rankedSources: pfasSummary.rankedSources.slice(0, 3).map((source) => source.id),
        },
        hazard: {
          readFirst: hazardSummary.readFirst,
          sourceActions: hazardSummary.sourceActions,
          primaryFacts: hazardSummary.primaryFacts,
          display: {
            officialSignals: hazardDisplay.officialSignals,
            contextSections: hazardDisplay.contextSections,
            sources: hazardDisplay.sources,
            secondaryStats: hazardDisplay.secondaryStats,
            releaseRecords: hazardDisplay.releaseRecords,
            caseStudies: hazardDisplay.caseStudies,
          },
          primarySignals: hazardSummary.primarySignals.slice(0, 3),
          rankedSources: hazardSummary.rankedSources.slice(0, 4).map((source) => source.id),
        },
        wastewater: {
          readFirst: wastewaterSummary.readFirst,
          sourceActions: wastewaterSummary.sourceActions,
          primaryFacts: wastewaterSummary.primaryFacts,
          display: {
            officialSignals: wastewaterDisplay.officialSignals,
            contextSections: wastewaterDisplay.contextSections,
            sources: wastewaterDisplay.sources,
            secondaryStats: wastewaterDisplay.secondaryStats,
            releaseRecords: wastewaterDisplay.releaseRecords,
            caseStudies: wastewaterDisplay.caseStudies,
          },
          primaryStats: wastewaterSummary.primaryStats.map((stat) => stat.label),
          rankedSources: wastewaterSummary.rankedSources.slice(0, 3).map((source) => source.id),
        },
        industrial: {
          readFirst: industrialSummary.readFirst,
          sourceActions: industrialSummary.sourceActions,
          primaryFacts: industrialSummary.primaryFacts,
          display: {
            officialSignals: industrialDisplay.officialSignals,
            contextSections: industrialDisplay.contextSections,
            sources: industrialDisplay.sources,
            secondaryStats: industrialDisplay.secondaryStats,
            releaseRecords: industrialDisplay.releaseRecords,
            caseStudies: industrialDisplay.caseStudies,
          },
          primarySignals: industrialSummary.primarySignals.slice(0, 3),
          rankedSources: industrialSummary.rankedSources.slice(0, 3).map((source) => source.id),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL detail summary validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
