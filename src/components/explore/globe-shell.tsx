"use client";

import { useEffect, useState } from "react";
import { GlobeBrowserFallback } from "@/components/explore/globe-browser-fallback";
import { GlobeShellSupported } from "@/components/explore/globe-shell-supported";
import {
  evaluateGlobeRendererSupport,
  type GlobeRendererSupportStatus,
} from "@/lib/map/browser-support";

export function GlobeShell() {
  const [supportStatus, setSupportStatus] = useState<GlobeRendererSupportStatus | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSupportStatus(evaluateGlobeRendererSupport());
    });
  }, []);

  const shouldRenderPublicGlobe =
    supportStatus &&
    (supportStatus.kind !== "fallback-required" ||
      supportStatus.reason === "software-renderer");
  const fallbackStatus =
    supportStatus?.kind === "fallback-required" && supportStatus.reason !== "software-renderer"
      ? supportStatus
      : null;

  return (
    <section className="relative h-[100svh] overflow-hidden bg-[#05070a]">
      {shouldRenderPublicGlobe ? (
        <GlobeShellSupported />
      ) : fallbackStatus ? (
        <GlobeBrowserFallback supportStatus={fallbackStatus} />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/6" />
      )}
    </section>
  );
}
