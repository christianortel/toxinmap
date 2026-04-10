import { count } from "drizzle-orm";
import { db, sql } from "@/db/client";
import {
  industrialSites,
  pfasSites,
  sourceRegistry,
  wastewaterSites,
} from "@/db/schema";

async function main() {
  if (!db || !sql) {
    console.error("DATABASE_URL is not configured.");
    process.exitCode = 1;
    return;
  }

  const [
    [{ industrialCount }],
    [{ pfasCount }],
    [{ wastewaterCount }],
    [{ sourceCount }],
  ] = await Promise.all([
    db.select({ industrialCount: count() }).from(industrialSites),
    db.select({ pfasCount: count() }).from(pfasSites),
    db.select({ wastewaterCount: count() }).from(wastewaterSites),
    db.select({ sourceCount: count() }).from(sourceRegistry),
  ]);

  console.log(
    JSON.stringify(
      {
        databaseUrlConfigured: true,
        industrialSites: industrialCount,
        pfasSites: pfasCount,
        wastewaterSites: wastewaterCount,
        sourceRegistry: sourceCount,
      },
      null,
      2,
    ),
  );

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
