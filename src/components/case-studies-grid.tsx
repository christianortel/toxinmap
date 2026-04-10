"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { CaseStudyCard } from "@/components/case-study-card";
import { ErrorState } from "@/components/error-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import type { CaseStudyRecord } from "@/types/data";

export function CaseStudiesGrid() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["case-studies"],
    queryFn: () => fetchJson<CaseStudyRecord[]>("/api/case-studies"),
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <LoadingSkeleton lines={5} />
        <LoadingSkeleton lines={5} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Case study registry unavailable"
        body="The mock case-study feed could not be loaded. The API route is present, but the current request failed."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {data?.map((study) => <CaseStudyCard key={study.slug} study={study} />)}
    </div>
  );
}
