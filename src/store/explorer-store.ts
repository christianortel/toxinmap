"use client";

import { create } from "zustand";
import { explorerTimelineRange } from "@/content/explorer-data";
import { HOME_VIEW } from "@/lib/map/camera";
import { getDefaultLayerIds } from "@/lib/map/layer-registry";
import type {
  ExplorerCameraTarget,
  ExplorerCameraView,
  ExplorerFilterChip,
  ExplorerHoverState,
  ExplorerNearbyFocus,
  ExplorerLayerGroup,
  ExplorerLayerId,
} from "@/types/explorer";

type ExplorerState = {
  activeGroups: ExplorerLayerGroup[];
  activeLayerIds: ExplorerLayerId[];
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  hoverState: ExplorerHoverState | null;
  activeYear: number;
  timelineRange: [number, number];
  isLegendExpanded: boolean;
  isDrawerOpen: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
  activeFilterChips: ExplorerFilterChip[];
  cameraHeight: number;
  cameraCenter: [number, number];
  isCameraAtHome: boolean;
  nearbyFocus: ExplorerNearbyFocus | null;
  cameraTarget: ExplorerCameraTarget | null;
  applyExplorerSurfaceState: (
    nextState: Pick<
      ExplorerState,
      | "selectedEntityId"
      | "nearbyFocus"
      | "isDrawerOpen"
      | "searchQuery"
      | "isSearchOpen"
      | "cameraTarget"
      | "isCameraAtHome"
    >,
  ) => void;
  replaceExplorerState: (
    nextState: Partial<
      Pick<
        ExplorerState,
        | "activeGroups"
        | "activeLayerIds"
        | "selectedEntityId"
        | "activeYear"
        | "activeFilterChips"
        | "searchQuery"
        | "nearbyFocus"
        | "cameraTarget"
      >
    >,
  ) => void;
  toggleGroup: (group: ExplorerLayerGroup) => void;
  toggleLayer: (layerId: ExplorerLayerId) => void;
  setSelectedEntityId: (entityId: string | null) => void;
  setHoveredEntity: (entityId: string | null, hoverState?: ExplorerHoverState | null) => void;
  setActiveYear: (year: number) => void;
  setLegendExpanded: (expanded: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  toggleFilterChip: (chip: ExplorerFilterChip) => void;
  clearFilterChips: () => void;
  setCameraHeight: (height: number) => void;
  setCameraView: (view: ExplorerCameraView) => void;
  setCameraAtHome: (atHome: boolean) => void;
  setNearbyFocus: (focus: ExplorerNearbyFocus | null) => void;
  setCameraTarget: (target: ExplorerCameraTarget | null) => void;
  resetCameraState: () => void;
  resetExplorerFilters: () => void;
};

const defaultGroups: ExplorerLayerGroup[] = ["official", "emerging", "legal"];

export const useExplorerStore = create<ExplorerState>((set) => ({
  activeGroups: defaultGroups,
  activeLayerIds: getDefaultLayerIds(),
  selectedEntityId: null,
  hoveredEntityId: null,
  hoverState: null,
  activeYear: explorerTimelineRange.activeYear,
  timelineRange: [explorerTimelineRange.startYear, explorerTimelineRange.endYear],
  isLegendExpanded: false,
  isDrawerOpen: true,
  searchQuery: "",
  isSearchOpen: false,
  activeFilterChips: [],
  cameraHeight: HOME_VIEW.height,
  cameraCenter: [HOME_VIEW.lng, HOME_VIEW.lat],
  isCameraAtHome: true,
  nearbyFocus: null,
  cameraTarget: null,
  applyExplorerSurfaceState: (nextState) =>
    set({
      selectedEntityId: nextState.selectedEntityId,
      nearbyFocus: nextState.nearbyFocus,
      isDrawerOpen: nextState.isDrawerOpen,
      searchQuery: nextState.searchQuery,
      isSearchOpen: nextState.isSearchOpen,
      cameraTarget: nextState.cameraTarget,
      isCameraAtHome: nextState.isCameraAtHome,
      hoveredEntityId: null,
      hoverState: null,
    }),
  replaceExplorerState: (nextState) =>
    set((state) => ({
      ...nextState,
      isDrawerOpen:
        nextState.selectedEntityId !== undefined
          ? Boolean(nextState.selectedEntityId)
          : state.isDrawerOpen,
      isSearchOpen: false,
      hoveredEntityId: null,
      hoverState: null,
    })),
  toggleGroup: (group) =>
    set((state) => ({
      activeGroups: state.activeGroups.includes(group)
        ? state.activeGroups.filter((item) => item !== group)
        : [...state.activeGroups, group],
    })),
  toggleLayer: (layerId) =>
    set((state) => ({
      activeLayerIds: state.activeLayerIds.includes(layerId)
        ? state.activeLayerIds.filter((item) => item !== layerId)
        : [...state.activeLayerIds, layerId],
    })),
  setSelectedEntityId: (entityId) =>
    set({
      selectedEntityId: entityId,
      isDrawerOpen: !!entityId,
      cameraTarget: null,
    }),
  setHoveredEntity: (entityId, hoverState) =>
    set({ hoveredEntityId: entityId, hoverState: hoverState ?? null }),
  setActiveYear: (year) => set({ activeYear: year }),
  setLegendExpanded: (expanded) => set({ isLegendExpanded: expanded }),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleFilterChip: (chip) =>
    set((state) => ({
      activeFilterChips: state.activeFilterChips.includes(chip)
        ? state.activeFilterChips.filter((item) => item !== chip)
        : [...state.activeFilterChips, chip],
    })),
  clearFilterChips: () => set({ activeFilterChips: [] }),
  setCameraHeight: (height) => set({ cameraHeight: height }),
  setCameraView: (view) =>
    set({
      cameraHeight: view.height,
      cameraCenter: view.coordinates,
    }),
  setCameraAtHome: (atHome) => set({ isCameraAtHome: atHome }),
  setNearbyFocus: (focus) => set({ nearbyFocus: focus, selectedEntityId: null, isDrawerOpen: false }),
  setCameraTarget: (target) => set({ cameraTarget: target, selectedEntityId: null, isDrawerOpen: false }),
  resetCameraState: () =>
    set({
      cameraHeight: HOME_VIEW.height,
      cameraCenter: [HOME_VIEW.lng, HOME_VIEW.lat],
      isCameraAtHome: true,
      selectedEntityId: null,
      hoveredEntityId: null,
      hoverState: null,
      isDrawerOpen: false,
      cameraTarget: null,
      nearbyFocus: null,
    }),
  resetExplorerFilters: () =>
    set({
      activeGroups: defaultGroups,
      activeLayerIds: getDefaultLayerIds(),
      activeYear: explorerTimelineRange.activeYear,
      searchQuery: "",
      activeFilterChips: [],
      isSearchOpen: false,
      nearbyFocus: null,
      cameraTarget: null,
    }),
}));
