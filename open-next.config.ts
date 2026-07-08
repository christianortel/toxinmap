// OpenNext adapter config for deploying this Next.js app to Cloudflare Workers.
// Default config (no ISR queue / tag cache) is enough to build and deploy.
// See https://opennext.js.org/cloudflare
//
// NOTE: this app reads a TCP Postgres database (src/db/client.ts →
// postgres(process.env.DATABASE_URL)). Cloudflare Workers cannot open raw TCP
// connections to Postgres without Cloudflare Hyperdrive, so /api routes that
// touch the DB will fail at runtime until Hyperdrive (or a Workers-compatible
// data layer) is configured. This config only unblocks the deploy step.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
