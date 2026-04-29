export {};

import {
  buildGlobeRenderableEntities,
  buildMapInspectionLabels,
  getMapInspectionLabelPresentation,
  getLocalObjectRenderStyle,
  selectedInspectionLabelExclusionDistanceDegrees,
  splitGlobeRenderableEntities,
  type GlobeRenderableEntity,
} from "@/lib/map/globe-rendering";
import {
  resolveExplorerEntityActivation,
  resolveExplorerEntityActivationById,
} from "@/lib/map/entity-activation";
import type { ExplorerVisibleEntity } from "@/types/explorer";

type Scenario = {
  id: string;
  label: string;
  center: [number, number];
  selectedLayer?: ExplorerVisibleEntity["layerId"];
};

const liveLabelAuditCameraHeight = 320_000;

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }

  return (await response.json()) as T;
}

function getSquaredCoordinateDistance(
  left: Pick<GlobeRenderableEntity, "lat" | "lng">,
  right: Pick<GlobeRenderableEntity, "lat" | "lng">,
) {
  const latDelta = left.lat - right.lat;
  const lngDelta = left.lng - right.lng;
  return latDelta * latDelta + lngDelta * lngDelta;
}

function isInsideSelectedExclusionZone(
  entity: GlobeRenderableEntity,
  selectedEntity: GlobeRenderableEntity,
) {
  return (
    getSquaredCoordinateDistance(entity, selectedEntity) <=
    selectedInspectionLabelExclusionDistanceDegrees *
      selectedInspectionLabelExclusionDistanceDegrees
  );
}

function buildMapEntitiesPath(scenario: Scenario) {
  const params = new URLSearchParams({
    year: "2024",
    cameraBand: "local",
    centerLng: scenario.center[0].toString(),
    centerLat: scenario.center[1].toString(),
    groups: "official,emerging,legal",
  });

  return `/api/map-entities?${params.toString()}`;
}

function selectRepresentativeEntity(
  scenario: Scenario,
  objectEntities: GlobeRenderableEntity[],
) {
  const byLayer = scenario.selectedLayer
    ? objectEntities.find((entity) => entity.layerId === scenario.selectedLayer)
    : null;

  return byLayer ?? objectEntities[0] ?? null;
}

async function validateScenario(baseUrl: string, scenario: Scenario) {
  const localView = await fetchJson<ExplorerVisibleEntity[]>(
    baseUrl,
    buildMapEntitiesPath(scenario),
  );
  const initialRenderableEntities = buildGlobeRenderableEntities(localView, {
    cameraBand: "local",
    cameraHeight: liveLabelAuditCameraHeight,
    selectedEntityId: null,
  });
  const initialSplit = splitGlobeRenderableEntities(initialRenderableEntities, "local");
  const selectedCandidate = selectRepresentativeEntity(scenario, initialSplit.objectEntities);

  if (!selectedCandidate) {
    throw new Error(`${scenario.label}: expected at least one local concrete point record.`);
  }

  const renderableEntities = buildGlobeRenderableEntities(localView, {
    cameraBand: "local",
    cameraHeight: liveLabelAuditCameraHeight,
    selectedEntityId: selectedCandidate.id,
  });
  const { objectEntities } = splitGlobeRenderableEntities(renderableEntities, "local");
  const selectedEntity = objectEntities.find((entity) => entity.id === selectedCandidate.id);
  const unselectedBaseline = initialSplit.objectEntities.find(
    (entity) => entity.id === selectedCandidate.id,
  );

  if (!selectedEntity) {
    throw new Error(`${scenario.label}: selected local point was not retained on the object layer.`);
  }

  if (!unselectedBaseline) {
    throw new Error(`${scenario.label}: selected local point was not retained in the unselected baseline.`);
  }

  if (!(selectedEntity.pointRadius > unselectedBaseline.pointRadius)) {
    throw new Error(`${scenario.label}: selected marker radius did not exceed its unselected baseline.`);
  }

  if (!(selectedEntity.pointAltitude > unselectedBaseline.pointAltitude)) {
    throw new Error(`${scenario.label}: selected marker altitude did not exceed its unselected baseline.`);
  }

  const selectedRenderStyle = getLocalObjectRenderStyle(
    selectedEntity,
    100,
    liveLabelAuditCameraHeight,
    true,
  );
  const unselectedRenderStyle = getLocalObjectRenderStyle(
    selectedEntity,
    100,
    liveLabelAuditCameraHeight,
    false,
  );

  if (!selectedRenderStyle.selectionBeaconRadius) {
    throw new Error(`${scenario.label}: selected marker did not receive a selection beacon.`);
  }

  if (!(selectedRenderStyle.selectionBeaconRadius > selectedRenderStyle.haloRadius)) {
    throw new Error(`${scenario.label}: selected marker beacon did not exceed halo radius.`);
  }

  if (!(selectedRenderStyle.selectionBeaconOpacity > 0)) {
    throw new Error(`${scenario.label}: selected marker beacon opacity was not visible.`);
  }

  if (unselectedRenderStyle.selectionBeaconRadius !== null) {
    throw new Error(`${scenario.label}: unselected marker style unexpectedly received a beacon.`);
  }

  if (!(selectedRenderStyle.haloOpacity > unselectedRenderStyle.haloOpacity)) {
    throw new Error(`${scenario.label}: selected marker halo was not stronger than unselected halo.`);
  }

  const labels = buildMapInspectionLabels(objectEntities, "local", selectedEntity.id);
  const selectedLabel = labels.find((label) => label.entityId === selectedEntity.id);
  const unselectedLabels = labels.filter((label) => !label.isSelected);
  const adjacentCandidates = objectEntities.filter(
    (entity) => entity.id !== selectedEntity.id && isInsideSelectedExclusionZone(entity, selectedEntity),
  );
  const fartherCandidates = objectEntities.filter(
    (entity) => entity.id !== selectedEntity.id && !isInsideSelectedExclusionZone(entity, selectedEntity),
  );

  if (!selectedLabel?.isSelected) {
    throw new Error(`${scenario.label}: expected selected record to keep a selected inspection label.`);
  }

  if (labels[0]?.entityId !== selectedEntity.id) {
    throw new Error(`${scenario.label}: expected selected inspection label to be first.`);
  }

  if (!selectedLabel.text.includes(selectedEntity.title)) {
    throw new Error(`${scenario.label}: selected label must include the selected record title.`);
  }

  const selectedLabelPresentation = getMapInspectionLabelPresentation(selectedEntity);
  const selectedLabelFragments = [
    selectedLabelPresentation.layerLabel,
    selectedLabelPresentation.sourceLabel,
    selectedLabelPresentation.evidenceLabel,
    selectedLabelPresentation.confidenceLabel,
  ];

  if (selectedLabelPresentation.sourceLabel === "Source") {
    throw new Error(`${scenario.label}: selected label did not derive a concrete source label.`);
  }

  for (const fragment of selectedLabelFragments) {
    if (!selectedLabel.text.includes(fragment)) {
      throw new Error(
        `${scenario.label}: selected label must include ${fragment} context.`,
      );
    }
  }

  if (selectedLabel.text !== selectedLabelPresentation.selectedText) {
    throw new Error(`${scenario.label}: selected label text drifted from shared presentation rules.`);
  }

  if (labels.length > 5) {
    throw new Error(`${scenario.label}: expected inspection labels to stay capped at 5.`);
  }

  if (unselectedLabels.some((label) => label.text.includes("confidence"))) {
    throw new Error(`${scenario.label}: unselected labels should stay short and omit confidence copy.`);
  }

  for (const label of unselectedLabels) {
    const labelEntity = objectEntities.find((entity) => entity.id === label.entityId);
    if (!labelEntity) {
      throw new Error(`${scenario.label}: unselected label ${label.entityId} was not backed by an object entity.`);
    }

    const labelPresentation = getMapInspectionLabelPresentation(labelEntity);
    if (label.text !== labelPresentation.unselectedText) {
      throw new Error(
        `${scenario.label}: unselected label ${label.entityId} drifted from compact layer/title presentation.`,
      );
    }
  }

  if (unselectedLabels.some((label) => label.size >= selectedLabel.size)) {
    throw new Error(`${scenario.label}: selected label should remain larger than unselected labels.`);
  }

  const adjacentLabelIds = new Set(adjacentCandidates.map((entity) => entity.id));
  const leakedAdjacentLabel = unselectedLabels.find((label) => adjacentLabelIds.has(label.entityId));
  if (leakedAdjacentLabel) {
    throw new Error(
      `${scenario.label}: selected-adjacent label ${leakedAdjacentLabel.entityId} should have been suppressed.`,
    );
  }

  if (fartherCandidates.length > 0 && unselectedLabels.length === 0) {
    throw new Error(
      `${scenario.label}: farther local context exists but no unselected label survived suppression.`,
    );
  }

  const labelActivationParity = labels.map((label) => {
    const labelEntity = renderableEntities.find((entity) => entity.id === label.entityId);

    if (!labelEntity) {
      throw new Error(`${scenario.label}: label ${label.entityId} does not map to a visible entity.`);
    }

    const markerActivation = resolveExplorerEntityActivation({
      entity: labelEntity,
      visibleEntities: renderableEntities,
      cameraBand: "local",
    });
    const labelActivation = resolveExplorerEntityActivationById({
      entityId: label.entityId,
      visibleEntities: renderableEntities,
      cameraBand: "local",
    });

    if (!labelActivation) {
      throw new Error(`${scenario.label}: label ${label.entityId} did not resolve to a live entity activation.`);
    }

    if (JSON.stringify(labelActivation) !== JSON.stringify(markerActivation)) {
      throw new Error(
        `${scenario.label}: label ${label.entityId} activation drifted from marker activation.`,
      );
    }

    return {
      id: label.entityId,
      selected: label.isSelected,
      activation: labelActivation,
    };
  });

  const selectedLabelActivation = labelActivationParity.find(
    (entry) => entry.id === selectedLabel.entityId,
  )?.activation;

  if (!selectedLabelActivation) {
    throw new Error(`${scenario.label}: selected label activation was not captured.`);
  }

  return {
    id: scenario.id,
    label: scenario.label,
    visible: localView.length,
    objectEntities: objectEntities.length,
    selected: {
      id: selectedEntity.id,
      title: selectedEntity.title,
      layerId: selectedEntity.layerId,
    },
    renderEmphasis: {
      selectedRadius: Number(selectedEntity.pointRadius.toFixed(5)),
      unselectedRadius: Number(unselectedBaseline.pointRadius.toFixed(5)),
      selectedAltitude: Number(selectedEntity.pointAltitude.toFixed(5)),
      unselectedAltitude: Number(unselectedBaseline.pointAltitude.toFixed(5)),
      beaconRadius: Number(selectedRenderStyle.selectionBeaconRadius.toFixed(5)),
      beaconOpacity: Number(selectedRenderStyle.selectionBeaconOpacity.toFixed(3)),
      selectedHaloOpacity: Number(selectedRenderStyle.haloOpacity.toFixed(3)),
      unselectedHaloOpacity: Number(unselectedRenderStyle.haloOpacity.toFixed(3)),
    },
    adjacentSuppressed: adjacentCandidates.length,
    fartherCandidates: fartherCandidates.length,
    labels: labels.map((label) => ({
      id: label.entityId,
      selected: label.isSelected,
      text: label.text,
      size: label.size,
    })),
    selectedLabelPresentation: selectedLabelPresentation,
    activationParity: {
      selectedLabel: selectedLabelActivation,
      labels: labelActivationParity,
    },
  };
}

async function main() {
  const baseUrl =
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const scenarios: Scenario[] = [
    {
      id: "cape-fear-pfas",
      label: "Cape Fear PFAS local drilldown",
      center: [-78.88, 34.98],
      selectedLayer: "pfas-sites",
    },
    {
      id: "apex-wastewater",
      label: "Apex wastewater local drilldown",
      center: [-78.4528, 35.3848],
      selectedLayer: "wastewater-sites",
    },
  ];
  const results = [];

  for (const scenario of scenarios) {
    results.push(await validateScenario(baseUrl, scenario));
  }

  console.log("PASS live label quality");
  console.log(JSON.stringify({ baseUrl, scenarios: results }, null, 2));
}

main().catch((error) => {
  console.error("FAIL live label quality");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
