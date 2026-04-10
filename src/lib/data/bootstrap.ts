import { count, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { sourceRegistry } from "@/db/schema";
import { mockSources } from "@/data/mock/sources";
import { buildSourceRegistryInsertValue } from "@/lib/data/adapters";

let sourceRegistrySeedPromise: Promise<void> | null = null;

export async function ensureSourceRegistrySeeded() {
  if (!db || process.env.DOWNSTREAM_DISABLE_DB_BOOTSTRAP === "true") {
    return false;
  }

  if (!sourceRegistrySeedPromise) {
    sourceRegistrySeedPromise = (async () => {
      const [{ total }] = await db.select({ total: count() }).from(sourceRegistry);

      if (Number(total) > 0) {
        return;
      }

      await db
        .insert(sourceRegistry)
        .values(mockSources.map((source) => buildSourceRegistryInsertValue(source)))
        .onConflictDoUpdate({
          target: sourceRegistry.slug,
          set: {
            name: sql`excluded.name`,
            shortName: sql`excluded.short_name`,
            sourceType: sql`excluded.source_type`,
            lifecycle: sql`excluded.lifecycle`,
            programTier: sql`excluded.program_tier`,
            layerGroups: sql`excluded.layer_groups`,
            supportedEvidence: sql`excluded.supported_evidence`,
            geographicScope: sql`excluded.geographic_scope`,
            geographicLevel: sql`excluded.geographic_level`,
            spatialResolution: sql`excluded.spatial_resolution`,
            updateCadence: sql`excluded.update_cadence`,
            completenessTags: sql`excluded.completeness_tags`,
            description: sql`excluded.description`,
            caveats: sql`excluded.caveats`,
            confidenceNote: sql`excluded.confidence_note`,
            methodologicalUse: sql`excluded.methodological_use`,
            originSite: sql`excluded.origin_site`,
            upstreamDatasets: sql`excluded.upstream_datasets`,
            downloadability: sql`excluded.downloadability`,
            ingestionMethod: sql`excluded.ingestion_method`,
            externalUrl: sql`excluded.external_url`,
            sourceUpdatedAt: sql`excluded.source_updated_at`,
            updatedAt: sql`now()`,
          },
        });
    })().catch((error) => {
      sourceRegistrySeedPromise = null;
      throw error;
    });
  }

  await sourceRegistrySeedPromise;
  return true;
}

export async function upsertSourceRegistrySeed() {
  if (!db) {
    throw new Error("DATABASE_URL is required to seed the source registry.");
  }

  await db
    .insert(sourceRegistry)
    .values(mockSources.map((source) => buildSourceRegistryInsertValue(source)))
    .onConflictDoUpdate({
      target: sourceRegistry.slug,
      set: {
        name: sql`excluded.name`,
        shortName: sql`excluded.short_name`,
        sourceType: sql`excluded.source_type`,
        lifecycle: sql`excluded.lifecycle`,
        programTier: sql`excluded.program_tier`,
        layerGroups: sql`excluded.layer_groups`,
        supportedEvidence: sql`excluded.supported_evidence`,
        geographicScope: sql`excluded.geographic_scope`,
        geographicLevel: sql`excluded.geographic_level`,
        spatialResolution: sql`excluded.spatial_resolution`,
        updateCadence: sql`excluded.update_cadence`,
        completenessTags: sql`excluded.completeness_tags`,
        description: sql`excluded.description`,
        caveats: sql`excluded.caveats`,
        confidenceNote: sql`excluded.confidence_note`,
        methodologicalUse: sql`excluded.methodological_use`,
        originSite: sql`excluded.origin_site`,
        upstreamDatasets: sql`excluded.upstream_datasets`,
        downloadability: sql`excluded.downloadability`,
        ingestionMethod: sql`excluded.ingestion_method`,
        externalUrl: sql`excluded.external_url`,
        sourceUpdatedAt: sql`excluded.source_updated_at`,
        updatedAt: sql`now()`,
      },
    });
}
