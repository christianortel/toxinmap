import { buildDetailDrawerHeaderState } from "@/lib/map/detail-drawer-state";
import type {
  ExplorerCameraTarget,
  ExplorerEntity,
  ExplorerNearbyFocus,
  ExplorerNearbyResponse,
} from "@/types/explorer";

export type SelectionSurfaceContextKind =
  | "selected-entity"
  | "nearby-focus"
  | "search-query"
  | "camera-scope";

export type SelectionSurfaceContextChip = {
  id: string;
  label: string;
  value: string;
  emphasis: "strong" | "muted";
};

export type SelectionSurfaceContextActionId =
  | "clear-selection"
  | "return-nearby"
  | "clear-nearby"
  | "clear-search";

export type SelectionSurfaceContextAction = {
  id: SelectionSurfaceContextActionId;
  label: string;
};

export type SelectionSurfaceContext = {
  kind: SelectionSurfaceContextKind;
  title: string;
  value: string;
  chips: SelectionSurfaceContextChip[];
  actions: SelectionSurfaceContextAction[];
};

export type SelectionContextActionState = {
  selectedEntityId: string | null;
  nearbyFocus: ExplorerNearbyFocus | null;
  isDrawerOpen: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
  cameraTarget: ExplorerCameraTarget | null;
  isCameraAtHome: boolean;
};

export type NearbyFocusRadiusState = {
  nearbyFocus: ExplorerNearbyFocus;
  cameraTarget: ExplorerCameraTarget;
  isCameraAtHome: boolean;
};

type SelectionSurfaceContextParams = {
  selectedEntity: Pick<ExplorerEntity, "id" | "title" | "layerGroup" | "layerId"> | null;
  selectedEntityId: string | null;
  nearbyFocus: ExplorerNearbyFocus | null;
  nearbySummary: ExplorerNearbyResponse | null;
  searchQuery: string;
  cameraBandLabel: string;
};

function buildNearbyChips(
  nearbyFocus: ExplorerNearbyFocus,
  nearbySummary: ExplorerNearbyResponse | null,
): SelectionSurfaceContextChip[] {
  const chips: SelectionSurfaceContextChip[] = [
    {
      id: "radius",
      label: "Radius",
      value: `${nearbyFocus.radiusMiles} mi`,
      emphasis: "muted",
    },
  ];

  if (nearbySummary) {
    chips.push({
      id: "signals",
      label: "Signals",
      value: nearbySummary.total.toLocaleString(),
      emphasis: "strong",
    });
  }

  return chips;
}

export function buildSelectionSurfaceContext({
  selectedEntity,
  selectedEntityId,
  nearbyFocus,
  nearbySummary,
  searchQuery,
  cameraBandLabel,
}: SelectionSurfaceContextParams): SelectionSurfaceContext {
  const trimmedSearchQuery = searchQuery.trim();

  if (selectedEntityId) {
    const headerState = selectedEntity
      ? buildDetailDrawerHeaderState(selectedEntity, selectedEntityId)
      : null;
    const chips: SelectionSurfaceContextChip[] = [];

    if (headerState) {
      chips.push({
        id: "layer",
        label: "Layer",
        value: headerState.layerLabel,
        emphasis: "strong",
      });
      chips.push({
        id: "group",
        label: "Group",
        value: headerState.groupLabel,
        emphasis: "muted",
      });
    }

    if (nearbyFocus) {
      chips.push({
        id: "focus",
        label: "Focus",
        value: nearbyFocus.label,
        emphasis: "muted",
      });
      chips.push(...buildNearbyChips(nearbyFocus, nearbySummary));
    }

    if (
      trimmedSearchQuery &&
      trimmedSearchQuery.toLowerCase() !==
        (selectedEntity?.title ?? selectedEntityId).trim().toLowerCase()
    ) {
      chips.push({
        id: "query",
        label: "Search",
        value: trimmedSearchQuery,
        emphasis: "muted",
      });
    }

    return {
      kind: "selected-entity",
      title: headerState?.isSelectedOnMap ? "Selected record" : "Focused record",
      value: selectedEntity?.title || trimmedSearchQuery || selectedEntityId,
      chips,
      actions: [
        ...(nearbyFocus
          ? ([{ id: "return-nearby", label: "Nearby summary" }] satisfies SelectionSurfaceContextAction[])
          : []),
        { id: "clear-selection", label: "Clear selection" },
      ],
    };
  }

  if (nearbyFocus) {
    return {
      kind: "nearby-focus",
      title: "Nearby focus",
      value: nearbyFocus.label,
      chips: buildNearbyChips(nearbyFocus, nearbySummary),
      actions: [{ id: "clear-nearby", label: "Clear focus" }],
    };
  }

  if (trimmedSearchQuery) {
    return {
      kind: "search-query",
      title: "Search query",
      value: trimmedSearchQuery,
      chips: [
        {
          id: "scope",
          label: "Scope",
          value: cameraBandLabel,
          emphasis: "muted",
        },
      ],
      actions: [{ id: "clear-search", label: "Clear search" }],
    };
  }

  return {
    kind: "camera-scope",
    title: "Current scope",
    value: `${cameraBandLabel} view`,
    chips: [],
    actions: [],
  };
}

export function buildNearbyFocusCameraTarget(
  nearbyFocus: ExplorerNearbyFocus,
): ExplorerCameraTarget {
  const radiusMiles = Math.max(nearbyFocus.radiusMiles, 1);

  let height = 1_250_000;
  if (radiusMiles <= 25) {
    height = 850_000;
  } else if (radiusMiles <= 50) {
    height = 1_250_000;
  } else if (radiusMiles <= 100) {
    height = 1_900_000;
  } else {
    height = 2_600_000;
  }

  return {
    label: nearbyFocus.label,
    coordinates: nearbyFocus.coordinates,
    height,
  };
}

export function resolveNearbyFocusRadiusState(
  nearbyFocus: ExplorerNearbyFocus,
  radiusMiles: number,
): NearbyFocusRadiusState {
  const nextNearbyFocus = {
    ...nearbyFocus,
    radiusMiles,
  };

  return {
    nearbyFocus: nextNearbyFocus,
    cameraTarget: buildNearbyFocusCameraTarget(nextNearbyFocus),
    isCameraAtHome: false,
  };
}

function buildSelectionRecoveryState(
  state: SelectionContextActionState,
): SelectionContextActionState {
  if (!state.nearbyFocus) {
    return {
      ...state,
      selectedEntityId: null,
      isDrawerOpen: false,
      cameraTarget: null,
    };
  }

  return {
    ...state,
    selectedEntityId: null,
    isDrawerOpen: true,
    cameraTarget: buildNearbyFocusCameraTarget(state.nearbyFocus),
    isCameraAtHome: false,
  };
}

export function resolveDetailDrawerCloseState(
  state: SelectionContextActionState,
): SelectionContextActionState {
  return buildSelectionRecoveryState(state);
}

export function resolveSelectedNearbyRefocusState(
  state: SelectionContextActionState,
): SelectionContextActionState {
  if (!state.nearbyFocus) {
    return state;
  }

  return {
    ...state,
    isDrawerOpen: true,
    cameraTarget: buildNearbyFocusCameraTarget(state.nearbyFocus),
    isCameraAtHome: false,
  };
}

export function resolveSelectionContextActionState(
  actionId: SelectionSurfaceContextActionId,
  state: SelectionContextActionState,
): SelectionContextActionState {
  switch (actionId) {
    case "clear-selection":
    case "return-nearby":
      return buildSelectionRecoveryState(state);
    case "clear-nearby":
      return {
        ...state,
        nearbyFocus: null,
        isDrawerOpen: false,
        cameraTarget: null,
      };
    case "clear-search":
      return {
        ...state,
        searchQuery: "",
        isSearchOpen: false,
      };
    default:
      return state;
  }
}
