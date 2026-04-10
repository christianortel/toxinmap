# toxinmap.com

A U.S. toxin globe.

toxinmap.com is a U.S.-first 3D globe for exploring toxic releases, PFAS contamination context, wastewater pathways, modeled air-toxics screening, and literature-backed emerging chemical concern near real places.

## Concept framing

This project is intentionally not a causation engine.

It is a public-interest map designed to make different evidence classes legible side by side:

- direct measurement
- proxy
- screening signal
- literature evidence
- editorial case study

The core product rule is simple: overlap does not equal proof.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Framer Motion
- Zustand
- TanStack Query
- d3
- CesiumJS + Resium
- Drizzle ORM
- PostgreSQL + PostGIS
- Python ETL for EPA TRI / FRS / ECHO normalization

## Route overview

- `/`
  Primary U.S. globe experience with search, locate-me, nearby results, layers, timeline, and detail drawer
- `/explore`
  Alias of the main globe experience
- `/case-studies`
  Editorial index of structured case files
- `/case-studies/[slug]`
  Detailed case-study reading experience
- `/methodology`
  Evidence framework, interpretation guardrails, and causation caution
- `/sources`
  Source registry with cadence, geography, caveats, and methodological use
- `/about`
  Mission and editorial posture

## Project structure

- `src/app`
  Routes and API handlers
- `src/components`
  Shared UI, editorial components, and explorer HUD/globe components
- `src/content`
  Compatibility exports and shared explorer definitions
- `src/data/mock`
  Centralized mock entities, sources, case studies, geographies, and methodology data
- `src/lib/data`
  Evidence helpers, source registry helpers, bootstrap logic, adapters, and repository-style accessors
- `src/lib/map`
  Explorer transforms, search, legend, layer registry, and camera logic
- `src/store`
  Zustand explorer state
- `src/db`
  Drizzle schema and database helper
- `drizzle`
  Generated Drizzle SQL migration artifacts
- `db/sql`
  SQL-first schema notes and supplemental SQL
- `scripts/etl`
  EPA ingestion, normalization, and optional Postgres loaders
- `scripts/db`
  Database seed, status, and U.S. MVP load helpers
- `reports`
  Phase plans, implementation reports, and handoff notes

## Local development

1. Install dependencies:

```bash
npm install
```

2. Duplicate `.env.example` as `.env.local`.

3. Add a Cesium token if you want Ion-backed globe features such as World Terrain.

4. If you want the app to read from Postgres/PostGIS instead of mock fallback data, start a local PostGIS instance if Docker is available:

```bash
docker compose up -d
```

5. Run the migration and seed the source registry:

```bash
npm run db:migrate
npm run db:seed:sources
```

6. Optional: load the current U.S. MVP backbone into the database:

```bash
npm run db:load:us-mvp
```

7. Check current row counts:

```bash
npm run db:status
```

8. Start the app:

```bash
npm run dev
```

9. Open [http://localhost:3000](http://localhost:3000).

## Environment notes

- `NEXT_PUBLIC_CESIUM_ACCESS_TOKEN`
  Optional. Required for Cesium Ion services such as World Terrain.
- `NEXT_PUBLIC_CESIUM_BASE_URL`
  Public Cesium asset base path. The default works for local development in this repo.
- `NEXT_PUBLIC_ENABLE_CESIUM_TERRAIN`
  Set to `true` only when a valid Cesium token is available.
- `DATABASE_URL`
  Required for live Postgres/PostGIS-backed official layers and source registry reads.
- `DOWNSTREAM_DISABLE_DB_BOOTSTRAP`
  Optional. Set to `true` if you want to prevent automatic source-registry seeding in environments with a writable database.

## Scripts

- `npm run dev`
  Start the local development server
- `npm run build`
  Production build
- `npm run start`
  Run the production server after build
- `npm run lint`
  ESLint validation
- `npm run typecheck`
  TypeScript validation
- `npm run format`
  Prettier formatting
- `npm run db:generate`
  Generate Drizzle artifacts
- `npm run db:migrate`
  Apply generated Drizzle migrations
- `npm run db:push`
  Push schema changes to a configured database
- `npm run db:seed:sources`
  Seed the `source_registry` table from the typed source model
- `npm run db:status`
  Print current database row counts for the main live source tables
- `npm run db:load:us-mvp`
  Run the current U.S. MVP ETL load sequence into a configured database
- `npm run etl:demo`
  Generate the older demo ETL output
- `npm run etl:frs`
  Download and normalize EPA FRS facilities/linkages
- `npm run etl:tri`
  Download and normalize EPA TRI Basic Data
- `npm run etl:echo`
  Download and normalize EPA ECHO ICIS FE&C data
- `npm run etl:atsdr-pfas`
  Download and normalize ATSDR PFAS site records
- `npm run etl:usgs-pfas`
  Download and normalize USGS PFAS dashboard sample points
- `npm run etl:npdes-wastewater`
  Download and normalize EPA NPDES wastewater and biosolids context
- `npm run etl:usgs-pharma`
  Download and normalize USGS pharmaceutical and wastewater-indicator research context
- `npm run data:validate`
  Validate mock entities, case-study links, layer ids, and active source-lineage metadata
- `npm run qa:smoke`
  Run a lightweight runtime smoke pass against a running local or deployed server

## Mock data and real-data integration

The project uses a mixed data path:

- official source layers can be served from Postgres/PostGIS when `DATABASE_URL` is configured and the U.S. backbone has been loaded
- secondary and caution-heavy context can continue to use structured content where false precision would be misleading
- fallback U.S. map entities remain available when the database is not configured, so the globe is still usable during local development

The project is organized around planned U.S. source families including:

- EPA TRI
- EPA FRS
- EPA ECHO
- EPA SEMS / Superfund
- power-plant context via eGRID / EIA
- watershed context via USGS hydrography
- ATSDR PFAS sites
- USGS PFAS tap-water sampling context
- PFAS and pharmaceuticals research context
- carefully bounded reproductive-health and public-health context
- editorial case-study records

The first real-data backbone is centered on:

- EPA FRS as the canonical facility identity layer
- EPA TRI as direct reported release context
- EPA ECHO ICIS FE&C as compliance and enforcement context

Those jobs live in [`scripts/etl`](./scripts/etl) and write cleaned outputs plus loader manifests before optional database load.

The repo now also includes a lightweight local database path:

1. `docker compose up -d`
2. `npm run db:migrate`
3. `npm run db:seed:sources`
4. `npm run db:load:us-mvp`
5. `npm run db:status`

## Methodology note

Some public datasets do not exist at the precision people might expect.

That is why the project explicitly avoids fabricating:

- local sperm-count maps
- local egg-production maps
- falsely precise wildlife coverage
- falsely precise nationwide microplastics maps
- direct causation claims unsupported by source material

Where direct measurement does not exist, the interface uses clearly labeled proxy, literature, screening, or editorial framing instead.

## Validation

The preferred validation pass is:

```bash
npm run lint
npm run typecheck
npm run build
npm run data:validate
```

For runtime QA against a running server:

```bash
npm run qa:smoke
```

## Handoff

See the reports in [`reports/`](./reports) for phase plans, implementation summaries, and the final handoff notes.
