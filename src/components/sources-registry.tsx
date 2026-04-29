"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getCompletenessLabels,
  geographicLevelLabels,
  updateCadenceLabels,
} from "@/lib/data/evidence";
import {
  sourceImplementationRoleDescriptions,
  sourceImplementationRoleLabels,
  getSourceLayerGroupSummary,
  getSourcesGroupedByTier,
  sourceTypeDescriptions,
} from "@/lib/data/source-registry";
import { fetchJson } from "@/lib/api";
import { ErrorState } from "@/components/error-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { SourceBadge } from "@/components/source-badge";
import { Badge } from "@/components/ui/badge";
import type { SourceRegistryEntry } from "@/types/sources";

export function SourcesRegistry() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: () => fetchJson<SourceRegistryEntry[]>("/api/sources"),
  });

  const groupedSources = useMemo(() => getSourcesGroupedByTier(data ?? []), [data]);

  if (isLoading) {
    return <LoadingSkeleton lines={8} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Source registry unavailable"
        body="The source registry API failed during the mock fetch step."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groupedSources.map((group) => (
        <section key={group.tier} className="surface-panel overflow-hidden">
          <div className="border-b border-white/10 px-6 py-5 md:px-8">
            <p className="eyebrow mb-3">{group.tier}</p>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div>
                <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">
                  {group.title}
                </h3>
                <p className="mt-3 max-w-3xl body-sm">{group.description}</p>
              </div>
              <div className="surface-panel-soft p-4">
                <p className="eyebrow mb-2">Tier framing</p>
                <p className="body-sm">
                  Sources in this section share the same implementation horizon and are designed to
                  be replaceable without changing the surrounding UI contract.
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/8">
            {group.entries.map((record) => (
              <article
                key={record.id}
                className="grid gap-5 px-6 py-6 md:px-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,1.1fr)]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={record.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-lg text-white transition hover:text-[var(--accent-water)]"
                    >
                      {record.name}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <SourceBadge type={record.sourceType} />
                  </div>
                  <p className="mt-3 body-sm">{record.description}</p>
                  <p className="mt-3 text-sm text-[var(--foreground-soft)]">
                    {sourceTypeDescriptions[record.sourceType]}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {getCompletenessLabels(record.completenessTags).map((label) => (
                      <Badge key={label}>{label}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="surface-panel-soft p-4">
                    <p className="eyebrow mb-2">Coverage</p>
                    <p className="text-sm text-white">{record.geographicScope}</p>
                    <p className="mt-2 body-sm">
                      {geographicLevelLabels[record.geographicLevel]} resolution,{" "}
                      {record.spatialResolution.toLowerCase()}.
                    </p>
                  </div>
                  <div className="surface-panel-soft p-4">
                    <p className="eyebrow mb-2">Cadence</p>
                    <p className="text-sm text-white">
                      {updateCadenceLabels[record.updateCadence]}
                    </p>
                    <p className="mt-2 body-sm">
                      Supports {getSourceLayerGroupSummary(record)} layers.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="surface-panel-soft p-4">
                    <p className="eyebrow mb-2">Methodological use</p>
                    <p className="body-sm">{record.methodologicalUse}</p>
                  </div>
                  {record.implementationRole ? (
                    <div className="surface-panel-soft p-4">
                      <p className="eyebrow mb-2">How toxinmap uses it</p>
                      <p className="text-sm text-white">
                        {sourceImplementationRoleLabels[record.implementationRole]}
                      </p>
                      <p className="mt-2 body-sm">
                        {sourceImplementationRoleDescriptions[record.implementationRole]}
                      </p>
                      {record.mimicContributions?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {record.mimicContributions.map((item) => (
                            <Badge key={item}>{item}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {record.originSite || record.upstreamDatasets?.length || record.downloadability ? (
                    <div className="surface-panel-soft p-4">
                      <p className="eyebrow mb-2">Acquisition path</p>
                      <div className="space-y-2">
                        {record.originSite ? (
                          <p className="body-sm">
                            Origin site: <span className="text-white">{record.originSite}</span>
                          </p>
                        ) : null}
                        {record.upstreamDatasets?.length ? (
                          <p className="body-sm">
                            Upstream datasets:{" "}
                            <span className="text-white">{record.upstreamDatasets.join(", ")}</span>
                          </p>
                        ) : null}
                        {record.downloadability ? (
                          <p className="body-sm">
                            Downloadability: <span className="text-white">{record.downloadability}</span>
                          </p>
                        ) : null}
                        {record.ingestionMethod ? (
                          <p className="body-sm">
                            Ingestion method: <span className="text-white">{record.ingestionMethod}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="surface-panel-soft p-4">
                    <p className="eyebrow mb-2">Caveats</p>
                    <div className="space-y-2">
                      {record.caveats.map((caveat) => (
                        <p key={caveat} className="body-sm">
                          {caveat}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="surface-panel-soft p-4">
                    <p className="eyebrow mb-2">Confidence note</p>
                    <p className="body-sm">{record.confidenceNote}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                      Source updated {record.sourceUpdatedAt}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {!groupedSources.length ? (
        <ErrorState
          title="No source records available"
          body="The source registry returned an empty response."
        />
      ) : null}
    </div>
  );
}
