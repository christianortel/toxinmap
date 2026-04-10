# ETL Scaffold

This folder is the staging area for future ingestion and transformation work.

## Intended flow
1. Pull raw public source files into `etl/data/raw`.
2. Standardize records into `etl/data/staged`.
3. Build analysis-ready geoparquet, CSV, or SQL-ready outputs into `etl/data/processed`.
4. Load curated outputs into PostgreSQL/PostGIS.

## Current status
- The current repository includes scaffold files and a mock layer builder.
- No production data downloads are executed automatically.
