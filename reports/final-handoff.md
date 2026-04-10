# DOWNSTREAM Final Handoff

## Overall project summary

DOWNSTREAM is now a cohesive globe-first investigative concept build. The site combines a premium editorial landing experience, a polished Cesium-based atlas, source-aware registry and methodology pages, structured case-study storytelling, a future-facing schema draft, and ETL scaffolding for eventual real-data integration.

The product’s central design and editorial rule remains explicit throughout the codebase and UI: overlap does not equal causation.

## What changed in the final phase

- Finalized shared visual language and interaction consistency.
- Added completed mobile navigation and stronger focus states.
- Polished explorer HUD balance, search behavior, timeline responsiveness, and drawer presentation.
- Refined landing-page composition and non-map editorial page hierarchy.
- Improved case-study detail treatment and metadata readability.
- Cleaned visible copy and removed older phase-language where it weakened presentation quality.
- Strengthened README and environment/setup guidance for handoff.

## Validation performed

- `npm run lint`
- `npm run typecheck`
- `npm run build`

All three passed successfully at the end of the phase.

## Known limitations

- Mock data still powers the current user-facing experience.
- API handlers are repository-backed rather than database-backed.
- ETL jobs are placeholders and metadata emitters, not live source ingests.
- The atlas does not yet support URL-deep-linking directly into a selected entity state.
- No dedicated automated UI test suite exists yet.

## Recommended next steps

1. Replace repository-backed mock records with database-backed query paths for sources, entities, and case studies.
2. Implement the first real ETL path for EPA TRI plus EPA FRS normalization, then connect that data to the explorer layer system.
3. Add watershed-aware downstream logic using real hydrography geometries.
4. Introduce atlas deep-linking for selected entities, filters, and camera state.
5. Add lightweight browser smoke testing for core routes and the explorer shell.

## Areas ready for real-data integration next

- `src/lib/data/repository.ts`
  Clear handoff point for swapping mock arrays with database reads
- `src/app/api/entities/route.ts`
  Ready for database-backed entity filtering and timeline queries
- `src/app/api/sources/route.ts`
  Ready for source-registry table reads
- `src/app/api/case-studies/route.ts`
  Ready for case-study table reads and source joins
- `src/db/schema.ts`
  Draft structure is in place for the first credible PostGIS-backed ingest path
- `scripts/etl/`
  Scaffold exists for source-specific ingestion jobs and shared metadata attachment

## Presentation status

The project is now in a presentable concept-build state: aesthetically polished, structurally credible, and organized for the next phase of real-data integration without requiring a front-end rewrite.
