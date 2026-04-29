export {};

import { buildEntityFocusState, classifyCameraHeight } from "../../src/lib/map/camera";
import {
  EXPLORER_ENTITY_FOCUS_HEIGHT,
  resolveExplorerEntityActivation,
  resolveExplorerEntityFocusState,
} from "../../src/lib/map/entity-activation";
import {
  getExplorerSearchMatchLabel,
  getExplorerSearchResultActionLabel,
  getExplorerSearchResultInsightBadges,
} from "../../src/lib/map/search-presentation";
import type { ExplorerSearchResult, ExplorerVisibleEntity } from "../../src/types/explorer";

function expectIncludesAll(values: string[], expectedValues: string[], context: string) {
  const missing = expectedValues.filter((value) => !values.includes(value));
  if (missing.length > 0) {
    throw new Error(
      `${context}: expected ${JSON.stringify(values)} to include ${missing.join(", ")}.`,
    );
  }
}

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildMapEntitiesPath(
  cameraBand: "national" | "regional" | "local",
  center: [number, number],
) {
  const params = new URLSearchParams({
    year: "2025",
    cameraBand,
    centerLng: center[0].toString(),
    centerLat: center[1].toString(),
    groups: "official,emerging,legal",
  });

  return `/api/map-entities?${params.toString()}`;
}

function requireSearchFocusState(
  result: ExplorerSearchResult,
  expected: { id: string; title: string; context: string },
) {
  if (!result.entityId) {
    throw new Error(`${expected.context}: expected result to carry an entity id.`);
  }

  if (result.entityId !== expected.id || result.id !== expected.id) {
    throw new Error(
      `${expected.context}: expected id/entityId ${expected.id}, received id=${result.id}, entityId=${result.entityId}.`,
    );
  }

  if (!result.coordinates) {
    throw new Error(`${expected.context}: expected result to carry focus coordinates.`);
  }

  const preservedNearbyTarget = {
    label: "Existing nearby focus",
    coordinates: [-78.88, 34.98] satisfies [number, number],
    height: 1_250_000,
  };
  const focusState = resolveExplorerEntityFocusState(
    {
      entityId: result.entityId,
      label: result.title,
      coordinates: result.coordinates,
    },
    {
      selectedEntityId: null,
      nearbyFocus: null,
      isDrawerOpen: false,
      searchQuery: result.title,
      isSearchOpen: true,
      cameraTarget: preservedNearbyTarget,
      isCameraAtHome: true,
    },
  );

  if (focusState.selectedEntityId !== expected.id) {
    throw new Error(
      `${expected.context}: expected search focus to select ${expected.id}, received ${focusState.selectedEntityId}.`,
    );
  }

  if (!focusState.isDrawerOpen) {
    throw new Error(`${expected.context}: expected search focus to open the detail drawer.`);
  }

  if (focusState.isSearchOpen) {
    throw new Error(`${expected.context}: expected search focus to close the search surface.`);
  }

  if (focusState.cameraTarget?.label !== expected.title) {
    throw new Error(
      `${expected.context}: expected camera target label ${expected.title}, received ${focusState.cameraTarget?.label ?? "none"}.`,
    );
  }

  if (
    focusState.cameraTarget?.coordinates[0] !== result.coordinates[0] ||
    focusState.cameraTarget?.coordinates[1] !== result.coordinates[1]
  ) {
    throw new Error(`${expected.context}: expected camera target to use result coordinates.`);
  }

  if (focusState.cameraTarget?.height !== EXPLORER_ENTITY_FOCUS_HEIGHT) {
    throw new Error(
      `${expected.context}: expected selected-record focus height ${EXPLORER_ENTITY_FOCUS_HEIGHT}, received ${focusState.cameraTarget?.height ?? "none"}.`,
    );
  }

  if (focusState.isCameraAtHome) {
    throw new Error(`${expected.context}: expected search focus to leave home-camera state.`);
  }

  return focusState;
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const capeFearCenter: [number, number] = [-78.88, 34.98];

  const regionalView = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    buildMapEntitiesPath("regional", capeFearCenter),
  );
  const localView = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    buildMapEntitiesPath("local", capeFearCenter),
  );
  const southCarySearch = await fetchJson<ExplorerSearchResult[]>(
    baseUrl,
    `/api/search?q=${encodeURIComponent("SOUTH CARY WRF")}`,
  );
  const briarwoodSearch = await fetchJson<ExplorerSearchResult[]>(
    baseUrl,
    `/api/search?q=${encodeURIComponent("BRIARWOOD FARMS WWTP")}`,
  );
  const southCaryDetail = await fetchJson<{ id: string; layerId: string; backend: string }>(
    baseUrl,
    "/api/entities/npdes-nc0065102-001",
  );
  const briarwoodDetail = await fetchJson<{ id: string; layerId: string; backend: string }>(
    baseUrl,
    "/api/entities/npdes-nc0062740-001",
  );

  if (regionalView.length === 0) {
    throw new Error("Regional Cape Fear view returned no visible entities.");
  }

  if (localView.length === 0) {
    throw new Error("Local Cape Fear view returned no visible entities.");
  }

  const visibleRegionalPfas =
    regionalView.find((entity) => entity.layerId === "pfas-sites" && !entity.isAggregate) ??
    regionalView.find((entity) => entity.layerId === "pfas-sites") ??
    null;

  if (!visibleRegionalPfas) {
    throw new Error("Expected regional Cape Fear view to expose a visible PFAS entity.");
  }

  const regionalActivation = resolveExplorerEntityActivation({
    entity: visibleRegionalPfas,
    visibleEntities: regionalView,
    cameraBand: "regional",
  });

  if (regionalActivation.type !== "select") {
    throw new Error(
      `Expected visible regional PFAS activation to select a concrete entity, received ${regionalActivation.type}.`,
    );
  }

  if (regionalActivation.entityId !== visibleRegionalPfas.id) {
    throw new Error(
      `Expected visible regional PFAS activation to preserve ${visibleRegionalPfas.id}, received ${regionalActivation.entityId}.`,
    );
  }

  const regionalFocus = buildEntityFocusState(visibleRegionalPfas);
  if (classifyCameraHeight(regionalFocus.height) !== "local") {
    throw new Error(
      `Expected PFAS point focus to resolve to local inspection height, received ${regionalFocus.height}.`,
    );
  }

  const topTen = localView.slice(0, 10);
  const localLayerIds = new Set(topTen.map((entity) => entity.layerId));
  if (!localLayerIds.has("pfas-sites") || !localLayerIds.has("wastewater-sites") || !localLayerIds.has("industrial-sites")) {
    throw new Error("Expected local Cape Fear top results to include PFAS, wastewater, and industrial point records.");
  }

  const firstLocalWastewater = localView.find((entity) => entity.layerId === "wastewater-sites");
  if (!firstLocalWastewater) {
    throw new Error("Expected local Cape Fear view to include at least one wastewater record.");
  }

  const firstLocalWastewaterActivation = resolveExplorerEntityActivation({
    entity: firstLocalWastewater,
    visibleEntities: localView,
    cameraBand: "local",
  });

  if (
    firstLocalWastewaterActivation.type !== "select" ||
    firstLocalWastewaterActivation.entityId !== firstLocalWastewater.id
  ) {
    throw new Error(
      `Expected local wastewater activation to preserve ${firstLocalWastewater.id}, received ${JSON.stringify(firstLocalWastewaterActivation)}.`,
    );
  }

  if (southCarySearch[0]?.id !== "npdes-nc0065102-001") {
    throw new Error(
      `Expected South Cary search to resolve to npdes-nc0065102-001, received ${southCarySearch[0]?.id ?? "none"}.`,
    );
  }

  if (!southCarySearch[0].coordinates) {
    throw new Error("Expected South Cary search top result to include focusable coordinates.");
  }

  const southCaryFocusState = requireSearchFocusState(southCarySearch[0], {
    id: "npdes-nc0065102-001",
    title: "SOUTH CARY WRF",
    context: "South Cary search focus",
  });

  if (
    southCarySearch[0].layerId !== "wastewater-sites" ||
    southCarySearch[0].layerShortLabel !== "Wastewater" ||
    southCarySearch[0].evidenceType !== "Proxy" ||
    southCarySearch[0].confidenceLevel !== "High" ||
    !southCarySearch[0].sourceIds?.includes("epa-npdes") ||
    !southCarySearch[0].sourceHint?.includes("NPDES") ||
    !southCarySearch[0].systemHint?.includes("Wastewater") ||
    !southCarySearch[0].chemistryHint?.includes("PFAS")
  ) {
    throw new Error(
      `Expected South Cary search result to expose layer/evidence/source/system/chemistry hints, received ${JSON.stringify(southCarySearch[0])}.`,
    );
  }

  const southCaryBadges = getExplorerSearchResultInsightBadges(southCarySearch[0]);
  expectIncludesAll(
    southCaryBadges,
    ["Wastewater", "Proxy", "NPDES wastewater record", "PFAS / Wastewater-associated compounds"],
    "South Cary search result badges",
  );

  if (getExplorerSearchMatchLabel(southCarySearch[0]) !== "Record") {
    throw new Error("Expected South Cary search presentation to label the result as a record.");
  }

  if (getExplorerSearchResultActionLabel(southCarySearch[0]) !== "Fly to") {
    throw new Error("Expected South Cary coordinate-bearing search result to present a Fly to action.");
  }

  if (briarwoodSearch[0]?.id !== "npdes-nc0062740-001") {
    throw new Error(
      `Expected Briarwood search to resolve to npdes-nc0062740-001, received ${briarwoodSearch[0]?.id ?? "none"}.`,
    );
  }

  if (!briarwoodSearch[0].coordinates) {
    throw new Error("Expected Briarwood search top result to include focusable coordinates.");
  }

  const briarwoodFocusState = requireSearchFocusState(briarwoodSearch[0], {
    id: "npdes-nc0062740-001",
    title: "BRIARWOOD FARMS WWTP",
    context: "Briarwood search focus",
  });

  if (
    briarwoodSearch[0].layerId !== "wastewater-sites" ||
    briarwoodSearch[0].layerShortLabel !== "Wastewater" ||
    briarwoodSearch[0].evidenceType !== "Proxy" ||
    !briarwoodSearch[0].sourceIds?.includes("epa-npdes") ||
    !briarwoodSearch[0].sourceHint?.includes("NPDES")
  ) {
    throw new Error(
      `Expected Briarwood search result to expose wastewater/source hints, received ${JSON.stringify(briarwoodSearch[0])}.`,
    );
  }

  const briarwoodBadges = getExplorerSearchResultInsightBadges(briarwoodSearch[0]);
  expectIncludesAll(
    briarwoodBadges,
    ["Wastewater", "Proxy", "NPDES wastewater record", "PFAS / Wastewater-associated compounds"],
    "Briarwood search result badges",
  );

  if (getExplorerSearchResultActionLabel(briarwoodSearch[0]) !== "Fly to") {
    throw new Error("Expected Briarwood coordinate-bearing search result to present a Fly to action.");
  }

  if (southCaryDetail.layerId !== "wastewater-sites" || southCaryDetail.backend !== "database") {
    throw new Error(
      `Expected South Cary detail to resolve as database-backed wastewater, received ${JSON.stringify(southCaryDetail)}.`,
    );
  }

  if (briarwoodDetail.layerId !== "wastewater-sites" || briarwoodDetail.backend !== "database") {
    throw new Error(
      `Expected Briarwood detail to resolve as database-backed wastewater, received ${JSON.stringify(briarwoodDetail)}.`,
    );
  }

  console.log("PASS interaction contract validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        regional: {
          visible: regionalView.length,
          pfasEntityId: visibleRegionalPfas.id,
          pfasActivation: regionalActivation,
          pfasFocusHeight: regionalFocus.height,
        },
        local: {
          visible: localView.length,
          topTen: topTen.map((entity) => ({
            id: entity.id,
            title: entity.title,
            layerId: entity.layerId,
          })),
          firstLocalWastewaterActivation,
          southCarySearchTop: southCarySearch[0],
          briarwoodSearchTop: briarwoodSearch[0],
          searchPresentation: {
            southCary: {
              matchLabel: getExplorerSearchMatchLabel(southCarySearch[0]),
              actionLabel: getExplorerSearchResultActionLabel(southCarySearch[0]),
              badges: southCaryBadges,
              focusState: southCaryFocusState,
            },
            briarwood: {
              matchLabel: getExplorerSearchMatchLabel(briarwoodSearch[0]),
              actionLabel: getExplorerSearchResultActionLabel(briarwoodSearch[0]),
              badges: briarwoodBadges,
              focusState: briarwoodFocusState,
            },
          },
          southCaryDetail,
          briarwoodDetail,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL interaction contract validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
