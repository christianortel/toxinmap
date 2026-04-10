"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-[rgba(6,8,10,0.62)] backdrop-blur-2xl">
      <div className="page-shell flex h-[72px] items-center justify-between gap-6">
        <Link
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.9)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/7 transition group-hover:border-white/20 group-hover:bg-white/10">
            <Compass className="h-4 w-4 text-[var(--accent-water)]" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-white">{siteConfig.name}</p>
            <p className="text-xs text-[var(--foreground-soft)]">{siteConfig.tagline}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-2 lg:flex">
          {siteConfig.navigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.9)]",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--foreground-muted)] hover:bg-white/8 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden rounded-full border border-[rgba(167,116,78,0.32)] bg-[rgba(167,116,78,0.14)] px-5 py-2.5 text-sm text-[var(--foreground)] transition hover:bg-[rgba(167,116,78,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.9)] md:inline-flex"
          >
            Open map
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen((value) => !value)}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-site-nav"
            aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-[var(--foreground-muted)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.9)] lg:hidden"
          >
            {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileOpen ? (
          <motion.div
            id="mobile-site-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="border-t border-white/6 lg:hidden"
          >
            <div className="page-shell py-4">
              <div className="surface-panel p-3">
                <div className="grid gap-2">
                  {siteConfig.navigation.map((item) => {
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "rounded-[18px] px-4 py-3 text-sm transition",
                          active
                            ? "bg-white/10 text-white"
                            : "text-[var(--foreground-muted)] hover:bg-white/6 hover:text-white",
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
