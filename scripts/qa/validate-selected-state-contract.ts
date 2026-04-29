export {};

import { buildDetailDrawerHeaderState } from "@/lib/map/detail-drawer-state";
import { getLocalObjectRenderStyle } from "@/lib/map/globe-rendering";
import type { ExplorerVisibleEntity } from "@/types/explorer";

function buildEntity(
  id: string,
  overrides: Partial<ExplorerVisibleEntity> = {},
): ExplorerVisibleEntity & {
  lat: number;
  lng: number;
  pointColor: string;
  pointAltitude: number;
  pointRadius: number;
} {
  const entity: ExplorerVisibleEntity = {
    id,
    title: id,
    geometryType: "point",
    coordinates: [-78.48, 35.38],
    layerGroup: "emerging",
    layerId: "wastewater-sites",
    category: "Wastewater",
    subcategory: "Permit",
    locationLabel: "APEX, NC",
    summary: "Synthetic validation entity",
    whyThisAppears: "Validation",
    dateLabel: "2025",
    yearStart: 2024,
    yearEnd: 2026,
    evidenceType: "Proxy",
    confidenceLevel: "High",
    tags: [],
    signalFamilies: ["wastewater"],
    chemicalMarkers: ["wastewater-indicators"],
    chemicalHighlights: ["PFAS"],
    sourceIds: ["epa-npdes"],
    relatedCaseStudyIds: [],
    officialSignals: [],
    emergingConcerns: [],
    wildlifeSentinelContext: [],
    reproductiveHealthContext: [],
    legalHistoricalContext: [],
    uncertaintyNote: "Validation entity",
    ...overrides,
  };

  return {
    ...entity,
    lat: entity.coordinates[1],
    lng: entity.coordinates[0],
    pointColor: "#7fd0ff",
    pointAltitude: 0.0022,
    pointRadius: 0.005,
  };
}

async function main() {
  const entity = buildEntity("npdes-nc0065102-001");

  const selectedRenderStyle = getLocalObjectRenderStyle(entity, 100, 220_000, true);
  const unselectedRenderStyle = getLocalObjectRenderStyle(entity, 100, 220_000, false);

  if (!selectedRenderStyle.selectionBeaconRadius) {
    throw new Error("Expected selected local markers to receive a dedicated selection beacon.");
  }

  if (!(selectedRenderStyle.selectionBeaconRadius > selectedRenderStyle.haloRadius)) {
    throw new Error("Expected selected beacon radius to exceed the selected halo radius.");
  }

  if (!(selectedRenderStyle.selectionBeaconOpacity > 0)) {
    throw new Error("Expected selected markers to render a visible selection beacon.");
  }

  if (unselectedRenderStyle.selectionBeaconRadius !== null || unselectedRenderStyle.selectionBeaconOpacity !== 0) {
    throw new Error("Expected unselected local markers to omit the selection beacon.");
  }

  const selectedHeaderState = buildDetailDrawerHeaderState(entity, entity.id);
  const indirectHeaderState = buildDetailDrawerHeaderState(entity, "other-entity");

  if (!selectedHeaderState.isSelectedOnMap) {
    throw new Error("Expected the detail header state to mark the active selected entity as selected on map.");
  }

  if (indirectHeaderState.isSelectedOnMap) {
    throw new Error("Expected non-selected entities to report an indirect detail-header state.");
  }

  if (!selectedHeaderState.layerLabel) {
    throw new Error("Expected the detail header state to expose a non-empty layer label.");
  }

  if (!selectedHeaderState.layerAccent) {
    throw new Error("Expected the detail header state to expose the layer accent.");
  }

  console.log("PASS selected state contract");
  console.log(
    JSON.stringify(
      {
        selectedBeaconRadius: Number(selectedRenderStyle.selectionBeaconRadius.toFixed(3)),
        selectedBeaconOpacity: Number(selectedRenderStyle.selectionBeaconOpacity.toFixed(2)),
        selectedLayerLabel: selectedHeaderState.layerLabel,
        selectedGroupLabel: selectedHeaderState.groupLabel,
        selectedOnMap: selectedHeaderState.isSelectedOnMap,
        indirectOnMap: indirectHeaderState.isSelectedOnMap,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL selected state contract");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
