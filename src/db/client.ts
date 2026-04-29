import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "@/lib/env/load-local-env";

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;

const postgresOptions = {
  max: 4,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
} as const;

type SqlClient = ReturnType<typeof postgres>;
type DbClient = ReturnType<typeof drizzle>;

declare global {
  var __toxinmapSqlClient: SqlClient | undefined;
  var __toxinmapDbClient: DbClient | undefined;
}

function createSqlClient() {
  if (!connectionString) {
    return null;
  }

  return postgres(connectionString, postgresOptions);
}

export const sql =
  connectionString ?
    (globalThis.__toxinmapSqlClient ??= createSqlClient() ?? undefined)
  : null;

export const db =
  sql ?
    (globalThis.__toxinmapDbClient ??= drizzle(sql))
  : null;

export async function closeDbConnection() {
  if (!sql) {
    return;
  }

  await sql.end({ timeout: 5 });
  globalThis.__toxinmapSqlClient = undefined;
  globalThis.__toxinmapDbClient = undefined;
}
