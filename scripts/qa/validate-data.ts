import { mockCaseStudies } from "@/data/mock/case-studies";
import { mockEntities } from "@/data/mock/entities";
import { mockSources } from "@/data/mock/sources";
import { explorerLayerDefinitions } from "@/content/explorer-data";

type ValidationError = {
  scope: string;
  message: string;
};

function pushUniqueErrors(
  errors: ValidationError[],
  scope: string,
  items: string[],
  label: string,
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
      continue;
    }
    seen.add(item);
  }

  for (const duplicate of duplicates) {
    errors.push({
      scope,
      message: `Duplicate ${label}: ${duplicate}`,
    });
  }
}

function validate() {
  const errors: ValidationError[] = [];

  const sourceIds = new Set(mockSources.map((source) => source.id));
  const entityIds = new Set(mockEntities.map((entity) => entity.id));
  const caseStudySlugs = new Set(mockCaseStudies.map((study) => study.slug));
  const layerIds = new Set(explorerLayerDefinitions.map((layer) => layer.id));

  pushUniqueErrors(errors, "sources", mockSources.map((source) => source.id), "source id");
  pushUniqueErrors(errors, "sources", mockSources.map((source) => source.slug), "source slug");
  pushUniqueErrors(errors, "entities", mockEntities.map((entity) => entity.id), "entity id");
  pushUniqueErrors(
    errors,
    "entities",
    mockEntities.flatMap((entity) => (entity.slug ? [entity.slug] : [])),
    "entity slug",
  );
  pushUniqueErrors(errors, "case-studies", mockCaseStudies.map((study) => study.id), "case-study id");
  pushUniqueErrors(
    errors,
    "case-studies",
    mockCaseStudies.map((study) => study.slug),
    "case-study slug",
  );

  for (const entity of mockEntities) {
    if (!layerIds.has(entity.layerId)) {
      errors.push({
        scope: `entity:${entity.id}`,
        message: `Unknown layer id "${entity.layerId}"`,
      });
    }

    for (const sourceId of entity.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push({
          scope: `entity:${entity.id}`,
          message: `Unknown source id "${sourceId}"`,
        });
      }
    }

    for (const caseStudyId of entity.relatedCaseStudyIds) {
      if (!caseStudySlugs.has(caseStudyId)) {
        errors.push({
          scope: `entity:${entity.id}`,
          message: `Unknown related case-study slug "${caseStudyId}"`,
        });
      }
    }

    if (!entity.signalFamilies.length) {
      errors.push({
        scope: `entity:${entity.id}`,
        message: "Missing signalFamilies",
      });
    }

    if (!entity.chemicalMarkers.length) {
      errors.push({
        scope: `entity:${entity.id}`,
        message: "Missing chemicalMarkers",
      });
    }

    if (!entity.chemicalHighlights.length) {
      errors.push({
        scope: `entity:${entity.id}`,
        message: "Missing chemicalHighlights",
      });
    }
  }

  for (const study of mockCaseStudies) {
    for (const sourceId of study.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push({
          scope: `case-study:${study.slug}`,
          message: `Unknown source id "${sourceId}"`,
        });
      }
    }

    for (const entityId of study.relatedEntityIds) {
      if (!entityIds.has(entityId)) {
        errors.push({
          scope: `case-study:${study.slug}`,
          message: `Unknown related entity id "${entityId}"`,
        });
      }
    }
  }

  for (const source of mockSources) {
    if (source.lifecycle === "active-mock") {
      if (!source.originSite?.trim()) {
        errors.push({
          scope: `source:${source.id}`,
          message: "Active source is missing originSite",
        });
      }

      if (!source.upstreamDatasets?.length) {
        errors.push({
          scope: `source:${source.id}`,
          message: "Active source is missing upstreamDatasets",
        });
      }

      if (!source.downloadability) {
        errors.push({
          scope: `source:${source.id}`,
          message: "Active source is missing downloadability",
        });
      }

      if (!source.ingestionMethod) {
        errors.push({
          scope: `source:${source.id}`,
          message: "Active source is missing ingestionMethod",
        });
      }
    }
  }

  return {
    errors,
    summary: {
      sources: mockSources.length,
      entities: mockEntities.length,
      caseStudies: mockCaseStudies.length,
      layers: explorerLayerDefinitions.length,
    },
  };
}

const { errors, summary } = validate();

if (errors.length) {
  console.error("FAIL data integrity validation");
  for (const error of errors) {
    console.error(`- [${error.scope}] ${error.message}`);
  }
  process.exitCode = 1;
} else {
  console.log("PASS data integrity validation");
  console.log(JSON.stringify(summary, null, 2));
}
