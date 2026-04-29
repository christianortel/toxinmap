"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AmbientLight,
  DirectionalLight,
  Group,
  MeshBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import type { GlobeMethods } from "react-globe.gl";
import {
  EARTH_RADIUS_METERS,
  HOME_VIEW,
  buildEntityFocusState,
  clampCameraHeight,
  getCameraPointResolution,
} from "@/lib/map/camera";
import {
  resolveExplorerEntityActivation,
  resolveExplorerEntityActivationById,
  type ExplorerEntityActivation,
} from "@/lib/map/entity-activation";
import {
  buildGlobeRenderableEntities,
  buildMapInspectionLabels,
  getLocalObjectRenderStyle,
  mixColor,
  splitGlobeRenderableEntities,
  type GlobeRenderableEntity,
  type MapInspectionLabel,
} from "@/lib/map/globe-rendering";
import { useExplorerStore } from "@/store/explorer-store";
import type { ExplorerCameraBand, ExplorerVisibleEntity } from "@/types/explorer";

type GlobeMode = "main" | "debug";

type ThreeSafeGlobeProps = {
  mode?: GlobeMode;
  entities?: ExplorerVisibleEntity[];
  homeSignal?: number;
  cameraBand?: ExplorerCameraBand;
};

type ThreeGlobeComponent = typeof import("react-globe.gl").default;

type InitStage =
  | "idle"
  | "component-mounted"
  | "module-loading"
  | "module-ready"
  | "globe-ready"
  | "entity-bind-complete"
  | "camera-home"
  | "camera-focus"
  | "failed";

declare global {
  interface Window {
    __TOXINMAP_E2E__?: {
      getPointScreenPosition?: (entityId: string) => { x: number; y: number } | null;
    };
  }
}

const EARTH_TEXTURE_URL = "/textures/earth-night.jpg";
const EARTH_TOPOLOGY_URL = "/textures/earth-topology.png";

function logGlobeStage(stage: InitStage, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[toxinmap-three-globe] ${stage}${payload}`);
}

function resolveAccentColor(accent: string) {
  if (typeof window === "undefined") {
    return "#6cb6ff";
  }

  if (accent.startsWith("var(")) {
    const variableName = accent.slice(4, -1).trim();
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();
    return resolved || "#6cb6ff";
  }

  return accent;
}

function toGlobeAltitude(heightMeters: number) {
  return Math.max(heightMeters / EARTH_RADIUS_METERS, 0.035);
}

export function ThreeSafeGlobe({
  mode = "main",
  entities = [],
  homeSignal = 0,
  cameraBand = "national",
}: ThreeSafeGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [GlobeComponent, setGlobeComponent] = useState<ThreeGlobeComponent | null>(null);
  const [globeFailed, setGlobeFailed] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [initStage, setInitStage] = useState<InitStage>("idle");
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cameraHeight, setLocalCameraHeight] = useState(HOME_VIEW.height);
  const [globeRadius, setGlobeRadius] = useState(100);
  const selectedEntityId = useExplorerStore((state) => state.selectedEntityId);
  const cameraTarget = useExplorerStore((state) => state.cameraTarget);
  const setSelectedEntityId = useExplorerStore((state) => state.setSelectedEntityId);
  const setCameraTarget = useExplorerStore((state) => state.setCameraTarget);
  const setCameraView = useExplorerStore((state) => state.setCameraView);
  const setCameraAtHome = useExplorerStore((state) => state.setCameraAtHome);

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedEntityId) ?? null,
    [entities, selectedEntityId],
  );

  const globeLights = useMemo(() => {
    const ambientLight = new AmbientLight("#f1f6fb", 1.58);
    const directionalLight = new DirectionalLight("#f8fbff", 1.24);
    directionalLight.position.set(1.15, 1.18, 1.5);
    return [ambientLight, directionalLight];
  }, []);

  const pointResolution = getCameraPointResolution(cameraHeight, cameraBand);

  const renderData = useMemo<GlobeRenderableEntity[]>(() => {
    return buildGlobeRenderableEntities(entities, {
      cameraBand,
      cameraHeight,
      selectedEntityId,
      resolveAccentColor,
    });
  }, [cameraBand, cameraHeight, entities, selectedEntityId]);

  const { pointEntities, objectEntities } = useMemo(
    () => splitGlobeRenderableEntities(renderData, cameraBand),
    [cameraBand, renderData],
  );
  const inspectionLabels = useMemo(
    () => buildMapInspectionLabels(objectEntities, cameraBand, selectedEntityId),
    [cameraBand, objectEntities, selectedEntityId],
  );

  const applyEntityActivation = (activation: ExplorerEntityActivation | null) => {
    if (!activation) {
      return;
    }
    if (activation.type === "drilldown") {
      setSelectedEntityId(null);
      setCameraTarget({
        label: activation.label,
        coordinates: activation.coordinates,
        height: activation.height,
      });
      return;
    }

    setSelectedEntityId(activation.entityId);
  };

  const activateEntity = (entity: GlobeRenderableEntity | ExplorerVisibleEntity) => {
    applyEntityActivation(
      resolveExplorerEntityActivation({
        entity,
        visibleEntities: entities,
        cameraBand,
      }),
    );
  };

  const activateEntityById = (entityId: string) => {
    applyEntityActivation(
      resolveExplorerEntityActivationById({
        entityId,
        visibleEntities: entities,
        cameraBand,
      }),
    );
  };

  useEffect(() => {
    let active = true;
    setInitStage("component-mounted");
    logGlobeStage("component-mounted", { mode });
    setInitStage("module-loading");
    logGlobeStage("module-loading");

    import("react-globe.gl")
      .then((module) => {
        if (!active) {
          return;
        }

        setGlobeComponent(() => module.default);
        setInitStage("module-ready");
        logGlobeStage("module-ready");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error ? `${error.name}: ${error.message}` : "Failed to load Three.js globe.";
        setFailureMessage(message);
        setGlobeFailed(true);
        setInitStage("failed");
        logGlobeStage("failed", { message });
      });

    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    logGlobeStage("entity-bind-complete", {
      entityCount: renderData.length,
      pointEntities: pointEntities.length,
      objectEntities: objectEntities.length,
      inspectionLabels: inspectionLabels.length,
    });
    setInitStage((current) => (current === "failed" ? current : "entity-bind-complete"));
  }, [inspectionLabels.length, objectEntities.length, pointEntities.length, renderData.length]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !selectedEntity || mode !== "main") {
      return;
    }

    const focus = buildEntityFocusState(selectedEntity);
    globe.pointOfView(
      {
        lat: focus.lat,
        lng: focus.lng,
        altitude: toGlobeAltitude(focus.height),
      },
      Math.round(focus.duration * 1000),
    );
    setCameraView({
      coordinates: [focus.lng, focus.lat],
      height: focus.height,
    });
    setLocalCameraHeight(focus.height);
    setCameraAtHome(false);
    setInitStage("camera-focus");
    logGlobeStage("camera-focus", { target: selectedEntity.id });
  }, [mode, selectedEntity, setCameraAtHome, setCameraView]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !cameraTarget || selectedEntity || mode !== "main") {
      return;
    }

    globe.pointOfView(
      {
        lat: cameraTarget.coordinates[1],
        lng: cameraTarget.coordinates[0],
        altitude: toGlobeAltitude(cameraTarget.height ?? 1_500_000),
      },
      1100,
    );
    setCameraView({
      coordinates: cameraTarget.coordinates,
      height: cameraTarget.height ?? 1_500_000,
    });
    setLocalCameraHeight(cameraTarget.height ?? 1_500_000);
    setCameraAtHome(false);
    setInitStage("camera-focus");
    logGlobeStage("camera-focus", { target: cameraTarget.label });
  }, [cameraTarget, mode, selectedEntity, setCameraAtHome, setCameraView]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || mode !== "main") {
      return;
    }

    globe.pointOfView(
      {
        lat: HOME_VIEW.lat,
        lng: HOME_VIEW.lng,
        altitude: toGlobeAltitude(HOME_VIEW.height),
      },
      1100,
    );
    setCameraView({
      coordinates: [HOME_VIEW.lng, HOME_VIEW.lat],
      height: HOME_VIEW.height,
    });
    setLocalCameraHeight(HOME_VIEW.height);
    setCameraAtHome(true);
    setInitStage("camera-home");
    logGlobeStage("camera-home");
  }, [homeSignal, mode, setCameraAtHome, setCameraView]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const search = new URLSearchParams(window.location.search);
    if (search.get("e2e") !== "1") {
      return;
    }

    window.__TOXINMAP_E2E__ = {
      getPointScreenPosition: (entityId: string) => {
        const globe = globeRef.current as GlobeMethods & {
          getScreenCoords?: (lat: number, lng: number, altitude?: number) => { x: number; y: number } | null;
        };
        const target = renderData.find((entity) => entity.id === entityId);
        if (!globe || !target || typeof globe.getScreenCoords !== "function") {
          return null;
        }

        return globe.getScreenCoords(target.lat, target.lng, target.pointAltitude);
      },
    };

    return () => {
      if (window.__TOXINMAP_E2E__) {
        delete window.__TOXINMAP_E2E__;
      }
    };
  }, [renderData]);

  if (globeFailed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#05070a,#090c10)]">
        <div className="max-w-xl rounded-[28px] border border-white/10 bg-[rgba(8,10,12,0.78)] px-6 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
            Public globe failed
          </p>
          <p className="mt-3 font-serif text-3xl tracking-[-0.05em] text-white">
            Three.js globe failed during initialization.
          </p>
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">
            Last completed stage: {initStage}
          </p>
          {failureMessage ? (
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">{failureMessage}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!GlobeComponent || viewport.width === 0 || viewport.height === 0) {
    return <div className="absolute inset-0 bg-[#05070a]" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <GlobeComponent
        ref={globeRef}
        width={viewport.width}
        height={viewport.height}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe
        showAtmosphere
        atmosphereColor="#88b8d4"
        atmosphereAltitude={0.11}
        globeImageUrl={EARTH_TEXTURE_URL}
        bumpImageUrl={EARTH_TOPOLOGY_URL}
        waitForGlobeReady
        animateIn={false}
        rendererConfig={{
          antialias: true,
          alpha: true,
          powerPreference: "default",
        }}
        pointsData={pointEntities}
        pointLat="lat"
        pointLng="lng"
        pointColor="pointColor"
        pointAltitude="pointAltitude"
        pointRadius="pointRadius"
        pointsMerge={false}
        pointsTransitionDuration={0}
        pointResolution={pointResolution}
        objectsData={objectEntities}
        objectLat="lat"
        objectLng="lng"
        objectAltitude="pointAltitude"
        objectThreeObject={(point) => {
          const entity = point as GlobeRenderableEntity;
          const isSelected = entity.id === selectedEntityId;
          const renderStyle = getLocalObjectRenderStyle(
            entity,
            globeRadius,
            cameraHeight,
            isSelected,
          );
          const group = new Group();
          const coreGeometry = new SphereGeometry(
            renderStyle.coreRadius,
            renderStyle.detail,
            renderStyle.detail,
          );
          const coreMaterial = new MeshStandardMaterial({
            color: entity.pointColor,
            emissive: entity.pointColor,
            emissiveIntensity: renderStyle.emissiveIntensity,
            metalness: 0.05,
            roughness: 0.42,
            transparent: true,
            opacity: entity.id === selectedEntityId ? 0.98 : 0.9,
          });
          const coreMesh = new Mesh(coreGeometry, coreMaterial);

          const haloGeometry = new SphereGeometry(
            renderStyle.haloRadius,
            Math.max(renderStyle.detail - 2, 10),
            Math.max(renderStyle.detail - 2, 10),
          );
          const haloMaterial = new MeshBasicMaterial({
            color: entity.pointColor,
            transparent: true,
            opacity: renderStyle.haloOpacity,
            depthWrite: false,
          });
          const haloMesh = new Mesh(haloGeometry, haloMaterial);

          const hitGeometry = new SphereGeometry(
            renderStyle.hitRadius,
            Math.max(renderStyle.detail - 4, 8),
            Math.max(renderStyle.detail - 4, 8),
          );
          const hitMaterial = new MeshBasicMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: 0.015,
            depthWrite: false,
          });
          const hitMesh = new Mesh(hitGeometry, hitMaterial);

          group.add(hitMesh);
          if (renderStyle.selectionBeaconRadius) {
            const beaconGeometry = new SphereGeometry(
              renderStyle.selectionBeaconRadius,
              Math.max(renderStyle.detail - 3, 10),
              Math.max(renderStyle.detail - 3, 10),
            );
            const beaconMaterial = new MeshBasicMaterial({
              color: mixColor(entity.pointColor, 0.36),
              transparent: true,
              opacity: renderStyle.selectionBeaconOpacity,
              depthWrite: false,
            });
            const beaconMesh = new Mesh(beaconGeometry, beaconMaterial);
            group.add(beaconMesh);
          }
          group.add(haloMesh);
          group.add(coreMesh);
          return group;
        }}
        showPointerCursor={() => true}
        onObjectClick={(point) => {
          const entity = point as GlobeRenderableEntity;
          activateEntity(entity);
        }}
        labelsData={inspectionLabels}
        labelLat="lat"
        labelLng="lng"
        labelAltitude="altitude"
        labelText="text"
        labelColor="color"
        labelSize="size"
        labelIncludeDot={false}
        labelResolution={2}
        labelsTransitionDuration={0}
        labelLabel={(label) => (label as MapInspectionLabel).text}
        onLabelClick={(label) => {
          const inspectionLabel = label as MapInspectionLabel;
          activateEntityById(inspectionLabel.entityId);
        }}
        onGlobeReady={() => {
          const globe = globeRef.current;
          if (!globe) {
            return;
          }

          globe.lights(globeLights);
          globe.pointOfView(
            {
              lat: HOME_VIEW.lat,
              lng: HOME_VIEW.lng,
              altitude: toGlobeAltitude(HOME_VIEW.height),
            },
            0,
          );

          const controls = globe.controls();
          const radius = globe.getGlobeRadius();
          setGlobeRadius(radius);
          controls.enablePan = false;
          controls.enableDamping = true;
          controls.dampingFactor = 0.07;
          controls.minDistance = radius * 1.035;
          controls.maxDistance = radius * 4.4;
          controls.rotateSpeed = 0.84;
          controls.zoomSpeed = 1.18;
          if ("zoomToCursor" in controls) {
            (controls as typeof controls & { zoomToCursor?: boolean }).zoomToCursor = true;
          }

          const renderer = globe.renderer();
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
          renderer.setClearColor(0x000000, 0);

          setCameraView({
            coordinates: [HOME_VIEW.lng, HOME_VIEW.lat],
            height: HOME_VIEW.height,
          });
          setLocalCameraHeight(HOME_VIEW.height);
          setCameraAtHome(true);
          setInitStage("globe-ready");
          logGlobeStage("globe-ready", { mode });
        }}
        onZoom={(pov) => {
          const height = clampCameraHeight(pov.altitude * EARTH_RADIUS_METERS);
          setLocalCameraHeight(height);
          setCameraView({
            coordinates: [pov.lng, pov.lat],
            height,
          });
          setCameraAtHome(Math.abs(height - HOME_VIEW.height) < 1_200_000 && !selectedEntityId);
        }}
        onPointClick={(point) => {
          const entity = point as GlobeRenderableEntity;
          activateEntity(entity);
        }}
        onGlobeClick={() => {
          setSelectedEntityId(null);
        }}
      />
      {mode === "debug" ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-[rgba(8,10,12,0.54)] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white backdrop-blur-md">
          Public Three.js globe
        </div>
      ) : null}
    </div>
  );
}
