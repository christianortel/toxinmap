"use client";

import nextDynamic from "next/dynamic";
import type { ExplorerCameraBand, ExplorerVisibleEntity } from "@/types/explorer";

export type GlobeRendererKind = "three" | "cesium";

type GlobeRendererBoundaryProps = {
  mode?: "main" | "debug";
  entities?: ExplorerVisibleEntity[];
  homeSignal?: number;
  renderer?: GlobeRendererKind;
  cameraBand?: ExplorerCameraBand;
};

const CesiumSafeGlobe = nextDynamic(
  () => import("@/components/explore/cesium-safe-globe").then((mod) => mod.CesiumSafeGlobe),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#05070a]" />,
  },
);

const ThreeSafeGlobe = nextDynamic(
  () => import("@/components/explore/three-safe-globe").then((mod) => mod.ThreeSafeGlobe),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#05070a]" />,
  },
);

export function GlobeRendererBoundary({
  mode = "main",
  entities = [],
  homeSignal = 0,
  renderer = mode === "debug" ? "cesium" : "three",
  cameraBand = "national",
}: GlobeRendererBoundaryProps) {
  switch (renderer) {
    case "three":
      return (
        <ThreeSafeGlobe
          mode={mode}
          entities={entities}
          homeSignal={homeSignal}
          cameraBand={cameraBand}
        />
      );
    case "cesium":
    default:
      return <CesiumSafeGlobe mode={mode} entities={entities} homeSignal={homeSignal} />;
  }
}
