export {};

import {
  buildGlobeRenderableEntities,
  buildMapInspectionLabels,
  getMapInspectionLabelPresentation,
  getLocalObjectDetail,
  getLocalObjectRadius,
  getLocalObjectRenderStyle,
  splitGlobeRenderableEntities,
} from "@/lib/map/globe-rendering";
import {
  resolveExplorerEntityActivation,
  resolveExplorerEntityActivationById,
} from "@/lib/map/entity-activation";
import type { ExplorerVisibleEntity } from "@/types/explorer";

function buildEntity(
  id: string,
  overrides: Partial<ExplorerVisibleEntity> = {},
): ExplorerVisibleEntity {
  return {
    id,
    title: id,
    geometryType: "point",
    coordinates: [-78.9, 35.2],
    layerGroup: "official",
    layerId: "pfas-sites",
    category: "PFAS",
    subcategory: "Direct sample",
    locationLabel: "Cape Fear",
    summary: "Synthetic validation entity",
    whyThisAppears: "Validation",
    dateLabel: "2025",
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
    uncertaintyNote: "Validation entity",
    ...overrides,
  };
}

async function main() {
  const localPoint = buildEntity("local-point");
  const localPointSibling = buildEntity("local-point-sibling", {
    title: "local-point-sibling",
    layerId: "wastewater-sites",
    sourceIds: ["epa-npdes"],
    signalFamilies: ["wastewater"],
    chemicalMarkers: ["wastewater-indicators"],
    chemicalHighlights: ["PFAS"],
    coordinates: [-78.901, 35.201],
  });
  const localPointFar = buildEntity("local-point-far", {
    title: "local-point-far",
    layerId: "industrial-sites",
    sourceIds: ["epa-tri"],
    signalFamilies: ["air-toxics"],
    chemicalMarkers: ["legacy-industrial-mixtures"],
    chemicalHighlights: ["TRI"],
    coordinates: [-78.94, 35.24],
  });
  const localAggregate = buildEntity("local-aggregate", {
    geometryType: "region",
    layerId: "legal-markers",
    isAggregate: true,
  });
  const localRegion = buildEntity("local-region", {
    geometryType: "region",
    layerId: "air-toxics-regions",
  });
  const visibleEntities = [
    localPoint,
    localPointSibling,
    localPointFar,
    localAggregate,
    localRegion,
  ];
  const selectedRenderableEntities = buildGlobeRenderableEntities(visibleEntities, {
    cameraBand: "local",
    cameraHeight: 320_000,
    selectedEntityId: "local-point",
  });
  const unselectedRenderableEntities = buildGlobeRenderableEntities(visibleEntities, {
    cameraBand: "local",
    cameraHeight: 320_000,
    selectedEntityId: null,
  });

  const localSplit = splitGlobeRenderableEntities(selectedRenderableEntities, "local");

  if (localSplit.objectEntities.length !== 3) {
    throw new Error("Expected only concrete local point records to render on the smooth object layer.");
  }

  if (localSplit.pointEntities.length !== 2) {
    throw new Error("Expected local aggregates and regional context to stay on the point layer.");
  }

  const objectIds = new Set(localSplit.objectEntities.map((entity) => entity.id));
  if (!objectIds.has("local-point") || !objectIds.has("local-point-sibling") || !objectIds.has("local-point-far")) {
    throw new Error("Expected all local concrete points to stay on the object layer.");
  }

  const regionalRenderableEntities = buildGlobeRenderableEntities([localPoint], {
    cameraBand: "regional",
    cameraHeight: 2_100_000,
    selectedEntityId: null,
  });
  const regionalSplit = splitGlobeRenderableEntities(regionalRenderableEntities, "regional");
  if (regionalSplit.objectEntities.length !== 0 || regionalSplit.pointEntities.length !== 1) {
    throw new Error("Expected regional concrete points to stay on the broad-band point layer.");
  }

  const closeRadius = getLocalObjectRadius(0.005, 100, 220_000, false);
  const selectedRadius = getLocalObjectRadius(0.005, 100, 220_000, true);
  const farLocalRadius = getLocalObjectRadius(0.005, 100, 1_100_000, false);

  if (!(closeRadius > 0 && selectedRadius > closeRadius)) {
    throw new Error("Expected selected local object markers to render slightly larger than unselected markers.");
  }

  if (!(farLocalRadius > closeRadius)) {
    throw new Error("Expected local object marker radius to grow slightly as the camera pulls back.");
  }

  const closeDetail = getLocalObjectDetail(300_000);
  const farDetail = getLocalObjectDetail(1_100_000);

  if (!(closeDetail > farDetail)) {
    throw new Error("Expected close local object markers to use smoother sphere detail than far local markers.");
  }

  const localPrimary = localSplit.objectEntities.find((entity) => entity.id === "local-point");
  const localSibling = localSplit.objectEntities.find((entity) => entity.id === "local-point-sibling");
  const localFar = localSplit.objectEntities.find((entity) => entity.id === "local-point-far");
  if (!localPrimary || !localSibling || !localFar) {
    throw new Error("Expected local object entities to remain addressable after splitting.");
  }

  const closeRenderStyle = getLocalObjectRenderStyle(localPrimary, 100, 220_000, false);
  const selectedRenderStyle = getLocalObjectRenderStyle(localPrimary, 100, 220_000, true);

  if (!(closeRenderStyle.haloRadius > closeRenderStyle.coreRadius)) {
    throw new Error("Expected local marker halo radius to exceed the visible core radius.");
  }

  if (!(closeRenderStyle.hitRadius > closeRenderStyle.haloRadius)) {
    throw new Error("Expected local marker hit radius to exceed the halo radius.");
  }

  if (!(selectedRenderStyle.haloOpacity > closeRenderStyle.haloOpacity)) {
    throw new Error("Expected selected local markers to render with a stronger halo than unselected markers.");
  }

  if (localPrimary.localStackIndex === localSibling.localStackIndex) {
    throw new Error("Expected nearby local object markers to receive different stack offsets for click clarity.");
  }

  if (!(localPrimary.pointAltitude !== localSibling.pointAltitude)) {
    throw new Error("Expected nearby local object markers to receive different object altitudes.");
  }

  const unselectedInspectionLabels = buildMapInspectionLabels(
    splitGlobeRenderableEntities(unselectedRenderableEntities, "local").objectEntities,
    "local",
    null,
  );
  if (unselectedInspectionLabels.length !== 3) {
    throw new Error("Expected local concrete object markers to expose lightweight inspection labels.");
  }

  if (!unselectedInspectionLabels.every((label) => label.text.includes(":"))) {
    throw new Error("Expected unselected inspection labels to include layer/title context.");
  }

  if (unselectedInspectionLabels.some((label) => label.text.includes("confidence"))) {
    throw new Error("Expected unselected inspection labels to stay short and omit evidence/confidence copy.");
  }

  const selectedInspectionLabels = buildMapInspectionLabels(
    localSplit.objectEntities,
    "local",
    "local-point",
  );
  if (selectedInspectionLabels.length > 5) {
    throw new Error("Expected inspection labels to stay visually bounded.");
  }

  const selectedInspectionLabel = selectedInspectionLabels.find((label) => label.entityId === "local-point");
  const siblingInspectionLabel = selectedInspectionLabels.find((label) => label.entityId === "local-point-sibling");
  const farInspectionLabel = selectedInspectionLabels.find((label) => label.entityId === "local-point-far");
  if (!selectedInspectionLabel?.isSelected) {
    throw new Error("Expected selected local marker to expose a selected inspection label.");
  }

  if (selectedInspectionLabels[0]?.entityId !== "local-point") {
    throw new Error("Expected selected inspection label to stay first and visually dominant.");
  }

  if (!(selectedInspectionLabel.size > (farInspectionLabel?.size ?? 0))) {
    throw new Error("Expected selected inspection label to render larger than unselected labels.");
  }

  if (siblingInspectionLabel) {
    throw new Error("Expected selected-adjacent inspection labels to be suppressed in dense local scenes.");
  }

  if (!farInspectionLabel) {
    throw new Error("Expected farther high-priority local labels to remain visible after dense-scene suppression.");
  }

  if (!selectedInspectionLabel.text.includes("USGS PFAS")) {
    throw new Error("Expected selected inspection label to expose strongest source context.");
  }

  const selectedLabelPresentation = getMapInspectionLabelPresentation(localPrimary);
  if (selectedInspectionLabel.text !== selectedLabelPresentation.selectedText) {
    throw new Error("Expected selected inspection label text to match shared presentation rules.");
  }

  const farLabelPresentation = getMapInspectionLabelPresentation(localFar);
  if (farInspectionLabel.text !== farLabelPresentation.unselectedText) {
    throw new Error("Expected unselected inspection label text to stay in compact layer/title form.");
  }

  if (
    !selectedInspectionLabel.text.includes("Direct evidence") ||
    !selectedInspectionLabel.text.includes("High confidence")
  ) {
    throw new Error("Expected selected inspection label to expose evidence and confidence context.");
  }

  if (!(selectedInspectionLabel.altitude > (localPrimary.pointAltitude ?? 0))) {
    throw new Error("Expected selected inspection label to sit above the marker altitude.");
  }

  if (buildMapInspectionLabels(localSplit.objectEntities, "regional", "local-point").length !== 0) {
    throw new Error("Expected inspection labels to stay disabled outside the local camera band.");
  }

  const markerActivation = resolveExplorerEntityActivation({
    entity: localPrimary,
    visibleEntities: selectedRenderableEntities,
    cameraBand: "local",
  });
  const labelActivation = resolveExplorerEntityActivationById({
    entityId: selectedInspectionLabel.entityId,
    visibleEntities: selectedRenderableEntities,
    cameraBand: "local",
  });

  if (!labelActivation) {
    throw new Error("Expected selected inspection label to resolve to an entity activation.");
  }

  if (JSON.stringify(labelActivation) !== JSON.stringify(markerActivation)) {
    throw new Error(
      `Expected label click activation to match marker click activation, received ${JSON.stringify(labelActivation)} instead of ${JSON.stringify(markerActivation)}.`,
    );
  }

  const missingLabelActivation = resolveExplorerEntityActivationById({
    entityId: "missing-label-entity",
    visibleEntities: selectedRenderableEntities,
    cameraBand: "local",
  });

  if (missingLabelActivation !== null) {
    throw new Error("Expected missing inspection label entity activation to fail closed.");
  }

  console.log("PASS local marker rendering");
  console.log(
    JSON.stringify(
      {
        localObjectEntities: localSplit.objectEntities.length,
        localPointEntities: localSplit.pointEntities.length,
        closeRadius: Number(closeRadius.toFixed(3)),
        selectedRadius: Number(selectedRadius.toFixed(3)),
        farLocalRadius: Number(farLocalRadius.toFixed(3)),
        closeDetail,
        farDetail,
        haloRadius: Number(closeRenderStyle.haloRadius.toFixed(3)),
        hitRadius: Number(closeRenderStyle.hitRadius.toFixed(3)),
        stackIndexes: localSplit.objectEntities.map((entity) => ({
          id: entity.id,
          stackIndex: entity.localStackIndex,
          altitude: Number(entity.pointAltitude.toFixed(4)),
        })),
        inspectionLabels: selectedInspectionLabels.map((label) => ({
          id: label.entityId,
          selected: label.isSelected,
          text: label.text,
          altitude: Number(label.altitude.toFixed(4)),
        })),
        activationParity: {
          marker: markerActivation,
          label: labelActivation,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL local marker rendering");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
