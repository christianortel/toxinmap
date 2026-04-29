import { resolveDenseClickSelection } from "@/lib/map/click-selection";
import type {
  ExplorerCameraBand,
  ExplorerCameraTarget,
  ExplorerNearbyFocus,
  ExplorerVisibleEntity,
} from "@/types/explorer";

export type ExplorerEntityActivation =
  | {
      type: "drilldown";
      label: string;
      coordinates: [number, number];
      height: number;
    }
  | {
      type: "select";
      entityId: string;
    };

export type ExplorerEntityFocusState = {
  selectedEntityId: string | null;
  nearbyFocus: ExplorerNearbyFocus | null;
  isDrawerOpen: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
  cameraTarget: ExplorerCameraTarget | null;
  isCameraAtHome: boolean;
};

export type ExplorerEntityFocusIntent = {
  entityId: string;
  label: string;
  coordinates?: [number, number] | null;
  height?: number;
};

export const EXPLORER_ENTITY_FOCUS_HEIGHT = 420_000;

type ResolveExplorerEntityActivationOptions = {
  entity: ExplorerVisibleEntity;
  visibleEntities: ExplorerVisibleEntity[];
  cameraBand: ExplorerCameraBand;
};

type ResolveExplorerEntityActivationByIdOptions = {
  entityId: string;
  visibleEntities: ExplorerVisibleEntity[];
  cameraBand: ExplorerCameraBand;
};

export function resolveExplorerEntityActivation({
  entity,
  visibleEntities,
  cameraBand,
}: ResolveExplorerEntityActivationOptions): ExplorerEntityActivation {
  if (entity.isAggregate) {
    return {
      type: "drilldown",
      label:
        entity.aggregateCount && entity.aggregateCount > 1
          ? `${entity.aggregateCount} nearby ${entity.category.toLowerCase()}`
          : entity.title,
      coordinates: entity.coordinates,
      height: cameraBand === "national" ? 1_450_000 : 520_000,
    };
  }

  const resolvedEntity = resolveDenseClickSelection({
    clickedEntity: entity,
    visibleEntities,
    cameraBand,
  });

  return {
    type: "select",
    entityId: resolvedEntity.id,
  };
}

export function resolveExplorerEntityActivationById({
  entityId,
  visibleEntities,
  cameraBand,
}: ResolveExplorerEntityActivationByIdOptions): ExplorerEntityActivation | null {
  const entity = visibleEntities.find((candidate) => candidate.id === entityId);
  if (!entity) {
    return null;
  }

  return resolveExplorerEntityActivation({
    entity,
    visibleEntities,
    cameraBand,
  });
}

export function resolveExplorerEntityFocusState(
  intent: ExplorerEntityFocusIntent,
  state: ExplorerEntityFocusState,
): ExplorerEntityFocusState {
  if (!intent.coordinates) {
    return {
      ...state,
      selectedEntityId: intent.entityId,
      isDrawerOpen: true,
      isSearchOpen: false,
    };
  }

  return {
    ...state,
    selectedEntityId: intent.entityId,
    isDrawerOpen: true,
    isSearchOpen: false,
    cameraTarget: {
      label: intent.label,
      coordinates: intent.coordinates,
      height: intent.height ?? EXPLORER_ENTITY_FOCUS_HEIGHT,
    },
    isCameraAtHome: false,
  };
}
