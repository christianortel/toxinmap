import { defineConfig } from "drizzle-kit";
import { loadLocalEnv } from "./src/lib/env/load-local-env";

loadLocalEnv();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
