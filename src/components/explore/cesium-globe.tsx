"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cartesian2,
  Cartesian3,
  Color,
  EllipsoidTerrainProvider,
  ImageryLayer,
  Ion,
  Math as CesiumMath,
  LabelStyle,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  createWorldTerrainAsync,
  type TerrainProvider,
  type Viewer as CesiumViewer,
} from "cesium";
import {
  CameraFlyTo,
  EllipseGraphics,
  Entity,
  LabelGraphics,
  PointGraphics,
  Viewer,
  type CesiumComponentRef,
} from "resium";
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

function getMovementPosition(movement: unknown) {
  if (!movement || typeof movement !== "object") return null;

  const value = movement as { position?: Cartesian2; endPosition?: Cartesian2 };
  return value.endPosition ?? value.position ?? null;
}

export function CesiumGlobe({ entities, homeSignal }: CesiumGlobeProps) {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const [globeFailed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const canvas = document.createElement("canvas");
      const context =
        canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
        canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false });

      return !context;
    } catch {
      return true;
    }
  });
  const selectedEntityId = useExplorerStore((state) => state.selectedEntityId);
  const hoveredEntityId = useExplorerStore((state) => state.hoveredEntityId);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const setSelectedEntityId = useExplorerStore((state) => state.setSelectedEntityId);
  const setHoveredEntity = useExplorerStore((state) => state.setHoveredEntity);
  const setCameraHeight = useExplorerStore((state) => state.setCameraHeight);
  const setCameraAtHome = useExplorerStore((state) => state.setCameraAtHome);
  const [terrainProvider, setTerrainProvider] = useState<TerrainProvider>(
    () => new EllipsoidTerrainProvider(),
  );

  const token = process.env.NEXT_PUBLIC_CESIUM_ACCESS_TOKEN;
  const terrainEnabled = process.env.NEXT_PUBLIC_ENABLE_CESIUM_TERRAIN === "true";

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedEntityId) ?? null,
    [entities, selectedEntityId],
  );

  useEffect(() => {
    if (!token || !terrainEnabled) return;

    Ion.defaultAccessToken = token;
    void createWorldTerrainAsync()
      .then((provider) => setTerrainProvider(provider))
      .catch(() => setTerrainProvider(new EllipsoidTerrainProvider()));
  }, [terrainEnabled, token]);

  const imageryProvider = useMemo(
    () =>
      new UrlTemplateImageryProvider({
        url: "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        credit: "CARTO",
      }),
    [],
  );

  const baseLayer = useMemo(() => new ImageryLayer(imageryProvider), [imageryProvider]);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;

    if (!viewer) return;
    viewer.scene.backgroundColor = Color.fromCssColorString("#05070a");
    viewer.scene.globe.baseColor = Color.fromCssColorString("#06080b");
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.highDynamicRange = false;
    viewer.scene.postProcessStages.fxaa.enabled = false;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = false;
    }
    viewer.scene.fog.enabled = false;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 280_000;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 24_000_000;
    viewer.scene.screenSpaceCameraController.inertiaSpin = 0.78;
    viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.72;
    viewer.scene.screenSpaceCameraController.inertiaZoom = 0.68;
    viewer.resolutionScale = 1;
    const moveEndHandler = () => {
      const height = viewer.camera.positionCartographic.height;
      setCameraHeight(height);
      setCameraAtHome(Math.abs(height - HOME_CAMERA.destination.z) < 1_200_000 && !selectedEntityId);
    };

    viewer.camera.moveEnd.addEventListener(moveEndHandler);
    return () => {
      viewer.camera.moveEnd.removeEventListener(moveEndHandler);
    };
  }, [selectedEntityId, setCameraAtHome, setCameraHeight]);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !selectedEntity) return;

    const focus = buildEntityCameraFocus(selectedEntity);
    viewer.camera.flyTo({
      ...focus,
      complete: () => setCameraAtHome(false),
    });
  }, [selectedEntity, setCameraAtHome]);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
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
      duration: 1.8,
      complete: () => setCameraAtHome(false),
    });
  }, [cameraTarget, selectedEntity, setCameraAtHome]);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    viewer.camera.flyTo({
      ...HOME_CAMERA,
      complete: () => setCameraAtHome(true),
    });
  }, [homeSignal, setCameraAtHome]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[30px]">
      {globeFailed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_45%,rgba(117,140,154,0.14),transparent_18%),linear-gradient(180deg,#05070a,#090c10)]">
          <div className="max-w-md rounded-[28px] border border-white/10 bg-[rgba(8,10,12,0.78)] px-6 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
              Globe unavailable
            </p>
            <p className="mt-3 font-serif text-3xl tracking-[-0.05em] text-white">
              This browser is refusing the current WebGL scene.
            </p>
            <p className="mt-4 text-sm text-[var(--foreground-muted)]">
              Try reloading once. If it still fails, disable aggressive browser shields or hardware-acceleration restrictions for this local page.
            </p>
          </div>
        </div>
      ) : null}
      {!globeFailed ? (
        <Viewer
          ref={viewerRef}
          className="h-full w-full"
          full
          scene3DOnly
          baseLayerPicker={false}
          geocoder={false}
          homeButton={false}
          navigationHelpButton={false}
          sceneModePicker={false}
          fullscreenButton={false}
          timeline={false}
          animation={false}
          infoBox={false}
          selectionIndicator={false}
          baseLayer={baseLayer}
          terrainProvider={terrainProvider}
          contextOptions={{
            requestWebgl1: true,
            webgl: {
              alpha: false,
              antialias: false,
              failIfMajorPerformanceCaveat: false,
              powerPreference: "low-power",
              preserveDrawingBuffer: false,
            },
          }}
          requestRenderMode
          maximumRenderTimeChange={Infinity}
        >
          <CameraFlyTo {...HOME_CAMERA} />
          {entities.map((entity) => {
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

            return (
              <Entity
                key={entity.id}
                name={entity.title}
                position={Cartesian3.fromDegrees(...toPosition(entity))}
                onClick={() => setSelectedEntityId(entity.id)}
                onMouseEnter={(movement) => {
                  const pos = getMovementPosition(movement);
                  setHoveredEntity(entity.id, {
                    entityId: entity.id,
                    x: pos?.x ?? 24,
                    y: pos?.y ?? 24,
                  });
                }}
                onMouseMove={(movement) => {
                  const pos = getMovementPosition(movement);
                  setHoveredEntity(entity.id, {
                    entityId: entity.id,
                    x: pos?.x ?? 24,
                    y: pos?.y ?? 24,
                  });
                }}
                onMouseLeave={() => setHoveredEntity(null, null)}
              >
                {entity.geometryType === "region" ? (
                  <EllipseGraphics
                    semiMajorAxis={(entity.radiusKm ?? 120) * 1000}
                    semiMinorAxis={(entity.radiusKm ?? 120) * 860}
                    material={color.withAlpha(selected ? 0.22 : hovered ? 0.16 : 0.1)}
                    outline
                    outlineColor={color.withAlpha(selected ? 0.85 : 0.55)}
                    outlineWidth={selected ? 3 : 1.5}
                    height={8_000}
                  />
                ) : (
                  <>
                    <PointGraphics
                      pixelSize={entity.isAggregate ? 20 : selected ? 17 : hovered ? 15 : 11}
                      color={color.withAlpha(selected ? 0.96 : 0.84)}
                      outlineColor={Color.fromCssColorString("#f3efe7").withAlpha(
                        selected ? 0.95 : 0.62,
                      )}
                      outlineWidth={selected ? 3 : 1.6}
                      disableDepthTestDistance={Number.POSITIVE_INFINITY}
                    />
                    {entity.isAggregate || selected ? (
                      <LabelGraphics
                        text={entity.isAggregate ? `${entity.aggregateCount}` : entity.title}
                        font={entity.isAggregate ? "600 13px Geist" : "500 12px Geist"}
                        fillColor={Color.fromCssColorString("#f4f1e8")}
                        style={LabelStyle.FILL_AND_OUTLINE}
                        outlineColor={Color.fromCssColorString("#05070a")}
                        outlineWidth={3}
                        verticalOrigin={VerticalOrigin.TOP}
                        pixelOffset={new Cartesian2(0, entity.isAggregate ? 18 : 20)}
                        disableDepthTestDistance={Number.POSITIVE_INFINITY}
                      />
                    ) : null}
                  </>
                )}
              </Entity>
            );
          })}
        </Viewer>
      ) : null}
    </div>
  );
}

function toPosition(entity: ExplorerVisibleEntity) {
  return [entity.coordinates[0], entity.coordinates[1], entity.geometryType === "region" ? 8_000 : 0] as const;
}
