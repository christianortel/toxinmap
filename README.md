# toxinmap.com

A U.S. toxin map.

toxinmap.com is a U.S.-first toxin map for exploring toxic releases, PFAS contamination context, wastewater pathways, modeled air-toxics screening, and literature-backed emerging chemical concern near real places.

## Concept framing

This project is intentionally not a causation engine.

It is a public-interest map designed to make different evidence classes legible side by side:

- direct measurement
- proxy
- screening signal
- literature evidence
- editorial case study

The core product rule is simple: overlap does not equal proof.

## Integrated source plan

toxinmap.com combines direct U.S. operational datasets with reference products that shape how the map behaves and how it explains chemical context.

Direct ingest / primary operational sources:

- EPA TRI / EPA Where You Live for reported releases and chemical drilldown
- EPA FRS for facility identity and cross-dataset linking
- EPA ECHO for permits, enforcement, and compliance context
- ATSDR PFAS Sites Map for documented PFAS sites
- USGS PFAS dashboard and geonarrative for PFAS sampling context
- EPA NPDES wastewater and biosolids context for discharge pathways
- USGS pharmaceuticals research context for wastewater-linked sampling

Reference products and methodology inputs:

- ProPublica ToxMap for neighborhood burden framing and point-plus-risk behavior
- EDF CEAM for chemical grouping and class framing
- Clear Collaborative pollution map for cumulative signal framing
- EWG PFAS contamination and suspected-discharge maps for PFAS visibility and QA benchmarks
- IPEN Plastic Map and the Plastic Health Map paper for plastics and microplastics literature taxonomy
- ArcGIS PFAS community resources map for PFAS site and resource cross-checking

The source registry in `/sources` makes explicit whether toxinmap uses each source as `direct-ingest`, `derived-from-methodology`, or `reference-only`.

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
  Primary U.S. toxin map experience with renderer, search, layer toggles, nearby results, and detail panel
- `/explore`
  Alias of the main toxin map experience
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

4. If you want the app to read from Postgres/PostGIS instead of ETL or mock fallback data, start a local PostGIS instance if Docker is available:

```bash
docker compose up -d
```

5. Run the migration and seed the source registry:

```bash
npm run db:migrate
npm run db:seed:sources
```

6. Optional: load the current state-scoped U.S. MVP backbone into the database:

```bash
npm run db:load:us-mvp
```

7. Optional: run the resumable national load workflow:

```bash
npm run db:load:national
```

8. Check current row counts:

```bash
npm run db:status
```

9. Start the managed local stack on the fixed app port:

```bash
npm run local:up -- -AllowDegradedWithoutDb
```

10. Check stack status:

```bash
npm run local:status
```

11. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

If you only want the app process without the managed local runtime helper, you can still use:

```bash
npm run dev
```

12. Stop the managed local app:

```bash
npm run local:down
```

If browser extensions inject DOM attributes before React hydrates, you may see hydration noise in development. For renderer debugging, use a clean Chrome profile or temporarily disable intrusive extensions first.

## Environment notes

- `NEXT_PUBLIC_CESIUM_ACCESS_TOKEN`
  Optional. Required for Cesium Ion services such as World Terrain.
- `NEXT_PUBLIC_CESIUM_BASE_URL`
  Public Cesium asset base path. The default works for local development in this repo.
- `NEXT_PUBLIC_ENABLE_CESIUM_TERRAIN`
  Set to `true` only when a valid Cesium token is available.
- `DATABASE_URL`
  Required for live Postgres/PostGIS-backed official layers and source registry reads.
- `TOXINMAP_ALLOW_DATABASE_FALLBACK`
  Allows local builds and local runtime to fall back to ETL-backed data when `DATABASE_URL` is configured but the database is not reachable.
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
- `npm run db:doctor`
  Diagnose whether a usable PostgreSQL/PostGIS runtime exists locally and print the remaining blockers / next steps
- `npm run db:install:postgres`
  Attempt a quiet local PostgreSQL 17 install; must be run from an elevated PowerShell session
- `npm run db:bootstrap:portable`
  Prepare or start a repo-local PostgreSQL/PostGIS runtime from official binaries when PostGIS extension files are present under `.local/postgresql-bin/pgsql`
- `npm run db:load:us-mvp`
  Run the current state-scoped U.S. MVP ETL load sequence into a configured database
- `npm run db:load:national`
  Run the resumable national ETL load sequence into a configured database using checkpointed FRS, ECHO, and NPDES batches
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
- `npm run qa:validate-home-atlas-cache`
  Verify the persistent public home atlas cache exists and the first live `/api/map-entities` home query returns quickly on a fresh process
- `npm run local:up`
  Build and start one managed app server on `127.0.0.1:3000`, optionally in degraded ETL fallback mode when the DB is unavailable, and seed the persistent public home atlas cache before startup
- `npm run local:seed:home-atlas`
  Seed or reuse the persistent public home atlas cache without starting the app server
- `npm run local:status`
  Report app listener health, DB reachability, API health, and the managed runtime log paths
- `npm run local:down`
  Stop the managed local app process
- `npm run local:verify`
  Run the sequential local release-readiness check against `127.0.0.1:3000`, including smoke, live API validation, and a summary of remaining hard blockers

## Mock data and real-data integration

The project uses a mixed data path:

- official source layers can be served from Postgres/PostGIS when `DATABASE_URL` is configured and the U.S. backbone has been loaded
- when PostGIS is unavailable, toxinmap can still read normalized ETL CSV outputs from `scripts/etl/cleaned` for a partial source-backed U.S. map tier
- secondary and caution-heavy context can continue to use structured content where false precision would be misleading
- fallback U.S. map entities remain available when the database is not configured, so the globe is still usable during local development
- the repo now supports a portable PostgreSQL bootstrap path under `.local`, but the official Windows PostGIS artifact is still an installer bundle; until `postgis.control` and `postgis*.dll` are actually present under `.local/postgresql-bin/pgsql`, `db:bootstrap:portable` will fail fast with the exact blocker instead of starting an incomplete database

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
