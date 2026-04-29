import { Suspense } from "react";
import { GlobeShell } from "@/components/explore/globe-shell";

export default function HomePage() {
  return (
    <div>
      <Suspense fallback={<div className="min-h-screen animate-pulse bg-[#05070a]" />}>
        <GlobeShell />
      </Suspense>
    </div>
  );
}
