import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/8 py-12">
      <div className="page-shell flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow mb-4">DOWNSTREAM</p>
          <p className="font-serif text-2xl tracking-[-0.05em] text-white">
            The body downstream of industry.
          </p>
          <p className="mt-4 body-sm max-w-lg">
            A globe-first investigative concept build that separates direct measurement,
            screening signals, literature, and editorial reporting so overlap can be explored
            without overstating causation.
          </p>
        </div>
        <div className="grid gap-4 md:text-right">
          <div className="flex flex-wrap gap-5 text-sm text-[var(--foreground-soft)] md:justify-end">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.9)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
            Evidence classes remain explicit. Overlap does not equal causation.
          </p>
        </div>
      </div>
    </footer>
  );
}
