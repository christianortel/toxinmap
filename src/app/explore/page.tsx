import { Suspense } from "react";
import { GlobeShell } from "@/components/explore/globe-shell";

export default function ExplorePage() {
  return (
    <div className="px-2 py-2 md:px-3 md:py-3">
      <Suspense fallback={<div className="surface-panel min-h-[calc(100vh-1rem)] animate-pulse" />}>
        <GlobeShell />
      </Suspense>
    </div>
  );
}
