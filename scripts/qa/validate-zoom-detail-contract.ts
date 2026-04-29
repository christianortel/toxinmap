export {};

import {
  HOME_VIEW,
  buildEntityFocusState,
  classifyCameraHeight,
  clampCameraHeight,
  getCameraZoomProgress,
  getZoomScaledAltitudeMultiplier,
  getZoomScaledPointMultiplier,
} from "@/lib/map/camera";
import type { ExplorerVisibleEntity } from "@/types/explorer";

function buildPointEntity(overrides: Partial<ExplorerVisibleEntity> = {}): ExplorerVisibleEntity {
  return {
    id: "test-point",
    title: "Test PFAS point",
    geometryType: "point",
    coordinates: [-78.9, 35],
    layerGroup: "official",
    layerId: "pfas-sites",
    category: "PFAS",
    subcategory: "Sample",
    locationLabel: "Cape Fear",
    summary: "Synthetic test point",
    whyThisAppears: "Validation",
    dateLabel: "2024",
    yearStart: 2024,
    yearEnd: 2026,
    evidenceType: "Direct Measurement",
    confidenceLevel: "High",
    tags: [],
    signalFamilies: ["pfas"],
    chemicalMarkers: ["pfas"],
    chemicalHighlights: ["GenX"],
    sourceIds: ["usgs-pfas-tapwater"],
    relatedCaseStudyIds: [],
    officialSignals: [],
    emergingConcerns: [],
    wildlifeSentinelContext: [],
    reproductiveHealthContext: [],
    legalHistoricalContext: [],
    uncertaintyNote: "Synthetic validation entity",
    ...overrides,
  };
}

function buildAggregateEntity(): ExplorerVisibleEntity {
  return buildPointEntity({
    id: "test-aggregate",
    title: "Aggregate legal cluster",
    layerId: "legal-markers",
    layerGroup: "legal",
    geometryType: "region",
    radiusKm: 180,
    sourceIds: ["epa-echo"],
    evidenceType: "Screening Signal",
    confidenceLevel: "Moderate",
    signalFamilies: ["legal-pressure"],
    chemicalMarkers: [],
    chemicalHighlights: [],
    isAggregate: true,
    aggregateCount: 12,
  });
}

async function main() {
  const closeHeight = clampCameraHeight(40_000);
  const localHeight = 320_000;
  const regionalHeight = 2_100_000;
  const farHeight = clampCameraHeight(12_000_000);

  if (closeHeight < 210_000 || closeHeight > 230_000) {
    throw new Error(`Expected close zoom clamp to stay near 220km, received ${closeHeight}.`);
  }

  if (farHeight < 6_000_000 || farHeight > 6_300_000) {
    throw new Error(`Expected far zoom clamp to stay near 6.2Mm, received ${farHeight}.`);
  }

  if (classifyCameraHeight(localHeight) !== "local") {
    throw new Error("Expected 320km camera height to classify as local.");
  }

  if (classifyCameraHeight(HOME_VIEW.height) !== "regional") {
    throw new Error("Expected the home camera height to classify as regional.");
  }

  if (classifyCameraHeight(farHeight) !== "national") {
    throw new Error("Expected the far clamped height to classify as national.");
  }

  const closePointScale = getZoomScaledPointMultiplier(closeHeight);
  const regionalPointScale = getZoomScaledPointMultiplier(regionalHeight);
  const farPointScale = getZoomScaledPointMultiplier(farHeight);

  if (!(closePointScale < regionalPointScale && regionalPointScale < farPointScale)) {
    throw new Error(
      `Expected point scale to grow as the camera pulls back, received close=${closePointScale.toFixed(2)}, regional=${regionalPointScale.toFixed(2)}, far=${farPointScale.toFixed(2)}.`,
    );
  }

  if (closePointScale > 0.9) {
    throw new Error(`Expected close zoom point scale to stay visually restrained, received ${closePointScale.toFixed(2)}.`);
  }

  const closeAltitudeScale = getZoomScaledAltitudeMultiplier(closeHeight);
  const farAltitudeScale = getZoomScaledAltitudeMultiplier(farHeight);
  if (!(closeAltitudeScale < farAltitudeScale)) {
    throw new Error(
      `Expected point altitude multiplier to shrink at close zoom, received close=${closeAltitudeScale.toFixed(2)}, far=${farAltitudeScale.toFixed(2)}.`,
    );
  }

  const pointFocus = buildEntityFocusState(buildPointEntity());
  if (pointFocus.height > 450_000) {
    throw new Error(`Expected direct point focus to zoom into close detail, received ${pointFocus.height}.`);
  }

  const aggregateFocus = buildEntityFocusState(buildAggregateEntity());
  if (aggregateFocus.height >= HOME_VIEW.height) {
    throw new Error(
      `Expected aggregate drilldown focus to move materially closer than home view, received aggregate=${aggregateFocus.height}, home=${HOME_VIEW.height}.`,
    );
  }

  const zoomProgress = getCameraZoomProgress(localHeight);
  if (zoomProgress <= 0 || zoomProgress >= 1) {
    throw new Error(`Expected local zoom progress to stay within the interior range, received ${zoomProgress}.`);
  }

  console.log("PASS zoom detail contract");
  console.log(
    JSON.stringify(
      {
        closeHeight,
        localHeight,
        regionalHeight,
        farHeight,
        pointScale: {
          close: Number(closePointScale.toFixed(2)),
          regional: Number(regionalPointScale.toFixed(2)),
          far: Number(farPointScale.toFixed(2)),
        },
        altitudeScale: {
          close: Number(closeAltitudeScale.toFixed(2)),
          far: Number(farAltitudeScale.toFixed(2)),
        },
        pointFocusHeight: pointFocus.height,
        aggregateFocusHeight: aggregateFocus.height,
        homeHeight: HOME_VIEW.height,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL zoom detail contract");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
