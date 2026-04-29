export {};

import { resolveDenseClickSelection } from "../../src/lib/map/click-selection";
import type { ExplorerVisibleEntity } from "../../src/types/explorer";

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const capeFearCenter: [number, number] = [-78.88, 34.98];
  const params = new URLSearchParams({
    year: "2024",
    cameraBand: "local",
    centerLng: capeFearCenter[0].toString(),
    centerLat: capeFearCenter[1].toString(),
    groups: "official,emerging,legal",
  });

  const localView = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    `/api/map-entities?${params.toString()}`,
  );

  const industrialComplex = localView.find((entity) => entity.id === "cape-fear-industrial-complex");
  const pfasOutfall = localView.find((entity) => entity.id === "pfas-fayetteville-outfall");
  const southCary = localView.find((entity) => entity.title === "SOUTH CARY WRF");
  const briarwood = localView.find((entity) => entity.title === "BRIARWOOD FARMS WWTP");

  if (!industrialComplex || !pfasOutfall || !southCary || !briarwood) {
    throw new Error(
      "Expected Cape Fear local view to include the industrial complex, PFAS outfall, South Cary WRF, and Briarwood Farms WWTP test records.",
    );
  }

  const resolvedIndustrialClick = resolveDenseClickSelection({
    clickedEntity: industrialComplex,
    visibleEntities: localView,
    cameraBand: "local",
  });

  if (resolvedIndustrialClick.id !== pfasOutfall.id) {
    throw new Error(
      `Expected dense local click resolution to upgrade ${industrialComplex.id} to ${pfasOutfall.id}, received ${resolvedIndustrialClick.id}.`,
    );
  }

  const resolvedSouthCaryClick = resolveDenseClickSelection({
    clickedEntity: southCary,
    visibleEntities: localView,
    cameraBand: "local",
  });
  if (resolvedSouthCaryClick.id !== southCary.id) {
    throw new Error(
      `Expected dense local click resolution to preserve the explicitly clicked ${southCary.id}, received ${resolvedSouthCaryClick.id}.`,
    );
  }

  const resolvedBriarwoodClick = resolveDenseClickSelection({
    clickedEntity: briarwood,
    visibleEntities: localView,
    cameraBand: "local",
  });
  if (resolvedBriarwoodClick.id !== briarwood.id) {
    throw new Error(
      `Expected dense local click resolution to preserve the explicitly clicked ${briarwood.id}, received ${resolvedBriarwoodClick.id}.`,
    );
  }

  console.log("PASS dense click selection validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        center: capeFearCenter,
        industrialClick: {
          clicked: industrialComplex.id,
          resolved: resolvedIndustrialClick.id,
        },
        southCaryClick: {
          clicked: southCary.id,
          resolved: resolvedSouthCaryClick.id,
        },
        briarwoodClick: {
          clicked: briarwood.id,
          resolved: resolvedBriarwoodClick.id,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL dense click selection validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
