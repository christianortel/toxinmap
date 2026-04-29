import type {
  ExplorerCameraTarget,
  ExplorerFilterChip,
  ExplorerNearbyFocus,
  ExplorerLayerGroup,
  ExplorerLayerId,
} from "@/types/explorer";

type ExplorerUrlState = {
  activeGroups: ExplorerLayerGroup[];
  activeLayerIds: ExplorerLayerId[];
  activeYear: number;
  activeFilterChips: ExplorerFilterChip[];
  searchQuery: string;
  nearbyFocus: ExplorerNearbyFocus | null;
};

type ExplorerUrlDefaults = ExplorerUrlState & {
  availableGroups: ExplorerLayerGroup[];
  availableLayerIds: ExplorerLayerId[];
  availableFilterChips: ExplorerFilterChip[];
  minYear?: number;
  maxYear?: number;
};

export type ParsedExplorerUrlState = ExplorerUrlState & {
  selectedEntityId: string | null;
  cameraTarget: ExplorerCameraTarget | null;
};

function splitValues(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function parseExplorerUrlState(
  searchParams: URLSearchParams,
  defaults: ExplorerUrlDefaults,
): ParsedExplorerUrlState {
  const requestedGroups = splitValues(searchParams.get("groups")).filter((value) =>
    defaults.availableGroups.includes(value as ExplorerLayerGroup),
  ) as ExplorerLayerGroup[];

  const requestedLayers = splitValues(searchParams.get("layers")).filter((value) =>
    defaults.availableLayerIds.includes(value as ExplorerLayerId),
  ) as ExplorerLayerId[];

  const requestedChips = splitValues(searchParams.get("chips")).filter((value) =>
    defaults.availableFilterChips.includes(value as ExplorerFilterChip),
  ) as ExplorerFilterChip[];

  const requestedYearParam = searchParams.get("year")?.trim();
  const requestedYear = requestedYearParam ? Number(requestedYearParam) : Number.NaN;
  const requestedEntityId = searchParams.get("entity")?.trim() ?? null;
  const requestedSearchQuery = searchParams.get("q")?.trim() ?? "";
  const requestedLat = Number(searchParams.get("lat"));
  const requestedLng = Number(searchParams.get("lng"));
  const requestedRadius = Number(searchParams.get("radius"));
  const requestedPlace = searchParams.get("place")?.trim();

  const hasNearbyFocus =
    Number.isFinite(requestedLat) &&
    Number.isFinite(requestedLng) &&
    requestedPlace;

  const resolvedYear = Number.isFinite(requestedYear)
    ? Math.min(
        defaults.maxYear ?? requestedYear,
        Math.max(defaults.minYear ?? requestedYear, requestedYear),
      )
    : defaults.activeYear;

  return {
    activeGroups: requestedGroups.length ? uniqueValues(requestedGroups) : defaults.activeGroups,
    activeLayerIds: requestedLayers.length ? uniqueValues(requestedLayers) : defaults.activeLayerIds,
    activeFilterChips: requestedChips.length
      ? uniqueValues(requestedChips)
      : defaults.activeFilterChips,
    activeYear: resolvedYear,
    searchQuery: requestedSearchQuery || defaults.searchQuery,
    selectedEntityId: requestedEntityId || null,
    nearbyFocus: hasNearbyFocus
      ? {
          label: requestedPlace,
          coordinates: [requestedLng, requestedLat],
          radiusMiles: Number.isFinite(requestedRadius) ? requestedRadius : 50,
        }
      : defaults.nearbyFocus,
    cameraTarget: hasNearbyFocus
      ? {
          label: requestedPlace,
          coordinates: [requestedLng, requestedLat],
          height: 1_600_000,
        }
      : null,
  };
}

export function buildExplorerUrlState(params: ParsedExplorerUrlState) {
  const searchParams = new URLSearchParams();

  if (params.selectedEntityId) {
    searchParams.set("entity", params.selectedEntityId);
  }

  if (params.activeGroups.length) {
    searchParams.set("groups", uniqueValues(params.activeGroups).join(","));
  }

  if (params.activeLayerIds.length) {
    searchParams.set("layers", uniqueValues(params.activeLayerIds).join(","));
  }

  if (params.activeFilterChips.length) {
    searchParams.set("chips", uniqueValues(params.activeFilterChips).join(","));
  }

  if (params.searchQuery.trim()) {
    searchParams.set("q", params.searchQuery.trim());
  }

  if (params.nearbyFocus) {
    searchParams.set("place", params.nearbyFocus.label);
    searchParams.set("lng", params.nearbyFocus.coordinates[0].toFixed(5));
    searchParams.set("lat", params.nearbyFocus.coordinates[1].toFixed(5));
    searchParams.set("radius", String(params.nearbyFocus.radiusMiles));
  }

  searchParams.set("year", String(params.activeYear));

  return searchParams;
}
