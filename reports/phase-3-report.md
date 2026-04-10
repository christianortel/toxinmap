# Phase 3 Report

## What was built

- Replaced the split mock content setup with a more credible typed data model for evidence, confidence, geography, cadence, and source registry metadata.
- Added centralized mock source, geography, case-study, methodology, and entity modules so the explorer, APIs, and editorial pages can read from one coherent contract.
- Built a repository-style data access layer and expanded API routes for sources, case studies, entities, and layer summaries.
- Upgraded the `/sources`, `/methodology`, and `/case-studies` surfaces so they read as source-aware editorial product pages rather than placeholder registries.
- Drafted a broader PostGIS-ready schema aligned to planned source categories and added a future-facing Python ETL scaffold under `scripts/etl`.

## Key files changed

- `src/types/data.ts`
- `src/types/sources.ts`
- `src/data/mock/sources.ts`
- `src/data/mock/case-studies.ts`
- `src/data/mock/geographies.ts`
- `src/data/mock/methodology.ts`
- `src/data/mock/entities.ts`
- `src/lib/data/evidence.ts`
- `src/lib/data/source-registry.ts`
- `src/lib/data/repository.ts`
- `src/content/explorer-data.ts`
- `src/db/schema.ts`
- `db/sql/001_initial_schema.sql`
- `src/app/api/sources/route.ts`
- `src/app/api/case-studies/route.ts`
- `src/app/api/case-studies/[slug]/route.ts`
- `src/app/api/entities/route.ts`
- `src/app/api/entities/[id]/route.ts`
- `src/app/api/layers/route.ts`
- `src/app/methodology/page.tsx`
- `src/app/sources/page.tsx`
- `src/app/case-studies/page.tsx`
- `src/app/case-studies/[slug]/page.tsx`
- `src/components/sources-registry.tsx`
- `src/components/methodology-accordion.tsx`
- `src/components/explore/detail-drawer-shell.tsx`
- `scripts/etl/README.md`
- `scripts/etl/*.py`

## Schema and data-model decisions

- Kept the Phase 2 explorer interaction model intact, but made it consume centralized source-aware mock entities.
- Standardized core evidence concepts around `evidence_type`, `confidence_level`, `source_type`, `geographic_level`, `update_cadence`, and completeness tags.
- Treated source lineage as first-class metadata with `source_ids`, `source_updated_at`, and ingestion-version placeholders across the schema draft.
- Expanded the schema draft so tables for industrial, PFAS, wastewater, reproductive, sentinel, legal, and editorial records all share the same structural credibility fields.
- Preserved the scientific caution rule by keeping reproductive and wildlife context explicitly typed as context, screening, literature, or editorial material instead of false direct measurement.

## Source-registry decisions

- Structured sources by program tier: `US V1 Core`, `Literature / Editorial`, and `Global / V2 Planned`.
- Kept planned placeholders visible where architecture matters but real public spatial coverage should not be overstated.
- Attached methodological use, caveats, cadence, geography, completeness tags, and supported evidence types to each source entry.
- Mapped entities and case studies to `source_ids` so drawer and editorial pages can resolve source-linked context consistently.

## Validation performed

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Remaining TODOs and caveats

- API routes are still backed by structured mock data rather than database queries.
- Explorer entities still use hand-authored geometry and summaries; real ingest and watershed logic remain future work.
- The ETL scripts are placeholders that write job metadata, not production ingest pipelines.
- The schema draft is broader and more credible now, but migrations and real load scripts are not yet wired into a live PostgreSQL/PostGIS environment.
