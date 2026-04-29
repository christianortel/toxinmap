import { count, sql } from "drizzle-orm";
import { db, sql as sqlClient } from "@/db/client";
import {
  hazardousSites,
  healthConcernContext,
  industrialSites,
  pfasSites,
  powerPlants,
  reproductiveIndicators,
  sentinelSpeciesRecords,
  spermStudies,
  sourceRegistry,
  toxicReleaseRecords,
  wastewaterSites,
  fertilityTrends,
} from "@/db/schema";

async function main() {
  if (!db) {
    console.error("DATABASE_URL is not configured.");
    process.exitCode = 1;
    return;
  }

  const [
    [{ industrialCount }],
    [{ toxicReleaseCount }],
    [{ pfasCount }],
    [{ wastewaterCount }],
    [{ powerPlantCount }],
    [{ hazardousSiteCount }],
    [{ legalMarkerCount }],
    [{ sentinelSpeciesCount }],
    [{ reproductiveIndicatorCount }],
    [{ spermStudyCount }],
    [{ fertilityTrendCount }],
    [{ sourceCount }],
  ] = await Promise.all([
    db
      .select({ industrialCount: count() })
      .from(industrialSites)
      .where(sql`${industrialSites.location} IS NOT NULL`),
    db.select({ toxicReleaseCount: count() }).from(toxicReleaseRecords),
    db
      .select({ pfasCount: count() })
      .from(pfasSites)
      .where(sql`${pfasSites.location} IS NOT NULL`),
    db
      .select({ wastewaterCount: count() })
      .from(wastewaterSites)
      .where(sql`${wastewaterSites.outfallLocation} IS NOT NULL`),
    db
      .select({ powerPlantCount: count() })
      .from(powerPlants)
      .where(sql`${powerPlants.location} IS NOT NULL`),
    db
      .select({ hazardousSiteCount: count() })
      .from(hazardousSites)
      .where(sql`${hazardousSites.boundary} IS NOT NULL`),
    db.select({ legalMarkerCount: count() }).from(healthConcernContext),
    db
      .select({ sentinelSpeciesCount: count() })
      .from(sentinelSpeciesRecords)
      .where(sql`${sentinelSpeciesRecords.location} IS NOT NULL`),
    db.select({ reproductiveIndicatorCount: count() }).from(reproductiveIndicators),
    db
      .select({ spermStudyCount: count() })
      .from(spermStudies)
      .where(sql`${spermStudies.location} IS NOT NULL`),
    db.select({ fertilityTrendCount: count() }).from(fertilityTrends),
    db.select({ sourceCount: count() }).from(sourceRegistry),
  ]);

  console.log(
    JSON.stringify(
      {
        databaseUrlConfigured: true,
        industrialSites: industrialCount,
        toxicReleaseRecords: toxicReleaseCount,
        pfasSites: pfasCount,
        wastewaterSites: wastewaterCount,
        powerPlants: powerPlantCount,
        hazardousSites: hazardousSiteCount,
        legalMarkers: legalMarkerCount,
        sentinelSpeciesRecords: sentinelSpeciesCount,
        reproductiveIndicators: reproductiveIndicatorCount,
        spermStudies: spermStudyCount,
        fertilityTrends: fertilityTrendCount,
        sourceRegistry: sourceCount,
      },
      null,
      2,
    ),
  );

  await sqlClient?.end({ timeout: 5 });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
