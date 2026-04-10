"use client";

import { useRouter } from "next/navigation";
import { Crosshair, LoaderCircle, MapPin, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { EvidenceBadge } from "@/components/evidence-badge";
import { UncertaintyBadge } from "@/components/uncertainty-badge";
import { chemicalQuickSearches } from "@/lib/data/chemistry";
import type { ExplorerNearbyResponse, ExplorerSearchResult } from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

type LocationFeedback = {
  tone: "neutral" | "success" | "error";
  message: string;
};

type SearchControlShellProps = {
  results: ExplorerSearchResult[];
  resultCount: number;
  nearbySummary: ExplorerNearbyResponse | null;
  locationFeedback: LocationFeedback | null;
  nearbyErrorMessage: string | null;
  onResolveLocation: (query: string) => Promise<void>;
  onLocateMe: () => Promise<void>;
  isResolvingLocation: boolean;
  isLocating: boolean;
  isNearbyLoading: boolean;
};

export function SearchControlShell({
  results,
  resultCount,
  nearbySummary,
  locationFeedback,
  nearbyErrorMessage,
  onResolveLocation,
  onLocateMe,
  isResolvingLocation,
  isLocating,
  isNearbyLoading,
}: SearchControlShellProps) {
  const router = useRouter();
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchQuery = useExplorerStore((state) => state.searchQuery);
  const isSearchOpen = useExplorerStore((state) => state.isSearchOpen);
  const setSearchQuery = useExplorerStore((state) => state.setSearchQuery);
  const setSearchOpen = useExplorerStore((state) => state.setSearchOpen);
  const setSelectedEntityId = useExplorerStore((state) => state.setSelectedEntityId);
  const setDrawerOpen = useExplorerStore((state) => state.setDrawerOpen);
  const nearbyFocus = useExplorerStore((state) => state.nearbyFocus);
  const setNearbyFocus = useExplorerStore((state) => state.setNearbyFocus);

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
    setSearchQuery(result.title);
    setSearchOpen(false);
    if (result.entityId) {
      setSelectedEntityId(result.entityId);
      setDrawerOpen(true);
      return;
    }

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
          : locationFeedback?.message ??
            (nearbySummary
              ? `${nearbySummary.total} mapped signals loaded within ${nearbySummary.center.radiusMiles} miles.`
              : null));

  const statusTone: LocationFeedback["tone"] =
    locationError || nearbyErrorMessage
      ? "error"
      : isResolvingLocation || isLocating || isNearbyLoading
        ? "neutral"
        : locationFeedback?.tone ?? "success";

  const statusClasses =
    statusTone === "error"
      ? "border-[rgba(179,108,77,0.32)] bg-[rgba(179,108,77,0.12)] text-[var(--accent-warning)]"
      : statusTone === "success"
        ? "border-[rgba(126,147,118,0.3)] bg-[rgba(126,147,118,0.12)] text-[var(--foreground-muted)]"
        : "border-white/10 bg-white/5 text-[var(--foreground-muted)]";

  return (
    <div className="hud-panel relative p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleLocationSearch();
        }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 focus-within:border-white/18 focus-within:bg-white/7">
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
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/7 px-4 text-sm text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResolvingLocation ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              "Go"
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
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--foreground-muted)] transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(135,160,176,0.22)] bg-[rgba(135,160,176,0.12)] px-4 py-2 text-sm text-white transition hover:bg-[rgba(135,160,176,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            Search U.S. location
          </button>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
            {resultCount} visible signals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
            Try compounds
          </p>
          {chemicalQuickSearches.map((entry) => (
            <button
              key={entry.query}
              type="button"
              onClick={() => {
                setSearchQuery(entry.query);
                setSearchOpen(true);
              }}
              className="rounded-full border border-[rgba(179,108,77,0.18)] bg-[rgba(179,108,77,0.08)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)] transition hover:bg-[rgba(179,108,77,0.14)] hover:text-white"
            >
              {entry.label}
            </button>
          ))}
        </div>
        {resolvedStatus ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClasses}`}>
            {resolvedStatus}
          </div>
        ) : null}
      </form>

      {nearbySummary ? (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Nearby signals</p>
              <p className="text-sm text-white">{nearbySummary.center.label}</p>
              <p className="mt-1 body-sm">
                {nearbySummary.total} mapped signals within {nearbySummary.center.radiusMiles} miles
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
              U.S. focus
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
              Nearby radius
            </p>
            {[25, 50, 100].map((radiusMiles) => (
              <button
                key={radiusMiles}
                type="button"
                onClick={() => {
                  if (!nearbyFocus) return;
                  setNearbyFocus({
                    ...nearbyFocus,
                    radiusMiles,
                  });
                }}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
                  nearbySummary.center.radiusMiles === radiusMiles
                    ? "border-[rgba(135,160,176,0.32)] bg-[rgba(135,160,176,0.16)] text-white"
                    : "border-white/10 bg-white/4 text-[var(--foreground-soft)] hover:bg-white/7 hover:text-white"
                }`}
              >
                {radiusMiles} mi
              </button>
            ))}
          </div>
          {nearbySummary.sourceCounts.length ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                Top source families in view
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nearbySummary.sourceCounts.map((source) => (
                  <span
                    key={source.sourceId}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--foreground-muted)]"
                  >
                    {source.label} / {source.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {nearbySummary.signalFamilyCounts.length ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                Dominant signal stack
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nearbySummary.signalFamilyCounts.map((family) => (
                  <span
                    key={family.id}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--foreground-muted)]"
                  >
                    {family.label} / {family.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {nearbySummary.chemicalMarkerCounts.length ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                Dominant chemistry markers
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nearbySummary.chemicalMarkerCounts.map((marker) => (
                  <span
                    key={marker.id}
                    className="rounded-full border border-[rgba(135,160,176,0.18)] bg-[rgba(135,160,176,0.1)] px-3 py-1.5 text-xs text-white"
                  >
                    {marker.label} / {marker.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {nearbySummary.chemicalHighlightCounts.length ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                Named chemical spotlights
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nearbySummary.chemicalHighlightCounts.map((entry) => (
                  <span
                    key={entry.label}
                    className="rounded-full border border-[rgba(179,108,77,0.22)] bg-[rgba(179,108,77,0.1)] px-3 py-1.5 text-xs text-white"
                  >
                    {entry.label} / {entry.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {nearbySummary.themeCounts.length ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                What this area lights up for
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nearbySummary.themeCounts.map((theme) => (
                  <span
                    key={theme.theme}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--foreground-muted)]"
                  >
                    {theme.label} / {theme.count}
                  </span>
                ))}
              </div>
              {nearbySummary.summaryLines.length ? (
                <div className="mt-3 space-y-2">
                  {nearbySummary.summaryLines.map((line) => (
                    <p key={line} className="body-sm">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {nearbySummary.results.length ? (
            <div className="mt-4 space-y-2">
              {nearbySummary.headlineResults.map((result) => (
                <button
                  key={result.entity.id}
                  type="button"
                  onClick={() =>
                    handleSelect({
                      id: result.entity.id,
                      title: result.entity.title,
                      subtitle: result.entity.locationLabel,
                      kind: "entity",
                      entityId: result.entity.id,
                      score: 100,
                    })
                  }
                  className="flex w-full items-start justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-white">{result.entity.title}</p>
                      <EvidenceBadge evidence={result.entity.evidenceType} />
                    </div>
                    <p className="mt-2 body-sm">{result.whyRanked}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                      {Math.max(1, Math.round(result.distanceMiles))} mi
                    </span>
                    <div className="mt-2 flex justify-end">
                      <UncertaintyBadge level={result.entity.confidenceLevel} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
              <p className="text-sm text-white">No mapped signals in the current radius</p>
              <p className="mt-2 body-sm">
                Try a broader search area or switch on additional layers to widen the U.S. context around this place.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {isSearchOpen && searchQuery.trim() ? (
        <div className="absolute inset-x-4 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(10,12,15,0.96)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="max-h-[320px] overflow-y-auto p-2">
            {results.length > 0 ? (
              <>
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-start justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-white/7"
                  >
                    <div>
                      <p className="text-sm text-white">{result.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
                          {result.kind === "entity" ? "Mapped signal" : "Case study"}
                        </p>
                        {result.matchType ? (
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                            {result.matchType === "chemical"
                              ? "Chemical match"
                              : result.matchType === "location"
                                ? "Location match"
                                : result.matchType === "entity"
                                  ? "Entity match"
                                  : "Case study"}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 body-sm text-[var(--foreground-muted)]">{result.subtitle}</p>
                      {result.matchContext ? (
                        <p className="mt-2 text-xs text-[var(--foreground-soft)]">{result.matchContext}</p>
                      ) : null}
                    </div>
                    {result.relatedCaseStudyId ? (
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                        Read
                      </span>
                    ) : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void handleLocationSearch()}
                  className="mt-2 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7"
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
                    className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7"
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
