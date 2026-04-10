# toxinmap.com Work Journal

## Current objective

Drive the project from a broader concept site into a U.S.-first toxin globe that feels useful immediately: search a place, locate yourself, inspect nearby toxic signals, and understand the source and evidence quality behind each layer.

## Done

- Rebranded the active product surface to `toxinmap.com`.
- Made `/` the main map product and kept `/explore` as the same globe experience.
- Simplified the main HUD around search, geolocation, nearby results, layers, legend, timeline, reset/home, and detail drawer.
- Added `/api/geocode` using the U.S. Census geocoder.
- Added `/api/nearby` for grouped nearby-signal summaries around map targets.
- Added URL-restorable nearby focus state and camera targeting.
- Retuned the globe to a U.S.-first camera.
- Added denser fallback U.S. toxin-oriented entities for PFAS, air-toxics context, wastewater/pharma context, and plastics-related literature zones.
- Expanded source records to include origin site, upstream datasets, downloadability, and ingestion method.
- Updated the source UI to show acquisition-path metadata.
- Updated the source bootstrap path so source-registry seeds can refresh existing rows instead of only inserting once.
- Added schema and migration support for source-registry lineage fields.
- Updated SQL-first schema notes so they match the current source-registry model.
- Retuned timeline and methodology-support copy away from older atlas-era wording.
- Refreshed README, sources, methodology, and about copy to match the toxinmap.com product.
- Repaired smoke coverage for the new APIs and main globe route.
- Added a first real PFAS ETL slice through `ingest_atsdr_pfas.py` and `ingest_usgs_pfas.py`.
- Added reusable ArcGIS and geocoding helpers for public-source ingestion.
- Added `load_pfas_sites(...)` support in the ETL loader path.
- Updated ETL scripts and docs so PFAS joins the real-data cutover queue instead of staying only in mock content.
- Verified the live repository/API path already reads `pfas_sites` when `DATABASE_URL` is present.
- Improved location UX with explicit search, geolocation, nearby-loading, and nearby-error feedback in the map shell and drawer.
- Added a real EPA wastewater slice through `ingest_npdes_wastewater.py`.
- Added `load_wastewater_sites(...)` support so NPDES wastewater context can land in the live `wastewater_sites` table.
- Added EPA NPDES and EPA biosolids source-registry entries plus ETL script wiring and docs.
- Hardened ZIP download handling for large EPA archives so corrupt or partially cached downloads self-repair on rerun.
- Added a dedicated no-visible-signals overlay so aggressive layer/filter combinations explain themselves instead of making the globe feel broken.
- Added a real USGS pharmaceutical research slice through `ingest_usgs_pharma.py`.
- Wired the pharma ingest into scripts and ETL docs and connected it to the existing wastewater-context surface as explicit research evidence.
- Added local database scaffolding through [compose.yaml](C:/Users/chris/Toxin-Environment-Map/compose.yaml), [check-db.ts](C:/Users/chris/Toxin-Environment-Map/scripts/db/check-db.ts), and [load-us-mvp.ps1](C:/Users/chris/Toxin-Environment-Map/scripts/db/load-us-mvp.ps1).
- Updated the main README and environment defaults so the real-data path is easier to follow locally.
- Removed the stale atlas-versus-stories mode plumbing from explorer types, store state, URL state, filtering, and QA links.
- Folded the old `warning-stories` layer back into the main legal/context layer so the fallback map behaves more like a single toxin globe instead of a split editorial product.
- Upgraded nearby-result ranking so the API now prioritizes closer, more credible toxin signals instead of returning a distance-only list.
- Added headline nearby signals, evidence-mix summaries, and 25/50/100-mile radius controls to the search shell and drawer so “what is near me?” behaves more like a real map tool.
- Added a real `npm run data:validate` integrity pass for sources, entities, case studies, layer references, and active-source lineage metadata.
- Filled missing lineage metadata on remaining active source records and fixed duplicate fallback entity slugs surfaced by the validator.
- Added nearby source-family summaries so the map now explains which source systems are driving the current local view.
- Added nearby theme summaries and short interpretation lines so the local view now explains whether an area is dominated by downstream, drinking-water, litigation, community-pressure, wildlife, or fertility-context signals.
- Added nearby contaminant and pathway family summaries so local areas now read as PFAS-heavy, wastewater-heavy, air-toxics-heavy, petrochemical, plastics-context, pharmaceutical, legacy-hazard, or power/combustion heavy when the signal mix supports it.
- Replaced nearby signal-family heuristics with an explicit typed `signalFamilies` model on explorer entities, database adapters, and validation.
- Added signal-family badges to hover cards so the globe surface exposes the same typed concern model used by nearby summaries.
- Propagated explicit `signalFamilies` into the real ETL/load metadata for PFAS, wastewater/pharma, TRI, FRS, and ECHO slices.
- Hardened `industrial_sites` upserts so mixed FRS/TRI/ECHO loads now merge tags, source ids, metadata, and signal-family arrays instead of overwriting earlier context wholesale.
- Added shared ETL load-row validation so TRI, FRS, ECHO, PFAS, wastewater, and pharma jobs now fail early on malformed enums, coordinates, source lineage fields, or missing signal-family metadata before any future DB load.
- Switched FRS and ECHO onto ZIP-integrity recovery and tightened FRS limit-mode iteration so one-row dry runs no longer require a full national crosswalk parse after download.
- Added an offline ETL fixture-validation script so representative industrial, release, PFAS, wastewater, and legal-context rows can be checked without hitting live federal endpoints.
- Added typed `chemicalMarkers` across explorer entities, nearby summaries, fallback content, ETL metadata, and validation so the map can talk about PFAS, pharmaceuticals, petrochemical volatiles, chlorinated solvents, plasticizers, metals, combustion pollutants, and wastewater indicators explicitly.
- Hardened `industrial_sites` upserts again so `chemicalMarkers` now merge across mixed FRS/TRI/ECHO source slices the same way `signalFamilies` already do.
- Added explicit `chemicalHighlights` across fallback entities, nearby summaries, hover cards, detail badges, ETL metadata, and validation so the map can surface named compound spotlights when the source actually supports them.
- Added chemical-aware atlas search so named compound queries like PFOS, PFOA, GenX, benzene, or carbamazepine now resolve to relevant map entities with explicit match context instead of behaving like plain place search.
- Consolidated chemistry and signal-family vocabulary into a shared module so search, nearby summaries, hover cards, and drawer badges all use the same labels and chemistry matching rules.
- Added quick-search compound pills for PFAS, PFOA, PFOS, GenX, benzene, vinyl chloride, phthalates, and carbamazepine so the main globe surface exposes the toxin language directly instead of forcing users to guess search terms.
- Cleaned chemistry and nearby separators into a consistent ASCII format so the map no longer shows shell-encoding artifacts in search and summary surfaces.
- Added URL persistence for the active search query so shared toxinmap.com links can preserve the chemical or place search that produced the current globe view.

## Learned

- The fastest way to degrade this product is to let search behave like a visibility filter. A toxin map needs search to act as navigation first.
- Rich source metadata only matters if it survives the full chain: typed model -> DB seed -> repository -> API -> UI.
- Supporting docs and SQL notes drift faster than UI code during fast iteration; they need explicit cleanup passes, not just incidental updates.
- Runtime smoke checks must assert stable server-rendered signals, not client-only hydrated control text.
- When route files are replaced, `.next/types` can temporarily drift until a clean build regenerates them. Rebuilding before the final typecheck avoids false alarms.
- The user’s product instinct is consistently map-first and utility-first. Whenever a choice drifts toward “microsite” behavior, bias back toward the globe.
- Official public dashboards can often be converted into defensible ETL inputs if the underlying ArcGIS or ScienceBase services are discovered and documented instead of scraped visually.
- Some federal PFAS surfaces still require careful coordinate inference or layer discovery. That needs to be explicit in metadata, not hidden.
- UX trust improves quickly when location actions explain what the app is doing instead of only spinning silently.
- Large federal ZIP downloads need integrity recovery built in; otherwise one interrupted archive can silently break later ETL runs on Windows.
- Filtering official wastewater downloads is essential because the raw NPDES outfalls layer is dominated by construction and stormwater records that would drown the map in low-value noise.
- Empty visual states on a map need explanation and recovery actions, not just absence.
- Research-heavy contaminant datasets are more useful as site-level summaries than analyte-level globe markers. Summaries keep the map readable without flattening scientific nuance.
- Federal CSV releases still vary in encoding quality, so ETL readers need graceful fallbacks for real-world public files.
- Operational adoption matters. ETL and repository code are only half-done if the local DB path is unclear or too manual to follow reliably.
- Dead product branches survive longer than expected unless URL state, smoke tests, and fallback content are cleaned at the same time as the visible UI.
- Nearby results feel significantly better once ranking considers evidence class and confidence, not just distance.
- A validation script that can fail on real content drift is more valuable than extra prose about rigor. The duplicate-slug catch proved that immediately.
- Nearby summaries become more trustworthy when they expose source-family lineage, not just counts and distances.
- Nearby results become easier to read once the product explains the local concern pattern in plain thematic language rather than only in layer IDs and raw counts.
- Nearby summaries become even more useful once they describe contaminant families and pathways instead of only evidence classes and source systems.
- Heuristics are useful for bootstrapping, but once they shape visible product language they should be replaced by explicit typed content as quickly as possible.
- Loader merge behavior matters just as much as ETL extraction. Good source slices can still degrade the atlas if later upserts overwrite earlier context instead of composing with it.
- Real ETL confidence improves once normalized rows are treated as a contract. Validation at the job boundary is more reliable than trusting each script to remember the same shape rules.
- Some federal archive endpoints fail in ways that look like parsing bugs at first. Verifying the cached artifact itself prevents wasting time debugging downstream code that never had a valid input.
- Fast fixture-based checks are worth adding once a shared validator exists. They keep ETL contract regressions testable even when live federal sources are slow or unavailable.
- When a concept becomes visible product language, it needs a first-class field all the way through the stack. `chemicalMarkers` became useful only once it stopped being implicit in copy and started being typed in content, ETL, API, and UI together.
- Fallback data needs the same rigor as live data contracts. A typed chemistry mapping caught the exact place where loose inference was still hiding in mock content.
- Named compounds need stricter discipline than pathway families. It is fine to show broad chemistry markers everywhere, but named chemical spotlights should only appear where the source can support them or where the fallback case-study model is deliberately editorial.
- Search quality improves once the atlas can explain why something matched. Chemical queries are only useful if the result tells the user whether they matched a named compound, a chemistry family, a location, or a general entity label.
- Shared product language matters. If chemistry labels are duplicated across search, repository summaries, and badges, they drift quickly and the product starts sounding less trustworthy than the data model behind it.
- Quick toxin-search entry points make the globe feel more map-first and purposeful than a generic empty search box.
- Search is part of the state model, not just a transient input field. If it changes the user’s view, it should usually survive refresh and sharing.

## Better next

- Keep checking whether each new feature makes the main map more immediately useful.
- Prefer small, complete loops over broad partial additions.
- Validate after each subsystem, not only at the end.
- Keep the source lineage story strict; avoid any silent downgrade from direct ingest to vague reference.
- When a dataset is only partly spatially explicit, ingest the spatially defensible slice now and preserve the rest as a documented next table instead of forcing it into the wrong schema.
- Prefer official filter logic that reduces noise before records ever reach the UI.
- Turn confusing map silence into explicit product feedback whenever possible.
- Summarize research datasets for the map surface first; keep raw analyte granularity in transform outputs and metadata.
- Make the live-data path as repeatable as the UI path.
- Treat cleanup as product work. Removing old branches can improve trust just as much as adding a new layer.
- When the live data path is blocked by environment, prioritize map behavior that still improves the fallback experience instead of stalling.
- Turn repeated manual audit steps into scripts as soon as they uncover one real issue.
- Prefer server-side interpretation for nearby summaries so search, drawer, and future clients stay consistent.
- Keep the nearby API compositional: source lineage, evidence class, concern themes, and contaminant families can each be layered in without pushing interpretation into the client.
- If a summary concept matters enough to show in the UI, it usually deserves a first-class field in the data model.
- When multiple source programs land in the same table, validate the upsert semantics before assuming the live data path is trustworthy.
- Put validation as close as possible to the load boundary. That catches bad normalized rows before database state and product behavior start to drift together.
- When shell encoding damage shows up in a small module, replacing that module cleanly is usually safer than patching around broken bytes.
- Deep-link QA should include state that looks cosmetic at first, such as search text, because those omissions only show up when people try to share a map view.

## Next candidate tasks

- Load the real PFAS, wastewater, and pharma rows into a live local PostGIS database and confirm the globe is reading those rows instead of fallback mock markers.
- Tighten the current mock fallback set so it more closely mirrors the live official layer mix now that PFAS, wastewater, and pharma ETL are real.
- Start the next official-source ingest slice after PFAS, wastewater, and pharma: additional discharge-related evidence and higher-quality regional risk context.
- Add browser-level verification of the nearby radius controls and ranked nearby cards once a stable local browser path is available.
- Surface more source-aware and chemistry-aware summaries from the nearby API once the live database path is available for broader U.S. coverage.
- When the local runtime supports it, complete the live PostGIS load and compare the real nearby summary output against the fallback path for the same places.
- Once live rows are available, tune the family-inference logic against real U.S. datasets so the signal stack is driven less by fallback heuristics and more by official attributes.
- Add a small load-row validator or fixture-based test for ETL metadata so signal families, tags, and related case-study ids are checked before a live load.
- Add a fixture-based regression test for representative ETL rows now that the shared validator exists.
- Once the local runtime can load PostGIS again, compare fixture-validated rows against the real loaded DB rows to confirm the adapter path preserves the same contract.
- Propagate typed `chemicalMarkers` into any future live power-plant, hazardous-site, and hydrography-aware source slices so the chemistry vocabulary stays consistent as the atlas expands.
- When the live database runtime is available again, compare fallback `chemicalHighlights` against loaded TRI/PFAS/pharma rows to make sure the named-chemical story stays grounded in the real sources.
- Once live DB-backed rows are loading again, extend chemical-aware search scoring so it can privilege real release-record chemical names over fallback editorial highlights when both exist.
- Promote the shared chemistry vocabulary into any remaining UI surfaces and live DB summary logic so there is only one canonical source of chemistry labels, aliases, and quick-search compounds.
