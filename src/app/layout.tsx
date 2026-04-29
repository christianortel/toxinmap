import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/site-chrome";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="hero-grid absolute inset-x-0 top-0 h-[640px]" />
              <div className="absolute left-[12%] top-28 h-80 w-80 rounded-full bg-[rgba(135,160,176,0.12)] blur-[140px]" />
              <div className="absolute right-[8%] top-14 h-72 w-72 rounded-full bg-[rgba(165,108,72,0.12)] blur-[150px]" />
            </div>
            <SiteChrome>{children}</SiteChrome>
          </div>
        </Providers>
      </body>
    </html>
  );
}
