"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Layers3 } from "lucide-react";
import { explorerFilterChips, explorerTimelineRange } from "@/content/explorer-data";
import { DetailDrawerShell } from "@/components/explore/detail-drawer-shell";
import { GlobeRendererBoundary } from "@/components/explore/globe-renderer-boundary";
import { LayerControlShell } from "@/components/explore/layer-control-shell";
import { MapLegendShell } from "@/components/explore/map-legend-shell";
import { SearchControlShell } from "@/components/explore/search-control-shell";
import { ViewerControlsShell } from "@/components/explore/viewer-controls-shell";
import { fetchJson } from "@/lib/api";
import { buildLegendItems } from "@/lib/map/legend";
import { layerRegistry } from "@/lib/map/layer-registry";
import {
  buildSelectionSurfaceContext,
  resolveSelectionContextActionState,
} from "@/lib/map/selection-context";
import {
  classifyCameraHeight,
  getCameraPointResolution,
  getZoomScaledPointMultiplier,
} from "@/lib/map/camera";
import { resolveExplorerEntityActivation } from "@/lib/map/entity-activation";
import { buildExplorerUrlState, parseExplorerUrlState } from "@/lib/map/url-state";
import { useExplorerStore } from "@/store/explorer-store";
import type {
  ExplorerLocationMatch,
  ExplorerNearbyResponse,
  ExplorerSearchResult,
  ExplorerVisibleEntity,
} from "@/types/explorer";

type LayerSummary = {
  id: string;
  entityCount: number;
  coverageRange: string;
  sourceIds: string[];
  preferredSource: "database" | "etl-file" | "mock" | "none";
  sourceTruthNote: string | null;
};

export function GlobeShellSupported() {
  const [homeSignal, setHomeSignal] = useState(0);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<{
    tone: "neutral" | "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlHydratedRef = useRef(false);
  const skipInitialUrlSyncRef = useRef(true);
  const e2eModeRef = useRef(searchParams.get("e2e") === "1");
  const browserE2EAutoRef = useRef(
    searchParams.get("e2e") === "1" && searchParams.get("e2eAuto") === "browser",
  );
  const browserE2ERunIdRef = useRef(searchParams.get("e2eRunId"));
  const browserE2EAutoCloseRef = useRef(searchParams.get("e2eAutoClose") === "1");
  const browserE2EStartedRef = useRef(false);
  const activeGroups = useExplorerStore((state) => state.activeGroups);
  const activeLayerIds = useExplorerStore((state) => state.activeLayerIds);
  const activeYear = useExplorerStore((state) => state.activeYear);
  const activeFilterChips = useExplorerStore((state) => state.activeFilterChips);
  const searchQuery = useExplorerStore((state) => state.searchQuery);
  const isSearchOpen = useExplorerStore((state) => state.isSearchOpen);
  const cameraHeight = useExplorerStore((state) => state.cameraHeight);
  const cameraCenter = useExplorerStore((state) => state.cameraCenter);
  const isCameraAtHome = useExplorerStore((state) => state.isCameraAtHome);
  const selectedEntityId = useExplorerStore((state) => state.selectedEntityId);
  const isDrawerOpen = useExplorerStore((state) => state.isDrawerOpen);
  const nearbyFocus = useExplorerStore((state) => state.nearbyFocus);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const resetCameraState = useExplorerStore((state) => state.resetCameraState);
  const replaceExplorerState = useExplorerStore((state) => state.replaceExplorerState);
  const applyExplorerSurfaceState = useExplorerStore((state) => state.applyExplorerSurfaceState);
  const setSelectedEntityId = useExplorerStore((state) => state.setSelectedEntityId);
  const setNearbyFocus = useExplorerStore((state) => state.setNearbyFocus);
  const setCameraTarget = useExplorerStore((state) => state.setCameraTarget);
  const setCameraView = useExplorerStore((state) => state.setCameraView);
  const setCameraAtHome = useExplorerStore((state) => state.setCameraAtHome);
  const setSearchQuery = useExplorerStore((state) => state.setSearchQuery);
  const resetExplorerFilters = useExplorerStore((state) => state.resetExplorerFilters);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  if (searchParams.get("e2e") === "1") {
    e2eModeRef.current = true;
  }
  const isE2EMode = e2eModeRef.current;
  const isBrowserAutoE2E = browserE2EAutoRef.current;
  const browserE2ERunId = browserE2ERunIdRef.current;
  const shouldAutoCloseBrowserE2E = browserE2EAutoCloseRef.current;
  const [browserE2EResult, setBrowserE2EResult] = useState<{
    status: "idle" | "running" | "pass" | "fail";
    step: string;
    message: string;
    payload: string;
  }>({
    status: isBrowserAutoE2E ? "running" : "idle",
    step: isBrowserAutoE2E ? "initializing" : "idle",
    message: isBrowserAutoE2E ? "Starting browser self-test." : "",
    payload: "",
  });
  const cameraBand = classifyCameraHeight(cameraHeight);
  const pointResolution = getCameraPointResolution(cameraHeight, cameraBand);
  const zoomPointScale = getZoomScaledPointMultiplier(cameraHeight);
  const mapEntitiesQuery = useMemo(() => {
    const params = new URLSearchParams({
      year: activeYear.toString(),
      cameraBand,
      centerLat: cameraCenter[1].toString(),
      centerLng: cameraCenter[0].toString(),
    });

    if (activeGroups.length) {
      params.set("groups", activeGroups.join(","));
    }

    if (activeLayerIds.length) {
      params.set("layers", activeLayerIds.join(","));
    }

    if (activeFilterChips.length) {
      params.set("chips", activeFilterChips.join(","));
    }

    if (selectedEntityId) {
      params.set("selectedEntityId", selectedEntityId);
    }

    return params.toString();
  }, [activeFilterChips, activeGroups, activeLayerIds, activeYear, cameraBand, cameraCenter, selectedEntityId]);
  const {
    data: visibleEntities = [],
    error: mapEntitiesError,
    isFetching: isMapEntitiesFetching,
  } = useQuery({
    queryKey: ["explorer", "map-entities", mapEntitiesQuery],
    queryFn: () => fetchJson<ExplorerVisibleEntity[]>(`/api/map-entities?${mapEntitiesQuery}`),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
  const { data: layerSummaries } = useQuery({
    queryKey: ["explorer", "layers"],
    queryFn: () => fetchJson<LayerSummary[]>("/api/layers"),
  });
  const { data: searchResults = [], isFetching: isSearchFetching } = useQuery({
    enabled: deferredSearchQuery.trim().length > 0,
    queryKey: ["explorer", "search", deferredSearchQuery],
    queryFn: () =>
      fetchJson<ExplorerSearchResult[]>(
        `/api/search?q=${encodeURIComponent(deferredSearchQuery.trim())}`,
      ),
    staleTime: 60_000,
  });

  const nearbyQuery = useMemo(() => {
    if (!nearbyFocus) return null;

    const params = new URLSearchParams({
      lat: nearbyFocus.coordinates[1].toString(),
      lng: nearbyFocus.coordinates[0].toString(),
      radius: nearbyFocus.radiusMiles.toString(),
      label: nearbyFocus.label,
      year: activeYear.toString(),
      groups: activeGroups.join(","),
      layers: activeLayerIds.join(","),
      chips: activeFilterChips.join(","),
    });

    return params.toString();
  }, [activeFilterChips, activeGroups, activeLayerIds, activeYear, nearbyFocus]);

  const {
    data: nearbySummary,
    error: nearbyError,
    isFetching: isNearbyFetching,
  } = useQuery({
    enabled: Boolean(nearbyQuery),
    queryKey: ["explorer", "nearby", nearbyQuery],
    queryFn: () => fetchJson<ExplorerNearbyResponse>(`/api/nearby?${nearbyQuery}`),
  });

  const sourceCount = useMemo(() => {
    const uniqueSourceIds = new Set<string>();
    for (const summary of layerSummaries ?? []) {
      for (const sourceId of summary.sourceIds) {
        uniqueSourceIds.add(sourceId);
      }
    }
    return uniqueSourceIds.size;
  }, [layerSummaries]);

  useEffect(() => {
    if (urlHydratedRef.current) return;

    const parsedState = parseExplorerUrlState(searchParams, {
      availableGroups: ["official", "emerging", "wildlife", "reproductive", "legal"],
      availableLayerIds: layerRegistry.map((layer) => layer.id),
      availableFilterChips: explorerFilterChips.map((chip) => chip.id),
      activeGroups: ["official", "emerging", "legal"],
      activeLayerIds: layerRegistry.filter((layer) => layer.visibleByDefault).map((layer) => layer.id),
      activeFilterChips: [],
      activeYear: explorerTimelineRange.activeYear,
      minYear: explorerTimelineRange.startYear,
      maxYear: explorerTimelineRange.endYear,
      searchQuery: "",
      nearbyFocus: null,
    });

    replaceExplorerState(parsedState);
    urlHydratedRef.current = true;
  }, [replaceExplorerState, searchParams]);

  useEffect(() => {
    if (!urlHydratedRef.current) return;

    if (skipInitialUrlSyncRef.current) {
      skipInitialUrlSyncRef.current = false;
      return;
    }

    const nextParams = buildExplorerUrlState({
      selectedEntityId,
      activeGroups,
      activeLayerIds,
      activeYear,
      activeFilterChips,
      searchQuery,
      nearbyFocus,
      cameraTarget,
    });
    const current = searchParams.toString();
    const next = nextParams.toString();
    if (current === next) return;

    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  }, [
    activeFilterChips,
    activeGroups,
    activeLayerIds,
    activeYear,
    cameraTarget,
    nearbyFocus,
    pathname,
    router,
    searchQuery,
    searchParams,
    selectedEntityId,
  ]);

  useEffect(() => {
    if (selectedEntityId || nearbyFocus) {
      setLayersOpen(false);
    }
  }, [nearbyFocus, selectedEntityId]);

  const globeEntities = visibleEntities;
  const selectedVisibleEntity =
    globeEntities.find((entity) => entity.id === selectedEntityId) ?? null;
  const selectedEntity = selectedVisibleEntity;
  const renderedSignalCount = visibleEntities.length;
  const legendItems = useMemo(
    () => buildLegendItems(visibleEntities as ExplorerVisibleEntity[]),
    [visibleEntities],
  );
  const cameraBandLabel =
    cameraBand === "national" ? "National" : cameraBand === "regional" ? "Regional" : "Local";
  const legendViewSummary = `${renderedSignalCount.toLocaleString()} onscreen / ${activeLayerIds.length}/${layerRegistry.length} layers / ${cameraBandLabel}`;
  const hasDetailSurface = Boolean(selectedEntityId || nearbySummary || isNearbyFetching || nearbyError);
  const hasMobileDetailSurface = hasDetailSurface && !layersOpen;
  const topLayerLabels = legendItems.slice(0, 3).map((item) => item.label);
  const commandScopeLabel = nearbyFocus?.label ?? `${cameraBandLabel} scope`;
  const selectionContext = useMemo(
    () =>
      buildSelectionSurfaceContext({
        selectedEntity,
        selectedEntityId,
        nearbyFocus,
        nearbySummary: nearbySummary ?? null,
        searchQuery,
        cameraBandLabel,
      }),
    [cameraBandLabel, nearbyFocus, nearbySummary, searchQuery, selectedEntity, selectedEntityId],
  );
  const handleSelectionContextAction = useCallback(
    (actionId: ReturnType<typeof buildSelectionSurfaceContext>["actions"][number]["id"]) => {
      const nextState = resolveSelectionContextActionState(actionId, {
        selectedEntityId,
        nearbyFocus,
        isDrawerOpen,
        searchQuery,
        isSearchOpen,
        cameraTarget,
        isCameraAtHome,
      });

      applyExplorerSurfaceState(nextState);
    },
    [
      applyExplorerSurfaceState,
      cameraTarget,
      isCameraAtHome,
      isDrawerOpen,
      isSearchOpen,
      nearbyFocus,
      searchQuery,
      selectedEntityId,
    ],
  );
  const e2eVisiblePfasEntity =
    visibleEntities.find((entity) => entity.layerId === "pfas-sites" && !entity.isAggregate) ??
    visibleEntities.find((entity) => entity.layerId === "pfas-sites") ??
    null;
  const e2eVisibleEntitiesRef = useRef(visibleEntities);
  const e2eCameraBandRef = useRef(cameraBand);
  const e2eSelectedEntityIdRef = useRef(selectedEntityId);
  const e2eRenderedSignalCountRef = useRef(renderedSignalCount);
  const e2ePointResolutionRef = useRef(pointResolution);
  const e2eMapEntitiesStateRef = useRef<{
    visibleEntitiesCount: number;
    renderedSignalCount: number;
    isFetching: boolean;
    errorMessage: string | null;
  }>({
    visibleEntitiesCount: visibleEntities.length,
    renderedSignalCount,
    isFetching: isMapEntitiesFetching,
    errorMessage: mapEntitiesError instanceof Error ? mapEntitiesError.message : null,
  });

  useEffect(() => {
    e2eVisibleEntitiesRef.current = visibleEntities;
    e2eCameraBandRef.current = cameraBand;
    e2eSelectedEntityIdRef.current = selectedEntityId;
    e2eRenderedSignalCountRef.current = renderedSignalCount;
    e2ePointResolutionRef.current = pointResolution;
    e2eMapEntitiesStateRef.current = {
      visibleEntitiesCount: visibleEntities.length,
      renderedSignalCount,
      isFetching: isMapEntitiesFetching,
      errorMessage: mapEntitiesError instanceof Error ? mapEntitiesError.message : null,
    };
  }, [
    cameraBand,
    isMapEntitiesFetching,
    mapEntitiesError,
    pointResolution,
    renderedSignalCount,
    selectedEntityId,
    visibleEntities,
  ]);
  async function handleResolveLocation(query: string) {
    setIsResolvingLocation(true);
    setLocationFeedback({
      tone: "neutral",
      message: "Searching official U.S. location records...",
    });

    try {
      const match = await fetchJson<ExplorerLocationMatch>(
        `/api/geocode?q=${encodeURIComponent(query)}`,
      );

      setSearchQuery(match.label);
      setNearbyFocus({
        label: match.label,
        coordinates: match.coordinates,
        radiusMiles: 50,
      });
      setCameraTarget({
        label: match.label,
        coordinates: match.coordinates,
        height: 1_500_000,
      });
      setLocationFeedback({
        tone: "success",
        message: `Centered on ${match.label}. Nearby signals use a 50-mile radius.`,
      });
    } catch (error) {
      setLocationFeedback({
        tone: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "No U.S. place match found for that search.",
      });
      throw error;
    } finally {
      setIsResolvingLocation(false);
    }
  }

  async function handleLocateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const error = new Error("This browser does not expose geolocation.");
      setLocationFeedback({ tone: "error", message: error.message });
      throw error;
    }

    setIsLocating(true);
    setLocationFeedback({
      tone: "neutral",
      message: "Requesting your current location...",
    });

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 10_000,
        }),
      );

      const coordinates: [number, number] = [
        position.coords.longitude,
        position.coords.latitude,
      ];

      setSearchQuery("Near you");
      setNearbyFocus({
        label: "Near you",
        coordinates,
        radiusMiles: 50,
      });
      setCameraTarget({
        label: "Near you",
        coordinates,
        height: 1_250_000,
      });
      setLocationFeedback({
        tone: "success",
        message: "Centered on your current area with a 50-mile nearby scan.",
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "The browser did not return a usable location.";
      setLocationFeedback({
        tone: "error",
        message,
      });
      throw new Error(message);
    } finally {
      setIsLocating(false);
    }
  }

  const handleEntityActivation = useCallback((entity: ExplorerVisibleEntity) => {
    const activation = resolveExplorerEntityActivation({
      entity,
      visibleEntities: globeEntities,
      cameraBand,
    });

    if (activation.type === "drilldown") {
      setSelectedEntityId(null);
      setCameraView({
        coordinates: activation.coordinates,
        height: activation.height,
      });
      setCameraAtHome(false);
      setCameraTarget({
        label: activation.label,
        coordinates: activation.coordinates,
        height: activation.height,
      });
      return;
    }

    setSelectedEntityId(activation.entityId);
  }, [cameraBand, globeEntities, setCameraAtHome, setCameraTarget, setCameraView, setSelectedEntityId]);

  const focusCapeFear = useCallback((height: number, label: string) => {
    const capeFearCoordinates: [number, number] = [-78.88, 34.98];
    setSelectedEntityId(null);
    setNearbyFocus(null);
    setSearchQuery(label);
    setCameraView({
      coordinates: capeFearCoordinates,
      height,
    });
    setCameraAtHome(false);
    setCameraTarget({
      label,
      coordinates: capeFearCoordinates,
      height,
    });
  }, [setCameraAtHome, setCameraTarget, setCameraView, setNearbyFocus, setSearchQuery, setSelectedEntityId]);

  const openE2EEntity = useCallback((entityId: string, label: string) => {
    focusCapeFear(850_000, label);
    setSelectedEntityId(entityId);
  }, [focusCapeFear, setSelectedEntityId]);

  useEffect(() => {
    if (!isBrowserAutoE2E || browserE2EStartedRef.current) {
      return;
    }

    browserE2EStartedRef.current = true;
    let cancelled = false;

    async function waitForCondition(
      step: string,
      predicate: () => boolean,
      timeoutMs = 60_000,
      message = step,
      getHeartbeatPayload?: () => string,
    ) {
      const deadline = Date.now() + timeoutMs;
      let lastHeartbeatPayload = "";
      while (Date.now() < deadline) {
        if (predicate()) {
          return;
        }

        if (getHeartbeatPayload) {
          const heartbeatPayload = getHeartbeatPayload();
          if (heartbeatPayload !== lastHeartbeatPayload) {
            lastHeartbeatPayload = heartbeatPayload;
            const heartbeatResult = {
              status: "running",
              step,
              message,
              payload: heartbeatPayload,
            } as const;
            setBrowserE2EResult(heartbeatResult);
            await postBrowserE2EResult(heartbeatResult);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(message);
    }

    async function postBrowserE2EResult(result: {
      status: "running" | "pass" | "fail";
      step: string;
      message: string;
      payload: string;
    }) {
      if (!browserE2ERunId) {
        return;
      }

      try {
        await fetch("/api/e2e/browser-result", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            runId: browserE2ERunId,
            ...result,
          }),
        });
      } catch {
        // Browser-side reporting is best-effort; the rendered result node remains the fallback truth source.
      } finally {
        if (
          shouldAutoCloseBrowserE2E &&
          result.status !== "running" &&
          typeof window !== "undefined"
        ) {
          window.setTimeout(() => {
            window.close();
          }, 500);
        }
      }
    }

    async function runBrowserE2ESequence() {
      try {
        const initialResult = {
          status: "running",
          step: "waiting-for-atlas",
          message: "Waiting for visible atlas entities.",
          payload: "",
        } as const;
        setBrowserE2EResult(initialResult);
        await postBrowserE2EResult(initialResult);

        await waitForCondition(
          "waiting-for-atlas",
          () => e2eRenderedSignalCountRef.current > 0 && e2eVisibleEntitiesRef.current.length > 0,
          90_000,
          "Timed out waiting for initial visible atlas entities.",
          () =>
            JSON.stringify({
              visibleEntitiesCount: e2eMapEntitiesStateRef.current.visibleEntitiesCount,
              renderedSignalCount: e2eMapEntitiesStateRef.current.renderedSignalCount,
              isFetching: e2eMapEntitiesStateRef.current.isFetching,
              errorMessage: e2eMapEntitiesStateRef.current.errorMessage,
              cameraBand: e2eCameraBandRef.current,
            }),
        );

        const regionalResult = {
          status: "running",
          step: "focusing-regional",
          message: "Focusing Cape Fear regional view.",
          payload: "",
        } as const;
        setBrowserE2EResult(regionalResult);
        await postBrowserE2EResult(regionalResult);

        focusCapeFear(3_900_000, "Cape Fear regional focus");
        await waitForCondition(
          "focusing-regional",
          () =>
            e2eCameraBandRef.current === "regional" &&
            e2eRenderedSignalCountRef.current > 0 &&
            e2eVisibleEntitiesRef.current.some((entity) => entity.layerId === "pfas-sites"),
          60_000,
          "Timed out waiting for Cape Fear regional PFAS visibility.",
        );

        const visiblePfasEntity =
          e2eVisibleEntitiesRef.current.find((entity) => entity.layerId === "pfas-sites" && !entity.isAggregate) ??
          e2eVisibleEntitiesRef.current.find((entity) => entity.layerId === "pfas-sites") ??
          null;

        if (!visiblePfasEntity) {
          throw new Error("Regional Cape Fear view did not expose a visible PFAS entity.");
        }

        const pfasResult = {
          status: "running",
          step: "selecting-pfas",
          message: `Selecting visible PFAS entity ${visiblePfasEntity.id}.`,
          payload: "",
        } as const;
        setBrowserE2EResult(pfasResult);
        await postBrowserE2EResult(pfasResult);

        handleEntityActivation(visiblePfasEntity);
        await waitForCondition(
          "selecting-pfas",
          () => useExplorerStore.getState().selectedEntityId === visiblePfasEntity.id,
          30_000,
          `Timed out waiting for PFAS selection ${visiblePfasEntity.id}.`,
          () =>
            JSON.stringify({
              expectedSelectedEntityId: visiblePfasEntity.id,
              selectedEntityId: useExplorerStore.getState().selectedEntityId,
              cameraBand: classifyCameraHeight(useExplorerStore.getState().cameraHeight),
              renderedSignalCount: e2eRenderedSignalCountRef.current,
            }),
        );

        const localResult = {
          status: "running",
          step: "drilling-local",
          message: "Drilling into local Cape Fear view.",
          payload: "",
        } as const;
        setBrowserE2EResult(localResult);
        await postBrowserE2EResult(localResult);

        focusCapeFear(850_000, "Cape Fear local focus");
        await waitForCondition(
          "drilling-local",
          () =>
            e2eCameraBandRef.current === "local" &&
            e2eRenderedSignalCountRef.current > 0 &&
            e2ePointResolutionRef.current >= 10,
          60_000,
          "Timed out waiting for local Cape Fear inspection view.",
        );

        const southCaryResult = {
          status: "running",
          step: "selecting-south-cary",
          message: "Selecting South Cary wastewater record.",
          payload: "",
        } as const;
        setBrowserE2EResult(southCaryResult);
        await postBrowserE2EResult(southCaryResult);

        openE2EEntity("npdes-nc0065102-001", "South Cary wastewater focus");
        await waitForCondition(
          "selecting-south-cary",
          () => useExplorerStore.getState().selectedEntityId === "npdes-nc0065102-001",
          30_000,
          "Timed out waiting for South Cary wastewater selection.",
        );

        const briarwoodResult = {
          status: "running",
          step: "selecting-briarwood",
          message: "Selecting Briarwood wastewater record.",
          payload: "",
        } as const;
        setBrowserE2EResult(briarwoodResult);
        await postBrowserE2EResult(briarwoodResult);

        openE2EEntity("npdes-nc0062740-001", "Briarwood wastewater focus");
        await waitForCondition(
          "selecting-briarwood",
          () => useExplorerStore.getState().selectedEntityId === "npdes-nc0062740-001",
          30_000,
          "Timed out waiting for Briarwood wastewater selection.",
        );

        const payload = JSON.stringify({
          finalSelectedEntityId: e2eSelectedEntityIdRef.current,
          finalCameraBand: e2eCameraBandRef.current,
          finalRenderedSignalCount: e2eRenderedSignalCountRef.current,
          finalPointResolution: e2ePointResolutionRef.current,
          visiblePfasEntityId: visiblePfasEntity.id,
        });

        if (!cancelled) {
          const result = {
            status: "pass",
            step: "complete",
            message: "Browser self-test passed.",
            payload,
          } as const;
          setBrowserE2EResult(result);
          await postBrowserE2EResult(result);
        }
      } catch (error) {
        if (!cancelled) {
          const result = {
            status: "fail",
            step: "failed",
            message: error instanceof Error ? error.message : "Unknown browser self-test failure.",
            payload: "",
          } as const;
          setBrowserE2EResult(result);
          await postBrowserE2EResult(result);
        }
      }
    }

    void runBrowserE2ESequence();

    return () => {
      cancelled = true;
    };
  }, [
    browserE2ERunId,
    focusCapeFear,
    handleEntityActivation,
    isBrowserAutoE2E,
    openE2EEntity,
    shouldAutoCloseBrowserE2E,
  ]);

  return (
    <section
      data-testid="explorer-shell"
      data-camera-band={cameraBand}
      data-camera-height={Math.round(cameraHeight)}
      data-point-resolution={pointResolution}
      data-zoom-point-scale={zoomPointScale.toFixed(2)}
      data-rendered-signal-count={renderedSignalCount}
      data-selected-entity-id={selectedEntityId ?? ""}
      data-nearby-label={nearbyFocus?.label ?? ""}
      className="relative h-[100svh] overflow-hidden bg-[#05070a]"
    >
      <GlobeRendererBoundary
        mode="main"
        entities={globeEntities}
        homeSignal={homeSignal}
        cameraBand={cameraBand}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(57,116,150,0.12),transparent_22%),radial-gradient(circle_at_78%_14%,rgba(194,137,79,0.12),transparent_18%),linear-gradient(180deg,rgba(3,6,8,0.02),rgba(3,6,8,0.18)_42%,rgba(3,6,8,0.42))]" />
      <div className="command-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="command-frame" />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-4">
        <div className="pointer-events-auto flex items-start justify-between gap-4">
          <div className="flex max-w-[440px] flex-col gap-3">
            <SearchControlShell
              results={searchResults}
              isSearchLoading={isSearchFetching}
              nearbySummary={nearbySummary ?? null}
              locationFeedback={locationFeedback}
              nearbyErrorMessage={nearbyError instanceof Error ? nearbyError.message : null}
              onResolveLocation={handleResolveLocation}
              onLocateMe={handleLocateMe}
              isResolvingLocation={isResolvingLocation}
              isLocating={isLocating}
              isNearbyLoading={Boolean(nearbyFocus && isNearbyFetching)}
              scopeLabel={commandScopeLabel}
              cameraBandLabel={cameraBandLabel}
              renderedSignalCount={renderedSignalCount}
              topLayerLabels={topLayerLabels}
              selectionContext={selectionContext}
              onSelectionContextAction={handleSelectionContextAction}
            />
          </div>

          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setLayersOpen((value) => !value)}
              className="hud-panel-slim inline-flex items-center gap-2 border-[rgba(87,132,154,0.1)] bg-[rgba(8,12,18,0.44)] px-3 py-2 text-[var(--foreground-muted)] transition hover:text-white"
              aria-label="Toggle layers"
            >
              <Layers3 className="h-4.5 w-4.5" />
              <span className="status-rail text-white">Layers</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[var(--foreground-soft)]">
                {renderedSignalCount.toLocaleString()}
              </span>
            </button>
            <div className="hidden md:block">
              <ViewerControlsShell
                onHome={() => {
                  resetCameraState();
                  resetExplorerFilters();
                  setSearchQuery("");
                  setHomeSignal((value) => value + 1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-none flex justify-end">
          {layersOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="pointer-events-auto hidden w-[320px] xl:block"
            >
              <LayerControlShell
                visibleEntities={visibleEntities as ExplorerVisibleEntity[]}
                layerSummaries={layerSummaries ?? []}
                sourceCount={sourceCount}
              />
            </motion.div>
          ) : null}
        </div>
      </div>

      {layersOpen ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 top-24 xl:hidden">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="pointer-events-auto h-full overflow-hidden"
          >
            <LayerControlShell
              visibleEntities={visibleEntities as ExplorerVisibleEntity[]}
              layerSummaries={layerSummaries ?? []}
              sourceCount={sourceCount}
            />
          </motion.div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-4 hidden max-w-[224px] lg:block">
        <div className="pointer-events-auto">
          <MapLegendShell
            items={legendItems}
            cameraBand={cameraBandLabel}
            viewSummary={legendViewSummary}
          />
        </div>
      </div>

      {!hasDetailSurface ? (
        <div className="pointer-events-none absolute bottom-3 left-3 right-20 lg:hidden">
          <div className="hud-panel-slim pointer-events-auto max-w-[228px] border-[rgba(87,132,154,0.1)] bg-[rgba(8,12,18,0.44)] px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="status-rail">{cameraBandLabel}</p>
                <p className="mt-1 text-sm text-white">{renderedSignalCount.toLocaleString()} onscreen</p>
                <p className="mt-1 text-[11px] text-[var(--foreground-soft)]">
                  {activeLayerIds.length}/{layerRegistry.length} layers active
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLayersOpen(true)}
                className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white"
              >
                Layers
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {hasDetailSurface ? (
        <div className="pointer-events-none absolute right-4 top-24 bottom-4 hidden w-[320px] xl:block 2xl:w-[350px]">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="pointer-events-auto h-full"
          >
            <DetailDrawerShell
              entity={selectedEntity}
              selectedEntityId={selectedEntityId}
              nearbySummary={nearbySummary ?? null}
              isNearbyLoading={Boolean(nearbyFocus && isNearbyFetching)}
              nearbyErrorMessage={nearbyError instanceof Error ? nearbyError.message : null}
            />
          </motion.div>
        </div>
      ) : null}

      {hasMobileDetailSurface ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 xl:hidden">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="pointer-events-auto max-h-[72vh] overflow-hidden"
          >
            <DetailDrawerShell
              entity={selectedEntity}
              selectedEntityId={selectedEntityId}
              nearbySummary={nearbySummary ?? null}
              isNearbyLoading={Boolean(nearbyFocus && isNearbyFetching)}
              nearbyErrorMessage={nearbyError instanceof Error ? nearbyError.message : null}
            />
          </motion.div>
        </div>
      ) : null}

      {isE2EMode ? (
        <div hidden data-testid="e2e-controls">
          <div
            data-testid="e2e-browser-result"
            data-status={browserE2EResult.status}
            data-step={browserE2EResult.step}
            data-message={browserE2EResult.message}
            data-payload={browserE2EResult.payload}
          >
            {browserE2EResult.message}
          </div>
          <button
            type="button"
            data-testid="e2e-focus-cape-fear-regional"
            onClick={() => focusCapeFear(3_900_000, "Cape Fear regional focus")}
          >
            Focus Cape Fear regional
          </button>
          <button
            type="button"
            data-testid="e2e-focus-cape-fear-local"
            onClick={() => focusCapeFear(850_000, "Cape Fear local focus")}
          >
            Focus Cape Fear local
          </button>
          <button
            type="button"
            data-testid="e2e-drilldown-cape-fear-local"
            onClick={() => focusCapeFear(850_000, "Cape Fear local focus")}
          >
            Drill into Cape Fear local
          </button>
          <button
            type="button"
            data-testid="e2e-select-fayetteville-pfas"
            data-entity-id={e2eVisiblePfasEntity?.id ?? ""}
            onClick={() => {
              if (e2eVisiblePfasEntity) {
                handleEntityActivation(e2eVisiblePfasEntity);
              }
            }}
          >
            Select visible PFAS
          </button>
          <button
            type="button"
            data-testid="e2e-select-south-cary"
            onClick={() => openE2EEntity("npdes-nc0065102-001", "South Cary wastewater focus")}
          >
            Select South Cary
          </button>
          <button
            type="button"
            data-testid="e2e-select-briarwood"
            onClick={() => openE2EEntity("npdes-nc0062740-001", "Briarwood wastewater focus")}
          >
            Select Briarwood
          </button>
          {visibleEntities.map((entity) => (
            <button
              key={entity.id}
              type="button"
              data-testid={`e2e-entity-${entity.id}`}
              data-entity-id={entity.id}
              data-entity-title={entity.title}
              data-layer-id={entity.layerId}
              data-is-aggregate={entity.isAggregate ? "true" : "false"}
              onClick={() => handleEntityActivation(entity)}
            >
              {entity.title}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
