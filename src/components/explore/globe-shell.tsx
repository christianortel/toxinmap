"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Compass, MapPinned, ShieldAlert, SlidersHorizontal } from "lucide-react";
import {
  explorerEntities,
  explorerFilterChips,
  explorerTimelineRange,
} from "@/content/explorer-data";
import { DetailDrawerShell } from "@/components/explore/detail-drawer-shell";
import { HoverCardShell } from "@/components/explore/hover-card-shell";
import { LayerControlShell } from "@/components/explore/layer-control-shell";
import { MapLegendShell } from "@/components/explore/map-legend-shell";
import { SearchControlShell } from "@/components/explore/search-control-shell";
import { TimelineShell } from "@/components/explore/timeline-shell";
import { ViewerControlsShell } from "@/components/explore/viewer-controls-shell";
import { FilterChip } from "@/components/filter-chip";
import { fetchJson } from "@/lib/api";
import { buildLegendItems } from "@/lib/map/legend";
import { getVisibleExplorerEntities } from "@/lib/map/entity-transforms";
import { getExplorerSearchResults } from "@/lib/map/search";
import { classifyCameraHeight } from "@/lib/map/camera";
import { layerRegistry } from "@/lib/map/layer-registry";
import { buildExplorerUrlState, parseExplorerUrlState } from "@/lib/map/url-state";
import { useExplorerStore } from "@/store/explorer-store";
import type { CaseStudyRecord } from "@/types/data";
import type {
  ExplorerEntity,
  ExplorerLocationMatch,
  ExplorerNearbyResponse,
} from "@/types/explorer";
import type { SourceRegistryEntry } from "@/types/sources";

const CesiumGlobe = dynamic(
  () => import("@/components/explore/cesium-globe").then((mod) => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 animate-pulse rounded-[30px] bg-white/6" />,
  },
);

export function GlobeShell() {
  const [homeSignal, setHomeSignal] = useState(0);
  const [allowGlobeMount, setAllowGlobeMount] = useState(false);
  const [isBrave, setIsBrave] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<{
    tone: "neutral" | "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlHydratedRef = useRef(false);
  const activeGroups = useExplorerStore((state) => state.activeGroups);
  const activeLayerIds = useExplorerStore((state) => state.activeLayerIds);
  const activeYear = useExplorerStore((state) => state.activeYear);
  const activeFilterChips = useExplorerStore((state) => state.activeFilterChips);
  const searchQuery = useExplorerStore((state) => state.searchQuery);
  const cameraHeight = useExplorerStore((state) => state.cameraHeight);
  const selectedEntityId = useExplorerStore((state) => state.selectedEntityId);
  const hoverState = useExplorerStore((state) => state.hoverState);
  const nearbyFocus = useExplorerStore((state) => state.nearbyFocus);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const toggleFilterChip = useExplorerStore((state) => state.toggleFilterChip);
  const resetCameraState = useExplorerStore((state) => state.resetCameraState);
  const replaceExplorerState = useExplorerStore((state) => state.replaceExplorerState);
  const setNearbyFocus = useExplorerStore((state) => state.setNearbyFocus);
  const setCameraTarget = useExplorerStore((state) => state.setCameraTarget);
  const setSearchQuery = useExplorerStore((state) => state.setSearchQuery);
  const resetExplorerFilters = useExplorerStore((state) => state.resetExplorerFilters);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const { data: apiEntities } = useQuery({
    queryKey: ["explorer", "entities"],
    queryFn: () => fetchJson<ExplorerEntity[]>("/api/entities"),
  });
  const { data: layerSummaries } = useQuery({
    queryKey: ["explorer", "layers"],
    queryFn: () =>
      fetchJson<
        Array<{
          id: string;
          entityCount: number;
          coverageRange: string;
          sourceIds: string[];
        }>
      >("/api/layers"),
  });
  const { data: caseStudies } = useQuery({
    queryKey: ["explorer", "case-studies"],
    queryFn: () => fetchJson<CaseStudyRecord[]>("/api/case-studies"),
  });
  const { data: sources } = useQuery({
    queryKey: ["explorer", "sources"],
    queryFn: () => fetchJson<SourceRegistryEntry[]>("/api/sources"),
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

  const entities = apiEntities?.length ? apiEntities : explorerEntities;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const braveDetected =
        typeof navigator !== "undefined" &&
        typeof (navigator as Navigator & { brave?: unknown }).brave !== "undefined";

      setIsBrave(braveDetected);
      setAllowGlobeMount(!braveDetected);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (urlHydratedRef.current) {
      return;
    }

    const parsedState = parseExplorerUrlState(searchParams, {
      availableGroups: ["official", "emerging", "wildlife", "reproductive", "legal"],
      availableLayerIds: layerRegistry.map((layer) => layer.id),
      availableFilterChips: explorerFilterChips.map((chip) => chip.id),
      activeGroups: ["official", "emerging", "legal"],
      activeLayerIds: layerRegistry.filter((layer) => layer.visibleByDefault).map((layer) => layer.id),
      activeFilterChips: [],
      activeYear: explorerTimelineRange.activeYear,
      searchQuery: "",
      nearbyFocus: null,
    });

    replaceExplorerState(parsedState);
    urlHydratedRef.current = true;
  }, [replaceExplorerState, searchParams]);

  useEffect(() => {
    if (!urlHydratedRef.current) {
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

    if (current === next) {
      return;
    }

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

  const visibleEntities = useMemo(
    () =>
      getVisibleExplorerEntities(entities, {
        activeGroups,
        activeLayerIds,
        activeYear,
        activeFilterChips,
        cameraHeight,
        selectedEntityId,
      }),
    [
      activeFilterChips,
      activeGroups,
      activeLayerIds,
      activeYear,
      cameraHeight,
      entities,
      selectedEntityId,
    ],
  );

  const legendItems = useMemo(() => buildLegendItems(visibleEntities), [visibleEntities]);
  const selectedEntity =
    visibleEntities.find((entity) => entity.id === selectedEntityId) ??
    entities.find((entity) => entity.id === selectedEntityId) ??
    null;
  const hoveredEntity = visibleEntities.find((entity) => entity.id === hoverState?.entityId) ?? null;
  const searchResults = useMemo(
    () => getExplorerSearchResults(deferredSearchQuery, entities, caseStudies ?? []),
    [caseStudies, deferredSearchQuery, entities],
  );

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
      const geolocationCode =
        error && typeof error === "object" && "code" in error && typeof error.code === "number"
          ? error.code
          : null;
      const fallbackMessage =
        geolocationCode !== null
          ? geolocationCode === 1
            ? "Location access was denied by the browser."
            : geolocationCode === 3
              ? "Location lookup timed out before the browser returned a position."
              : "The browser did not return a usable location."
          : error instanceof Error && error.message
            ? error.message
            : "The browser did not return a usable location.";

      setLocationFeedback({
        tone: "error",
        message: fallbackMessage,
      });
      throw new Error(fallbackMessage);
    } finally {
      setIsLocating(false);
    }
  }

  const visibleCount = visibleEntities.reduce(
    (sum, entity) => sum + (entity.aggregateCount ?? 1),
    0,
  );

  return (
    <section className="surface-panel relative min-h-[calc(100vh-1rem)] overflow-hidden p-2 md:p-3">
      {allowGlobeMount ? (
        <CesiumGlobe entities={visibleEntities} homeSignal={homeSignal} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center rounded-[30px] bg-[radial-gradient(circle_at_50%_45%,rgba(117,140,154,0.14),transparent_18%),linear-gradient(180deg,#05070a,#090c10)]">
          <div className="max-w-lg rounded-[28px] border border-white/10 bg-[rgba(8,10,12,0.82)] px-6 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8">
              <ShieldAlert className="h-5 w-5 text-[var(--accent-warning)]" />
            </div>
            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
              Safe launch
            </p>
            <p className="mt-3 font-serif text-3xl tracking-[-0.05em] text-white">
              {isBrave ? "Brave is the likely failure point." : "Globe launch paused."}
            </p>
            <p className="mt-4 text-sm text-[var(--foreground-muted)]">
              The local server is healthy, but this browser looks likely to crash when the Cesium WebGL scene mounts.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setAllowGlobeMount(true)}
                className="rounded-full border border-[rgba(135,160,176,0.32)] bg-[rgba(135,160,176,0.14)] px-5 py-3 text-sm text-white transition hover:bg-[rgba(135,160,176,0.2)]"
              >
                Try globe anyway
              </button>
              <a
                href="/sources"
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm text-[var(--foreground-muted)] transition hover:text-white"
              >
                Open sources
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(3,6,8,0.04),rgba(3,6,8,0.24)_55%,rgba(3,6,8,0.72))]" />

      {visibleEntities.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="pointer-events-auto max-w-md rounded-[28px] border border-white/10 bg-[rgba(8,10,12,0.82)] px-6 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8">
              <SlidersHorizontal className="h-5 w-5 text-[var(--accent-water)]" />
            </div>
            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
              No visible signals
            </p>
            <p className="mt-3 font-serif text-3xl tracking-[-0.05em] text-white">
              The current filters hide every mapped layer.
            </p>
            <p className="mt-4 text-sm text-[var(--foreground-muted)]">
              Reset filters to restore the default U.S. toxin view, or widen your layer mix to bring wastewater, PFAS, and industrial signals back onto the globe.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetExplorerFilters();
                  setSearchQuery("");
                }}
                className="rounded-full border border-[rgba(135,160,176,0.32)] bg-[rgba(135,160,176,0.14)] px-5 py-3 text-sm text-white transition hover:bg-[rgba(135,160,176,0.2)]"
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-3 md:p-4">
        <div className="pointer-events-auto grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="hud-panel flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8">
                  <Compass className="h-4 w-4 text-[var(--accent-water)]" />
                </span>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-white">toxinmap.com</p>
                  <p className="mt-1 max-w-xl text-sm text-[var(--foreground-muted)]">
                    A U.S.-first 3D globe for inspecting reported releases, PFAS context, wastewater pathways, and modeled air-toxics signals near real places.
                  </p>
                </div>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/4 px-4 py-3 text-right">
                <p className="text-sm text-white">{visibleCount.toLocaleString()}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
                  visible signals
                </p>
              </div>
            </div>

            <SearchControlShell
              results={searchResults}
              resultCount={visibleCount}
              nearbySummary={nearbySummary ?? null}
              locationFeedback={locationFeedback}
              nearbyErrorMessage={nearbyError instanceof Error ? nearbyError.message : null}
              onResolveLocation={handleResolveLocation}
              onLocateMe={handleLocateMe}
              isResolvingLocation={isResolvingLocation}
              isLocating={isLocating}
              isNearbyLoading={Boolean(nearbyFocus && isNearbyFetching)}
            />

            <div className="hud-panel space-y-4 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">Quick filters</p>
                  <p className="body-sm">Keep the map centered on exposure-relevant pathways and away from low-signal clutter.</p>
                </div>
                {nearbyFocus ? (
                  <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)] md:inline-flex">
                    <MapPinned className="h-4 w-4" />
                    {nearbyFocus.label}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {explorerFilterChips.map((chip) => (
                  <FilterChip
                    key={chip.id}
                    label={chip.label}
                    active={activeFilterChips.includes(chip.id)}
                    onClick={() => toggleFilterChip(chip.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="hidden xl:block">
            <LayerControlShell
              visibleEntities={visibleEntities}
              layerSummaries={layerSummaries ?? []}
              sourceCount={sources?.length ?? 0}
            />
          </div>
        </div>

        <div className="pointer-events-auto mt-auto grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_220px]">
          <MapLegendShell items={legendItems} cameraBand={classifyCameraHeight(cameraHeight)} />
          <TimelineShell visibleCount={visibleCount} />
          <ViewerControlsShell
            onHome={() => {
              resetCameraState();
              setHomeSignal((value) => value + 1);
            }}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-[104px] bottom-3 hidden w-[390px] xl:block 2xl:w-[430px]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="pointer-events-auto h-full"
        >
          <DetailDrawerShell
            entity={selectedEntity}
            nearbySummary={nearbySummary ?? null}
            isNearbyLoading={Boolean(nearbyFocus && isNearbyFetching)}
            nearbyErrorMessage={nearbyError instanceof Error ? nearbyError.message : null}
          />
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 xl:hidden">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="pointer-events-auto max-h-[44vh] overflow-hidden"
        >
          <DetailDrawerShell
            entity={selectedEntity}
            nearbySummary={nearbySummary ?? null}
            isNearbyLoading={Boolean(nearbyFocus && isNearbyFetching)}
            nearbyErrorMessage={nearbyError instanceof Error ? nearbyError.message : null}
          />
        </motion.div>
      </div>

      {hoverState && hoveredEntity ? (
        <HoverCardShell entity={hoveredEntity} x={hoverState.x} y={hoverState.y} />
      ) : null}
    </section>
  );
}
