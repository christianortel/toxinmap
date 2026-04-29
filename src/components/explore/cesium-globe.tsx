"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cartesian2,
  Cartesian3,
  Color,
  EllipsoidTerrainProvider,
  Entity as CesiumEntity,
  HeightReference,
  Ion,
  LabelStyle,
  Math as CesiumMath,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer as CesiumViewer,
  createWorldTerrainAsync,
  type TerrainProvider,
} from "cesium";
import { buildEntityCameraFocus, HOME_CAMERA } from "@/lib/map/camera";
import { getLayerDefinition } from "@/lib/map/layer-registry";
import type { ExplorerVisibleEntity } from "@/types/explorer";
import { useExplorerStore } from "@/store/explorer-store";

if (typeof window !== "undefined") {
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
    process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? "/cesium";
}

type CesiumGlobeProps = {
  entities: ExplorerVisibleEntity[];
  homeSignal: number;
};

const MINIMAL_GLOBE_MODE = true;

function getPointerPosition(
  movement: { endPosition?: Cartesian2; position?: Cartesian2 } | undefined,
) {
  return movement?.endPosition ?? movement?.position ?? null;
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

export function CesiumGlobe({ entities, homeSignal }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [globeFailed, setGlobeFailed] = useState(false);
  const [terrainProvider, setTerrainProvider] = useState<TerrainProvider>(
    () => new EllipsoidTerrainProvider(),
  );
  const selectedEntityId = useExplorerStore((state) => state.selectedEntityId);
  const hoveredEntityId = useExplorerStore((state) => state.hoveredEntityId);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const setSelectedEntityId = useExplorerStore((state) => state.setSelectedEntityId);
  const setHoveredEntity = useExplorerStore((state) => state.setHoveredEntity);
  const setCameraHeight = useExplorerStore((state) => state.setCameraHeight);
  const setCameraAtHome = useExplorerStore((state) => state.setCameraAtHome);

  const token = process.env.NEXT_PUBLIC_CESIUM_ACCESS_TOKEN;
  const terrainEnabled = process.env.NEXT_PUBLIC_ENABLE_CESIUM_TERRAIN === "true";

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedEntityId) ?? null,
    [entities, selectedEntityId],
  );

  useEffect(() => {
    if (MINIMAL_GLOBE_MODE || !token || !terrainEnabled) return;

    Ion.defaultAccessToken = token;
    void createWorldTerrainAsync()
      .then((provider) => setTerrainProvider(provider))
      .catch(() => setTerrainProvider(new EllipsoidTerrainProvider()));
  }, [terrainEnabled, token]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    try {
      const viewer = new CesiumViewer(containerRef.current, {
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
        terrainProvider,
        shouldAnimate: false,
        shadows: false,
        scene3DOnly: true,
        orderIndependentTranslucency: false,
        requestRenderMode: false,
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
      viewer.imageryLayers.removeAll();
      viewer.scene.backgroundColor = Color.fromCssColorString("#030405");
      viewer.scene.globe.baseColor = Color.fromCssColorString("#1a2329");
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
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 280_000;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 24_000_000;
      viewer.scene.screenSpaceCameraController.inertiaSpin = 0.78;
      viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.72;
      viewer.scene.screenSpaceCameraController.inertiaZoom = 0.68;
      viewer.resolutionScale = 0.9;
      const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement | undefined;
      if (creditContainer) {
        creditContainer.style.display = "none";
      }
      viewer.camera.setView(HOME_CAMERA);

      const moveEndHandler = () => {
        const height = viewer.camera.positionCartographic.height;
        setCameraHeight(height);
        setCameraAtHome(Math.abs(height - HOME_CAMERA.destination.z) < 1_200_000 && !selectedEntityId);
      };

      viewer.camera.moveEnd.addEventListener(moveEndHandler);

      viewer.screenSpaceEventHandler.setInputAction((movement: { position?: Cartesian2 }) => {
        if (!movement.position) {
          return;
        }

        const picked = viewer.scene.pick(movement.position);
        const entityId = getPickedEntityId(picked);
        setSelectedEntityId(entityId);
      }, ScreenSpaceEventType.LEFT_CLICK);

      viewer.screenSpaceEventHandler.setInputAction(
        (movement: { endPosition?: Cartesian2 }) => {
          const pos = getPointerPosition(movement);
          const picked = pos ? viewer.scene.pick(pos) : undefined;
          const entityId = getPickedEntityId(picked);

          if (entityId && pos) {
            setHoveredEntity(entityId, {
              entityId,
              x: pos.x,
              y: pos.y,
            });
            return;
          }

          setHoveredEntity(null, null);
        },
        ScreenSpaceEventType.MOUSE_MOVE,
      );
      return () => {
        viewer.camera.moveEnd.removeEventListener(moveEndHandler);
        viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
        viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
        viewer.destroy();
        viewerRef.current = null;
      };
    } catch {
      queueMicrotask(() => setGlobeFailed(true));
      return undefined;
    }
  }, [setCameraAtHome, setCameraHeight, setHoveredEntity, setSelectedEntityId, selectedEntityId, terrainProvider]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    entities.forEach((entity) => {
      const selected = entity.id === selectedEntityId;
      const hovered = entity.id === hoveredEntityId;
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
      const baseConfig: ConstructorParameters<typeof CesiumEntity>[0] = {
        id: entity.id,
        name: entity.title,
        position: Cartesian3.fromDegrees(...toPosition(entity)),
        point: {
          pixelSize: entity.isAggregate ? 16 : selected ? 14 : hovered ? 12 : 8,
          color: color.withAlpha(selected ? 0.96 : 0.84),
          outlineColor: Color.fromCssColorString("#f3efe7").withAlpha(selected ? 0.95 : 0.62),
          outlineWidth: selected ? 2.5 : 1.4,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: HeightReference.NONE,
        },
      };

      if (entity.geometryType === "region" && (selected || hovered)) {
        baseConfig.ellipse = {
          semiMajorAxis: (entity.radiusKm ?? 120) * 1000,
          semiMinorAxis: (entity.radiusKm ?? 120) * 860,
          material: color.withAlpha(selected ? 0.22 : 0.16),
          outline: true,
          outlineColor: color.withAlpha(selected ? 0.85 : 0.55),
          outlineWidth: selected ? 3 : 1.5,
          height: 8_000,
        };
      }

      if (selected) {
        baseConfig.label = {
          text: entity.title,
          font: "500 12px Geist",
          fillColor: Color.fromCssColorString("#f4f1e8"),
          style: LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Color.fromCssColorString("#05070a"),
          outlineWidth: 3,
          verticalOrigin: VerticalOrigin.TOP,
          pixelOffset: new Cartesian2(0, 18),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        };
      }

      viewer.entities.add(baseConfig);
    });

    viewer.scene.requestRender();
  }, [entities, hoveredEntityId, selectedEntityId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedEntity) return;

    const focus = buildEntityCameraFocus(selectedEntity);
    viewer.camera.flyTo({
      ...focus,
      duration: 1.2,
      complete: () => setCameraAtHome(false),
    });
  }, [selectedEntity, setCameraAtHome]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !cameraTarget || selectedEntity) return;

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
      duration: 1.2,
      complete: () => setCameraAtHome(false),
    });
  }, [cameraTarget, selectedEntity, setCameraAtHome]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.camera.flyTo({
      ...HOME_CAMERA,
      duration: 1.2,
      complete: () => setCameraAtHome(true),
    });
  }, [homeSignal, setCameraAtHome]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
      {globeFailed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#05070a,#090c10)]">
          <div className="max-w-md rounded-[28px] border border-white/10 bg-[rgba(8,10,12,0.78)] px-6 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
              Globe unavailable
            </p>
            <p className="mt-3 font-serif text-3xl tracking-[-0.05em] text-white">
              Cesium failed to initialize in this browser.
            </p>
            <p className="mt-4 text-sm text-[var(--foreground-muted)]">
              The server is healthy, but this browser crashed on the WebGL globe mount.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toPosition(entity: ExplorerVisibleEntity) {
  return [
    entity.coordinates[0],
    entity.coordinates[1],
    entity.geometryType === "region" ? 8_000 : 0,
  ] as const;
}
