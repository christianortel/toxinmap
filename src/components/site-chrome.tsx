"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = pathname === "/" || pathname === "/explore";

  if (immersive) {
    return <main className="relative z-10">{children}</main>;
  }

  return (
    <>
      <SiteHeader />
      <main className="relative z-10">{children}</main>
      <SiteFooter />
    </>
  );
}
