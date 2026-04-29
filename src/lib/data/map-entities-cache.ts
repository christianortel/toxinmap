import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedMapEntitiesQuery } from "@/lib/data/query-params";
import type {
  ExplorerLayerGroup,
  ExplorerLayerId,
  ExplorerVisibleEntity,
} from "@/types/explorer";

const persistentMapEntitiesCacheNamespace = "schema-v32";

export const defaultMapEntitiesGroups: ExplorerLayerGroup[] = [
  "official",
  "emerging",
  "legal",
];

export const defaultHomeMapEntitiesLayerIds: ExplorerLayerId[] = [
  "industrial-sites",
  "air-toxics-regions",
  "power-plants",
  "hazardous-sites",
  "pfas-sites",
  "wastewater-sites",
  "sentinel-species",
  "reproductive-regions",
  "legal-markers",
];

export function getDefaultHomeMapEntitiesSearchParams() {
  return new URLSearchParams({
    year: "2025",
    cameraBand: "regional",
    centerLat: "37.9",
    centerLng: "-96.2",
    groups: defaultMapEntitiesGroups.join(","),
    layers: defaultHomeMapEntitiesLayerIds.join(","),
  });
}

export function getMapEntitiesCacheKey(
  query: ParsedMapEntitiesQuery,
  defaults: {
    groups: ExplorerLayerGroup[];
    layers: ExplorerLayerId[];
  },
) {
  return JSON.stringify({
    year: query.year ?? null,
    groups: query.groups ?? defaults.groups,
    layers: query.layers ?? defaults.layers,
    chips: query.chips ?? [],
    cameraBand: query.cameraBand,
    centerLat: query.centerLat ?? null,
    centerLng: query.centerLng ?? null,
    selectedEntityId: query.selectedEntityId ?? null,
  });
}

async function getMapEntitiesCacheDir() {
  const cacheDir = path.join(
    process.cwd(),
    ".local",
    "runtime-cache",
    "map-entities",
    persistentMapEntitiesCacheNamespace,
  );
  await mkdir(cacheDir, { recursive: true });
  return cacheDir;
}

function getMapEntitiesCacheRoot() {
  return path.join(process.cwd(), ".local", "runtime-cache", "map-entities");
}

export async function getMapEntitiesCacheFilePath(cacheKey: string) {
  const cacheDir = await getMapEntitiesCacheDir();
  const hashedKey = createHash("sha1").update(cacheKey).digest("hex");
  return path.join(cacheDir, `${hashedKey}.json`);
}

async function findLegacyMapEntitiesCacheFile(cacheKey: string) {
  const cacheRoot = getMapEntitiesCacheRoot();
  const hashedKey = `${createHash("sha1").update(cacheKey).digest("hex")}.json`;

  try {
    const namespaceEntries = await readdir(cacheRoot, { withFileTypes: true });
    for (const namespaceEntry of namespaceEntries) {
      if (!namespaceEntry.isDirectory()) {
        continue;
      }

      if (namespaceEntry.name === persistentMapEntitiesCacheNamespace) {
        continue;
      }

      if (namespaceEntry.name.startsWith("schema-")) {
        continue;
      }

      const legacyPath = path.join(cacheRoot, namespaceEntry.name, hashedKey);
      try {
        const payload = await readFile(legacyPath, "utf8");
        return {
          filePath: legacyPath,
          value: JSON.parse(payload) as ExplorerVisibleEntity[],
        };
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function readPersistentMapEntitiesCache(cacheKey: string) {
  try {
    const filePath = await getMapEntitiesCacheFilePath(cacheKey);
    const payload = await readFile(filePath, "utf8");
    return JSON.parse(payload) as ExplorerVisibleEntity[];
  } catch {
    const legacyPayload = await findLegacyMapEntitiesCacheFile(cacheKey);
    if (!legacyPayload) {
      return null;
    }

    await writePersistentMapEntitiesCache(cacheKey, legacyPayload.value);
    return legacyPayload.value;
  }
}

export async function writePersistentMapEntitiesCache(
  cacheKey: string,
  value: ExplorerVisibleEntity[],
) {
  const filePath = await getMapEntitiesCacheFilePath(cacheKey);
  await writeFile(filePath, JSON.stringify(value), "utf8");
  return filePath;
}
