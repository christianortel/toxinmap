import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MapPinned } from "lucide-react";
import { EvidenceBadge } from "@/components/evidence-badge";
import { SectionIntro } from "@/components/section-intro";
import { SourceBadge } from "@/components/source-badge";
import { UncertaintyBadge } from "@/components/uncertainty-badge";
import {
  getCaseStudies,
  getCaseStudyBySlug,
  getEntities,
  getSourcesByIds,
} from "@/lib/data/repository";

type CaseStudyPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return (await getCaseStudies()).map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = await getCaseStudyBySlug(slug);

  if (!study) {
    return {};
  }

  return {
    title: study.title,
    description: study.subtitle,
  };
}

export default async function CaseStudyDetailPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const study = await getCaseStudyBySlug(slug);

  if (!study) {
    notFound();
  }

  const [sources, relatedEntities] = await Promise.all([
    getSourcesByIds(study.sourceIds),
    getEntities({ relatedCaseStudyId: study.slug }),
  ]);

  return (
    <article className="page-shell py-10 md:py-14">
      <div className="surface-panel editorial-gradient px-6 py-8 md:px-10 md:py-12">
        <p className="eyebrow mb-5">{study.hero.eyebrow}</p>
        <h1 className="display-title max-w-4xl text-white">{study.title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--foreground-muted)]">
          {study.subtitle}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-2 text-sm text-[var(--foreground-soft)]">
            <MapPinned className="h-4 w-4 text-[var(--accent-water)]" />
            {study.location} | {study.dateRangeLabel}
          </div>
          {study.evidenceMix.map((item) => (
            <EvidenceBadge key={item} evidence={item} />
          ))}
          <UncertaintyBadge level={study.confidenceLevel} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="surface-panel-soft p-5">
            <p className="eyebrow mb-3">Why this matters</p>
            <p className="body-md">{study.whyItMatters}</p>
          </div>
          <div className="surface-panel-soft p-5">
            <p className="eyebrow mb-3">Hero treatment</p>
            <p className="body-sm">{study.hero.imageHint}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
              Editorial visual placeholder
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <SectionIntro
            eyebrow="Case frame"
            title={study.summary}
            body="Each case file separates source-aware context, editorial synthesis, and uncertainty notes so the reader can follow sequence without collapsing different evidence classes."
            align="left"
          />

          <div className="surface-panel p-6">
            <p className="eyebrow mb-3">Methodology note</p>
            <p className="body-md">{study.methodologyNote}</p>
          </div>

          <div className="space-y-5">
            {study.narrative.map((paragraph) => (
              <div key={paragraph} className="surface-panel p-6">
                <p className="body-md">{paragraph}</p>
              </div>
            ))}
          </div>

          <div className="surface-panel p-6">
            <p className="eyebrow mb-4">Key findings</p>
            <div className="grid gap-3">
              {study.keyFindings.map((finding) => (
                <div
                  key={finding}
                  className="rounded-[22px] border border-white/10 bg-white/4 px-4 py-4"
                >
                  <p className="body-sm">{finding}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="surface-panel p-6">
            <p className="eyebrow mb-3">Case metadata</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="surface-panel-soft p-4">
                <p className="meta-kicker">Category</p>
                <p className="mt-2 text-sm text-white">{study.category}</p>
              </div>
              <div className="surface-panel-soft p-4">
                <p className="meta-kicker">Region</p>
                <p className="mt-2 text-sm text-white">{study.region}</p>
              </div>
            </div>
          </div>

          <div className="surface-panel p-6">
            <p className="eyebrow mb-3">Key signals</p>
            <div className="space-y-3">
              {study.keySignals.map((signal) => (
                <div key={signal} className="surface-panel-soft p-4">
                  <p className="body-sm">{signal}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel p-6">
            <p className="eyebrow mb-3">Source references</p>
            <div className="space-y-3">
              {sources.map((source) => (
                <a
                  key={source.id}
                  href={source.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[22px] border border-white/10 bg-white/4 px-4 py-4 transition hover:bg-white/6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">{source.shortName}</p>
                      <p className="mt-2 body-sm">{source.methodologicalUse}</p>
                    </div>
                    <SourceBadge type={source.sourceType} />
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="surface-panel p-6">
            <p className="eyebrow mb-3">Related atlas entities</p>
            <div className="space-y-3">
              {relatedEntities.map((entity) => (
                <Link
                  key={entity.id}
                  href={`/explore?entity=${entity.id}`}
                  className="flex items-start justify-between rounded-[22px] border border-white/10 bg-white/4 px-4 py-4 transition hover:bg-white/6"
                >
                  <div>
                    <p className="text-sm text-white">{entity.title}</p>
                    <p className="mt-2 body-sm">{entity.locationLabel}</p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--foreground-soft)]" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </article>
  );
}
