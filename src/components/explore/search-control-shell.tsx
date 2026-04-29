"use client";

import { useRouter } from "next/navigation";
import { Crosshair, LoaderCircle, MapPin, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { chemicalQuickSearches } from "@/lib/data/chemistry";
import { resolveExplorerEntityFocusState } from "@/lib/map/entity-activation";
import {
  getExplorerSearchMatchLabel,
  getExplorerSearchResultActionLabel,
  getExplorerSearchResultInsightBadges,
} from "@/lib/map/search-presentation";
import type { SelectionSurfaceContext } from "@/lib/map/selection-context";
import type { ExplorerNearbyResponse, ExplorerSearchResult } from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

type LocationFeedback = {
  tone: "neutral" | "success" | "error";
  message: string;
};

type SearchControlShellProps = {
  results: ExplorerSearchResult[];
  isSearchLoading: boolean;
  nearbySummary: ExplorerNearbyResponse | null;
  locationFeedback: LocationFeedback | null;
  nearbyErrorMessage: string | null;
  onResolveLocation: (query: string) => Promise<void>;
  onLocateMe: () => Promise<void>;
  isResolvingLocation: boolean;
  isLocating: boolean;
  isNearbyLoading: boolean;
  scopeLabel: string;
  cameraBandLabel: string;
  renderedSignalCount: number;
  topLayerLabels: string[];
  selectionContext: SelectionSurfaceContext;
  onSelectionContextAction: (actionId: SelectionSurfaceContext["actions"][number]["id"]) => void;
};

export function SearchControlShell({
  results,
  isSearchLoading,
  nearbySummary,
  locationFeedback,
  nearbyErrorMessage,
  onResolveLocation,
  onLocateMe,
  isResolvingLocation,
  isLocating,
  isNearbyLoading,
  scopeLabel,
  cameraBandLabel,
  renderedSignalCount,
  topLayerLabels,
  selectionContext,
  onSelectionContextAction,
}: SearchControlShellProps) {
  const router = useRouter();
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchQuery = useExplorerStore((state) => state.searchQuery);
  const isSearchOpen = useExplorerStore((state) => state.isSearchOpen);
  const selectedEntityId = useExplorerStore((state) => state.selectedEntityId);
  const isDrawerOpen = useExplorerStore((state) => state.isDrawerOpen);
  const nearbyFocus = useExplorerStore((state) => state.nearbyFocus);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const isCameraAtHome = useExplorerStore((state) => state.isCameraAtHome);
  const activeGroups = useExplorerStore((state) => state.activeGroups);
  const activeLayerIds = useExplorerStore((state) => state.activeLayerIds);
  const activeFilterChips = useExplorerStore((state) => state.activeFilterChips);
  const applyExplorerSurfaceState = useExplorerStore((state) => state.applyExplorerSurfaceState);
  const setSearchQuery = useExplorerStore((state) => state.setSearchQuery);
  const setSearchOpen = useExplorerStore((state) => state.setSearchOpen);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  function handleSelect(result: ExplorerSearchResult) {
    if (result.entityId) {
      const nextState = resolveExplorerEntityFocusState(
        {
          entityId: result.entityId,
          label: result.title,
          coordinates: result.coordinates,
        },
        {
          selectedEntityId,
          nearbyFocus,
          isDrawerOpen,
          searchQuery: result.title,
          isSearchOpen,
          cameraTarget,
          isCameraAtHome,
        },
      );

      applyExplorerSurfaceState(nextState);
      return;
    }

    setSearchQuery(result.title);
    setSearchOpen(false);
    if (result.relatedCaseStudyId) {
      router.push(`/case-studies/${result.relatedCaseStudyId}`);
    }
  }

  async function handleLocationSearch() {
    if (!searchQuery.trim()) return;
    setLocationError(null);
    try {
      await onResolveLocation(searchQuery);
      setSearchOpen(false);
    } catch {
      setLocationError("No U.S. place match found for that search.");
    }
  }

  const resolvedStatus =
    locationError ??
    nearbyErrorMessage ??
    (isResolvingLocation
      ? "Searching official U.S. location records..."
      : isLocating
        ? "Requesting your current location..."
        : isNearbyLoading
          ? "Loading nearby mapped signals..."
          : locationFeedback?.message ?? null);

  const statusTone: LocationFeedback["tone"] =
    locationError || nearbyErrorMessage
      ? "error"
      : isResolvingLocation || isLocating || isNearbyLoading
        ? "neutral"
        : locationFeedback?.tone ?? "success";

  const statusClasses =
    statusTone === "error"
      ? "text-[var(--accent-warning)]"
      : statusTone === "success"
        ? "text-[var(--foreground-muted)]"
        : "text-[var(--foreground-muted)]";
  const scopeSummary = nearbySummary
    ? `${nearbySummary.total.toLocaleString()} signals in ${nearbySummary.center.radiusMiles} miles`
    : `${renderedSignalCount.toLocaleString()} onscreen in ${cameraBandLabel.toLowerCase()} view`;
  const compactScopeItems = [
    nearbySummary
      ? `${nearbySummary.center.radiusMiles} mi radius`
      : null,
    `${activeLayerIds.length} layers`,
    `${activeGroups.length} groups`,
    activeFilterChips.length > 0 ? `${activeFilterChips.length} filters` : "default stack",
  ].filter(Boolean) as string[];
  const topSystems = nearbySummary?.systemCounts.slice(0, 2) ?? [];
  const quickCompounds = chemicalQuickSearches.slice(0, 4);
  const topScopePills = [
    ...compactScopeItems.slice(0, 2),
    ...(topSystems.length
      ? topSystems.slice(0, 1).map((system) => system.label)
      : topLayerLabels.slice(0, 1)),
  ];

  return (
    <div className="hud-panel-slim relative z-40 max-w-[440px] border-[rgba(106,138,158,0.14)] bg-[rgba(10,14,20,0.48)] p-2.5 shadow-[0_22px_54px_rgba(0,0,0,0.2)]">
      <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
        <p className="text-sm text-white">{scopeLabel}</p>
        <p className="status-rail">
          {cameraBandLabel} / {renderedSignalCount.toLocaleString()} onscreen
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (results.length > 0) {
            handleSelect(results[0]);
            return;
          }

          if (isSearchLoading) {
            return;
          }

          void handleLocationSearch();
        }}
        className="space-y-2.5"
      >
        <div className="flex items-center gap-2 rounded-full border border-[rgba(87,132,154,0.16)] bg-[rgba(255,255,255,0.04)] px-3 py-2 focus-within:border-[rgba(87,132,154,0.28)] focus-within:bg-[rgba(255,255,255,0.06)]">
          <Search className="ml-1 h-4 w-4 text-[var(--foreground-soft)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="ZIP, city, address, or facility"
            aria-label="Search toxinmap.com"
            className="w-full bg-transparent text-sm text-white placeholder:text-[var(--foreground-soft)]"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(false);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground-soft)] transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!searchQuery.trim() || isResolvingLocation}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[rgba(87,132,154,0.18)] bg-[rgba(87,132,154,0.1)] px-3 text-sm text-white transition hover:bg-[rgba(87,132,154,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResolvingLocation ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setLocationError(null);
              try {
                await onLocateMe();
              } catch {
                setLocationError("Your browser did not return a usable location.");
              }
            }}
            disabled={isLocating}
            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[rgba(255,255,255,0.04)] px-3.5 py-1.5 text-sm text-[var(--foreground-muted)] transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLocating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
            Locate me
          </button>
          <button
            type="submit"
            disabled={!searchQuery.trim() || isResolvingLocation}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(87,132,154,0.22)] bg-[rgba(87,132,154,0.12)] px-3.5 py-1.5 text-sm text-white transition hover:bg-[rgba(87,132,154,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            Search
          </button>
          {resolvedStatus ? (
            <span className={`w-full text-[10px] uppercase tracking-[0.16em] ${statusClasses} sm:ml-auto sm:w-auto`}>
              {resolvedStatus}
            </span>
          ) : null}
        </div>
        <div
          data-testid="selection-context"
          data-context-kind={selectionContext.kind}
          className="rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3.5 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="status-rail">{selectionContext.title}</p>
              {selectionContext.chips.map((chip) => (
                <span
                  key={chip.id}
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                    chip.emphasis === "strong"
                      ? "border-[rgba(135,160,176,0.18)] bg-[rgba(135,160,176,0.08)] text-white"
                      : "border-white/10 text-[var(--foreground-soft)]"
                  }`}
                >
                  {chip.value}
                </span>
              ))}
            </div>
            {selectionContext.actions.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectionContext.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    data-testid={`selection-context-action-${action.id}`}
                    onClick={() => onSelectionContextAction(action.id)}
                    className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)] transition hover:bg-white/8 hover:text-white"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-white">{selectionContext.value}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-sm text-white">{scopeSummary}</span>
          {topScopePills.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-1">
          {quickCompounds.map((entry) => (
            <button
              key={entry.query}
              type="button"
              onClick={() => {
                setSearchQuery(entry.query);
                setSearchOpen(true);
              }}
              className="rounded-full border border-[rgba(179,108,77,0.16)] bg-[rgba(179,108,77,0.06)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-muted)] transition hover:bg-[rgba(179,108,77,0.12)] hover:text-white"
            >
              {entry.label}
            </button>
          ))}
        </div>
      </form>

      {isSearchOpen && searchQuery.trim() ? (
        <div className="absolute inset-x-4 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(10,12,15,0.96)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="max-h-[320px] overflow-y-auto p-2">
            {isSearchLoading ? (
              <div className="px-4 py-5">
                <p className="text-sm text-white">Searching mapped signals...</p>
                <p className="mt-2 body-sm">
                  Checking the live toxin map for facilities, chemistry, case studies, and nearby
                  mapped records.
                </p>
              </div>
            ) : results.length > 0 ? (
              <>
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    type="button"
                    data-testid="search-result"
                    data-result-id={result.id}
                    data-layer-id={result.layerId ?? ""}
                    data-evidence-type={result.evidenceType ?? ""}
                    data-source-hint={result.sourceHint ?? ""}
                    onClick={() => handleSelect(result)}
                    className={`flex w-full items-start justify-between gap-4 rounded-[20px] border px-4 py-3.5 text-left transition ${
                      index === 0
                        ? "border-[rgba(135,160,176,0.16)] bg-[rgba(135,160,176,0.08)] hover:bg-[rgba(135,160,176,0.12)]"
                        : "border-transparent hover:border-white/8 hover:bg-white/6"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                          {getExplorerSearchMatchLabel(result)}
                        </span>
                        {index === 0 ? (
                          <span className="rounded-full border border-[rgba(135,160,176,0.18)] bg-[rgba(135,160,176,0.08)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white">
                            Top result
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-white">{result.title}</p>
                      {getExplorerSearchResultInsightBadges(result).length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {getExplorerSearchResultInsightBadges(result).map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--foreground-muted)]"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">{result.subtitle}</p>
                      {result.matchContext ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--foreground-soft)]">{result.matchContext}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                      {getExplorerSearchResultActionLabel(result)}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void handleLocationSearch()}
                  className="mt-2 flex w-full items-center justify-between rounded-[20px] border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7"
                >
                  <div>
                    <p className="text-sm text-white">Search this place in the U.S.</p>
                    <p className="mt-2 body-sm">{searchQuery}</p>
                  </div>
                  <MapPin className="h-4 w-4 text-[var(--foreground-soft)]" />
                </button>
              </>
            ) : (
              <>
                <div className="px-4 py-5">
                  <p className="text-sm text-white">No exact mapped match yet</p>
                  <p className="mt-2 body-sm">
                    Search by facility, city, ZIP code, or street address to fly into a U.S. area and inspect nearby signals.
                  </p>
                </div>
                <div className="px-2 pb-2">
                  <button
                    type="button"
                    onClick={() => void handleLocationSearch()}
                    className="flex w-full items-center justify-between rounded-[20px] border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7"
                  >
                    <div>
                      <p className="text-sm text-white">Search this U.S. location</p>
                      <p className="mt-2 body-sm">{searchQuery}</p>
                    </div>
                    <MapPin className="h-4 w-4 text-[var(--foreground-soft)]" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
