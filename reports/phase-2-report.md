# DOWNSTREAM Phase 2 Report

## What Was Built
- Refactored `/explore` into a coordinated atlas surface driven by centralized explorer state instead of isolated demo widgets.
- Added a typed mock layer system covering industrial sites, power plants, hazardous sites, PFAS points, wastewater pathways, sentinel species markers, reproductive-health regions, legal markers, and curated warning-story markers.
- Added explorer-specific map architecture:
  - layer registry
  - entity transforms
  - camera helpers
  - legend generation
  - local search scoring
- Upgraded the Cesium globe behavior with:
  - cleaner viewer setup
  - subdued dark basemap styling
  - custom camera home/fly-to behavior
  - region and point rendering
  - hover state
  - selection state
  - wide-zoom aggregation
- Rebuilt the explorer HUD around the globe with:
  - search surface
  - layer registry controls
  - filter chips
  - mode toggle
  - dynamic legend
  - timeline control
  - viewer controls
  - richer detail drawer
  - hover card

## Key Files Changed
- `src/app/explore/page.tsx`
- `src/components/explore/cesium-globe.tsx`
- `src/components/explore/globe-shell.tsx`
- `src/components/explore/detail-drawer-shell.tsx`
- `src/components/explore/search-control-shell.tsx`
- `src/components/explore/layer-control-shell.tsx`
- `src/components/explore/timeline-shell.tsx`
- `src/components/explore/map-legend-shell.tsx`
- `src/components/explore/hover-card-shell.tsx`
- `src/components/explore/mode-toggle-shell.tsx`
- `src/components/explore/viewer-controls-shell.tsx`
- `src/store/explorer-store.ts`
- `src/types/explorer.ts`
- `src/content/explorer-data.ts`
- `src/lib/map/layer-registry.ts`
- `src/lib/map/entity-transforms.ts`
- `src/lib/map/camera.ts`
- `src/lib/map/legend.ts`
- `src/lib/map/search.ts`
- `src/app/globals.css`
- `reports/phase-2-plan.md`

## Validation Performed
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Notable Design Decisions
- Preserved the Phase 1 editorial dark visual language rather than replacing it.
- Replaced the thin `globeSignals`-style explorer model with a dedicated typed atlas dataset, but kept case studies and source registry structures intact.
- Moved explorer state from the older narrow store into a broader `explorer-store` so camera, hover, drawer, timeline, search, filters, and layer visibility can evolve without scattering state logic.
- Kept Cesium as the primary globe engine and made only minimal integration changes required for richer interaction.
- Used wide-zoom clustering as a restrained readability layer rather than turning the globe into a noisy point cloud.

## Small Justified Changes To Phase 1
- Replaced `src/store/explore-store.ts` with `src/store/explorer-store.ts` to support the larger explorer state surface required in Phase 2.
- Added explorer-specific mock data in `src/content/explorer-data.ts` instead of overloading the broader Phase 1 content file.
- Expanded `/explore` into a wider layout container so the globe can remain visually dominant.

## Remaining TODOs / Follow-Ups
- Replace the mock atlas dataset with real PostGIS-backed spatial feeds.
- Add richer regional geometry beyond ellipse-based mock regions.
- Consider a secondary flat/regional mode only after the globe workflow is fully data-backed.
- Add screenshot-based visual QA once a persistent local dev workflow or deployment preview is available.
- Consider lightweight geocoding integration after the local search model is replaced with real location search.
