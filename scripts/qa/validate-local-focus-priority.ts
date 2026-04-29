export {};

import { getEntitySelectionPriority } from "../../src/lib/map/entity-priority";
import type { ExplorerVisibleEntity } from "../../src/types/explorer";

const localComparablePriorityDelta = 36;
const localDistanceMaterialityMiles = 12;

function getDistanceMiles(origin: [number, number], destination: [number, number]) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const [originLng, originLat] = origin;
  const [destinationLng, destinationLat] = destination;
  const latitudeDelta = toRadians(destinationLat - originLat);
  const longitudeDelta = toRadians(destinationLng - originLng);
  const startLatitude = toRadians(originLat);
  const endLatitude = toRadians(destinationLat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMiles * angularDistance;
}

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
    centerLng: String(capeFearCenter[0]),
    centerLat: String(capeFearCenter[1]),
    groups: "official,emerging,legal",
  });

  const localView = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    `/api/map-entities?${params.toString()}`,
  );

  const topTwelve = localView.slice(0, 12);
  const topFive = localView.slice(0, 5);
  const topTwelveRegions = topTwelve.filter((entity) => entity.geometryType === "region");
  const topFivePoints = topFive.filter((entity) => entity.geometryType === "point");
  const topConcreteLayers = new Set(
    topFivePoints
      .filter((entity) =>
        ["pfas-sites", "wastewater-sites", "hazardous-sites", "industrial-sites", "legal-markers"].includes(
          entity.layerId,
        ),
      )
      .map((entity) => entity.layerId),
  );

  if (topFivePoints.length < 4) {
    throw new Error("Expected local top results to be dominated by concrete point records.");
  }

  if (topTwelveRegions.length > 3) {
    throw new Error(`Expected local top 12 to keep regional overlays constrained, found ${topTwelveRegions.length}.`);
  }

  if (!topConcreteLayers.has("pfas-sites")) {
    throw new Error("Expected local top results to keep PFAS records near the top of the stack.");
  }

  if (!topConcreteLayers.has("wastewater-sites")) {
    throw new Error("Expected local top results to keep wastewater records near the top of the stack.");
  }

  const rankedWastewater = localView
    .filter(
      (entity) =>
        entity.geometryType === "point" &&
        entity.layerId === "wastewater-sites" &&
        entity.sourceIds.includes("epa-npdes"),
    )
    .map((entity, index) => ({
      ...entity,
      index,
      milesFromCenter: getDistanceMiles(capeFearCenter, entity.coordinates),
      selectionPriority: getEntitySelectionPriority(entity),
    }));

  let comparableDistanceViolation:
    | {
        earlier: {
          id: string;
          title: string;
          index: number;
          milesFromCenter: number;
          selectionPriority: number;
        };
        later: {
          id: string;
          title: string;
          index: number;
          milesFromCenter: number;
          selectionPriority: number;
        };
      }
    | null = null;

  for (let earlierIndex = 0; earlierIndex < rankedWastewater.length; earlierIndex += 1) {
    const earlier = rankedWastewater[earlierIndex];
    for (let laterIndex = earlierIndex + 1; laterIndex < rankedWastewater.length; laterIndex += 1) {
      const later = rankedWastewater[laterIndex];
      const priorityDelta = Math.abs(earlier.selectionPriority - later.selectionPriority);
      const laterIsMateriallyCloser =
        earlier.milesFromCenter - later.milesFromCenter > localDistanceMaterialityMiles;

      if (priorityDelta <= localComparablePriorityDelta && laterIsMateriallyCloser) {
        comparableDistanceViolation = {
          earlier: {
            id: earlier.id,
            title: earlier.title,
            index: earlier.index,
            milesFromCenter: Number(earlier.milesFromCenter.toFixed(1)),
            selectionPriority: earlier.selectionPriority,
          },
          later: {
            id: later.id,
            title: later.title,
            index: later.index,
            milesFromCenter: Number(later.milesFromCenter.toFixed(1)),
            selectionPriority: later.selectionPriority,
          },
        };
        break;
      }
    }

    if (comparableDistanceViolation) {
      break;
    }
  }

  if (comparableDistanceViolation) {
    throw new Error(
      `Expected materially closer comparable wastewater facilities to outrank farther ones, but ${comparableDistanceViolation.earlier.id} (${comparableDistanceViolation.earlier.milesFromCenter} mi) ranked ahead of ${comparableDistanceViolation.later.id} (${comparableDistanceViolation.later.milesFromCenter} mi).`,
    );
  }

  console.log("PASS local focus priority validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        center: capeFearCenter,
        topFive: topFive.map((entity) => ({
          id: entity.id,
          title: entity.title,
          layerId: entity.layerId,
          geometryType: entity.geometryType,
        })),
        topTwelveRegionCount: topTwelveRegions.length,
        topWastewater: rankedWastewater.slice(0, 5).map((entity) => ({
          id: entity.id,
          title: entity.title,
          milesFromCenter: Number(entity.milesFromCenter.toFixed(1)),
          selectionPriority: entity.selectionPriority,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL local focus priority validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
