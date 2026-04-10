# toxinmap.com U.S. MVP ETL

This ETL folder now contains real first-pass ingestion jobs for the initial U.S. backbone:

- `ingest_frs.py`: downloads EPA FRS facilities/linkages, builds the canonical facility crosswalk, and can upsert `industrial_sites`.
- `ingest_tri.py`: downloads EPA TRI Basic Data, normalizes facility and chemical release records, and can load `industrial_sites` plus `toxic_release_records`.
- `ingest_echo.py`: downloads the EPA ECHO ICIS FE&C archive, extracts enforcement/compliance context, and can load facility updates plus `health_concern_context`.
- `ingest_atsdr_pfas.py`: downloads the ATSDR PFAS sites page, normalizes the official site table, geocodes listed sites through the Census geocoder, and can upsert `pfas_sites`.
- `ingest_usgs_pfas.py`: resolves the public USGS PFAS dashboard layers, downloads tap-water sample points plus source-summary context, and can upsert `pfas_sites`.
- `ingest_npdes_wastewater.py`: downloads EPA NPDES outfall and biosolids files, filters for wastewater-relevant permit components, and can upsert `wastewater_sites`.
- `ingest_usgs_pharma.py`: downloads the USGS Great Lakes tributary release, summarizes detected pharmaceuticals and wastewater indicators at sampled sites, and can upsert research-context rows into `wastewater_sites`.

The official endpoints used by these jobs are:

- FRS: `https://echo.epa.gov/files/echodownloads/frs_downloads.zip`
- ECHO ICIS FE&C: `https://echo.epa.gov/files/echodownloads/case_downloads.zip`
- TRI Basic Data: `https://data.epa.gov/efservice/downloads/tri/mv_tri_basic_download/{year}_{geography}/csv`
- ATSDR PFAS sites: `https://www.atsdr.cdc.gov/pfas/sites-map/index.html`
- USGS PFAS dashboard: `https://geonarrative.usgs.gov/pfasustapwater/`
- NPDES outfalls: `https://echo.epa.gov/files/echodownloads/npdes_outfalls_layer.zip`
- NPDES biosolids permits: `https://echo.epa.gov/files/echodownloads/npdes_biosolids_downloads.zip`
- USGS Great Lakes pharma release: `https://www.usgs.gov/data/pesticides-pharmaceuticals-and-wastewater-indicator-compounds-water-and-bottom-sediment`

## Setup

1. Install Python dependencies:

```bash
pip install -r scripts/etl/requirements.txt
```

2. Ensure `DATABASE_URL` points to the Postgres/PostGIS instance you want to load.

3. Run database migrations and seed the source registry:

```bash
npm run db:migrate
npm run db:seed:sources
```

## Recommended execution order

1. Build the facility identity layer:

```bash
python scripts/etl/ingest_frs.py --states NC,LA,OH,PA,DE,MI,WI
```

2. Load the current TRI year:

```bash
python scripts/etl/ingest_tri.py --year 2024 --geography US
```

3. Add compliance and enforcement context:

```bash
python scripts/etl/ingest_echo.py
```

4. Add documented PFAS sites and tap-water context:

```bash
python scripts/etl/ingest_atsdr_pfas.py
python scripts/etl/ingest_usgs_pfas.py
```

5. Add wastewater and biosolids pathway context:

```bash
python scripts/etl/ingest_npdes_wastewater.py
```

6. Add pharmaceutical and wastewater-indicator research context:

```bash
python scripts/etl/ingest_usgs_pharma.py
```

7. Run the fast offline ETL contract check:

```bash
python scripts/etl/validate_fixture_rows.py
```

8. Repeat with `--load` once the outputs look correct:

```bash
python scripts/etl/ingest_frs.py --states NC,LA,OH,PA,DE,MI,WI --load
python scripts/etl/ingest_tri.py --year 2024 --geography US --load
python scripts/etl/ingest_echo.py --load
python scripts/etl/ingest_atsdr_pfas.py --load
python scripts/etl/ingest_usgs_pfas.py --load
python scripts/etl/ingest_npdes_wastewater.py --load
python scripts/etl/ingest_usgs_pharma.py --load
```

## Output surfaces

- `raw/`: untouched EPA downloads
- `cleaned/`: normalized parquet/csv outputs
- `transforms/`: facility summaries and intermediate normalized tables
- `loaders/`: loader manifests that record what was downloaded, normalized, and loaded

## Notes

- FRS is treated as identity infrastructure, not direct contamination evidence.
- TRI release records remain `direct_measurement`.
- ECHO ICIS FE&C remains regulatory and legal context, not proof of exposure or outcome.
- Current ETL rows now carry explicit `signalFamilies` metadata where the source slice supports it, so the live database-backed atlas can preserve the same signal-stack model used by the fallback experience.
- Current ETL rows now also carry explicit `chemicalMarkers` metadata where the source slice supports it, so PFAS, wastewater indicators, pharmaceuticals, combustion pollutants, and other named chemistry classes can survive the load path instead of being inferred later in the UI.
- Current ETL rows now also carry `chemicalHighlights` where the source slice supports named compounds or named chemistry spotlights, so nearby summaries can surface things like PFOA, PFOS, GenX, benzene, carbamazepine, or styrene without inventing precision where the source does not support it.
- The ETL scripts now validate normalized load rows before any database write, including required enums, source lineage fields, coordinate ranges, and signal-family metadata on map-facing entity rows.
- ATSDR PFAS sites are loaded as high-confidence documented site context and remain incomplete nationally.
- USGS tap-water PFAS points are direct sample results at listed locations, not universal household tap-water coverage.
- ATSDR coordinates are currently inferred through Census geocoding because the public site table does not expose ready-to-load point coordinates.
- NPDES wastewater rows currently prioritize POTW, biosolids, CSO, and pretreatment permit components so the map stays focused on discharge pathways rather than construction-stormwater noise.
- USGS pharmaceutical rows currently use a Great Lakes tributary campaign. They are direct sample evidence at those sites, but only research context nationally.
- `industrial_sites` upserts now merge tags, source ids, and metadata instead of blindly replacing earlier source slices, which keeps mixed FRS/TRI/ECHO rows more structurally credible.
- FRS and ECHO ZIP downloads now use the same archive-integrity recovery path as other large EPA downloads, and FRS limit-mode runs now filter related tables instead of forcing a full national parse for one-row dry runs.
- The current scripts are national-source aware but keep state filters and `--limit` flags for local iteration and smaller dry runs.
- `validate_fixture_rows.py` gives a fast offline regression check for the shared load-row contract, including an intentional failing row so the validator is proven to reject malformed metadata.
