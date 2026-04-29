"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cartesian3,
  Color,
  EllipsoidTerrainProvider,
  HeightReference,
  Math as CesiumMath,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from "cesium";
import { HOME_CAMERA, buildEntityCameraFocus } from "@/lib/map/camera";
import {
  compareEntitiesBySelectionPriority,
  getEntitySelectionPointSize,
} from "@/lib/map/entity-priority";
import { getLayerDefinition } from "@/lib/map/layer-registry";
import { useExplorerStore } from "@/store/explorer-store";
import type { ExplorerVisibleEntity } from "@/types/explorer";

if (typeof window !== "undefined") {
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
    process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? "/cesium";
}

type GlobeMode = "main" | "debug";

type CesiumSafeGlobeProps = {
  mode?: GlobeMode;
  entities?: ExplorerVisibleEntity[];
  homeSignal?: number;
};

type InitStage =
  | "idle"
  | "component-mounted"
  | "viewer-construction-start"
  | "viewer-construction-success"
  | "scene-configuration-complete"
  | "entity-add-start"
  | "entity-add-complete"
  | "initial-camera-set"
  | "camera-fly-start"
  | "camera-fly-complete"
  | "render-ready"
  | "failed";

function logGlobeStage(stage: InitStage, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[toxinmap-globe] ${stage}${payload}`);
}

function getPickedEntityId(picked: unknown) {
  if (!picked || typeof picked !== "object" || !("id" in picked)) {
    return null;
  }

  const rawId = (picked as { id?: unknown }).id;

  if (typeof rawId === "string") {
    return rawId;
  }

  if (
    rawId &&
    typeof rawId === "object" &&
    "id" in rawId &&
    typeof (rawId as { id?: unknown }).id === "string"
  ) {
    return (rawId as { id: string }).id;
  }

  return null;
}

function getPickedEntityIds(pickedItems: unknown[]) {
  return Array.from(
    new Set(
      pickedItems
        .map((picked) => getPickedEntityId(picked))
        .filter((entityId): entityId is string => Boolean(entityId)),
    ),
  );
}

export function CesiumSafeGlobe({
  mode = "main",
  entities = [],
  homeSignal = 0,
}: CesiumSafeGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const entityMapRef = useRef(new Map<string, ExplorerVisibleEntity>());
  const [globeFailed, setGlobeFailed] = useState(false);
  const [initStage, setInitStage] = useState<InitStage>("idle");
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const selectedEntityId = useExplorerStore((state) => state.selectedEntityId);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const setSelectedEntityId = useExplorerStore((state) => state.setSelectedEntityId);
  const setCameraHeight = useExplorerStore((state) => state.setCameraHeight);
  const setCameraAtHome = useExplorerStore((state) => state.setCameraAtHome);

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedEntityId) ?? null,
    [entities, selectedEntityId],
  );

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let viewer: CesiumViewer | null = null;

    const advance = (stage: InitStage, details?: Record<string, unknown>) => {
      setInitStage(stage);
      logGlobeStage(stage, details);
    };

    advance("component-mounted", { mode });

    try {
      advance("viewer-construction-start");

      viewer = new CesiumViewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        scene3DOnly: true,
        shadows: false,
        shouldAnimate: false,
        orderIndependentTranslucency: false,
        requestRenderMode: false,
        terrainProvider: new EllipsoidTerrainProvider(),
        contextOptions: {
          requestWebgl1: true,
          webgl: {
            alpha: false,
            antialias: false,
            failIfMajorPerformanceCaveat: false,
            powerPreference: "default",
            preserveDrawingBuffer: false,
          },
        },
      });

      viewerRef.current = viewer;
      advance("viewer-construction-success");

      viewer.imageryLayers.removeAll();
      viewer.scene.backgroundColor = Color.fromCssColorString("#020304");
      viewer.scene.globe.baseColor = Color.fromCssColorString("#1b252c");
      viewer.scene.globe.showGroundAtmosphere = false;
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.highDynamicRange = false;
      viewer.scene.postProcessStages.fxaa.enabled = false;
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = false;
      }
      if (viewer.scene.sun) {
        viewer.scene.sun.show = false;
      }
      if (viewer.scene.moon) {
        viewer.scene.moon.show = false;
      }
      viewer.scene.fog.enabled = false;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 320_000;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 24_000_000;
      viewer.scene.screenSpaceCameraController.inertiaSpin = 0.75;
      viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.72;
      viewer.scene.screenSpaceCameraController.inertiaZoom = 0.68;
      viewer.resolutionScale = 0.9;
      const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement | undefined;
      if (creditContainer) {
        creditContainer.style.display = "none";
      }

      advance("scene-configuration-complete");

      viewer.camera.setView({
        destination: HOME_CAMERA.destination,
        orientation: {
          heading: CesiumMath.toRadians(8),
          pitch: CesiumMath.toRadians(-52),
          roll: 0,
        },
      });
      advance("initial-camera-set");

      const activeViewer = viewer;
      const moveEndHandler = () => {
        const height = activeViewer.camera.positionCartographic.height;
        setCameraHeight(height);
        setCameraAtHome(Math.abs(height - HOME_CAMERA.destination.z) < 1_200_000 && !selectedEntityId);
      };

      activeViewer.camera.moveEnd.addEventListener(moveEndHandler);
      activeViewer.screenSpaceEventHandler.setInputAction(
        (movement: { position?: { x: number; y: number } }) => {
          if (!movement.position) return;
          const pickedIds = getPickedEntityIds(
            activeViewer.scene.drillPick(movement.position as never, 12) as unknown[],
          );

          if (!pickedIds.length) {
            setSelectedEntityId(null);
            return;
          }

          const bestMatch = pickedIds
            .map((entityId) => entityMapRef.current.get(entityId))
            .filter((entity): entity is ExplorerVisibleEntity => Boolean(entity))
            .sort(compareEntitiesBySelectionPriority)[0];

          setSelectedEntityId(bestMatch?.id ?? pickedIds[0] ?? null);
        },
        ScreenSpaceEventType.LEFT_CLICK,
      );

      activeViewer.scene.requestRender();
      advance("render-ready");

      return () => {
        activeViewer.camera.moveEnd.removeEventListener(moveEndHandler);
        activeViewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
        activeViewer.destroy();
        viewerRef.current = null;
      };
    } catch (error) {
      const message =
        error instanceof Error ? `${error.name}: ${error.message}` : "Unknown Cesium initialization error";
      queueMicrotask(() => {
        setFailureMessage(message);
        setGlobeFailed(true);
        setInitStage("failed");
        logGlobeStage("failed", { message });
      });
    }
  }, [mode, selectedEntityId, setCameraAtHome, setCameraHeight, setSelectedEntityId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || mode !== "main") return;

    logGlobeStage("entity-add-start", { entityCount: entities.length });
    viewer.entities.removeAll();
    const renderEntities = [...entities].sort(
      (left, right) =>
        compareEntitiesBySelectionPriority(left, right) * -1,
    );
    const entityMap = new Map(renderEntities.map((entity) => [entity.id, entity]));

    for (const entity of renderEntities) {
      const layerAccent =
        getLayerDefinition(entity.layerId)?.accent ??
        (entity.layerGroup === "official"
          ? "var(--accent-industrial)"
          : entity.layerGroup === "emerging"
            ? "var(--accent-water)"
            : entity.layerGroup === "wildlife"
              ? "var(--accent-bio)"
              : entity.layerGroup === "reproductive"
                ? "var(--accent-bio-soft)"
                : "var(--accent-warning)");

      const color = Color.fromCssColorString(layerAccent);
      const isSelected = entity.id === selectedEntityId;

      viewer.entities.add({
        id: entity.id,
        name: entity.title,
        position: Cartesian3.fromDegrees(
          entity.coordinates[0],
          entity.coordinates[1],
          entity.geometryType === "region" ? 10_000 : 0,
        ),
        point: {
          pixelSize: getEntitySelectionPointSize(entity, isSelected),
          color: color.withAlpha(isSelected ? 0.98 : 0.86),
          outlineColor: Color.fromCssColorString("#f3efe7").withAlpha(isSelected ? 0.95 : 0.45),
          outlineWidth: isSelected ? 2 : 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: HeightReference.NONE,
        },
      });
    }

    viewer.scene.requestRender();
    entityMapRef.current = entityMap;
    logGlobeStage("entity-add-complete", { entityCount: entities.length });
  }, [entities, mode, selectedEntityId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedEntity || mode !== "main") return;

    const focus = buildEntityCameraFocus(selectedEntity);
    logGlobeStage("camera-fly-start", { target: selectedEntity.id });
    viewer.camera.flyTo({
      ...focus,
      duration: 1.1,
      complete: () => {
        setCameraAtHome(false);
        logGlobeStage("camera-fly-complete", { target: selectedEntity.id });
      },
    });
  }, [mode, selectedEntity, setCameraAtHome]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !cameraTarget || selectedEntity || mode !== "main") return;

    logGlobeStage("camera-fly-start", { target: cameraTarget.label });
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        cameraTarget.coordinates[0],
        cameraTarget.coordinates[1],
        cameraTarget.height ?? 1_600_000,
      ),
      orientation: {
        heading: CesiumMath.toRadians(6),
        pitch: CesiumMath.toRadians(-58),
        roll: 0,
      },
      duration: 1.1,
      complete: () => {
        setCameraAtHome(false);
        logGlobeStage("camera-fly-complete", { target: cameraTarget.label });
      },
    });
  }, [cameraTarget, mode, selectedEntity, setCameraAtHome]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || mode !== "main") return;

    logGlobeStage("camera-fly-start", { target: "home" });
    viewer.camera.flyTo({
      ...HOME_CAMERA,
      duration: 1.1,
      complete: () => {
        setCameraAtHome(true);
        logGlobeStage("camera-fly-complete", { target: "home" });
      },
    });
  }, [homeSignal, mode, setCameraAtHome]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div ref={containerRef} className="h-full w-full" />
      {mode === "debug" ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-[rgba(8,10,12,0.54)] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white backdrop-blur-md">
          Internal debug globe
        </div>
      ) : null}
      {globeFailed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#05070a,#090c10)]">
          <div className="max-w-xl rounded-[28px] border border-white/10 bg-[rgba(8,10,12,0.78)] px-6 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
              Raw globe failed
            </p>
            <p className="mt-3 font-serif text-3xl tracking-[-0.05em] text-white">
              Cesium failed during viewer initialization.
            </p>
            <p className="mt-4 text-sm text-[var(--foreground-muted)]">
              Last completed stage: {initStage}
            </p>
            {failureMessage ? (
              <p className="mt-3 text-sm text-[var(--foreground-muted)]">{failureMessage}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
