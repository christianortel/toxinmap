import { performance } from "node:perf_hooks";
import { closeDbConnection } from "@/db/client";
import { getVisibleMapEntities } from "@/lib/data/repository";
import {
  defaultHomeMapEntitiesLayerIds,
  defaultMapEntitiesGroups,
  getDefaultHomeMapEntitiesSearchParams,
  getMapEntitiesCacheFilePath,
  getMapEntitiesCacheKey,
  readPersistentMapEntitiesCache,
  writePersistentMapEntitiesCache,
} from "@/lib/data/map-entities-cache";
import { parseMapEntitiesQuery } from "@/lib/data/query-params";

type SeedSummary = {
  status: "reused" | "seeded";
  cachePath: string;
  visibleEntities: number;
  elapsedMs: number;
};

export async function seedDefaultHomeAtlasCache(force = false): Promise<SeedSummary> {
  const query = parseMapEntitiesQuery(getDefaultHomeMapEntitiesSearchParams());
  const cacheKey = getMapEntitiesCacheKey(query, {
    groups: [...defaultMapEntitiesGroups],
    layers: [...defaultHomeMapEntitiesLayerIds],
  });
  const cachePath = await getMapEntitiesCacheFilePath(cacheKey);
  const startedAt = performance.now();

  if (!force) {
    const cached = await readPersistentMapEntitiesCache(cacheKey);
    if (cached) {
      return {
        status: "reused",
        cachePath,
        visibleEntities: cached.length,
        elapsedMs: Math.round(performance.now() - startedAt),
      };
    }
  }

  const visibleEntities = await getVisibleMapEntities(query);
  await writePersistentMapEntitiesCache(cacheKey, visibleEntities);

  return {
    status: "seeded",
    cachePath,
    visibleEntities: visibleEntities.length,
    elapsedMs: Math.round(performance.now() - startedAt),
  };
}

async function main() {
  try {
    const force = process.argv.includes("--force");
    const summary = await seedDefaultHomeAtlasCache(force);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await closeDbConnection();
  }
}

main().catch((error) => {
  console.error("FAIL home atlas cache seed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
