"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Compass } from "lucide-react";
import type { GlobeRendererSupportStatus } from "@/lib/map/browser-support";

type GlobeBrowserFallbackProps = {
  supportStatus: Extract<GlobeRendererSupportStatus, { kind: "fallback-required" }>;
};

function getFallbackCopy(reason: GlobeBrowserFallbackProps["supportStatus"]["reason"]) {
  switch (reason) {
    case "no-webgl":
      return "This browser session is not exposing a usable WebGL context, so the 3D globe is being withheld instead of crashing the tab.";
    case "software-renderer":
      return "This browser looks like it is running on a software renderer, which is not stable enough for the live 3D map.";
    default:
      return "The live 3D globe could not be started safely in this browser session.";
  }
}

export function GlobeBrowserFallback({ supportStatus }: GlobeBrowserFallbackProps) {
  const browserLabel = supportStatus.browserLabel;
  const body = getFallbackCopy(supportStatus.reason);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#05070a,#090c10)]">
      <div className="w-full max-w-2xl px-6">
        <div className="rounded-[32px] border border-white/10 bg-[rgba(8,10,12,0.8)] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6">
              <AlertTriangle className="h-5 w-5 text-[var(--accent-warning)]" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--foreground-soft)]">
                Unsupported globe runtime
              </p>
              <h2 className="mt-1 font-serif text-4xl tracking-[-0.05em] text-white">
                {browserLabel} cannot start the public 3D renderer.
              </h2>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">
            {body}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(135,160,176,0.24)] bg-[rgba(135,160,176,0.12)] px-4 py-2 text-sm text-white">
              WebGL path unavailable for public renderer
            </div>
            <Link
              href="/sources"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Sources
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Methodology
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/globe-support"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Browser diagnostics
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/globe-debug"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(165,108,72,0.28)] bg-[rgba(165,108,72,0.12)] px-4 py-2 text-sm text-white transition hover:bg-[rgba(165,108,72,0.18)]"
            >
              <Compass className="h-4 w-4" />
              Internal debug globe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
