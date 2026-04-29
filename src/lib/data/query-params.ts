import { z } from "zod";
import type { EvidenceType, LayerGroup } from "@/types/data";
import type { ExplorerCameraBand, ExplorerFilterChip, ExplorerLayerId } from "@/types/explorer";

export const layerGroupValues = [
  "official",
  "emerging",
  "wildlife",
  "reproductive",
  "legal",
] as const satisfies LayerGroup[];

export const evidenceTypeValues = [
  "Direct Measurement",
  "Proxy",
  "Screening Signal",
  "Literature Evidence",
  "Editorial Case Study",
] as const satisfies EvidenceType[];

const layerGroupSchema = z.enum(layerGroupValues);
const evidenceTypeSchema = z.enum(evidenceTypeValues);

export type ParsedEntityQuery = {
  layerGroup?: LayerGroup;
  layerId?: ExplorerLayerId;
  evidenceType?: EvidenceType;
  category?: string;
  sourceId?: string;
  relatedCaseStudyId?: string;
  year?: number;
  limit?: number;
};

export type ParsedNearbyQuery = {
  lat: number;
  lng: number;
  radiusMiles: number;
  year?: number;
  groups?: LayerGroup[];
  layers?: ExplorerLayerId[];
  chips?: ExplorerFilterChip[];
};

export type ParsedMapEntitiesQuery = {
  year?: number;
  groups?: LayerGroup[];
  layers?: ExplorerLayerId[];
  chips?: ExplorerFilterChip[];
  cameraBand: ExplorerCameraBand;
  centerLat?: number;
  centerLng?: number;
  selectedEntityId?: string;
};

export type ParsedSourceQuery = {
  layerGroup?: LayerGroup;
  sourceId?: string;
};

export type ParsedCaseStudyQuery = {
  category?: string;
  tag?: string;
  sourceId?: string;
};

function cleanString(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function splitValues(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseEntityQuery(searchParams: URLSearchParams): ParsedEntityQuery {
  const yearValue = cleanString(searchParams.get("year"));
  const layerGroupValue = cleanString(searchParams.get("layerGroup"));
  const evidenceTypeValue = cleanString(searchParams.get("evidenceType"));

  return {
    layerGroup: layerGroupValue ? layerGroupSchema.safeParse(layerGroupValue).data : undefined,
    layerId: cleanString(searchParams.get("layerId"))
      ? explorerLayerIdSchema.safeParse(cleanString(searchParams.get("layerId"))).data
      : undefined,
    evidenceType: evidenceTypeValue
      ? evidenceTypeSchema.safeParse(evidenceTypeValue).data
      : undefined,
    category: cleanString(searchParams.get("category")),
    sourceId: cleanString(searchParams.get("sourceId")),
    relatedCaseStudyId: cleanString(searchParams.get("relatedCaseStudyId")),
    year: yearValue ? z.coerce.number().int().safeParse(yearValue).data : undefined,
    limit: z.coerce.number().int().positive().max(5000).safeParse(cleanString(searchParams.get("limit"))).data,
  };
}

export function parseSourceQuery(searchParams: URLSearchParams): ParsedSourceQuery {
  const layerGroupValue = cleanString(searchParams.get("layerGroup"));

  return {
    layerGroup: layerGroupValue ? layerGroupSchema.safeParse(layerGroupValue).data : undefined,
    sourceId: cleanString(searchParams.get("sourceId")),
  };
}

export function parseCaseStudyQuery(searchParams: URLSearchParams): ParsedCaseStudyQuery {
  return {
    category: cleanString(searchParams.get("category")),
    tag: cleanString(searchParams.get("tag")),
    sourceId: cleanString(searchParams.get("sourceId")),
  };
}

const explorerLayerIdValues = [
  "industrial-sites",
  "air-toxics-regions",
  "power-plants",
  "hazardous-sites",
  "pfas-sites",
  "wastewater-sites",
  "sentinel-species",
  "reproductive-regions",
  "legal-markers",
  "cluster",
] as const satisfies ExplorerLayerId[];

const explorerFilterChipValues = [
  "downstream",
  "drinking-water",
  "community-pressure",
  "wildlife-anomaly",
  "fertility-context",
  "litigation",
] as const satisfies ExplorerFilterChip[];

const explorerLayerIdSchema = z.enum(explorerLayerIdValues);
const explorerFilterChipSchema = z.enum(explorerFilterChipValues);

export function parseNearbyQuery(searchParams: URLSearchParams): ParsedNearbyQuery | null {
  const parsedLatitude = z.coerce.number().safeParse(cleanString(searchParams.get("lat")));
  const parsedLongitude = z.coerce.number().safeParse(cleanString(searchParams.get("lng")));

  if (!parsedLatitude.success || !parsedLongitude.success) {
    return null;
  }

  const parsedRadius = z.coerce.number().positive().max(250).safeParse(
    cleanString(searchParams.get("radius")),
  );
  const parsedYear = z.coerce.number().int().safeParse(cleanString(searchParams.get("year")));

  const groups = splitValues(searchParams.get("groups"))
    .map((value) => layerGroupSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);

  const layers = splitValues(searchParams.get("layers"))
    .map((value) => explorerLayerIdSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);

  const chips = splitValues(searchParams.get("chips"))
    .map((value) => explorerFilterChipSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);

  return {
    lat: parsedLatitude.data,
    lng: parsedLongitude.data,
    radiusMiles: parsedRadius.success ? parsedRadius.data : 50,
    year: parsedYear.success ? parsedYear.data : undefined,
    groups: groups.length ? groups : undefined,
    layers: layers.length ? layers : undefined,
    chips: chips.length ? chips : undefined,
  };
}

export function parseMapEntitiesQuery(searchParams: URLSearchParams): ParsedMapEntitiesQuery {
  const parsedYear = z.coerce.number().int().safeParse(cleanString(searchParams.get("year")));
  const parsedCameraBand = z
    .enum(["national", "regional", "local"])
    .safeParse(cleanString(searchParams.get("cameraBand")));
  const parsedCenterLat = z.coerce.number().safeParse(cleanString(searchParams.get("centerLat")));
  const parsedCenterLng = z.coerce.number().safeParse(cleanString(searchParams.get("centerLng")));

  const groups = splitValues(searchParams.get("groups"))
    .map((value) => layerGroupSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);

  const layers = splitValues(searchParams.get("layers"))
    .map((value) => explorerLayerIdSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);

  const chips = splitValues(searchParams.get("chips"))
    .map((value) => explorerFilterChipSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);

  return {
    year: parsedYear.success ? parsedYear.data : undefined,
    groups: groups.length ? groups : undefined,
    layers: layers.length ? layers : undefined,
    chips: chips.length ? chips : undefined,
    cameraBand: parsedCameraBand.success ? parsedCameraBand.data : "national",
    centerLat: parsedCenterLat.success ? parsedCenterLat.data : undefined,
    centerLng: parsedCenterLng.success ? parsedCenterLng.data : undefined,
    selectedEntityId: cleanString(searchParams.get("selectedEntityId")),
  };
}
