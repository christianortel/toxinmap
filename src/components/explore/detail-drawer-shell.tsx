"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPinned, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EvidenceBadge } from "@/components/evidence-badge";
import { ErrorState } from "@/components/error-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { SourceBadge } from "@/components/source-badge";
import { UncertaintyBadge } from "@/components/uncertainty-badge";
import { fetchJson } from "@/lib/api";
import { getChemicalMarkerLabel } from "@/lib/data/chemistry";
import {
  buildDetailDrawerDisplayState,
  buildDetailDrawerHeaderState,
  type DetailDrawerItemWindow,
} from "@/lib/map/detail-drawer-state";
import { resolveExplorerEntityFocusState } from "@/lib/map/entity-activation";
import {
  resolveDetailDrawerCloseState,
  resolveNearbyFocusRadiusState,
  resolveSelectedNearbyRefocusState,
  resolveSelectionContextActionState,
} from "@/lib/map/selection-context";
import type {
  ExplorerEntity,
  ExplorerEntityDetail,
  ExplorerNearbyResponse,
} from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

const backendLabels: Record<ExplorerEntityDetail["backend"], string> = {
  database: "DB-backed",
  "etl-file": "ETL-backed",
  mock: "Mock-backed",
};

const backendDescriptions: Record<ExplorerEntityDetail["backend"], string> = {
  database: "This record is coming from the live database-backed atlas path.",
  "etl-file":
    "This record is coming from normalized EPA, ATSDR, or USGS ETL files on disk while PostGIS is unavailable.",
  mock: "This record is currently coming from the curated fallback dataset rather than a live ingest output.",
};

type DetailDrawerShellProps = {
  entity: ExplorerEntity | null;
  selectedEntityId?: string | null;
  nearbySummary?: ExplorerNearbyResponse | null;
  isNearbyLoading?: boolean;
  nearbyErrorMessage?: string | null;
};

export function DetailDrawerShell({
  entity,
  selectedEntityId = null,
  nearbySummary = null,
  isNearbyLoading = false,
  nearbyErrorMessage = null,
}: DetailDrawerShellProps) {
  const isDrawerOpen = useExplorerStore((state) => state.isDrawerOpen);
  const applyExplorerSurfaceState = useExplorerStore((state) => state.applyExplorerSurfaceState);
  const nearbyFocus = useExplorerStore((state) => state.nearbyFocus);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const isCameraAtHome = useExplorerStore((state) => state.isCameraAtHome);
  const searchQuery = useExplorerStore((state) => state.searchQuery);
  const isSearchOpen = useExplorerStore((state) => state.isSearchOpen);
  const entityId = entity?.id ?? selectedEntityId;
  const { data, error, isLoading } = useQuery({
    enabled: Boolean(entityId),
    queryKey: ["entity-detail", entityId],
    queryFn: () => fetchJson<ExplorerEntityDetail>(`/api/entities/${entityId}`),
  });
  const detail = data ?? null;
  const resolvedEntity = detail ?? entity;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const nextState = selectedEntityId
          ? resolveDetailDrawerCloseState({
              selectedEntityId,
              nearbyFocus,
              isDrawerOpen,
              searchQuery,
              isSearchOpen,
              cameraTarget,
              isCameraAtHome,
            })
          : nearbyFocus
            ? resolveSelectionContextActionState("clear-nearby", {
                selectedEntityId,
                nearbyFocus,
                isDrawerOpen,
                searchQuery,
                isSearchOpen,
                cameraTarget,
                isCameraAtHome,
              })
            : {
                selectedEntityId,
                nearbyFocus,
                isDrawerOpen: false,
                searchQuery,
                isSearchOpen,
                cameraTarget,
                isCameraAtHome,
              };

        applyExplorerSurfaceState(nextState);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    applyExplorerSurfaceState,
    cameraTarget,
    isCameraAtHome,
    isDrawerOpen,
    isSearchOpen,
    nearbyFocus,
    searchQuery,
    selectedEntityId,
  ]);

  if (!isDrawerOpen || (!resolvedEntity && !selectedEntityId)) {
    return (
      <div className="hud-panel h-full min-h-[460px] border-[rgba(106,138,158,0.14)] bg-[rgba(10,14,20,0.66)] p-4 md:p-5">
        {nearbyFocus ? (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Map focus</p>
              <p className="text-sm text-white">{nearbyFocus.label}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextState = resolveSelectionContextActionState("clear-nearby", {
                  selectedEntityId,
                  nearbyFocus,
                  isDrawerOpen,
                  searchQuery,
                  isSearchOpen,
                  cameraTarget,
                  isCameraAtHome,
                });

                applyExplorerSurfaceState(nextState);
              }}
              className="rounded-full border border-white/10 bg-white/6 p-2 text-[var(--foreground-soft)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Return to map"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {isNearbyLoading ? (
          <div className="space-y-4">
            <div>
              <p className="eyebrow mb-3">Nearby summary</p>
              <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">
                Loading nearby signals
              </h3>
              <p className="mt-3 body-sm">
                Pulling mapped toxin and contamination context for the current U.S. focus area.
              </p>
            </div>
            <LoadingSkeleton lines={6} />
          </div>
        ) : nearbyErrorMessage ? (
          <ErrorState
            title="Nearby results unavailable"
            body="The current map focus could not be resolved into nearby results. Try another search or reset the map."
          />
        ) : nearbySummary ? (
          <div className="space-y-4">
            <div>
              <p className="eyebrow mb-3">Nearby summary</p>
              <h3 className="font-serif text-[2rem] tracking-[-0.05em] text-white">
                {nearbySummary.center.label}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white">
                  {nearbySummary.total.toLocaleString()} signals
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                  {nearbySummary.center.radiusMiles} mi radius
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                  {nearbySummary.systemCounts.length} active systems
                </span>
              </div>
            </div>
            <div className="surface-panel-soft p-4">
              <div className="flex flex-wrap items-center gap-2">
                {nearbySummary.systemCounts.slice(0, 3).map((system) => (
                  <span
                    key={system.id}
                    className="rounded-full border border-[rgba(135,160,176,0.18)] bg-[rgba(135,160,176,0.1)] px-3 py-1.5 text-xs text-white"
                  >
                    {system.label} / {system.count}
                  </span>
                ))}
                {nearbySummary.signalFamilyCounts.slice(0, 2).map((family) => (
                  <span
                    key={family.id}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--foreground-muted)]"
                  >
                    {family.label} / {family.count}
                  </span>
                ))}
              </div>
              {nearbySummary.summaryLines.length ? (
                <p className="mt-3 body-sm">{nearbySummary.summaryLines[0]}</p>
              ) : null}
            </div>
            {nearbySummary.coverageNotes.length ? (
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Coverage notes</p>
                <div className="space-y-2.5">
                  {nearbySummary.coverageNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-2xl border border-[rgba(179,108,77,0.18)] bg-[rgba(179,108,77,0.08)] px-4 py-3"
                    >
                      <p className="text-sm text-white">{note.title}</p>
                      <p className="mt-2 body-sm">{note.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="surface-panel-soft p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                  Nearby radius
                </p>
                {[25, 50, 100].map((radiusMiles) => (
                  <button
                    key={radiusMiles}
                    type="button"
                    onClick={() => {
                      if (!nearbyFocus) return;
                      const nextState = resolveNearbyFocusRadiusState(
                        nearbyFocus,
                        radiusMiles,
                      );
                      applyExplorerSurfaceState({
                        selectedEntityId,
                        nearbyFocus: nextState.nearbyFocus,
                        isDrawerOpen: true,
                        searchQuery,
                        isSearchOpen,
                        cameraTarget: nextState.cameraTarget,
                        isCameraAtHome: nextState.isCameraAtHome,
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
            </div>
            {nearbySummary.sourceCounts.length ? (
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Source lineage in this radius</p>
                <div className="flex flex-wrap gap-2">
                  {nearbySummary.sourceCounts.slice(0, 6).map((source) => (
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
            {nearbySummary.systemCounts.length ? (
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Dominant toxin systems</p>
                <div className="space-y-2">
                  {nearbySummary.systemCounts.slice(0, 4).map((system) => (
                    <div
                      key={system.id}
                      className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{system.label}</p>
                          <p className="mt-2 body-sm">{system.description}</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                          {system.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {nearbySummary.signalFamilyCounts.length ? (
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Dominant signal stack</p>
                <div className="flex flex-wrap gap-2">
                  {nearbySummary.signalFamilyCounts.slice(0, 6).map((family) => (
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
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Dominant chemistry markers</p>
                <div className="flex flex-wrap gap-2">
                  {nearbySummary.chemicalMarkerCounts.slice(0, 6).map((marker) => (
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
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Named chemical spotlights</p>
                <div className="flex flex-wrap gap-2">
                  {nearbySummary.chemicalHighlightCounts.slice(0, 6).map((entry) => (
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
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">What this area lights up for</p>
                <div className="flex flex-wrap gap-2">
                  {nearbySummary.themeCounts.map((theme) => (
                    <span
                      key={theme.theme}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--foreground-muted)]"
                    >
                      {theme.label} / {theme.count}
                    </span>
                  ))}
                </div>
                {nearbySummary.summaryLines.length > 1 ? (
                  <div className="mt-3 space-y-2">
                    {nearbySummary.summaryLines.slice(1).map((line) => (
                      <p key={line} className="body-sm">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {nearbySummary.evidenceCounts.length ? (
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Evidence mix</p>
                <div className="flex flex-wrap gap-2">
                  {nearbySummary.evidenceCounts.map((entry) => (
                    <div
                      key={entry.evidenceType}
                      className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <EvidenceBadge evidence={entry.evidenceType} />
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                          {entry.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="surface-panel-soft p-4">
              <p className="eyebrow mb-3">Highest-priority nearby signals</p>
              {nearbySummary.headlineResults.length ? (
                <div className="space-y-2">
                  {nearbySummary.headlineResults.map((result) => (
                    <button
                      key={result.entity.id}
                      type="button"
                      onClick={() => {
                        const nextState = resolveExplorerEntityFocusState(
                          {
                            entityId: result.entity.id,
                            label: result.entity.title,
                            coordinates: result.entity.coordinates,
                          },
                          {
                            selectedEntityId,
                            nearbyFocus,
                            isDrawerOpen,
                            searchQuery,
                            isSearchOpen,
                            cameraTarget,
                            isCameraAtHome,
                          },
                        );

                        applyExplorerSurfaceState(nextState);
                      }}
                      className="flex w-full items-start justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left transition hover:bg-white/6"
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
                <p className="body-sm">
                  No mapped signals were found inside the current radius. Widen the search area or enable more layers.
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Search a U.S. place"
            body="Use ZIP, city, address, or Locate me to inspect nearby toxin and contamination signals."
          />
        )}
      </div>
    );
  }

  if (selectedEntityId && !resolvedEntity && isLoading) {
    return (
      <div
        data-testid="detail-drawer"
        data-entity-id={selectedEntityId}
        data-entity-title=""
        className="hud-panel h-full min-h-[460px] p-4 md:p-5"
      >
        <LoadingSkeleton lines={8} />
      </div>
    );
  }

  if (selectedEntityId && !resolvedEntity && error) {
    return (
      <div
        data-testid="detail-drawer"
        data-entity-id={selectedEntityId}
        data-entity-title=""
        className="hud-panel h-full min-h-[460px] p-4 md:p-5"
      >
        <ErrorState
          title="Entity detail unavailable"
          body="The selected atlas entity could not be resolved from the current data source."
        />
      </div>
    );
  }

  if (!resolvedEntity) {
    return (
      <div
        data-testid="detail-drawer"
        data-entity-id={selectedEntityId ?? ""}
        data-entity-title=""
        className="hud-panel h-full min-h-[460px] p-4 md:p-5"
      >
        <ErrorState
          title="Entity detail unavailable"
          body="The selected atlas entity could not be resolved from the current data source."
        />
      </div>
    );
  }

  const detailDisplay = detail ? buildDetailDrawerDisplayState(detail) : null;
  const detailSummary = detailDisplay?.summary ?? null;
  const headerState = buildDetailDrawerHeaderState(resolvedEntity, selectedEntityId);
  const visibleSecondaryStats = detailDisplay?.secondaryStats.visible ?? [];
  const hiddenSecondaryStats = detailDisplay?.secondaryStats.hidden ?? 0;
  const visibleReleaseRecords = detailDisplay?.releaseRecords.visible ?? [];
  const hiddenReleaseRecords = detailDisplay?.releaseRecords.hidden ?? 0;
  const visibleSources = detailDisplay?.sources.visible ?? [];
  const hiddenSources = detailDisplay?.sources.hidden ?? 0;
  const visibleCaseStudies = detailDisplay?.caseStudies.visible ?? [];
  const hiddenCaseStudies = detailDisplay?.caseStudies.hidden ?? 0;
  const officialSignals = detailDisplay?.officialSignals ?? null;
  const contextSections = detailDisplay?.contextSections ?? [];

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      data-testid="detail-drawer"
      data-entity-id={resolvedEntity.id}
      data-entity-title={resolvedEntity.title}
      data-layer-id={resolvedEntity.layerId}
      data-layer-label={headerState.layerLabel}
      data-selected-state={headerState.isSelectedOnMap ? "selected" : "indirect"}
      className="hud-panel h-full min-h-[320px] max-h-[860px] overflow-y-auto border-[rgba(106,138,158,0.14)] bg-[rgba(10,14,20,0.68)] p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {headerState.isSelectedOnMap ? (
              <span className="rounded-full border border-[rgba(135,160,176,0.22)] bg-[rgba(135,160,176,0.12)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
                Selected on map
              </span>
            ) : null}
            <span
              className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "color-mix(in srgb, transparent 82%, currentColor 18%)",
                color: headerState.layerAccent,
              }}
            >
              {headerState.layerLabel}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
              {headerState.groupLabel}
            </span>
            {detail ? (
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                {backendLabels[detail.backend]}
              </span>
            ) : null}
            <EvidenceBadge evidence={resolvedEntity.evidenceType} />
            <UncertaintyBadge level={resolvedEntity.confidenceLevel} />
          </div>
          <h3 className="mt-3 font-serif text-[1.75rem] leading-tight tracking-[-0.05em] text-white">
            {resolvedEntity.title}
          </h3>
          <div className="mt-2 inline-flex max-w-full items-center gap-2 text-sm text-[var(--foreground-soft)]">
            <MapPinned className="h-4 w-4 text-[var(--accent-water)]" />
            <span className="truncate">{resolvedEntity.locationLabel}</span>
          </div>
          <p className="mt-2 text-xs text-[var(--foreground-soft)]">
            {headerState.isSelectedOnMap
              ? "This drawer is linked to the currently selected atlas marker."
              : "This drawer is showing a linked atlas record from the current investigation flow."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextState = resolveDetailDrawerCloseState({
              selectedEntityId,
              nearbyFocus,
              isDrawerOpen,
              searchQuery,
              isSearchOpen,
              cameraTarget,
              isCameraAtHome,
            });

            applyExplorerSurfaceState(nextState);
          }}
          className="rounded-full border border-white/10 bg-white/6 p-2 text-[var(--foreground-soft)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label="Close detail drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {resolvedEntity.chemicalMarkers.slice(0, 3).map((marker) => (
          <span
            key={marker}
            className="rounded-full border border-[rgba(135,160,176,0.18)] bg-[rgba(135,160,176,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white"
          >
            {getChemicalMarkerLabel(marker)}
          </span>
        ))}
        {resolvedEntity.chemicalHighlights.slice(0, 2).map((highlight) => (
          <span
            key={highlight}
            className="rounded-full border border-[rgba(179,108,77,0.22)] bg-[rgba(179,108,77,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white"
          >
            {highlight}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-2.5">
        {detailSummary ? (
          <div
            data-testid="detail-read-first"
            data-read-first-what={detailSummary.readFirst.what}
            data-read-first-source={detailSummary.readFirst.source}
            data-read-first-measurement={detailSummary.readFirst.measuredVsInferred}
            className="surface-panel-soft border-[rgba(135,160,176,0.18)] bg-[rgba(135,160,176,0.07)] p-4"
          >
            <p className="eyebrow mb-3">Read this first</p>
            <div className="grid gap-2.5">
              <ReadFirstRow label="What this point is" value={detailSummary.readFirst.what} />
              <ReadFirstRow label="Why it matters" value={detailSummary.readFirst.why} />
              <ReadFirstRow label="Source backing" value={detailSummary.readFirst.source} />
              <ReadFirstRow
                label="Measured vs inferred"
                value={detailSummary.readFirst.measuredVsInferred}
              />
            </div>
          </div>
        ) : null}
        {detailSummary?.sourceActions.length ? (
          <div
            data-testid="detail-source-actions"
            data-primary-source-action-href={detailSummary.sourceActions[0]?.href ?? ""}
            className="surface-panel-soft p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">Source actions</p>
                <p className="body-sm">
                  Open the strongest public source behind this record without hunting through the
                  full source registry.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2.5">
              {detailSummary.sourceActions.map((action) => (
                <a
                  key={action.id}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 transition hover:border-[rgba(135,160,176,0.28)] hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <span>
                    <span className="block text-sm text-white">{action.label}</span>
                    <span className="mt-1 block text-xs text-[var(--foreground-soft)]">
                      {action.sourceType} / {action.helper}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--foreground-soft)] transition group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>
        ) : null}
        {selectedEntityId && nearbyFocus ? (
          <div
            data-testid="detail-nearby-context"
            data-nearby-label={nearbyFocus.label}
            data-nearby-radius={nearbyFocus.radiusMiles}
            className="surface-panel-soft border-[rgba(135,160,176,0.14)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Nearby context</p>
                <p className="text-sm text-white">{nearbyFocus.label}</p>
                <p className="mt-2 body-sm">
                  Keep this record selected while returning the map camera to the surrounding{" "}
                  {nearbyFocus.radiusMiles} mi investigation area.
                  {nearbySummary
                    ? ` ${nearbySummary.total.toLocaleString()} signals remain in that nearby context.`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = resolveSelectedNearbyRefocusState({
                    selectedEntityId,
                    nearbyFocus,
                    isDrawerOpen,
                    searchQuery,
                    isSearchOpen,
                    cameraTarget,
                    isCameraAtHome,
                  });

                  applyExplorerSurfaceState(nextState);
                }}
                className="shrink-0 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Refocus map
              </button>
            </div>
          </div>
        ) : null}
        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-0">Record context</p>
          <p className="mt-2 body-sm">{resolvedEntity.summary}</p>
          {detail ? (
            <p className="mt-3 text-xs text-[var(--foreground-soft)]">{backendDescriptions[detail.backend]}</p>
          ) : null}
        </div>
        {detailSummary ? (
          <div className="surface-panel-soft p-4">
            <p className="eyebrow mb-3">Key evidence</p>
            <div className="grid gap-2.5">
              {detailSummary.chemistrySpotlight.length ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                    Primary chemistry
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detailSummary.chemistrySpotlight.map((entry) => (
                      <span
                        key={entry}
                        className="rounded-full border border-[rgba(179,108,77,0.22)] bg-[rgba(179,108,77,0.1)] px-3 py-1.5 text-xs text-white"
                      >
                        {entry}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {detailSummary.rankedSources.length ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                    Strongest lineage
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detailSummary.rankedSources.slice(0, 4).map((source) => (
                      <span
                        key={source.id}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white"
                      >
                        {source.shortName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {detailSummary.primarySignals.length ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                    Strongest signals
                  </p>
                  <div className="mt-3 space-y-2">
                    {detailSummary.primarySignals.map((signal) => (
                      <p key={signal} className="body-sm">
                        {signal}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="my-5 glow-divider" />

      <div className="grid gap-2.5">
        {officialSignals ? (
          <SectionCard title="Official signals" itemWindow={officialSignals} />
        ) : null}
        {contextSections.map((section) => (
          <SectionCard key={section.key} title={section.title} itemWindow={section.items} />
        ))}
      </div>

      <div className="my-5 glow-divider" />

      <div className="grid gap-2.5">
        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-2">Confidence / uncertainty</p>
          <p className="body-sm">{resolvedEntity.uncertaintyNote}</p>
        </div>

        {detailSummary?.primaryFacts.length ? (
          <div
            data-testid="detail-primary-facts"
            data-primary-fact-labels={detailSummary.primaryFacts
              .map((fact) => fact.label)
              .join("|")}
            className="surface-panel-soft p-4"
          >
            <p className="eyebrow mb-3">Primary facts</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {detailSummary.primaryFacts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="eyebrow mb-2">{fact.label}</p>
                  <p className="font-serif text-2xl tracking-[-0.04em] text-white">{fact.value}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--foreground-soft)]">
                    {fact.helper}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : detailSummary?.primaryStats.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {detailSummary.primaryStats.map((stat) => (
              <div key={stat.label} className="surface-panel-soft p-4">
                <p className="eyebrow mb-2">{stat.label}</p>
                <p className="font-serif text-2xl tracking-[-0.04em] text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {visibleSecondaryStats.length ? (
          <div className="surface-panel-soft p-4">
            <p className="eyebrow mb-3">Additional record stats</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {visibleSecondaryStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="eyebrow mb-2">{stat.label}</p>
                  <p className="text-sm text-white">{stat.value}</p>
                </div>
              ))}
            </div>
            {hiddenSecondaryStats > 0 ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                +{hiddenSecondaryStats} more stats
              </p>
            ) : null}
          </div>
        ) : null}

        {visibleReleaseRecords.length ? (
          <div className="surface-panel-soft p-4">
            <p className="eyebrow mb-3">Recent TRI release records</p>
            <div className="space-y-2.5">
              {visibleReleaseRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">{record.chemicalName}</p>
                      <p className="mt-2 body-sm">
                        {record.releaseMedium ?? "Reported medium not specified"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{record.reportingYear}</p>
                      <p className="mt-2 body-sm">
                        {record.quantityKg !== null
                          ? `${record.quantityKg.toLocaleString()} kg`
                          : "Quantity not published"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hiddenReleaseRecords > 0 ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                +{hiddenReleaseRecords} more release records
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-3">Sources</p>
          <div className="space-y-2.5">
            {visibleSources.map((source) => (
              <div
                key={source.id}
                className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a
                      href={source.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-white transition hover:text-[var(--accent-water)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      {source.name}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    <p className="mt-1 body-sm">{source.methodologicalUse}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                      Updated {source.sourceUpdatedAt}
                    </p>
                    {source.caveats[0] ? (
                      <p className="mt-2 text-sm text-[var(--foreground-soft)]">{source.caveats[0]}</p>
                    ) : null}
                  </div>
                  <SourceBadge type={source.sourceType} />
                </div>
              </div>
            ))}
          </div>
          {hiddenSources > 0 ? (
            <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
              +{hiddenSources} more sources
            </p>
          ) : null}
        </div>

        {visibleCaseStudies.length ? (
          <div className="surface-panel-soft p-4">
            <p className="eyebrow mb-3">Related case studies</p>
            <div className="space-y-2.5">
              {visibleCaseStudies.map((study) => (
                <Link
                  key={study.slug}
                  href={`/case-studies/${study.slug}`}
                  className="flex items-start justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 transition hover:bg-white/6"
                >
                  <div>
                    <p className="text-sm text-white">{study.title}</p>
                    <p className="mt-2 body-sm">{study.subtitle}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--foreground-soft)]" />
                </Link>
              ))}
            </div>
            {hiddenCaseStudies > 0 ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                +{hiddenCaseStudies} more case studies
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.aside>
  );
}

function SectionCard({
  title,
  itemWindow,
}: {
  title: string;
  itemWindow: DetailDrawerItemWindow<string>;
}) {
  if (!itemWindow.total) {
    return null;
  }

  const visibleItems = itemWindow.visible;
  const hiddenItems = itemWindow.hidden;

  return (
    <div className="surface-panel-soft p-4">
      <p className="eyebrow mb-3">{title}</p>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/8 bg-black/20 px-4 py-2.5 text-sm text-[var(--foreground-muted)]"
          >
            {item}
          </div>
        ))}
      </div>
      {hiddenItems > 0 ? (
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
          +{hiddenItems} more
        </p>
      ) : null}
    </div>
  );
}

function ReadFirstRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-white">{value}</p>
    </div>
  );
}
