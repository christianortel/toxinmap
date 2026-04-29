import { NextResponse } from "next/server";
import {
  getMapEntitiesCacheKey,
  readPersistentMapEntitiesCache,
  writePersistentMapEntitiesCache,
} from "@/lib/data/map-entities-cache";
import { getVisibleMapEntities } from "@/lib/data/repository";
import { parseMapEntitiesQuery } from "@/lib/data/query-params";
import { layerRegistry } from "@/lib/map/layer-registry";
import type { ExplorerLayerGroup, ExplorerVisibleEntity } from "@/types/explorer";

const defaultGroups: ExplorerLayerGroup[] = ["official", "emerging", "legal"];
const mapEntitiesCacheTtlMs = 300_000;

type MapEntitiesRouteCache = typeof globalThis & {
  __toxinmapMapEntitiesCache?: Map<
    string,
    {
      loadedAt: number;
      value?: ExplorerVisibleEntity[];
      pending?: Promise<ExplorerVisibleEntity[]>;
    }
  >;
};

function getMapEntitiesRouteCache() {
  const cache = globalThis as MapEntitiesRouteCache;
  if (!cache.__toxinmapMapEntitiesCache) {
    cache.__toxinmapMapEntitiesCache = new Map();
  }

  return cache.__toxinmapMapEntitiesCache;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseMapEntitiesQuery(searchParams);
  const cacheKey = getMapEntitiesCacheKey(query, {
    groups: defaultGroups,
    layers: layerRegistry.map((layer) => layer.id),
  });
  const cache = getMapEntitiesRouteCache();
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached?.value && now - cached.loadedAt <= mapEntitiesCacheTtlMs) {
    return NextResponse.json(cached.value);
  }

  if (cached?.pending) {
    return NextResponse.json(await cached.pending);
  }

  const persistentCache = await readPersistentMapEntitiesCache(cacheKey);
  if (persistentCache) {
    cache.set(cacheKey, {
      loadedAt: now,
      value: persistentCache,
    });
    return NextResponse.json(persistentCache);
  }

  const pending = (async () => {
    return getVisibleMapEntities(query);
  })();

  cache.set(cacheKey, {
    loadedAt: now,
    pending,
  });

  try {
    const visibleEntities = await pending;
    await writePersistentMapEntitiesCache(cacheKey, visibleEntities);
    cache.set(cacheKey, {
      loadedAt: Date.now(),
      value: visibleEntities,
    });
    return NextResponse.json(visibleEntities);
  } catch (error) {
    cache.delete(cacheKey);
    throw error;
  }
}
