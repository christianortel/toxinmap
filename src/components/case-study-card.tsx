import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";
import type { CaseStudyRecord } from "@/types/data";
import { EvidenceBadge } from "@/components/evidence-badge";

export function CaseStudyCard({ study }: { study: CaseStudyRecord }) {
  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="group surface-panel editorial-gradient flex h-full flex-col justify-between p-6 transition duration-500 hover:-translate-y-1 hover:border-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.9)]"
    >
      <div>
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="eyebrow">{study.dateRangeLabel}</p>
          <ArrowUpRight className="h-4 w-4 text-[var(--foreground-soft)] transition group-hover:text-white" />
        </div>
        <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">{study.title}</h3>
        <p className="mt-4 body-sm">{study.subtitle}</p>
      </div>

      <div className="mt-8 space-y-5">
        <div className="flex items-center gap-2 text-sm text-[var(--foreground-soft)]">
          <MapPinned className="h-4 w-4 text-[var(--accent-water)]" />
          {study.location}
        </div>
        <p className="body-sm text-[var(--foreground-soft)]">{study.whyItMatters}</p>
        <div className="flex flex-wrap gap-2">
          {study.evidenceMix.slice(0, 3).map((item) => (
            <EvidenceBadge key={item} evidence={item} />
          ))}
        </div>
      </div>
    </Link>
  );
}
