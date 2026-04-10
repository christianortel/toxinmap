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
import type {
  ExplorerEntity,
  ExplorerEntityDetail,
  ExplorerNearbyResponse,
} from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

type DetailDrawerShellProps = {
  entity: ExplorerEntity | null;
  nearbySummary?: ExplorerNearbyResponse | null;
  isNearbyLoading?: boolean;
  nearbyErrorMessage?: string | null;
};

export function DetailDrawerShell({
  entity,
  nearbySummary = null,
  isNearbyLoading = false,
  nearbyErrorMessage = null,
}: DetailDrawerShellProps) {
  const isDrawerOpen = useExplorerStore((state) => state.isDrawerOpen);
  const setDrawerOpen = useExplorerStore((state) => state.setDrawerOpen);
  const setSelectedEntityId = useExplorerStore((state) => state.setSelectedEntityId);
  const nearbyFocus = useExplorerStore((state) => state.nearbyFocus);
  const setNearbyFocus = useExplorerStore((state) => state.setNearbyFocus);
  const entityId = entity?.id ?? null;
  const { data, error, isLoading } = useQuery({
    enabled: Boolean(entityId),
    queryKey: ["entity-detail", entityId],
    queryFn: () => fetchJson<ExplorerEntityDetail>(`/api/entities/${entityId}`),
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setDrawerOpen]);

  if (!entity || !isDrawerOpen) {
    return (
      <div className="hud-panel h-full min-h-[460px] p-4 md:p-5">
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
              <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">
                {nearbySummary.center.label}
              </h3>
              <p className="mt-3 body-sm">
                {nearbySummary.total} mapped signals within {nearbySummary.center.radiusMiles} miles.
              </p>
            </div>
            <div className="grid gap-3">
              {nearbySummary.groupedCounts.slice(0, 4).map((group) => (
                <div key={group.id} className="surface-panel-soft p-4">
                  <p className="eyebrow mb-2">{group.label}</p>
                  <p className="font-serif text-2xl tracking-[-0.04em] text-white">{group.count}</p>
                </div>
              ))}
            </div>
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
            </div>
            {nearbySummary.sourceCounts.length ? (
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Source lineage in this radius</p>
                <div className="flex flex-wrap gap-2">
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
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Dominant signal stack</p>
                <div className="flex flex-wrap gap-2">
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
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Dominant chemistry markers</p>
                <div className="flex flex-wrap gap-2">
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
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-3">Named chemical spotlights</p>
                <div className="flex flex-wrap gap-2">
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
                      onClick={() => setSelectedEntityId(result.entity.id)}
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

  if (isLoading) {
    return (
      <div className="hud-panel h-full min-h-[460px] p-4 md:p-5">
        <LoadingSkeleton lines={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="hud-panel h-full min-h-[460px] p-4 md:p-5">
        <ErrorState
          title="Entity detail unavailable"
          body="The selected atlas entity could not be resolved from the current data source."
        />
      </div>
    );
  }

  const detail = data ?? null;
  const resolvedEntity = detail ?? entity;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="hud-panel h-full min-h-[320px] max-h-[860px] overflow-y-auto p-5"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Detail drawer</p>
          <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">
            {resolvedEntity.title}
          </h3>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--foreground-soft)]">
            <MapPinned className="h-4 w-4 text-[var(--accent-water)]" />
            {resolvedEntity.locationLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDrawerOpen(false);
            setSelectedEntityId(null);
          }}
          className="rounded-full border border-white/10 bg-white/6 p-2 text-[var(--foreground-soft)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label="Close detail drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <EvidenceBadge evidence={resolvedEntity.evidenceType} />
        <UncertaintyBadge level={resolvedEntity.confidenceLevel} />
        {detail ? (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
            {detail.backend === "database" ? "DB-backed" : "Mock-backed"}
          </span>
        ) : null}
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

      <div className="mt-5 grid gap-3">
        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-2">Summary</p>
          <p className="body-sm">{resolvedEntity.summary}</p>
        </div>
        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-2">Why this appears</p>
          <p className="body-sm">{resolvedEntity.whyThisAppears}</p>
        </div>
      </div>

      <div className="my-5 glow-divider" />

      <div className="grid gap-3">
        <SectionCard title="Official signals" items={resolvedEntity.officialSignals} />
        <SectionCard title="Emerging concerns" items={resolvedEntity.emergingConcerns} />
        <SectionCard
          title="Wildlife sentinel context"
          items={resolvedEntity.wildlifeSentinelContext}
        />
        <SectionCard
          title="Reproductive-health context"
          items={resolvedEntity.reproductiveHealthContext}
        />
        <SectionCard
          title="Legal / historical context"
          items={resolvedEntity.legalHistoricalContext}
        />
      </div>

      <div className="my-5 glow-divider" />

      <div className="grid gap-3">
        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-2">Confidence / uncertainty</p>
          <p className="body-sm">{resolvedEntity.uncertaintyNote}</p>
        </div>

        {resolvedEntity.sourceStats?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {resolvedEntity.sourceStats.map((stat) => (
              <div key={stat.label} className="surface-panel-soft p-4">
                <p className="eyebrow mb-2">{stat.label}</p>
                <p className="font-serif text-2xl tracking-[-0.04em] text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {detail?.releaseRecords?.length ? (
          <div className="surface-panel-soft p-4">
            <p className="eyebrow mb-3">Recent TRI release records</p>
            <div className="space-y-3">
              {detail.releaseRecords.map((record) => (
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
          </div>
        ) : null}

        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-3">Sources</p>
          <div className="space-y-3">
            {detail?.sources.map((source) => (
              <div
                key={source.id}
                className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white">{source.name}</p>
                    <p className="mt-1 body-sm">{source.methodologicalUse}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                      Updated {source.sourceUpdatedAt}
                    </p>
                    {source.caveats[0] ? <p className="mt-2 body-sm">{source.caveats[0]}</p> : null}
                  </div>
                  <SourceBadge type={source.sourceType} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel-soft p-4">
          <p className="eyebrow mb-3">Related case studies</p>
          <div className="space-y-3">
            {detail?.relatedCaseStudies.map((study) => (
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
        </div>
      </div>
    </motion.aside>
  );
}

function SectionCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="surface-panel-soft p-4">
      <p className="eyebrow mb-3">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[var(--foreground-muted)]"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
