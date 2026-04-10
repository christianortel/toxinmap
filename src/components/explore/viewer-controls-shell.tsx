"use client";

import { Crosshair, Home, RotateCcw } from "lucide-react";
import { useExplorerStore } from "@/store/explorer-store";

type ViewerControlsShellProps = {
  onHome: () => void;
};

export function ViewerControlsShell({ onHome }: ViewerControlsShellProps) {
  const resetExplorerFilters = useExplorerStore((state) => state.resetExplorerFilters);
  const isCameraAtHome = useExplorerStore((state) => state.isCameraAtHome);

  return (
    <div className="hud-panel flex flex-col gap-2 p-2">
      <button
        type="button"
        onClick={onHome}
        className={`rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
          isCameraAtHome
            ? "border-white/16 bg-white/10 text-white"
            : "border-white/10 bg-white/4 text-[var(--foreground-soft)] hover:text-white"
        }`}
      >
        <span className="flex items-center gap-3 text-sm">
          <Home className="h-4 w-4" />
          Home view
        </span>
      </button>
      <button
        type="button"
        onClick={() => resetExplorerFilters()}
        className="rounded-2xl border border-white/10 bg-white/4 px-3 py-3 text-left text-[var(--foreground-soft)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <span className="flex items-center gap-3 text-sm">
          <RotateCcw className="h-4 w-4" />
          Reset filters
        </span>
      </button>
      <div className="rounded-2xl border border-white/10 bg-white/4 px-3 py-3 text-sm text-[var(--foreground-soft)]">
        <div className="flex items-center gap-3">
          <Crosshair className="h-4 w-4" />
          U.S. globe controls
        </div>
      </div>
    </div>
  );
}
