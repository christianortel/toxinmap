from __future__ import annotations

import argparse
from datetime import datetime, timezone

import pandas as pd

from loaders.postgres import load_pfas_sites
from utils.epa import (
    cleaned_path,
    download_file,
    normalize_columns,
    raw_path,
    slugify,
    transform_path,
    write_dataframe,
    write_loader_manifest,
)
from utils.geocode import census_geocode_one_line, load_cache, save_cache
from utils.validation import validate_load_rows

ATSDR_PFAS_URL = "https://www.atsdr.cdc.gov/pfas/sites-map/index.html"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download, normalize, geocode, and optionally load ATSDR PFAS site records.")
    parser.add_argument("--limit", type=int, default=None, help="Optional record limit for local iteration.")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--force-geocode", action="store_true", help="Ignore cached geocoder matches and look them up again.")
    parser.add_argument("--skip-geocode", action="store_true", help="Normalize without attempting site-name geocoding.")
    parser.add_argument("--load", action="store_true")
    return parser.parse_args()


def build_geocode_query(record: dict) -> str:
    return f"{record['site_name']}, {record['state']}, USA"


def enrich_with_geocodes(frame: pd.DataFrame, *, force_geocode: bool) -> pd.DataFrame:
    cache_path = raw_path("atsdr-pfas", "atsdr_pfas_geocode_cache.json")
    cache = load_cache(cache_path)
    latitude: list[float | None] = []
    longitude: list[float | None] = []
    matched_addresses: list[str | None] = []

    for record in frame.to_dict("records"):
        geocode_key = f"{record['site_name']}::{record['state']}"
        if force_geocode or geocode_key not in cache:
            cache[geocode_key] = census_geocode_one_line(build_geocode_query(record))

        cached = cache[geocode_key]
        latitude.append(cached.get("latitude"))
        longitude.append(cached.get("longitude"))
        matched_addresses.append(cached.get("matchedAddress"))

    save_cache(cache_path, cache)
    enriched = frame.copy()
    enriched["latitude"] = latitude
    enriched["longitude"] = longitude
    enriched["matched_address"] = matched_addresses
    return enriched


def build_load_rows(frame: pd.DataFrame) -> list[dict]:
    rows: list[dict] = []
    updated_at = datetime.now(timezone.utc).isoformat()

    for record in frame.to_dict("records"):
        tag_set = {"pfas", "atsdr-site", slugify(str(record.get("site_type") or "site"))}
        if record.get("partner"):
            tag_set.add("partner-site")

        rows.append(
            {
                "slug": f"atsdr-{record['state'].lower()}-{slugify(record['site_name'])}-{slugify(record['site_type'])}",
                "site_name": record["site_name"],
                "site_subtype": record.get("site_type"),
                "sampling_matrix": None,
                "concentration_ppt": None,
                "observed_year": None,
                "longitude": float(record["longitude"]) if pd.notna(record.get("longitude")) else None,
                "latitude": float(record["latitude"]) if pd.notna(record.get("latitude")) else None,
                "category": "PFAS documented site",
                "subcategory": record.get("site_type") or "ATSDR PFAS site",
                "layer_group": "emerging",
                "evidence_type": "screening_signal",
                "confidence_level": "high",
                "geographic_level": "site",
                "summary": f"ATSDR-listed PFAS site record for {record['site_name']} in {record['state']}.",
                "notes": (
                    "ATSDR site listings indicate documented federal PFAS investigation or community-resource context. "
                    "They should not be interpreted as a complete national absence-or-presence map."
                ),
                "tags": sorted(tag_set),
                "source_ids": ["atsdr-pfas-sites"],
                "source_name": "ATSDR PFAS Sites Map",
                "source_url": ATSDR_PFAS_URL,
                "source_updated_at": updated_at,
                "ingestion_version": "atsdr_pfas_v1",
                "metadata": {
                    "signalFamilies": ["pfas"],
                    "chemicalMarkers": ["pfas"],
                    "chemicalHighlights": ["PFAS"],
                    "stateCode": record.get("state"),
                    "partner": record.get("partner"),
                    "matchedAddress": record.get("matched_address"),
                    "geocoder": "US Census Geocoder",
                    "officialSignals": ["ATSDR documented PFAS site involvement"],
                    "emergingConcerns": ["Coverage is limited to listed sites and documented federal activity."],
                    "uncertaintyNote": "Coordinates are inferred from site-name geocoding unless ATSDR publishes direct site coordinates.",
                },
            }
        )

    return rows


def main() -> None:
    args = parse_args()
    raw_file = raw_path("atsdr-pfas", "atsdr_pfas_sites.html")
    download_file(ATSDR_PFAS_URL, raw_file, force=args.force_download)

    tables = pd.read_html(raw_file)
    frame = normalize_columns(tables[0]).rename(
        columns={
            "site_name": "site_name",
            "site_type": "site_type",
            "state": "state",
            "partner": "partner",
        }
    )

    frame["site_name"] = frame["site_name"].astype(str).str.strip()
    frame["site_type"] = frame["site_type"].astype(str).str.strip()
    frame["state"] = frame["state"].astype(str).str.strip().str.upper()
    frame["partner"] = frame["partner"].where(frame["partner"].notna(), None)
    frame = frame.drop_duplicates(subset=["site_name", "site_type", "state"]).reset_index(drop=True)

    if args.limit:
        frame = frame.head(args.limit).copy()

    if not args.skip_geocode:
        frame = enrich_with_geocodes(frame, force_geocode=args.force_geocode)
    else:
        frame["latitude"] = None
        frame["longitude"] = None
        frame["matched_address"] = None

    cleaned_base = cleaned_path("atsdr-pfas", "atsdr_pfas_sites")
    parquet_path, csv_path = write_dataframe(frame, cleaned_base)

    load_rows = build_load_rows(frame)
    validate_load_rows(load_rows, "pfas_sites", job_name="ATSDR PFAS site rows")
    transform_base = transform_path("atsdr-pfas", "atsdr_pfas_sites_load_rows")
    write_dataframe(pd.DataFrame(load_rows), transform_base)

    loaded_records = load_pfas_sites(load_rows) if args.load else 0

    write_loader_manifest(
        "atsdr_pfas_sites",
        {
            "source": "atsdr-pfas-sites",
            "download_url": ATSDR_PFAS_URL,
            "raw_file": str(raw_file),
            "cleaned_parquet": str(parquet_path),
            "cleaned_csv": str(csv_path),
            "records": len(load_rows),
            "loaded_to_database": bool(args.load),
            "loaded_records": loaded_records,
            "geocoded": not args.skip_geocode,
        },
    )

    print(f"Normalized ATSDR PFAS sites: {parquet_path}")
    print(f"PFAS site rows: {len(load_rows)}")


if __name__ == "__main__":
    main()
