# DECISIONS

## 2026-04-13 - Continuity files are mandatory

- `PROJECT_STATUS.md`, `TODO_BACKLOG.md`, and `DECISIONS.md` are the continuity layer for future runs.
- They must be updated from verified repo state, not memory or aspiration.

## 2026-04-13 - Keep Three.js as the public renderer

- Public `/` and `/explore` remain on the Three.js renderer path.
- Cesium stays diagnostic-only unless it becomes clearly stable enough to justify returning.

## 2026-04-13 - Local views are an investigation surface

- Close zoom is not just regional context.
- Local views must prefer concrete, clickable records over broad overlays.
- Regional context remains available, but it must not dominate the focused record stack.

## 2026-04-13 - Local focus radius is investigative, not regional

- The `local` radius is `120` miles.
- This keeps focused local views from surfacing truthful but irrelevant distant facilities.

## 2026-04-14 - Focused local ordering uses blended distance and source priority

- Focused local ordering is based on source strength plus distance from the current center.
- This preserves stronger source-backed records while letting closer comparable facilities outrank farther comparable ones.

## 2026-04-14 - Dense click upgrades are only for broad context layers

- Dense click upgrades are limited to broad context layers:
  - `industrial-sites`
  - `power-plants`
  - `air-toxics-regions`
  - `reproductive-regions`
  - `sentinel-species`
- Explicit clicks on concrete `pfas-sites`, `wastewater-sites`, `hazardous-sites`, and `legal-markers` are preserved.

## 2026-04-15 - Browser verification is part of local readiness

- `local:verify` includes browser interaction validation.
- `readyForLocalUse` means server health, live API behavior, zoom drilldown, and browser interaction flow all pass together.

## 2026-04-15 - Browser verification uses a query-gated e2e bridge

- The public globe remains canvas-driven.
- Deterministic browser verification uses a hidden `e2e=1` bridge that drives activation logic through DOM buttons instead of brittle pixel-coordinate clicks.

## 2026-04-15 - NPDES outfall IDs are treated as suffixed live entities

- Wastewater IDs include outfall suffixes such as `-001`, `-001p`, and related variants.
- Validators and browser checks must target the real current IDs or titles, not stale unsuffixed placeholders.

## 2026-04-15 - Core atlas source precedence is judged layer by layer

- The merged atlas prefers the higher-coverage source per core layer rather than forcing a single global source.
- Full core readiness means the DB tier wins for industrial, PFAS, and wastewater layers.

## 2026-04-16 - Core DB counts must reflect usable spatial rows

- `databaseCoreCounts` and `db:status` should count usable geocoded rows, not raw table rows.
- Rows without geometry should not be allowed to make the DB tier look more complete than the live map can actually render.

## 2026-04-16 - PFAS DB readiness requires both USGS and ATSDR source families

- The PFAS DB cutover was not complete when only the USGS PFAS rows were present in Postgres.
- Core PFAS readiness requires both:
  - USGS PFAS tap-water rows
  - ATSDR PFAS site rows

## 2026-04-16 - Full local stack is complete for the core atlas

- `local:verify` returns:
  - `readyForLocalUse = true`
  - `readyForFullLocalStack = true`
  - `dataMode = database`
- The core stack bring-up milestone is closed.

## 2026-04-16 - Runtime truthfulness beats optimistic process bookkeeping

- The source of truth for the managed app process is the active listener on `127.0.0.1:3000`, not the initial launcher PID.
- Runtime scripts should stop the real Next.js process tree and self-heal `managedPid` toward the listener PID when needed.

## 2026-04-16 - Health checks must match real endpoint latency

- `/api/health` is a valid readiness source, but it is not consistently sub-5-second.
- Runtime health polling and `Get-AppHealth` must use realistic request timeouts and retries instead of assuming a very fast health endpoint.

## 2026-04-16 - Cache freshness validation should assert visibility, not static global totals

- The database can still change underneath validation.
- Cache refresh validation should prove that a temp row appears and disappears through `/api/entities`; it should not assume the rest of the global industrial count is frozen.

## 2026-04-16 - Warm atlas performance is a supported runtime optimization

- Warm-path visible-entity performance is allowed to rely on cache layers.
- Performance work should improve real user response time first, then reduce structural rebuild cost second.

## 2026-04-16 - Home atlas caching is now persistent, not post-start HTTP warmed

- The first public home atlas request should be fast without an HTTP prewarm against the running server.
- `/api/map-entities` now uses a persistent disk cache under `.local/runtime-cache/map-entities/schema-v1`.
- `local:up` seeds the public home atlas cache before app start instead of hitting `/api/map-entities` after startup.

## 2026-04-16 - Persistent map-entities cache must survive rebuilds

- A build-scoped cache namespace forced unnecessary full reseeds after every `npm run build`.
- The persistent map-entities cache now uses a stable schema namespace and adopts older build-scoped cache files when present.

## 2026-04-16 - Browser verification timeouts must match real cold navigation

- Browser interaction validation is part of readiness, but it must allow the real latency envelope of a fresh local process.
- `qa:validate-browser-interactions` now uses explicit longer navigation and default action timeouts instead of brittle Playwright defaults.

## 2026-04-16 - Cold home atlas seed cost remains the next performance milestone

- The first live home atlas request is now fast because the route can read the persistent cache immediately.
- The remaining performance gap is the raw cost of creating that cache from scratch when it does not already exist.

## 2026-04-16 - Broad-band map queries should cap before hydrating the full atlas

- The cold home-atlas bottleneck was not only cache reuse.
- Broad-band `map-entities` queries were hydrating far more DB rows than the globe could ever render at once.
- National and regional DB-backed map queries now cap per layer before entity hydration so broad views do not pay for the full atlas.

## 2026-04-16 - ETL layer loading must be lazy per source family

- A single ETL `legal-markers` supplement was previously triggering all ETL CSV loads.
- ETL layer loading is now split so each layer only reads the source files it actually needs.
- This matters for cold-start performance even when the public route is primarily DB-backed.

## 2026-04-16 - Standalone DB-backed scripts must close their DB handle

- The forced home-atlas seed was completing in seconds but timing out at the shell because the postgres handle stayed open.
- Standalone DB-backed scripts now explicitly close the DB connection when their work is complete.

## 2026-04-16 - Industrial validation must accept source-rich TRI detail, not only cross-program stats

- The DB-backed industrial layer can be valid through direct TRI release disclosure even when a sampled row does not expose cross-program linkage stats.
- Live API validation now accepts either:
  - program-linkage source stats, or
  - TRI release-oriented source stats and official TRI linkage context

## 2026-04-16 - Broad-band DB priority scoring must treat `source_ids` as JSONB

- The map-query fast path stores `source_ids` as `jsonb`, not `text[]`.
- Using text-array operators in broad-band query scoring silently broke the DB fast path and forced the home atlas back onto ETL / mock fallback.
- Broad-band DB scoring now uses `jsonb` containment checks, which restored DB-backed industrial overview markers in the home atlas.

## 2026-04-16 - Schema bumps must not auto-adopt older `schema-*` atlas caches

- `schema-v3` exists to invalidate the prior home-atlas mix, not to migrate it forward.
- Persistent cache adoption is still valid for older build-scoped caches, but not for prior semantic `schema-*` namespaces.
- If the home-atlas selection rules change materially, the new schema namespace must recompute from source truth.

## 2026-04-16 - `power-plants` and `hazardous-sites` now load from transformed FRS rows into dedicated DB tables

- `power_plants` and `hazardous_sites` are no longer ETL-only synthesized layers at runtime.
- They now load into Postgres from transformed FRS rows enriched by transformed TRI and ECHO context through:
  - `scripts/db/load-transformed-rows.py`
  - `scripts/etl/loaders/postgres.py`
- The live atlas should prefer those DB rows over ETL or mock fallback once the tables are populated.

## 2026-04-16 - Mock fallback must be suppressed for any layer with a preferred real source

- Suppressing fallback only for `reproductive-regions` and `sentinel-species` was too narrow.
- Once a layer has a preferred `database` or `etl-file` source, mock rows for that same layer must not mix back into the merged atlas.
- This prevents single fallback records like `gulf-coast-power-plant` and `niagara-hazard-site` from making a DB-backed layer look partially real and partially placeholder-driven.

## 2026-04-16 - Standalone live validation must target the managed runtime on port 3000

- `qa:validate-live-api` should default to `http://127.0.0.1:3000`, not an older ad hoc port.
- The validator also now waits for `/api/health` before probing the rest of the API so direct runs and `local:verify` test the same live target.

## 2026-04-16 - DB legal markers must use legal case year, not industrial facility year

- The DB-backed `legal-markers` layer is sourced from `health_concern_context`, not from the transformed industrial facility chronology.
- Broad-band legal rows must use the legal case year parsed from the ECHO legal slug/title.
- Reusing `industrial_sites.active_year` made the live `year=2025` atlas drop valid DB legal rows before visibility balancing.

## 2026-04-16 - Visible atlas fallback suppression must apply in `getMapBaseEntities`, not only merged entities

- It was not enough to suppress mock fallback in the merged atlas path.
- The visible map path also needed layer-level fallback suppression or mock legal markers could still leak back into the broad-band home atlas.
- When a layer is already served by database or ETL records in `getMapBaseEntities`, mock rows for that same layer must stay out of the visible atlas result.

## 2026-04-16 - ETL legal supplement rows are context inputs, not a display layer once DB legal is active

- ETL legal markers can still help build derived context layers.
- They must not render as part of the visible `legal-markers` layer once DB legal rows are available for the same atlas request.

## 2026-04-16 - Browser PFAS e2e controls must target real current visible entities

- Hidden browser verification controls cannot hardcode old entity IDs like `pfas-fayetteville-outfall` once that ID no longer exists in the live atlas.
- The PFAS e2e control now selects a real currently visible PFAS entity so browser validation proves actual current behavior.

## 2026-04-16 - Drilldown validation should assert the real current investigation flow

- The live Cape Fear drilldown currently exposes PFAS at regional scale and concrete wastewater / industrial records at local scale.
- `qa:validate-zoom-drilldown` now validates that real contract instead of assuming local PFAS visibility in the default focused local slice.

## 2026-04-16 - PFAS site records stay active beyond the sample year

- PFAS site records represent persistent site context, not one-year-only relevance.
- DB-backed and ETL-backed `pfas-sites` now keep `yearStart = observedYear` and `yearEnd = currentYear`.
- This preserves source truth while preventing PFAS sites from disappearing from later atlas years solely because the original sample was older.

## 2026-04-16 - Focused regional PFAS ordering should prefer nearer same-layer records

- When regional broad-band PFAS records have comparable source strength, the focused atlas should prefer the nearer same-layer records.
- This prevents Cape Fear regional PFAS visibility from drifting to arbitrary distant same-priority sites when closer official PFAS rows are available.

## 2026-04-16 - Focused local opening results are intentionally investigation-balanced

- The first local records should not be monopolized by one layer when PFAS, wastewater, and industrial context all exist in the focused band.
- Local opening results now explicitly preserve a useful investigation mix across:
  - `pfas-sites`
  - `wastewater-sites`
  - `industrial-sites`
- This is a product decision for first-read usability, not a change to click preservation or source precedence.

## 2026-04-16 - Cache schema must bump when map-selection semantics change materially

- The focused PFAS visibility fix changed which records should appear in both local and broad-band cached atlas responses.
- Persistent `map-entities` cache namespace is now `schema-v8`.
- Route-level memory cache can temporarily continue serving an old payload until restart, so final verification after a semantic cache bump must happen on a fresh runtime.

## 2026-04-16 - Chemours PFAS source gaps must be surfaced explicitly, not implied away

- The current loaded official PFAS source set does not contain a closer geocoded Chemours-edge sample/site than the existing Cape Fear PFAS samples.
- The product should say that directly in the nearby investigation surface instead of implying a tighter hotspot than the source set supports.

## 2026-04-16 - USGS PFAS `GENX_num` is part of the official PFAS signal contract

- `GENX_num` from the USGS PFAS source is not optional metadata.
- It must flow through transformed load rows, ETL fallback entities, and UI detail semantics as `GenX`.

## 2026-04-16 - `/api/entities` verification must be bounded and stream-safe

- The raw atlas is now large enough that full in-memory JSON serialization and validation are not trustworthy defaults.
- `/api/entities` should stream results, and validator coverage should use bounded layer-scoped queries instead of fetching the entire atlas.

## 2026-04-16 - Standalone validator expectations must match the real atlas band contract

- National view currently keeps:
  - direct PFAS records
  - air-toxics regional overlays
  - aggregate legal marker context
- Regional view currently adds:
  - industrial context
  - richer legal coverage
- Validators should assert that real contract, not stale assumptions such as direct national hazard rows or unrestricted full-atlas samples.

## 2026-04-16 - `local:up` force-seeds the home atlas cache for truthfulness

- Reusing a same-schema atlas cache without forcing refresh can preserve stale selection semantics across source-truth changes.
- `local:up` now seeds the home atlas cache with `--force` so the managed runtime starts from current atlas truth instead of prior same-schema drift.

## 2026-04-16 - Derived regional layers stay ETL-backed until atlas-ready DB records exist

- `air-toxics-regions`, `reproductive-regions`, and `sentinel-species` should not be promoted to `database` just because related schema tables exist.
- Promotion requires atlas-ready DB rows and a defensible source-backed display path.
- Current verified state:
  - `air-toxics-regions = etl-file`
  - `reproductive-regions = etl-file`
  - `sentinel-species = etl-file`

## 2026-04-16 - Source provenance for each layer must be visible in both health and UI

- Layer source truth is not just an internal implementation detail.
- `/api/health` and `/api/layers` now expose preferred layer source and, for derived layers, a source-truth note explaining why the layer is still ETL-backed.
- The layer control surface shows that provenance directly so users and future runs are not forced to infer it from behavior.

## 2026-04-16 - Empty DB support tables are evidence against premature promotion

- `db:status` now reports supporting counts for:
  - `sentinelSpeciesRecords`
  - `reproductiveIndicators`
  - `spermStudies`
  - `fertilityTrends`
- Current verified counts are all `0`, which is why those derived layers remain ETL-backed.

## 2026-04-17 - `reproductive-regions` is now a DB-backed derived layer

- `reproductive-regions` no longer needs to stay ETL-backed once the shared derived-context builder has:
  - DB-backed PFAS
  - DB-backed wastewater
  - DB-backed industrial
  - DB-backed hazardous
  - DB-backed legal
  - DB-backed air-toxics context
- Promotion is acceptable here because the atlas surface is still explicitly literature-backed and uncertainty-framed, not an outcome map.

## 2026-04-17 - Home-atlas cache seeding must not block local runtime startup

- A failed or stalled home-atlas seed is a performance problem, not a reason to keep `3000` down.
- `local:up` now treats atlas seeding as best-effort and time-bounded so the app can still come up in a healthy managed state.

## 2026-04-17 - Windows local runtime must normalize duplicate `Path` casing before `Start-Process`

- This shell can carry both `Path` and `PATH` in the process environment.
- `Start-Process` treats that as an invalid duplicate-key environment block and fails startup.
- Local runtime startup now normalizes those keys before spawning the managed Next.js process.

## 2026-04-17 - `sentinel-species` remains ETL-backed until DB-backed ecological-warning rows actually exist

- The derived DB-backed contamination-system path was re-tested for `sentinel-species`.
- Current verified state:
  - `preferredDerivedLayerSource.sentinelSpecies = etl-file`
  - `derivedLayerStatus.sentinelSpecies.databaseRows = 0`
  - `sentinelSpeciesRecords = 0`
- Promoting `sentinel-species` to `database` now would be false source truth, so the layer remains ETL-backed.

## 2026-04-17 - Standalone local verification and seed scripts now run through direct Node strip-types execution

- The remaining `tsx` / esbuild path was too brittle in this shell and could fail with `spawn EPERM`.
- Package scripts for:
  - DB status / seed
  - data validation
  - QA validation
  - home-atlas cache seeding
  now run through:
  - `scripts/local/run-ts.mjs`
  - `scripts/local/register-ts-path-loader.mjs`
  - `scripts/local/ts-path-loader.mjs`
- This keeps local verification and seed flows working without depending on `tsx` child-process behavior.

## 2026-04-17 - The `scripts` tree has its own ESM boundary; the root app package stays unchanged

- Added `scripts/package.json` with `"type": "module"` so standalone script entrypoints no longer need to inherit the Next app package mode.
- This reduced warning noise without changing the root package semantics that the main app depends on.
- Remaining typeless warnings now come from imported `src/**/*.ts` modules, not from the script entrypoints themselves.

## 2026-04-17 - The `src` tree also has its own ESM boundary for standalone validation imports

- Added `src/package.json` with `"type": "module"` so the direct Node strip-types runner does not reparse imported source modules as typeless ESM.
- This keeps the repo-root package semantics unchanged while removing the remaining standalone verification warning noise.
- `next build`, `db:status`, `local:seed:home-atlas`, and `local:verify` all still pass with this boundary in place.

## 2026-04-17 - Wastewater is persistent atlas context, not a one-year-only opening marker

- DB-backed and ETL-backed `wastewater-sites` should remain visible from their observed year through the current atlas year.
- Treating wastewater as a single-year-only record made the `year=2025` opening atlas silently drop wastewater entirely even though the permit and pathway context was still relevant.
- After restoring persistence, the opening regional atlas must still stay balanced:
  - `wastewater-sites` max = `10`
  - `legal-markers` max = `10`
  - `air-toxics-regions` max = `8`
- The home-atlas validator now enforces that wastewater is present and that legal / air-toxics remain bounded.

## 2026-04-17 - Broad-band wastewater should prefer actionable NPDES infrastructure over research-only pharma sampling

- In the opening atlas, wastewater is an investigation entry path first.
- Regional and national broad-band wastewater ranking now gives additional weight to `epa-npdes` and subtracts weight from `usgs-pharma`.
- This is intentionally different from local or nearby detail ranking:
  - broad-band opening view should surface permit / outfall infrastructure
  - local and nearby views can still use direct-sampling pharma context where it is actually relevant
- The home-atlas validator now requires at least `2` `epa-npdes` wastewater markers in the opening atlas.

## 2026-04-17 - Opening-atlas minimums should reserve more space for concrete PFAS and industrial entry points

- The previous regional minimums were too sticky:
  - `wastewater-sites = 10`
  - `legal-markers = 6`
  - `air-toxics-regions = 6`
- That forced contextual layers to saturate the opening atlas before PFAS and industrial could reclaim space.
- The opening regional atlas is now concrete-first:
  - minimums:
    - `industrial-sites = 10`
    - `pfas-sites = 6`
    - `wastewater-sites = 6`
    - `legal-markers = 4`
    - `air-toxics-regions = 4`
  - maximums:
    - `industrial-sites = 20`
    - `pfas-sites = 10`
    - `wastewater-sites = 8`
    - `legal-markers = 8`
    - `air-toxics-regions = 6`
- The validator now checks the higher-level product rule:
  - concrete `industrial + pfas + wastewater` must outnumber contextual `legal + air`

## 2026-04-17 - PFAS geographic diversity is enforced on the real opening atlas, not isolated layer-only debug probes

- The product surface that matters is the full regional opening atlas.
- Broad-band PFAS diversity is now enforced there with `8` degree regional buckets and a cap of `3` PFAS markers per bucket.
- This prevents one USGS sample cluster from monopolizing the opening atlas while preserving the corrected concrete-first atlas mix.

## 2026-04-17 - Dev and managed runtime must share a bounded global Postgres singleton

- The runtime regression was not only listener bookkeeping.
- In this shell, repeated module evaluation could create enough Postgres clients to trigger `too many clients already`, which then caused the live app to fall back to ETL-backed behavior even while the DB itself was reachable.
- `src/db/client.ts` now uses a bounded global Postgres singleton with:
  - `max = 4`
  - `idle_timeout = 20`
  - `connect_timeout = 10`
  - `prepare = false`
- `local:verify` now treats listener truth as a hard requirement, not just health reachability.

## 2026-04-17 - Opening-atlas PFAS source-family diversity should be explicit and source-truthful

- The opening PFAS slice should not be monopolized by one source family.
- The real current live source ids are:
  - `usgs-pfas-tapwater`
  - `atsdr-pfas-sites`
- The previous `atsdr-pfas` selection-source boost key was stale for the live atlas and under-scored ATSDR PFAS site rows.
- Current verified opening-atlas contract:
  - `usgsTapwater = 8`
  - `atsdrSites = 1`
- This keeps the direct-measurement path dominant while reserving one explicit ATSDR site-context entry in the broad-band PFAS slice.

## 2026-04-17 - A second ATSDR opening slot is not currently supportable under the concrete-first regional atlas contract

- The second-slot idea was tested against the live atlas by raising the regional ATSDR family minimum and lowering the USGS ceiling.
- Verified result:
  - PFAS opening count dropped from `9` to `8`
  - the live atlas still produced only `1` ATSDR PFAS marker
- Current conclusion:
  - the truthful broad-band opening PFAS floor is still `8 USGS + 1 ATSDR`
  - the next PFAS opening improvement should come from better PFAS row quality, not from forcing a second ATSDR slot

## 2026-04-17 - Broad-band PFAS should not spend opening slots on exact-coordinate duplicates

- The regional opening PFAS slice was still wasting a slot on duplicate same-coordinate rows such as:
  - `KS_14_Priv`
  - `KS_12_Pub`
- Broad-band PFAS now caps exact-coordinate rows at `1` using a per-layer coordinate rule.
- This preserves the current source-family and geographic diversity contract while widening distinct investigation entry points.

## 2026-04-17 - Broad-band PFAS opening markers should stay concrete when concrete ATSDR rows exist

- The opening atlas is an investigation-entry surface, not a density heatmap.
- A PFAS aggregate cluster is only acceptable when there are not enough source-backed direct PFAS points to preserve.
- The live atlas does have enough ATSDR PFAS points, so broad-band preservation now keeps ATSDR PFAS point rows direct before clustering.
- Current verified opening PFAS contract:
  - `usgsTapwater = 8`
  - `atsdrSites = 2`
  - `pfasAggregates = 0`
  - `pfasChemistryRich = 7`

## 2026-04-17 - Browser validation may fall back to installed Chrome, Edge, or Brave on Windows

- In this shell, Playwright can intermittently fail with `spawn EPERM` on its bundled browser launcher.
- Browser validation now retries with an installed browser executable instead of treating that launcher artifact as a product failure.
- `local:verify` remains the authoritative end-to-end readiness check.

## 2026-04-17 - A bounded broad-band hazard slot must represent strong cleanup context, not the first generic SEMS row

- The opening atlas now allows at most one `hazardous-sites` marker at regional scale.
- That slot is only worth spending when it carries stronger cleanup context than a generic SEMS-linked cleaner site.
- Broad-band hazard ranking now explicitly prefers:
  - `epa-tri` hazard rows
  - positive `TRI ids`
  - positive `Federal cases`
  - richer multi-program cleanup context
  - overlap with `legal-pressure` or `wastewater` systems
- The home-atlas validator now fails if the opening hazard marker lacks all of those stronger context signals.

## 2026-04-17 - Opening legal markers should expose cluster context, not generic representative metadata

- The opening `legal-markers` slice is a broad-band context layer, so clustered legal markers must explain the cluster, not leak whichever representative row happened to win first.
- Broad-band cluster representative replacement for legal markers now uses broad-band focus quality instead of raw selection priority.
- Opening legal markers now surface cluster-level signals such as:
  - `Aggregated legal markers: N`
  - optional maximum federal case count
  - wastewater-linked legal context
  - air-toxics-linked legal context
- The home-atlas validator now fails if opening legal markers do not expose that cluster-level context.

## 2026-04-17 - `local:verify` must normalize both raw and flattened health shapes

- `Get-AppHealth` can return the raw `/api/health` shape with nested `repository` and `layers`.
- `local:status` intentionally publishes a flattened API summary shape for human readability.
- `local:verify` must accept either shape when producing the final readiness summary, or it can falsely report:
  - `readyForFullLocalStack = false`
  - `dataMode = etl-file`
  even when every validation step passed on a DB-backed runtime.
- `local:status` now also exposes `preferredDerivedLayerSource` so the flattened summary stays complete.

## 2026-04-17 - Opening air-toxics regions must be materially useful legal-overlap context

- The opening `air-toxics-regions` slice is a contextual investigation layer, not a generic burden sampler.
- Broad-band opening air rows must now satisfy a quality gate:
  - `epa-echo` lineage required
  - `Legal overlap >= 50` required
- This intentionally allows the opening atlas to shrink from `6` air rows to `5` if the sixth available region is weak legal context.
- The home-atlas validator now fails if any opening air region is:
  - non-ECHO-backed, or
  - zero-overlap, or
  - below the strong-overlap floor

## 2026-04-21 - The public globe is a close-zoom inspection surface, not only a broad-band atlas

- The Three.js globe must support materially closer inspection than the earlier fixed-height regional view.
- Current enforced contract:
  - direct point focus height `= 420000`
  - aggregate drilldown focus height `= 2600000`
  - close clamp `= 220000`
  - far clamp `= 6200000`
  - `zoomToCursor = true`
- Point markers must scale continuously with actual camera height so they do not stay the same size at every zoom level.
- Close zoom must still be product-usable:
  - no surface-scrape zoom into a low-resolution earth texture
  - no giant faceted local dots
- This is now protected by:
  - `scripts/qa/validate-zoom-detail-contract.ts`

## 2026-04-21 - Managed local production start needs an explicit Node heap ceiling

- After the close-zoom slice, `next start` on this machine could die on first health load with:
  - `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`
- `scripts/local/up.ps1` now injects `--max-old-space-size=6144` into `NODE_OPTIONS` for the managed app process when the caller has not already set a heap ceiling.
- This keeps the local production runtime truthful and prevents false verification failures caused by process death immediately after startup.

## 2026-04-21 - `Path` / `PATH` normalization must be scoped to spawned child processes

- Normalizing the full PowerShell process environment before `npm run build` can trigger:
  - `next build --webpack`
  - `spawn EPERM`
- The normalization is still needed for Windows `Start-Process`, but it must be scoped only around the specific child launches that need it.
- `scripts/local/common.ps1` now provides:
  - `Invoke-WithNormalizedProcessPath`
  - process-env snapshot / restore helpers
- `scripts/local/up.ps1` now uses that scoped path only for:
  - home-atlas seed child process
  - managed app start child process

## 2026-04-21 - Browser validation must be bounded and self-cleaning even while CDP hydration is unresolved

- `qa:validate-browser-interactions` cannot be allowed to hang indefinitely or reuse a stale browser profile.
- The PowerShell wrapper now:
  - uses a unique per-run user-data dir
  - launches with anti-background-throttling flags
  - captures stdout / stderr to `.local` log files
  - enforces a 180 second validator timeout
- Current unresolved blocker:
  - the CDP attach path can still reach a page target where:
    - `title = toxinmap.com`
    - `shellExists = false`
    - `canvasCount = 0`
    - `bodyText = ""`
  - that means browser-level hydration verification is still open and should remain a top-priority blocker until it produces a real hydrated atlas shell

## 2026-04-21 - Managed `prod-start` is currently the truthful local runtime mode again

- Current verified runtime state from `npm run local:status` is:
  - `listenerPid = managedPid = 32808`
  - `runtimeMode = prod-start`
  - `healthOk = true`
- Continuity and backlog should not keep treating `dev-managed` as the active blocker unless the regression is reproduced again.

## 2026-04-21 - External-browser validation now owns a fresh atlas target instead of mutating a startup tab

- The installed-browser verification path still needs:
  - a unique profile
  - managed timeout
  - captured logs
- The validator now creates a fresh atlas target under the browser websocket and attaches to that target instead of trying to repurpose the startup page target.
- Current unresolved blocker is no longer startup-tab ambiguity; it is target-session command transport, specifically `Runtime.evaluate` timing out after attach.

## 2026-04-21 - Browser verification now has an app-owned result channel

- Raw external CDP transport on this machine remained too brittle to trust as the primary validator mechanism.
- The live app now exposes:
  - `?e2e=1&e2eAuto=browser&e2eRunId=<id>`
  - `POST /api/e2e/browser-result`
- The browser page owns the interaction sequence and reports step-level `running` / `pass` / `fail` status into `.local/browser-e2e/<runId>.json`.
- Current unresolved blocker moved again:
  - the endpoint is writeable
  - launched browsers still do not produce the result file
  - so the next debugging target is browser launch / page execution, not result persistence

## 2026-04-21 - `prod-start` should no longer be assumed closed

- After the browser-result slice, `npm run local:status` is back on:
  - `listenerPid = managedPid = 26808`
  - `runtimeMode = dev-managed`
- Plain `npm run build` still passes.
- That means the current regression is again in the managed startup path, not the app bundle or the live health route.

## 2026-04-22 - Automated local readiness no longer depends on opening desktop browser tabs

- The user explicitly prohibited validation paths that launch installed browsers or open new tabs/windows on the desktop.
- `local:verify` now relies on:
  - runtime health
  - API truth
  - zoom/detail contract validation
  - no-browser interaction validation
  - local marker rendering validation
- `qa:validate-browser-interactions` remains in the repo for manual or explicitly requested use only and is not part of automated readiness.

## 2026-04-22 - Close-range concrete points render on the object layer, not the point-cylinder layer

- The old local marker path used `react-globe.gl` point cylinders for everything.
- That made close zoom degenerate into chunky low-poly blobs even after camera and size tuning.
- Current contract:
  - local non-aggregate point records render as smooth sphere objects
  - local aggregates and broad contextual overlays stay on the existing point layer
- This split is now the validated close-zoom rendering boundary and should not be collapsed back into one primitive path without replacing the lost close-range quality.

## 2026-04-22 - Focused local atlas is capped and deduped instead of returning the full filtered local tail

- Focused local views are an inspection surface, not a raw dump of every local candidate row.
- The local selector now:
  - preserves the opening investigation mix first
  - then caps the remaining long tail by layer
  - dedupes same-site variants for industrial, wastewater, hazard, power, and legal rows using layer + normalized title + rounded coordinates
- Current enforced local caps:
  - total visible max `= 160`
  - industrial `= 72`
  - wastewater `= 56`
  - pfas `= 10`
  - hazardous `= 8`
  - legal `= 4`
  - power `= 4`
- This is a product decision for readable GPS-like local exploration.
- It is not a change to source precedence or DB-vs-ETL truth.

## 2026-04-22 - Local concrete object markers use halo and hit-shell separation, not only a bare sphere

- Smooth sphere geometry alone was not enough for close-range click clarity.
- Local concrete object markers now render with:
  - a visible halo shell for stronger category / selection read
  - a larger transparent hit shell so clicking does not depend on the exact visible core radius
  - stack-separated altitudes for nearby local concrete markers in the same close-range bucket
- This is a product decision for local inspection usability.
- It does not change source precedence, local density caps, or click-preservation rules.

## 2026-04-22 - Selected local markers use a dedicated beacon shell and the drawer must expose that linkage explicitly

- Halo and hit-shell separation improved local click clarity, but selected-state recognition still relied too much on subtle size and opacity changes.
- Selected local concrete markers now render with a dedicated outer beacon shell beyond the normal local halo.
- The detail drawer header must also expose the selected linkage explicitly through:
  - selected-on-map state
  - layer label
  - group label
- This is a product decision for cross-surface selection clarity.
- It does not change source precedence, local density caps, or click-preservation rules.

## 2026-04-22 - The top command surface must expose the current investigation context

- Selected-marker emphasis and drawer linkage were not enough on their own.
- The top command surface now carries the active investigation state through a shared selection-context contract:
  - `selected-entity`
  - `nearby-focus`
  - `search-query`
- Selected-record context must expose:
  - layer
  - group
  - nearby focus label
  - nearby radius
  - nearby visible signal count
- The same surface now also carries low-weight recovery actions:
  - `clear-selection`
  - `return-nearby`
  - `clear-nearby`
  - `clear-search`
- Recovery semantics for those actions are now explicit and shared:
  - `clear-selection` and `return-nearby` both clear the selected entity and keep nearby summary open when nearby focus exists
  - `clear-nearby` clears nearby focus and returns to map scope
  - `clear-search` clears query text and closes search-open state
- This is a product decision for cross-surface clarity.
- It does not change source precedence, local density caps, click-preservation rules, or no-browser readiness.

## 2026-04-22 - Selection-context recovery must restore explicit camera intent, not only shell state

- The command surface recovery actions are not complete if they only change drawer/search flags.
- Shared selection-context recovery now also owns camera intent:
  - `clear-selection`
    - clears the selected entity
    - preserves nearby focus
    - restores nearby camera target when nearby focus exists
  - `return-nearby`
    - restores nearby summary state
    - restores nearby camera target
  - `clear-nearby`
    - clears nearby focus
    - clears stale camera target
  - `clear-search`
    - clears query state
    - preserves current camera target
- Nearby camera target heights are now canonical by radius:
  - `25 mi -> 850000`
  - `50 mi -> 1250000`
  - `100 mi -> 1900000`
  - `>100 mi -> 2600000`
- This is a product decision for coherent map recovery.
- It does not change source precedence, local density caps, or no-browser readiness.

## 2026-04-22 - Drawer-side nearby controls must use the same canonical camera contract as the command surface

- It is not enough for the top command surface alone to restore camera intent correctly.
- Drawer-side nearby controls now use the same shared camera-target contract for:
  - nearby radius changes
  - nearby-only map-focus close
- Canonical nearby heights remain:
  - `25 mi -> 850000`
  - `50 mi -> 1250000`
- `100 mi -> 1900000`
- `>100 mi -> 2600000`
- This avoids split behavior where the shell says one thing while the drawer mutates focus ad hoc.
- It does not change source precedence, local density caps, or no-browser readiness.

## 2026-04-22 - Selected-record drawer dismissal must use the same shared recovery contract

- Top-level selected-record dismissal cannot bypass the shared selection-context reducer while nearby-focus dismissal uses it.
- Selected-record drawer dismissal now goes through the same shared recovery logic as command-surface `clear-selection`:
  - top-right close button
  - `Escape` when a selected record is open
- That shared dismissal contract is now:
  - with nearby focus:
    - clear selected entity
    - preserve nearby focus
    - keep nearby summary open
    - restore nearby camera target
  - without nearby focus:
    - clear selected entity
    - close the drawer
    - clear stale selected-focus camera target
- This is a product decision for coherent cross-surface dismissal semantics.
- It does not change source precedence, local density caps, or no-browser readiness.

## 2026-04-22 - Non-map entity activation must use a shared focus contract too

- Cross-surface focus semantics do not stop at dismissal and recovery.
- Search-result entity activation and nearby headline-result activation now share one non-map focus reducer.
- That shared activation contract is now:
  - always:
    - set selected entity
    - open the drawer
  - when entity coordinates are available:
    - set explicit selected-record camera target
    - use canonical selected-record focus height `= 420000`
  - when entity coordinates are not available:
    - preserve the current camera target instead of inventing a focus move
- Nearby headline results already satisfy the coordinate-bearing branch because they carry full entity geometry.
- Search entity results currently satisfy the coordinate-missing branch because search rows still lack geometry.
- This is a product decision for coherent non-map activation semantics.
- It does not change source precedence, local density caps, or no-browser readiness.

## 2026-04-23 - Search results are map-focus controls when geometry exists

- Entity search results now carry their source entity coordinates.
- Selecting a coordinate-bearing entity search result should behave like selecting a map record:
  - set selected entity
  - open the detail drawer
  - focus the camera on the selected record
  - use canonical selected-record height `= 420000`
- Search results that still lack coordinates must preserve the current camera target rather than fabricating a focus move.
- Case-study search rows may inherit anchor-entity coordinates when an anchor exists, but the public API shape remains backward-compatible.
- This supports the product goal that search is a real map navigation tool, not only text filtering or drawer opening.

## 2026-04-23 - Cross-surface reducer state must be applied atomically

- The lower-level store setters intentionally have side effects:
  - `setSelectedEntityId(...)` clears `cameraTarget`
  - `setCameraTarget(...)` clears `selectedEntityId` and closes the drawer
- Those setters are still valid for simple single-purpose interactions, but they are unsafe for one user intent that needs selected record, drawer state, search state, nearby state, and camera target together.
- Shared reducer outputs for selection recovery and non-map entity activation now apply through `applyExplorerSurfaceState(...)`.
- Future cross-surface focus/recovery work should use that atomic store action instead of sequencing multiple side-effectful setters.

## 2026-04-23 - Search results should explain the dot before opening it

- Search is now a triage surface, not only a text match list.
- Entity search results should expose enough context to decide whether to click:
  - layer/category
  - evidence type
  - confidence
  - source family
  - chemistry or toxin-system hint
- These fields are additive optional API fields so the existing search response shape remains backward-compatible.
- The UI should render this as compact badges, not another heavy dashboard panel.
- This supports the product goal that every dot/search hit should represent a meaningful contamination, facility, pathway, legal, or source-backed signal.

## 2026-04-23 - Selected-record drawers must start with a source-backed read-first answer

- Clicking a dot or search result should not drop the user into a generic data dump.
- The first detail card must answer:
  - what this point is
  - why it matters
  - what source backs it
  - what is measured versus inferred
- Direct measurement records must still be framed carefully:
  - they are monitoring or sampling evidence
  - they do not establish personal exposure by themselves
- Proxy records such as wastewater, facility, and hazard context must say they are pathway or facility context, not measured exposure concentration.
- This is a product decision for public trust and usability.
- It keeps the data model unchanged and improves interpretation on top of the current DB-backed atlas.

## 2026-04-23 - Source lineage in detail drawers must be actionable, not only descriptive

- After a user clicks a dot, source provenance should not be buried as passive explanatory copy.
- Detail summaries now derive source actions from the same ranked source lineage used for the read-first answer.
- The drawer should expose the strongest public source links near the top of the record, before the longer source cards.
- Representative source-action contracts are:
  - PFAS: `usgs-pfas`
  - hazardous cleanup: `epa-sems`
  - wastewater: `epa-npdes`
  - industrial TRI: `epa-tri`
- This keeps the data model unchanged and treats source URLs from the existing registry as user-facing action affordances.

## 2026-04-23 - Selected-record facts should be interpreted cards, not raw stat tiles

- Raw source stats are too terse for public inspection.
- Detail summaries now convert prioritized source stats into `primaryFacts` with short helper text.
- The helper text must preserve evidence boundaries:
  - PFAS concentration and detection values are sample facts, not exposure histories
  - wastewater permit and design-flow fields are pathway context, not downstream concentration measurements
  - TRI release totals are disclosures, not dose estimates
- This keeps the data model unchanged while making facility, permit, sample, release, and cleanup facts easier to scan.

## 2026-04-23 - Nearby refocus from a selected detail must preserve selection

- Returning the map camera to nearby context is different from leaving the selected record.
- `return-nearby` can still clear selection when the user explicitly asks for the nearby summary surface.
- The detail drawer now also supports selected-nearby refocus:
  - preserve `selectedEntityId`
  - keep the drawer open
  - restore the nearby camera target
  - leave home-camera state
- This supports GPS-like investigation because users can see the surrounding area again without losing the record they clicked.

## 2026-04-23 - Local map inspection labels are allowed only in the local camera band

- Broad and regional views already carry heavy density and should not gain text labels.
- Local concrete point markers may expose lightweight inspection labels because the local view is the GPS-like inspection surface.
- Label behavior is intentionally bounded:
  - only local camera band
  - concrete point records only
  - selected record first
  - capped high-priority unselected records after that
- Selected labels should include title, layer, and strongest source family.
- Unselected labels should stay shorter and identify layer plus title.
- Label clicks use the same activation path as marker clicks so labels are not a parallel interaction model.

## 2026-04-23 - Selected local labels carry evidence and confidence, unselected labels stay short

- The selected marker is the only map-side label allowed to carry the fuller readout:
  - record title
  - layer/source
  - evidence type
  - confidence level
- Unselected local labels stay limited to layer/title context so the GPS-like view does not become a text-heavy dashboard.
- The label budget remains capped and local-band-only.
- This keeps clicked-dot interpretation visible on the map without adding another panel or increasing broad-scale clutter.

## 2026-04-28 - Selected local labels get a close-coordinate exclusion zone

- Dense local scenes should keep the selected marker's label dominant.
- Unselected labels inside a small selected-label coordinate exclusion zone are suppressed before the label budget is applied.
- Farther high-priority labels remain eligible after suppression so the map still shows surrounding context.
- Selected labels remain first and larger than unselected labels.
- This is a presentation-layer rule only; it does not change entity selection, marker rendering, source priority, local density caps, or the detail API.

## 2026-04-28 - Live label quality is part of no-browser readiness

- Synthetic marker fixtures are not enough to protect the local inspection-label contract.
- `qa:validate-live-label-quality` now fetches live DB-backed local map payloads and runs local inspection-label generation against representative real records.
- The validator is intentionally no-browser because installed-browser launches remain disallowed unless explicitly requested.
- Current representative live scenarios are:
  - Cape Fear PFAS local drilldown
  - Apex wastewater local drilldown
- The validator should fail if selected labels lose title/source/evidence/confidence context, lose first/larger dominance, exceed the label cap, or suppress all farther local context when farther context exists.

## 2026-04-28 - Globe renderable preparation is shared across renderer and no-browser QA

- The Three.js renderer and `qa:validate-live-label-quality` must use the same renderable-entity preparation path.
- `buildGlobeRenderableEntities(...)` now owns:
  - selection-priority render ordering
  - layer-specific point style
  - zoom-scaled point radius
  - zoom-scaled point altitude
  - selected-marker render emphasis
- QA scripts should not recreate marker radius, altitude, color, or selected-state calculations locally.
- This keeps no-browser validation trustworthy while browser launches remain disallowed unless explicitly requested.

## 2026-04-28 - Inspection label clicks use the same activation resolver as marker clicks

- Local map labels are not a separate interaction model.
- Label clicks now resolve entity IDs through `resolveExplorerEntityActivationById(...)`, which delegates to the same `resolveExplorerEntityActivation(...)` path used by point and object marker clicks.
- Missing label entity IDs fail closed by returning `null`.
- No-browser marker QA must continue proving marker/label activation parity because installed-browser validation remains excluded unless explicitly requested.

## 2026-04-28 - Search result presentation is a shared contract

- Search rows are part of the investigation surface, not just text-match output.
- The UI must keep compact pre-click context for high-value entity results:
  - layer/category
  - evidence type
  - source family
  - chemistry or toxin-system hint
  - action label
- `src/lib/map/search-presentation.ts` owns match labels, insight badges, and action labels.
- `qa:validate-interaction-contract` must continue validating representative live search rows so UI refactors do not silently remove the context that explains what a searchable dot represents.

## 2026-04-28 - Detail drawer richness must flow through shared display windows

- The selected-record drawer is allowed to show richer source-backed detail, but it must stay scannable.
- Detail sections that can grow with source data should use shared visible/hidden windows instead of inline component-specific slice limits.
- `src/lib/map/detail-drawer-state.ts` owns the current display-window limits and transforms:
  - context rows
  - secondary stats
  - TRI release records
  - source cards
  - related case studies
- `qa:validate-detail-summary` must keep validating representative live records so richer detail data does not silently make the drawer panel-heavy again.

## 2026-04-28 - Live inspection labels must prove activation parity too

- Synthetic marker fixtures are useful, but they are not enough to protect real DB-backed label interactions.
- `qa:validate-live-label-quality` must prove that representative live local labels are not stale display-only artifacts.
- Current live label activation contract:
  - every rendered live label activation equals the corresponding marker activation
  - every rendered live inspection label resolves to a current visible entity
  - validation remains no-browser/API-contract based unless browser testing is explicitly requested
- This keeps local labels as clickable investigation controls, not just map annotations.

## 2026-04-28 - Live selected markers must prove render emphasis

- Synthetic selected-state fixtures are useful, but they are not enough to protect real DB-backed selected-marker presentation.
- `qa:validate-live-label-quality` now also owns live selected-marker emphasis checks for representative local payloads.
- Current live selected-marker emphasis contract:
  - selected radius exceeds the unselected baseline radius
  - selected altitude exceeds the unselected baseline altitude
  - selected local object style has a visible beacon outside the halo
  - selected halo opacity is stronger than unselected halo opacity
- This keeps selected records visually recoverable in GPS-like local views without requiring browser-launch validation.

## 2026-04-28 - Inspection-label presentation is a shared contract

- Local map-label copy should not be reconstructed independently in the renderer and validators.
- `getMapInspectionLabelPresentation(...)` now owns the selected-label and unselected-label text contract.
- Selected local labels are allowed to carry the fuller readout:
  - title
  - layer label
  - strongest source label
  - evidence label
  - confidence label
- Unselected local labels stay compact as layer/title only, so local GPS-like inspection does not become another dense dashboard.
- Live QA must prove source/evidence/confidence context from real DB-backed payloads, not only synthetic fixtures or title-only checks.

## 2026-04-28 - Detail context rows must use shared display windows

- Detail drawer context rows are part of the same scannability contract as stats, releases, sources, and case studies.
- Official signals and context sections should not be sliced only inside React component rendering, because validators then cannot prove hidden/total accounting.
- `buildDetailDrawerDisplayState(...)` now owns official-signal and context-section windows with visible, hidden, total, and limit fields.
- `SectionCard` should consume those shared windows instead of creating its own display limits.
- Live QA must keep proving the window accounting across representative PFAS, hazardous-site, wastewater, and industrial details.

## 2026-04-28 - Entity focus reducers close search surfaces

- Search result activation is one cross-surface user intent, not separate search, drawer, selection, and camera actions.
- `resolveExplorerEntityFocusState(...)` must own the complete entity-focus transition:
  - select the entity
  - open the detail drawer
  - close the search surface
  - focus the camera when coordinates exist
  - preserve the current camera target when coordinates are missing
- Call sites should not rely on pre-mutating `isSearchOpen` before applying the reducer.
- No-browser QA must keep proving this with both representative live coordinate-bearing search rows and synthetic coordinate-missing reducer coverage.
- Production search UI must pass the actual current `isSearchOpen` state into the reducer so the reducer, not the caller, owns the close transition.
