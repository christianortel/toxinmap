"use client";

import { motion } from "framer-motion";
import {
  formatChemicalHighlights,
  getChemicalMarkerLabel,
  getSignalFamilyLabel,
} from "@/lib/data/chemistry";
import type { ExplorerVisibleEntity } from "@/types/explorer";

type HoverCardShellProps = {
  entity: ExplorerVisibleEntity | null;
  x: number;
  y: number;
};

export function HoverCardShell({ entity, x, y }: HoverCardShellProps) {
  if (!entity) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="pointer-events-none absolute z-30 hidden w-[280px] rounded-[22px] border border-white/10 bg-[rgba(8,10,13,0.92)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] lg:block"
      style={{ left: Math.min(x + 18, 980), top: Math.max(y - 28, 24) }}
    >
      <p className="eyebrow mb-2">{entity.category}</p>
      <p className="text-base text-white">{entity.title}</p>
      <p className="mt-2 body-sm">{entity.summary}</p>
      {entity.signalFamilies.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {entity.signalFamilies.slice(0, 3).map((family) => (
            <span
              key={family}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]"
            >
              {getSignalFamilyLabel(family, { compact: true })}
            </span>
          ))}
        </div>
      ) : null}
      {entity.chemicalMarkers.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {entity.chemicalMarkers.slice(0, 2).map((marker) => (
            <span
              key={marker}
              className="rounded-full border border-[rgba(135,160,176,0.18)] bg-[rgba(135,160,176,0.1)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white"
            >
              {getChemicalMarkerLabel(marker)}
            </span>
          ))}
        </div>
      ) : null}
      {entity.chemicalHighlights.length ? (
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
          {formatChemicalHighlights(entity.chemicalHighlights)}
        </p>
      ) : null}
      {entity.aggregateCount ? (
        <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
          {entity.aggregateCount} grouped signals
        </p>
      ) : null}
    </motion.div>
  );
}
