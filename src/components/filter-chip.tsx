"use client";

import { cn } from "@/lib/utils";

type FilterChipProps = {
  active?: boolean;
  label: string;
  onClick?: () => void;
};

export function FilterChip({ active, label, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.85)]",
        active
          ? "border-[rgba(132,160,121,0.3)] bg-[rgba(112,132,105,0.18)] text-white"
          : "border-white/10 bg-white/4 text-[var(--foreground-soft)] hover:border-white/16 hover:bg-white/7 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}
