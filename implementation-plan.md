# DOWNSTREAM Phase 1 Implementation Plan

## Current State
- The repository is empty.
- There is no existing Next.js application, design system, data model, ETL scaffold, or content to preserve.

## Phase 1 Scope
1. Establish the application architecture and project tooling.
2. Create the design tokens, typography system, visual identity, and motion language.
3. Build the premium app shell and all requested routes.
4. Build reusable globe-first and editorial UI components.
5. Seed realistic mock data for case studies, source registry, layers, and timeline states.
6. Draft the PostgreSQL/PostGIS schema and add ETL scaffolding for future pipelines.

## Deliverables
- Next.js App Router application with TypeScript and Tailwind CSS.
- Shared providers for theme, query state, and app state.
- Premium dark editorial landing page and route shells.
- Cesium-powered explorer shell with mock overlays, filters, legend, and drawer UI.
- Case studies, methodology, sources, and about pages.
- Drizzle schema draft plus raw SQL PostGIS bootstrap.
- Python ETL scaffold with folders for raw, staged, and processed data.
- Local-development documentation, environment template, and scripts.

## Architecture
- `src/app`: App Router routes, layouts, and route-level composition.
- `src/components`: Shared UI, editorial blocks, shell chrome, and globe interface.
- `src/content`: Structured mock content and editorial copy.
- `src/lib`: Utilities, tokens, formatting, and shared helpers.
- `src/store`: Zustand state for explorer UI.
- `src/db`: Drizzle schema draft and database helpers.
- `etl`: Data pipeline scaffold for ingestion and transformation.

## Design Priorities
- Globe-first composition with the globe as the dominant interaction surface.
- Dark premium palette with restrained biological, industrial, and hydrological accents.
- Editorial typography with serif display heads and calm sans-serif body text.
- Motion limited to slow fades, subtle elevation, and composed reveal transitions.

## Explicit Non-Goals For This Phase
- Real production datasets.
- Full search or geocoding integration.
- Live Postgres connectivity.
- Completed analytical workflows or causation claims.
