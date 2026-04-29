import { sql as sqlClient } from "@/db/client";

type EntitiesResponse = Array<{
  id: string;
  layerId: string;
}>;

const TEMP_INDUSTRIAL_SLUG = "cache-refresh-industrial-temp";
const TEMP_FRS_ID = "CACHE-REFRESH-FRS-001";

function getBaseUrl() {
  return process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
}

async function fetchEntities(baseUrl: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/entities`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Expected /api/entities to return 200, received ${response.status}.`);
      }

      return (await response.json()) as EntitiesResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }

  throw lastError ?? new Error("Failed to fetch /api/entities.");
}

function getIndustrialCount(entities: EntitiesResponse) {
  return entities.filter((entity) => entity.layerId === "industrial-sites").length;
}

async function cleanupTempRow() {
  if (!sqlClient) {
    throw new Error("DATABASE_URL is required for cache-refresh validation.");
  }

  await sqlClient`
    delete from industrial_sites
    where slug = ${TEMP_INDUSTRIAL_SLUG}
  `;
}

async function insertTempRow() {
  if (!sqlClient) {
    throw new Error("DATABASE_URL is required for cache-refresh validation.");
  }

  await sqlClient`
    insert into industrial_sites (
      slug,
      facility_name,
      operator_name,
      naics_code,
      status,
      location,
      active_year,
      date_range_label,
      category,
      subcategory,
      layer_group,
      evidence_type,
      confidence_level,
      geographic_level,
      summary,
      notes,
      tags,
      source_ids,
      source_name,
      source_url,
      source_updated_at,
      ingestion_version,
      metadata
    )
    values (
      ${TEMP_INDUSTRIAL_SLUG},
      ${"Cache refresh validation facility"},
      ${"Toxinmap QA"},
      ${"325199"},
      ${"reported"},
      ST_SetSRID(ST_Point(${-78.889}, ${34.991}), 4326),
      ${2024},
      ${"2024"},
      ${"Facility footprint"},
      ${"Cache refresh validation"},
      ${"official"},
      ${"proxy"},
      ${"high"},
      ${"facility"},
      ${"Synthetic row used to verify repository cache invalidation after DB changes."},
      ${"Validation-only row."},
      ${JSON.stringify(["validation", "cache-refresh", "industrial"])}::jsonb,
      ${JSON.stringify(["epa-frs"])}::jsonb,
      ${"Cache refresh validator"},
      ${"https://example.test/cache-refresh"},
      ${"2026-04-16T00:00:00+00:00"},
      ${"cache_refresh_validation_v1"},
      ${JSON.stringify({
        frsId: TEMP_FRS_ID,
        signalFamilies: ["industrial"],
        chemicalMarkers: ["benzene"],
        locationLabel: "Cape Fear test focus",
      })}::jsonb
    )
    on conflict (slug) do update set
      facility_name = excluded.facility_name,
      operator_name = excluded.operator_name,
      naics_code = excluded.naics_code,
      status = excluded.status,
      location = excluded.location,
      active_year = excluded.active_year,
      date_range_label = excluded.date_range_label,
      category = excluded.category,
      subcategory = excluded.subcategory,
      layer_group = excluded.layer_group,
      evidence_type = excluded.evidence_type,
      confidence_level = excluded.confidence_level,
      geographic_level = excluded.geographic_level,
      summary = excluded.summary,
      notes = excluded.notes,
      tags = excluded.tags,
      source_ids = excluded.source_ids,
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      source_updated_at = excluded.source_updated_at,
      ingestion_version = excluded.ingestion_version,
      metadata = excluded.metadata,
      updated_at = now()
  `;
}

async function waitForEntityState(
  baseUrl: string,
  expectation: {
    expectTempEntity: boolean;
    minimumIndustrialCount?: number;
  },
  label: string,
) {
  const deadline = Date.now() + 120_000;
  let lastCount = -1;
  let lastPresence = false;

  while (Date.now() < deadline) {
    const entities = await fetchEntities(baseUrl);
    lastCount = getIndustrialCount(entities);
    lastPresence = entities.some((entity) => entity.id === TEMP_INDUSTRIAL_SLUG);

    const meetsCountExpectation =
      typeof expectation.minimumIndustrialCount === "number"
        ? lastCount >= expectation.minimumIndustrialCount
        : true;

    if (meetsCountExpectation && lastPresence === expectation.expectTempEntity) {
      return {
        industrialCount: lastCount,
        tempEntityPresent: lastPresence,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `${label} did not reach the expected cache state. ` +
      `Expected tempEntityPresent=${expectation.expectTempEntity}` +
      (typeof expectation.minimumIndustrialCount === "number"
        ? ` with industrialCount >= ${expectation.minimumIndustrialCount}`
        : "") +
      ", " +
      `last observed industrial count ${lastCount} and tempEntityPresent=${lastPresence}.`,
  );
}

async function main() {
  const baseUrl = getBaseUrl();

  await cleanupTempRow();

  try {
    const baselineEntities = await fetchEntities(baseUrl);
    const baselineIndustrialCount = getIndustrialCount(baselineEntities);

    if (baselineEntities.some((entity) => entity.id === TEMP_INDUSTRIAL_SLUG)) {
      throw new Error("Expected cache-refresh temp industrial row to be absent before validation starts.");
    }

    await insertTempRow();
    const afterInsert = await waitForEntityState(
      baseUrl,
      {
        minimumIndustrialCount: baselineIndustrialCount + 1,
        expectTempEntity: true,
      },
      "Post-insert cache refresh",
    );

    await cleanupTempRow();
    const afterDelete = await waitForEntityState(
      baseUrl,
      {
        minimumIndustrialCount: baselineIndustrialCount,
        expectTempEntity: false,
      },
      "Post-delete cache refresh",
    );

    console.log("PASS entity cache refresh validation");
    console.log(
      JSON.stringify(
        {
          baseUrl,
          baselineIndustrialCount,
          afterInsert,
          afterDelete,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanupTempRow();
    await sqlClient?.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("FAIL entity cache refresh validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
