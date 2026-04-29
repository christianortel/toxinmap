export {};

import {
  resolveNearbyFocusRadiusState,
  buildNearbyFocusCameraTarget,
  buildSelectionSurfaceContext,
  resolveDetailDrawerCloseState,
  resolveSelectedNearbyRefocusState,
  resolveSelectionContextActionState,
} from "@/lib/map/selection-context";
import { resolveExplorerEntityFocusState } from "@/lib/map/entity-activation";
import { useExplorerStore } from "@/store/explorer-store";
import type { ExplorerEntity, ExplorerNearbyResponse } from "@/types/explorer";

function buildEntity(
  id: string,
  overrides: Partial<ExplorerEntity> = {},
): ExplorerEntity {
  return {
    id,
    title: "SOUTH CARY WRF",
    geometryType: "point",
    coordinates: [-78.82, 35.72],
    layerGroup: "emerging",
    layerId: "wastewater-sites",
    category: "Wastewater",
    subcategory: "Permit",
    locationLabel: "Cary, NC",
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
}

function buildNearbySummary(): ExplorerNearbyResponse {
  return {
    center: {
      label: "Cape Fear focus",
      coordinates: [-78.88, 34.98],
      radiusMiles: 50,
    },
    total: 96,
    groupedCounts: [],
    evidenceCounts: [],
    sourceCounts: [],
    systemCounts: [],
    signalFamilyCounts: [],
    chemicalMarkerCounts: [],
    chemicalHighlightCounts: [],
    themeCounts: [],
    coverageNotes: [],
    summaryLines: [],
    headlineResults: [],
    results: [],
  };
}

async function main() {
  const selectedEntity = buildEntity("npdes-nc0065102-001");
  const nearbySummary = buildNearbySummary();

  const selectedContext = buildSelectionSurfaceContext({
    selectedEntity,
    selectedEntityId: selectedEntity.id,
    nearbyFocus: nearbySummary.center,
    nearbySummary,
    searchQuery: "SOUTH CARY WRF",
    cameraBandLabel: "Local",
  });

  if (selectedContext.kind !== "selected-entity") {
    throw new Error(`Expected selected context kind, received ${selectedContext.kind}.`);
  }

  if (selectedContext.value !== "SOUTH CARY WRF") {
    throw new Error(`Expected selected context value to expose the selected title, received ${selectedContext.value}.`);
  }

  const selectedChipValues = new Set(selectedContext.chips.map((chip) => chip.value));
  if (!selectedChipValues.has("Wastewater")) {
    throw new Error("Expected selected context chips to include the layer label.");
  }

  if (!selectedChipValues.has("Emerging")) {
    throw new Error("Expected selected context chips to include the group label.");
  }

  if (!selectedChipValues.has("Cape Fear focus")) {
    throw new Error("Expected selected context chips to include the nearby focus label.");
  }

  if (!selectedChipValues.has("50 mi")) {
    throw new Error("Expected selected context chips to include the nearby focus radius.");
  }

  const selectedActionIds = new Set(selectedContext.actions.map((action) => action.id));
  if (!selectedActionIds.has("clear-selection")) {
    throw new Error("Expected selected context actions to include clear-selection.");
  }

  if (!selectedActionIds.has("return-nearby")) {
    throw new Error("Expected selected context actions to include return-nearby.");
  }

  const selectedRecovery = resolveSelectionContextActionState("clear-selection", {
    selectedEntityId: selectedEntity.id,
    nearbyFocus: nearbySummary.center,
    isDrawerOpen: true,
    searchQuery: "SOUTH CARY WRF",
    isSearchOpen: false,
    cameraTarget: {
      label: "Selected record focus",
      coordinates: selectedEntity.coordinates,
      height: 420000,
    },
    isCameraAtHome: false,
  });

  if (selectedRecovery.selectedEntityId !== null) {
    throw new Error("Expected clear-selection to clear the selected entity id.");
  }

  if (selectedRecovery.nearbyFocus?.label !== "Cape Fear focus") {
    throw new Error("Expected clear-selection to preserve nearby focus.");
  }

  if (!selectedRecovery.isDrawerOpen) {
    throw new Error("Expected clear-selection to keep the nearby summary surface open when nearby focus exists.");
  }

  const expectedNearbyCameraTarget = buildNearbyFocusCameraTarget(nearbySummary.center);
  if (selectedRecovery.cameraTarget?.label !== expectedNearbyCameraTarget.label) {
    throw new Error("Expected clear-selection to restore nearby camera focus label.");
  }

  if (selectedRecovery.cameraTarget?.height !== expectedNearbyCameraTarget.height) {
    throw new Error("Expected clear-selection to restore nearby camera focus height.");
  }

  if (selectedRecovery.isCameraAtHome) {
    throw new Error("Expected clear-selection to leave home-camera state.");
  }

  const selectedDrawerClose = resolveDetailDrawerCloseState({
    selectedEntityId: selectedEntity.id,
    nearbyFocus: nearbySummary.center,
    isDrawerOpen: true,
    searchQuery: "SOUTH CARY WRF",
    isSearchOpen: false,
    cameraTarget: {
      label: "Selected record focus",
      coordinates: selectedEntity.coordinates,
      height: 420000,
    },
    isCameraAtHome: false,
  });

  if (selectedDrawerClose.selectedEntityId !== null) {
    throw new Error("Expected selected drawer close to clear the selected entity id.");
  }

  if (selectedDrawerClose.nearbyFocus?.label !== "Cape Fear focus") {
    throw new Error("Expected selected drawer close to preserve nearby focus.");
  }

  if (!selectedDrawerClose.isDrawerOpen) {
    throw new Error("Expected selected drawer close to reopen nearby summary when nearby focus exists.");
  }

  if (selectedDrawerClose.cameraTarget?.label !== expectedNearbyCameraTarget.label) {
    throw new Error("Expected selected drawer close to restore nearby camera focus label.");
  }

  if (selectedDrawerClose.cameraTarget?.height !== expectedNearbyCameraTarget.height) {
    throw new Error("Expected selected drawer close to restore nearby camera focus height.");
  }

  const selectedNearbyRefocus = resolveSelectedNearbyRefocusState({
    selectedEntityId: selectedEntity.id,
    nearbyFocus: nearbySummary.center,
    isDrawerOpen: true,
    searchQuery: "SOUTH CARY WRF",
    isSearchOpen: false,
    cameraTarget: {
      label: "Selected record focus",
      coordinates: selectedEntity.coordinates,
      height: 420000,
    },
    isCameraAtHome: false,
  });

  if (selectedNearbyRefocus.selectedEntityId !== selectedEntity.id) {
    throw new Error("Expected selected nearby refocus to preserve the selected entity id.");
  }

  if (!selectedNearbyRefocus.isDrawerOpen) {
    throw new Error("Expected selected nearby refocus to keep the detail drawer open.");
  }

  if (selectedNearbyRefocus.cameraTarget?.label !== expectedNearbyCameraTarget.label) {
    throw new Error("Expected selected nearby refocus to restore nearby camera focus label.");
  }

  if (selectedNearbyRefocus.cameraTarget?.height !== expectedNearbyCameraTarget.height) {
    throw new Error("Expected selected nearby refocus to restore nearby camera focus height.");
  }

  const isolatedDrawerClose = resolveDetailDrawerCloseState({
    selectedEntityId: selectedEntity.id,
    nearbyFocus: null,
    isDrawerOpen: true,
    searchQuery: "",
    isSearchOpen: false,
    cameraTarget: {
      label: "Selected record focus",
      coordinates: selectedEntity.coordinates,
      height: 420000,
    },
    isCameraAtHome: false,
  });

  if (isolatedDrawerClose.selectedEntityId !== null) {
    throw new Error("Expected isolated selected drawer close to clear the selected entity id.");
  }

  if (isolatedDrawerClose.isDrawerOpen) {
    throw new Error("Expected isolated selected drawer close to close the drawer.");
  }

  if (isolatedDrawerClose.cameraTarget !== null) {
    throw new Error("Expected isolated selected drawer close to clear the stale selected camera target.");
  }

  const returnNearbyRecovery = resolveSelectionContextActionState("return-nearby", {
    selectedEntityId: selectedEntity.id,
    nearbyFocus: nearbySummary.center,
    isDrawerOpen: true,
    searchQuery: "",
    isSearchOpen: false,
    cameraTarget: {
      label: "Selected record focus",
      coordinates: selectedEntity.coordinates,
      height: 420000,
    },
    isCameraAtHome: false,
  });

  if (returnNearbyRecovery.selectedEntityId !== null || !returnNearbyRecovery.isDrawerOpen) {
    throw new Error("Expected return-nearby to clear selection and reopen nearby summary.");
  }

  if (returnNearbyRecovery.cameraTarget?.label !== expectedNearbyCameraTarget.label) {
    throw new Error("Expected return-nearby to restore nearby camera target.");
  }

  const nearbyContext = buildSelectionSurfaceContext({
    selectedEntity: null,
    selectedEntityId: null,
    nearbyFocus: nearbySummary.center,
    nearbySummary,
    searchQuery: "",
    cameraBandLabel: "Regional",
  });

  if (nearbyContext.kind !== "nearby-focus") {
    throw new Error(`Expected nearby context kind, received ${nearbyContext.kind}.`);
  }

  if (nearbyContext.value !== "Cape Fear focus") {
    throw new Error(`Expected nearby context to expose the focus label, received ${nearbyContext.value}.`);
  }

  if (!nearbyContext.chips.some((chip) => chip.value === "96")) {
    throw new Error("Expected nearby context chips to include the nearby signal count.");
  }

  if (
    nearbyContext.actions.length !== 1 ||
    nearbyContext.actions[0]?.id !== "clear-nearby"
  ) {
    throw new Error("Expected nearby context to expose only the clear-nearby action.");
  }

  const clearedNearbyState = resolveSelectionContextActionState("clear-nearby", {
    selectedEntityId: null,
    nearbyFocus: nearbySummary.center,
    isDrawerOpen: true,
    searchQuery: "",
    isSearchOpen: false,
    cameraTarget: expectedNearbyCameraTarget,
    isCameraAtHome: false,
  });

  if (clearedNearbyState.nearbyFocus !== null) {
    throw new Error("Expected clear-nearby to clear the nearby focus.");
  }

  if (clearedNearbyState.isDrawerOpen) {
    throw new Error("Expected clear-nearby to return to map scope by closing the detail surface.");
  }

  if (clearedNearbyState.cameraTarget !== null) {
    throw new Error("Expected clear-nearby to clear any stale camera target.");
  }

  const searchContext = buildSelectionSurfaceContext({
    selectedEntity: null,
    selectedEntityId: null,
    nearbyFocus: null,
    nearbySummary: null,
    searchQuery: "GenX",
    cameraBandLabel: "Regional",
  });

  if (searchContext.kind !== "search-query") {
    throw new Error(`Expected search context kind, received ${searchContext.kind}.`);
  }

  if (searchContext.value !== "GenX") {
    throw new Error(`Expected search context to expose the search query, received ${searchContext.value}.`);
  }

  if (!searchContext.chips.some((chip) => chip.value === "Regional")) {
    throw new Error("Expected search context chips to expose the current camera scope.");
  }

  if (
    searchContext.actions.length !== 1 ||
    searchContext.actions[0]?.id !== "clear-search"
  ) {
    throw new Error("Expected search context to expose only the clear-search action.");
  }

  const clearedSearchState = resolveSelectionContextActionState("clear-search", {
    selectedEntityId: null,
    nearbyFocus: null,
    isDrawerOpen: false,
    searchQuery: "GenX",
    isSearchOpen: true,
    cameraTarget: expectedNearbyCameraTarget,
    isCameraAtHome: false,
  });

  if (clearedSearchState.searchQuery !== "") {
    throw new Error("Expected clear-search to clear the active search query.");
  }

  if (clearedSearchState.isSearchOpen) {
    throw new Error("Expected clear-search to close search-open state.");
  }

  if (clearedSearchState.cameraTarget?.label !== expectedNearbyCameraTarget.label) {
    throw new Error("Expected clear-search to preserve current camera target.");
  }

  const tightenedNearbyState = resolveNearbyFocusRadiusState(nearbySummary.center, 25);
  if (tightenedNearbyState.nearbyFocus.radiusMiles !== 25) {
    throw new Error("Expected nearby radius reducer to update radius to 25 miles.");
  }

  if (tightenedNearbyState.cameraTarget.height !== 850000) {
    throw new Error("Expected 25 mile nearby focus to use the canonical close camera height.");
  }

  if (tightenedNearbyState.isCameraAtHome) {
    throw new Error("Expected nearby radius reducer to leave home-camera state.");
  }

  const widenedNearbyState = resolveNearbyFocusRadiusState(nearbySummary.center, 100);
  if (widenedNearbyState.cameraTarget.height !== 1900000) {
    throw new Error("Expected 100 mile nearby focus to use the canonical wide camera height.");
  }

  const nearbyHeadlineActivation = resolveExplorerEntityFocusState(
    {
      entityId: selectedEntity.id,
      label: selectedEntity.title,
      coordinates: selectedEntity.coordinates,
    },
    {
      selectedEntityId: null,
      nearbyFocus: nearbySummary.center,
      isDrawerOpen: true,
      searchQuery: "",
      isSearchOpen: false,
      cameraTarget: expectedNearbyCameraTarget,
      isCameraAtHome: false,
    },
  );

  if (nearbyHeadlineActivation.selectedEntityId !== selectedEntity.id) {
    throw new Error("Expected nearby headline activation to select the targeted entity.");
  }

  if (!nearbyHeadlineActivation.isDrawerOpen) {
    throw new Error("Expected nearby headline activation to keep the drawer open.");
  }

  if (nearbyHeadlineActivation.cameraTarget?.label !== selectedEntity.title) {
    throw new Error("Expected nearby headline activation to set the camera target label to the selected entity title.");
  }

  if (nearbyHeadlineActivation.cameraTarget?.height !== 420000) {
    throw new Error("Expected nearby headline activation to use the canonical selected-entity focus height.");
  }

  const searchEntityActivationWithCoordinates = resolveExplorerEntityFocusState(
    {
      entityId: selectedEntity.id,
      label: selectedEntity.title,
      coordinates: selectedEntity.coordinates,
    },
    {
      selectedEntityId: null,
      nearbyFocus: nearbySummary.center,
      isDrawerOpen: false,
      searchQuery: "SOUTH CARY WRF",
      isSearchOpen: true,
      cameraTarget: expectedNearbyCameraTarget,
      isCameraAtHome: false,
    },
  );

  if (searchEntityActivationWithCoordinates.selectedEntityId !== selectedEntity.id) {
    throw new Error("Expected coordinate-bearing search activation to select the targeted entity.");
  }

  if (!searchEntityActivationWithCoordinates.isDrawerOpen) {
    throw new Error("Expected coordinate-bearing search activation to open the detail drawer.");
  }

  if (searchEntityActivationWithCoordinates.isSearchOpen) {
    throw new Error("Expected coordinate-bearing search activation to close the search surface.");
  }

  if (searchEntityActivationWithCoordinates.cameraTarget?.label !== selectedEntity.title) {
    throw new Error("Expected coordinate-bearing search activation to set a selected-record camera target.");
  }

  if (searchEntityActivationWithCoordinates.cameraTarget?.height !== 420000) {
    throw new Error("Expected coordinate-bearing search activation to use selected-record focus height.");
  }

  useExplorerStore.setState({
    selectedEntityId: null,
    nearbyFocus: nearbySummary.center,
    isDrawerOpen: false,
    searchQuery: "SOUTH CARY WRF",
    isSearchOpen: true,
    cameraTarget: expectedNearbyCameraTarget,
    isCameraAtHome: false,
  });
  useExplorerStore.getState().applyExplorerSurfaceState(searchEntityActivationWithCoordinates);
  const appliedSearchActivation = useExplorerStore.getState();

  if (appliedSearchActivation.selectedEntityId !== selectedEntity.id) {
    throw new Error("Expected atomic surface-state application to preserve selected entity id.");
  }

  if (appliedSearchActivation.cameraTarget?.label !== selectedEntity.title) {
    throw new Error("Expected atomic surface-state application to preserve selected camera target.");
  }

  const searchEntityActivation = resolveExplorerEntityFocusState(
    {
      entityId: selectedEntity.id,
      label: selectedEntity.title,
    },
    {
      selectedEntityId: null,
      nearbyFocus: nearbySummary.center,
      isDrawerOpen: false,
      searchQuery: "SOUTH CARY WRF",
      isSearchOpen: false,
      cameraTarget: expectedNearbyCameraTarget,
      isCameraAtHome: false,
    },
  );

  if (searchEntityActivation.selectedEntityId !== selectedEntity.id) {
    throw new Error("Expected search activation to select the targeted entity.");
  }

  if (!searchEntityActivation.isDrawerOpen) {
    throw new Error("Expected search activation to open the detail drawer.");
  }

  if (searchEntityActivation.isSearchOpen) {
    throw new Error("Expected search activation without coordinates to close the search surface.");
  }

  if (searchEntityActivation.cameraTarget?.label !== expectedNearbyCameraTarget.label) {
    throw new Error("Expected search activation without coordinates to preserve the current camera target.");
  }

  console.log("PASS selection context contract");
  console.log(
    JSON.stringify(
      {
        selectedContext,
        nearbyContext,
        searchContext,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL selection context contract");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
