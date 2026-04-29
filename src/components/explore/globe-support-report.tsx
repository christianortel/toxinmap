"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor, ShieldAlert } from "lucide-react";
import {
  evaluateGlobeRendererSupport,
  type GlobeRendererSupportStatus,
} from "@/lib/map/browser-support";

type SupportSnapshot = GlobeRendererSupportStatus & { userAgent: string };

function buildSnapshot(): SupportSnapshot {
  return {
    ...evaluateGlobeRendererSupport(),
    userAgent: navigator.userAgent ?? "",
  };
}

export function GlobeSupportReport() {
  const [snapshot] = useState<SupportSnapshot | null>(() =>
    typeof window === "undefined" ? null : buildSnapshot(),
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#05070a,#090c10)] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--foreground-soft)]">
              Globe support diagnostics
            </p>
            <h1 className="mt-2 font-serif text-5xl tracking-[-0.05em]">Local browser capability report</h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Link>
        </div>

        <div className="mt-8 rounded-[32px] border border-white/10 bg-[rgba(8,10,12,0.8)] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {snapshot ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {snapshot.kind !== "fallback-required" ? (
                  <Monitor className="h-6 w-6 text-[var(--accent-water)]" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-[var(--accent-warning)]" />
                )}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--foreground-soft)]">
                    Public renderer verdict
                  </p>
                  <h2 className="mt-1 font-serif text-3xl tracking-[-0.05em]">
                    {snapshot.kind === "fallback-required"
                      ? `Blocked: ${snapshot.reason}`
                      : snapshot.kind === "cesium-supported"
                        ? "Three.js + Cesium supported"
                        : "Three.js supported / Cesium degraded"}
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DiagnosticCard label="Browser" value={snapshot.browserLabel} />
                <DiagnosticCard label="Renderer" value={snapshot.renderer ?? "Unavailable"} />
                <DiagnosticCard label="WebGL" value={snapshot.webglLoose ? "Available" : "Unavailable"} />
                <DiagnosticCard
                  label="WebGL strict"
                  value={snapshot.webglStrict ? "Passed" : "Failed"}
                />
                <DiagnosticCard
                  label="WebGL2"
                  value={snapshot.webgl2Loose ? "Available" : "Unavailable"}
                />
                <DiagnosticCard
                  label="WebGL2 strict"
                  value={snapshot.webgl2Strict ? "Passed" : "Failed"}
                />
                <DiagnosticCard
                  label="Public renderer"
                  value={snapshot.kind === "fallback-required" ? "Fallback required" : "Three.js globe"}
                />
                <DiagnosticCard
                  label="Cesium diagnostics"
                  value={
                    snapshot.kind === "cesium-supported"
                      ? "Cesium-supported"
                      : snapshot.cesiumReason ?? "Unavailable"
                  }
                />
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-soft)]">
                  User agent
                </p>
                <p className="mt-3 break-all text-sm leading-7 text-[var(--foreground-muted)]">
                  {snapshot.userAgent}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--foreground-muted)]">Collecting browser diagnostics...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DiagnosticCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-soft)]">{label}</p>
      <p className="mt-3 text-lg text-white">{value}</p>
    </div>
  );
}
