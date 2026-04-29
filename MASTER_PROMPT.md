# MASTER_PROMPT

Use this prompt when handing `toxinmap.com` to a new engineer or a new coding agent.

---

## Master Prompt

You are taking over `toxinmap.com`, a U.S.-first environmental intelligence globe built in Next.js. This is not a generic dashboard, a story site, or a Cesium experiment. It is a **single-product 3D globe investigation surface** where users can:

- open the globe immediately
- search a place
- zoom from national to regional to local
- click concrete markers
- inspect evidence-backed environmental risk context
- understand what is measured directly versus inferred or contextual

Your job is to continue the product with source truth, runtime truth, and interaction truth. Do not re-derive the product from scratch. Read the repo continuity files first, then build from the verified current state.

Mandatory continuity files:

- `PROJECT_STATUS.md`
- `TODO_BACKLOG.md`
- `DECISIONS.md`

If they are missing, recreate them from repo truth. If they exist, reconcile them with the code and the live runtime before changing anything.

---

## Product Definition

This project is a **globe-first toxin investigation product**.

What it is:

- a full-screen 3D U.S.-first globe
- a broad-to-local investigation tool
- an environmental source-truth map
- a place-based evidence surface
- a concrete marker exploration product

What it is not:

- not a generic GIS layer dump
- not a heatmap-only experience
- not a stories-first editorial site
- not a “show every row at once” atlas
- not a Cesium lock-in project

User intent:

- zoom out to see national and regional patterns
- zoom in to inspect actual facilities, wastewater sites, PFAS records, legal pressure, cleanup context, and derived environmental regions
- click markers and get evidence-backed detail
- trust that each visible marker is worth clicking

The visual product should feel calm, premium, and readable, but the real value is not aesthetics alone. The value is **trustworthy, source-backed, investigation-useful interaction**.

---

## Core Non-Negotiables

1. The public product is the globe.
2. `/` and `/explore` are the main product surface.
3. Public rendering stays on the Three.js globe path unless a better working 3D renderer is implemented deliberately.
4. Cesium is diagnostic-only unless explicitly restored for a proven reason.
5. The atlas must remain concrete-first at broad scale.
6. DB-backed source truth beats fallback convenience.
7. Continuity files must reflect verified reality, not aspiration.
8. Do not mark work complete unless it actually works on the live local runtime.

---

## Current Verified Runtime State

At the time this prompt was written, the repo is in this verified state:

- app URL: `http://127.0.0.1:3000`
- public renderer: Three.js
- managed runtime mode: `prod-start`
- database reachable: `localhost:5432`
- `readyForLocalUse = true`
- `readyForFullLocalStack = true`
- `dataMode = database`

Current verified totals from `/api/health`:

- `totalEntities = 383,940`
- `totalLayers = 9`
- `industrialSites = 361,445`
- `toxicReleaseRecords = 76,218`
- `pfasSites = 749`
- `wastewaterSites = 3,236`
- `powerPlants = 188`
- `hazardousSites = 1,506`
- `legalMarkers = 133,261`
- `sentinelSpecies = 0`
- `sourceRegistry = 27`

Current verified layer source truth:

- preferred core layer source:
  - `industrialSites = database`
  - `pfasSites = database`
  - `wastewaterSites = database`
- preferred derived layer source:
  - `airToxicsRegions = database`
  - `reproductiveRegions = database`
  - `sentinelSpecies = etl-file`

Do not blindly trust these numbers in the future. Re-verify them from:

- `npm run local:status`
- `npm run local:verify`
- `/api/health`

---

## Current Product Contracts

### 1. Broad-Band Opening Atlas Contract

The opening regional atlas is intentionally bounded. It is not supposed to show every possible row.

Current verified opening atlas:

- `visible = 49`
- `industrial-sites = 17`
- `pfas-sites = 10`
- `wastewater-sites = 8`
- `hazardous-sites = 1`
- `legal-markers = 8`
- `air-toxics-regions = 5`

The broad-band opening atlas must stay:

- concrete-first
- readable
- source-truthful
- investigation-useful

That means:

- `industrial + pfas + wastewater + hazardous` must outweigh `legal + air`
- wastewater must stay actionable and NPDES-backed at opening scale
- PFAS must stay geographically diverse and concrete
- legal markers must stay cluster-truthful
- air-toxics regions must stay quality-gated

### 2. PFAS Opening Contract

Broad-band PFAS is not allowed to collapse into a single region or a single source family.

Current verified PFAS opening contract:

- `usgsTapwater = 8`
- `atsdrSites = 2`
- `pfasAggregates = 0`
- `pfasChemistryRich = 8`
- exact-coordinate duplicate PFAS points are not allowed

Meaning:

- PFAS opening markers should be direct points, not aggregates, when source-backed direct points exist
- ATSDR point rows must not get clustered away if real point visibility is possible
- broad-band PFAS should preserve geographic diversity

### 3. Wastewater Opening Contract

At opening scale, wastewater is an investigation entry path, not a research-sampling showcase.

Meaning:

- prefer `epa-npdes` wastewater infrastructure at broad scale
- do not allow `usgs-pharma` to retake the whole broad-band wastewater slice
- local and nearby views can still use pharma context where it is actually relevant

### 4. Hazard Opening Contract

The opening hazard slot is bounded and intentional.

Current contract:

- at most one broad-band `hazardous-sites` marker
- that marker must represent strong cleanup context

Examples of allowed strength signals:

- `epa-tri`
- positive `TRI ids`
- positive `Federal cases`
- richer linked-program cleanup context
- overlap with `legal-pressure` or `wastewater`

### 5. Legal Opening Contract

Broad-band legal markers are clusters. They must explain the cluster, not leak bland representative metadata.

Required legal behavior:

- opening legal markers must surface cluster-level signals
- must not degrade back to generic `FRS registry match` style text
- must preserve wastewater-linked legal context when present

Current verified legal quality:

- `legalMarkersWithClusterSignals = 8`
- `legalMarkersWithStrongAggregation = 7`
- `legalMarkersWithWastewaterContext = 2`

### 6. Air Opening Contract

Broad-band air is contextual, not generic burden wallpaper.

Current air gate:

- `epa-echo` required
- `Legal overlap >= 50` required

This is allowed to reduce the opening air count if the next available row is weak.

Current verified air quality:

- `airToxicsRegionsWithLegalOverlap = 5`
- `airToxicsRegionsWithStrongLegalOverlap = 5`
- `airToxicsRegionsWithoutLegalOverlap = 0`
- `airToxicsRegionsWithoutEcho = 0`

Current opening air rows:

- `ROCKFORD, IL`
- `INDIANAPOLIS, IN`
- `ELKHART, IN`
- `CHICAGO, IL`
- `ATLANTA, GA`

---

## Local and Focused Investigation Contracts

### Camera Bands

The globe uses explicit camera bands:

- `national`
- `regional`
- `local`

These are meaningful product states, not just visual zoom levels.

### Local Radius

Local view is investigative, not regional:

- local radius = `120` miles

This exists to avoid surfacing truthful but irrelevant distant facilities in focused local investigation.

### Local Ranking

Focused local ordering is based on:

- source strength
- investigation relevance
- distance from the current center

It is intentionally balanced so one layer does not monopolize first-read local context when PFAS, wastewater, and industrial signals all matter.

### Click Behavior

Dense click upgrades are only allowed for broad context layers:

- `industrial-sites`
- `power-plants`
- `air-toxics-regions`
- `reproductive-regions`
- `sentinel-species`

Explicit clicks on concrete rows must be preserved:

- `pfas-sites`
- `wastewater-sites`
- `hazardous-sites`
- `legal-markers`

### Browser Verification Contract

The repo includes hidden e2e hooks because the globe is canvas-driven.

The browser verification flow must continue to prove:

- regional PFAS click opens a real visible PFAS drawer
- Cape Fear drilldown reaches local band
- explicit wastewater clicks preserve the clicked wastewater drawer

Do not remove the browser verification contract unless you replace it with something stronger.

---

## Source Truth Rules

This project is built on strict layer-by-layer source precedence.

### Current real source expectations

Core layers:

- `industrial-sites = database`
- `pfas-sites = database`
- `wastewater-sites = database`

Derived layers:

- `air-toxics-regions = database`
- `reproductive-regions = database`
- `sentinel-species = etl-file`

Supplemental DB-backed layers:

- `power-plants = database`
- `hazardous-sites = database`
- `legal-markers = database`

### Important source-truth rule

Do not promote a layer to `database` just because schema tables exist.

A DB-backed promotion is only valid if:

- atlas-ready rows exist
- geospatial rows are real and usable
- the display path is defensible
- validation proves the live route is using those DB rows

That is why:

- `sentinel-species` is still ETL-backed

### Chemours PFAS Truth

Do not invent tighter Chemours PFAS coverage than the source set supports.

Current explicit truth:

- nearest official PFAS record to Chemours: `NC_1_Priv` at `62.3` miles
- nearest official GenX-bearing sample: `NC_5_Pub` at `70.9` miles

If a closer official source is later ingested, update:

- DB ingestion
- nearby/detail coverage notes
- validation

---

## Runtime and Verification Rules

### Runtime truth

The source of truth for the app process is the actual listener on `127.0.0.1:3000`.

Managed runtime scripts must stay aligned:

- `local:up`
- `local:down`
- `local:status`
- `local:verify`

### Health truth

`local:verify` must accept:

- raw `/api/health` shape
- flattened `local:status` health summary shape

This was a real bug before. Do not reintroduce it.

### DB client truth

The repo uses a bounded global Postgres singleton in `src/db/client.ts`.

That prevents:

- connection exhaustion
- silent runtime drift back into ETL-backed behavior

Do not revert to unbounded client creation.

### Cache truth

The home atlas uses persistent cache semantics under:

- `.local/runtime-cache/map-entities/schema-v*`

If you change atlas-selection semantics materially:

1. bump the schema namespace
2. reseed the home atlas
3. verify the live route on a fresh runtime

Do not reuse an old schema after a semantic selection change.

---

## Files That Matter Most

If you are new to the repo, start with these:

### Continuity

- `PROJECT_STATUS.md`
- `TODO_BACKLOG.md`
- `DECISIONS.md`
- `reports/toxinmap-work-journal.md`

### Product behavior

- `src/lib/map/entity-transforms.ts`
- `src/lib/map/entity-priority.ts`
- `src/lib/map/click-selection.ts`
- `src/lib/map/entity-activation.ts`
- `src/components/explore/three-safe-globe.tsx`
- `src/components/explore/globe-shell-supported.tsx`
- `src/components/explore/detail-drawer-shell.tsx`

### Data and repository truth

- `src/lib/data/repository.ts`
- `src/lib/data/etl-file-repository.ts`
- `src/lib/data/map-entities-cache.ts`
- `src/lib/data/query-params.ts`
- `src/db/client.ts`

### Runtime

- `scripts/local/up.ps1`
- `scripts/local/down.ps1`
- `scripts/local/status.ps1`
- `scripts/local/verify.ps1`

### Validation

- `scripts/qa/validate-home-atlas-cache.ts`
- `scripts/qa/validate-live-api.ts`
- `scripts/qa/validate-zoom-drilldown.ts`
- `scripts/qa/validate-local-focus-priority.ts`
- `scripts/qa/validate-browser-interactions.ts`
- `scripts/qa/validate-pfas-coverage-notes.ts`
- `scripts/qa/smoke.ts`

---

## How to Work Each Run

At the start of each run:

1. Read:
   - `PROJECT_STATUS.md`
   - `TODO_BACKLOG.md`
   - `DECISIONS.md`
2. Reconcile docs with actual repo and runtime state.
3. Choose the highest-leverage unfinished task.
4. Implement a real vertical slice.
5. Verify it with commands, not assumptions.

At the end of each run:

1. Update:
   - `PROJECT_STATUS.md`
   - `TODO_BACKLOG.md`
   - `DECISIONS.md`
2. Record what actually changed.
3. Record what was learned.
4. Record the next exact highest-value task.

Do not:

- do docs-only runs unless explicitly asked
- report “complete” without runtime proof
- widen the product scope unnecessarily
- regress source truth for convenience
- let validators drift from real current behavior

---

## Required Validation Baseline

Unless the task clearly cannot affect runtime behavior, use as much of this set as relevant:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run local:down`
- `npm run local:up`
- `npm run local:status`
- `npm run qa:validate-home-atlas-cache`
- `npm run local:verify`

For source-truth or API work, also use:

- `npm run qa:validate-live-api`

For zoom / interaction work, also use:

- `npm run qa:validate-zoom-drilldown`
- `npm run qa:validate-local-focus-priority`
- `npm run qa:validate-browser-interactions`

For PFAS coverage truth, also use:

- `npm run qa:validate-pfas-coverage-notes`

---

## Current Next Task

The next highest-priority unresolved product question is:

**Should the opening atlas stay at `5` high-quality `air-toxics-regions`, or should it reclaim a sixth slot only if another region can meet the same quality bar?**

Constraints for that next slice:

- do not regress:
  - `industrial-sites = 17`
  - `pfas-sites = 10`
  - `wastewater-sites = 8`
  - `hazardous-sites = 1`
  - `legal-markers = 8`
  - `air-toxics-regions = 5`
- do not weaken:
  - `epa-echo` requirement
  - `Legal overlap >= 50` requirement
- preserve:
  - PFAS concrete direct-point opening slice
  - cluster-truthful legal context
  - actionable NPDES wastewater path
  - strong bounded hazard slot

If you are taking over this repo fresh, start there.

---

## Short Version

`toxinmap.com` is a DB-backed, Three.js U.S. toxin investigation globe. Keep it globe-first, concrete-first, source-truthful, and validator-backed. Read the continuity files first, preserve the verified opening atlas contract, and only expand or rebalance the atlas when the new result is demonstrably more investigation-useful than the old one.
