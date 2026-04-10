# DOWNSTREAM Phase 3 Plan

## Goals
- Make the project structurally credible and source-aware without losing the Phase 1-2 visual quality.
- Centralize evidence, source, geography, and editorial case-study abstractions so the app can evolve toward real data cleanly.
- Refactor mock data to align with planned real source categories and explicitly label evidence, confidence, caveats, and source lineage.
- Strengthen the schema and API/data-access layer so future map queries, source lookups, and drawer detail lookups are structurally obvious.
- Upgrade methodology, sources, and case-study surfaces so they feel rigorously editorial rather than placeholder-heavy.

## Files Likely To Change
- `src/content/mock-data.ts`
- `src/content/explorer-data.ts`
- `src/db/schema.ts`
- `db/sql/001_initial_schema.sql`
- `src/app/methodology/page.tsx`
- `src/app/sources/page.tsx`
- `src/app/case-studies/page.tsx`
- `src/app/case-studies/[slug]/page.tsx`
- `src/components/sources-registry.tsx`
- `src/components/methodology-accordion.tsx`
- `src/components/case-studies-grid.tsx`
- `src/app/api/**`
- new files under:
  - `src/types/`
  - `src/data/mock/`
  - `src/lib/data/`
  - `scripts/etl/`

## Schema / Content Decisions
- Introduce typed enums and helpers for:
  - evidence type
  - confidence level
  - source type
  - geographic level
  - update cadence
  - completeness / caveat tags
- Separate broad editorial content from source-aware mock entity/case-study/source registries.
- Preserve the current explorer layer/entity structure, but make it resolve through centralized registry/adapters instead of directly reading mixed content modules.
- Expand case-study records to include:
  - subtitle
  - why it matters
  - methodology note
  - source references
  - key findings
  - related tags
  - hero placeholder metadata

## API / Data-Flow Decisions
- Add a centralized server-side data access layer for:
  - layer/entity queries
  - source registry queries
  - case-study queries
- Keep route handlers thin and future-ready by routing them through shared query helpers.
- Support filtering by:
  - layer group
  - evidence type
  - source id
  - timeline year
  - entity id / slug

## Validation Steps
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Risks / Caveats
- The current app already depends on Phase 1-2 content modules, so the refactor must preserve existing explorer behavior while moving logic to stronger abstractions.
- The source model must stay careful around reproductive and wildlife data so the UI does not imply false direct measurement.
- Schema expansion should improve credibility without pretending the project already has production ingest coverage.
- ETL scaffolding should look real and organized, but it must remain explicit that production ingest logic is still pending.
