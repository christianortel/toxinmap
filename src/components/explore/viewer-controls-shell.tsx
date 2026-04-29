"use client";

import { Home, RotateCcw } from "lucide-react";
import { useExplorerStore } from "@/store/explorer-store";

type ViewerControlsShellProps = {
  onHome: () => void;
};

export function ViewerControlsShell({ onHome }: ViewerControlsShellProps) {
  const resetExplorerFilters = useExplorerStore((state) => state.resetExplorerFilters);
  const isCameraAtHome = useExplorerStore((state) => state.isCameraAtHome);

  return (
    <div className="hud-panel-slim flex flex-col gap-2 border-[rgba(106,138,158,0.14)] bg-[rgba(10,14,20,0.54)] p-2">
      <button
        type="button"
        onClick={onHome}
        className={`rounded-[16px] border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
          isCameraAtHome
            ? "border-white/14 bg-white/8 text-white"
            : "border-white/8 bg-white/4 text-[var(--foreground-soft)] hover:text-white"
        }`}
        aria-label="Return to home view"
      >
        <span className="flex items-center justify-center gap-3 text-sm">
          <Home className="h-4 w-4" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => resetExplorerFilters()}
        className="rounded-[16px] border border-white/8 bg-white/4 px-3 py-3 text-[var(--foreground-soft)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        aria-label="Reset filters"
      >
        <span className="flex items-center justify-center gap-3 text-sm">
          <RotateCcw className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
