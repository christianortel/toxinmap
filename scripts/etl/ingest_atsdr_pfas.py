from __future__ import annotations

import argparse
import hashlib
import re
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
from utils.geocode import geocode_one_line_candidates, load_cache, save_cache
from utils.validation import validate_load_rows

ATSDR_PFAS_URL = "https://www.atsdr.cdc.gov/pfas/sites-map/index.html"
STATE_NAMES = {
    "AK": "Alaska",
    "AL": "Alabama",
    "AR": "Arkansas",
    "AZ": "Arizona",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DC": "District of Columbia",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "IA": "Iowa",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "MA": "Massachusetts",
    "MD": "Maryland",
    "ME": "Maine",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MO": "Missouri",
    "MS": "Mississippi",
    "MT": "Montana",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "NE": "Nebraska",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NV": "Nevada",
    "NY": "New York",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VA": "Virginia",
    "VT": "Vermont",
    "WA": "Washington",
    "WI": "Wisconsin",
    "WV": "West Virginia",
    "WY": "Wyoming",
}
GEOCODE_QUERY_OVERRIDES = {
    ("Fairbanks Regional Fire Training Center", "AK"): [
        "Regional Fire Training Center, Fairbanks, Alaska, USA",
        "Fairbanks, Alaska, USA",
    ],
    ("Former North Pole Refinery Property, North Pole", "AK"): [
        "North Pole Refinery, North Pole, Alaska, USA",
        "North Pole, Alaska, USA",
    ],
    ("Oatman Water Company", "AZ"): [
        "Oatman, Arizona, USA",
    ],
    ("Near the UC Irvine Medical Center", "CA"): [
        "UC Irvine Medical Center, Orange, California, USA",
        "Orange, California, USA",
    ],
    ("El Paso County near Peterson Air Force Base", "CO"): [
        "Peterson Space Force Base, Colorado Springs, Colorado, USA",
    ],
    ("New Castle County near New Castle Air National Guard Base", "DE"): [
        "New Castle Air National Guard Base, Delaware, USA",
    ],
    ("Ayer, MA", "MA"): [
        "Ayer, Massachusetts, USA",
    ],
    ("Hampden County near Barnes Air National Guard Base", "MA"): [
        "Barnes Air National Guard Base, Massachusetts, USA",
    ],
    ("Hyannis, MA", "MA"): [
        "Hyannis, Massachusetts, USA",
    ],
    ("Belmont/Rockford Area, MI", "MI"): [
        "Belmont, Michigan, USA",
        "Rockford, Michigan, USA",
    ],
    ("Former Wolverine Worldwide, Inc.", "MI"): [
        "Wolverine Worldwide, Rockford, Michigan, USA",
        "Rockford, Michigan, USA",
    ],
    ("Former Wurtsmith Air Force Base", "MI"): [
        "Wurtsmith Air Force Base, Michigan, USA",
    ],
    ("Parchment/Cooper Township, MI", "MI"): [
        "Parchment, Michigan, USA",
        "Cooper Township, Michigan, USA",
    ],
    ("US Army National Guard Camp Grayling", "MI"): [
        "Camp Grayling, Michigan, USA",
    ],
    ("Naval Construction Battalion Center Gulfport", "MS"): [
        "Naval Construction Battalion Center Gulfport, Mississippi, USA",
    ],
    ("Bucks County near Naval Air Warfare Center Warminster", "PA"): [
        "Naval Air Warfare Center Warminster, Pennsylvania, USA",
    ],
}
MANUAL_COORDINATE_OVERRIDES = {
    ("Dillingham Airport", "AK"): {
        "latitude": 59.0433568,
        "longitude": -158.5112028,
        "matchedAddress": "Dillingham Airport, Dillingham, Alaska, United States",
    },
    ("Fairbanks International Airport", "AK"): {
        "latitude": 64.8176357,
        "longitude": -147.867807,
        "matchedAddress": "Fairbanks International Airport, Fairbanks, Alaska, United States",
    },
    ("Fairbanks North Star Borough near Eielson Air Force Base", "AK"): {
        "latitude": 64.6657,
        "longitude": -147.102,
        "matchedAddress": "Eielson Air Force Base, Fairbanks North Star Borough, Alaska, United States",
    },
    ("Gustavus Airport", "AK"): {
        "latitude": 58.4249803,
        "longitude": -135.7054108,
        "matchedAddress": "Gustavus Airport, Gustavus, Alaska, United States",
    },
    ("King Salmon Airport", "AK"): {
        "latitude": 58.6757472,
        "longitude": -156.6474763,
        "matchedAddress": "King Salmon Airport, King Salmon, Alaska, United States",
    },
    ("Naval Arctic Research Laboratory, Utqiagvik (Barrow)", "AK"): {
        "latitude": 71.3275883,
        "longitude": -156.6779646,
        "matchedAddress": "Naval Arctic Research Laboratory, Utqiagvik, Alaska, United States",
    },
    ("Yakutat Airport", "AK"): {
        "latitude": 59.5008136,
        "longitude": -139.6440808,
        "matchedAddress": "Yakutat Airport, Yakutat, Alaska, United States",
    },
    ("Oatman Water Company", "AZ"): {
        "latitude": 35.026389,
        "longitude": -114.383611,
        "matchedAddress": "Oatman, Arizona, United States",
    },
    ("Near the UC Irvine Medical Center", "CA"): {
        "latitude": 33.7879,
        "longitude": -117.8937,
        "matchedAddress": "UC Irvine Medical Center, Orange, California, United States",
    },
    ("Air Force Academy, Colorado Springs, Colorado", "CO"): {
        "latitude": 38.99697,
        "longitude": -104.85755,
        "matchedAddress": "United States Air Force Academy, Colorado Springs, Colorado, United States",
    },
    ("El Paso County near Peterson Air Force Base", "CO"): {
        "latitude": 38.80693,
        "longitude": -104.70081,
        "matchedAddress": "Peterson Space Force Base, Colorado Springs, Colorado, United States",
    },
    ("Dover Air Force Base", "DE"): {
        "latitude": 39.12954,
        "longitude": -75.466,
        "matchedAddress": "Dover Air Force Base, Dover, Delaware, United States",
    },
    ("New Castle County near New Castle Air National Guard Base", "DE"): {
        "latitude": 39.67872,
        "longitude": -75.60653,
        "matchedAddress": "New Castle Air National Guard Base, New Castle County, Delaware, United States",
    },
    ("Ayer, MA", "MA"): {
        "latitude": 42.5612,
        "longitude": -71.58979,
        "matchedAddress": "Ayer, Massachusetts, United States",
    },
    ("Hyannis, MA", "MA"): {
        "latitude": 41.65249,
        "longitude": -70.28811,
        "matchedAddress": "Hyannis, Massachusetts, United States",
    },
    ("Belmont/Rockford Area, MI", "MI"): {
        "latitude": 43.12,
        "longitude": -85.56,
        "matchedAddress": "Rockford, Michigan, United States",
    },
    ("Former Wurtsmith Air Force Base", "MI"): {
        "latitude": 44.45111,
        "longitude": -83.39417,
        "matchedAddress": "Wurtsmith Air Force Base, Oscoda, Michigan, United States",
    },
    ("Parchment/Cooper Township, MI", "MI"): {
        "latitude": 42.3303,
        "longitude": -85.57,
        "matchedAddress": "Parchment / Cooper Township, Michigan, United States",
    },
    ("US Army National Guard Camp Grayling", "MI"): {
        "latitude": 44.6614,
        "longitude": -84.7145,
        "matchedAddress": "Camp Grayling, Michigan, United States",
    },
    ("Naval Construction Battalion Center Gulfport", "MS"): {
        "latitude": 30.36778,
        "longitude": -89.09222,
        "matchedAddress": "Naval Construction Battalion Center Gulfport, Mississippi, United States",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download, normalize, geocode, and optionally load ATSDR PFAS site records.")
    parser.add_argument("--limit", type=int, default=None, help="Optional record limit for local iteration.")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--force-geocode", action="store_true", help="Ignore cached geocoder matches and look them up again.")
    parser.add_argument("--skip-geocode", action="store_true", help="Normalize without attempting site-name geocoding.")
    parser.add_argument("--load", action="store_true")
    return parser.parse_args()


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def build_capped_slug(site_name: str, state_code: str, site_type: str, max_length: int = 160) -> str:
    base_slug = f"atsdr-{state_code.lower()}-{slugify(site_name)}-{slugify(site_type)}"
    if len(base_slug) <= max_length:
        return base_slug

    digest = hashlib.sha1(base_slug.encode("utf-8")).hexdigest()[:10]
    trimmed_length = max_length - len(digest) - 1
    trimmed = base_slug[:trimmed_length].rstrip("-")
    return f"{trimmed}-{digest}"


def build_geocode_queries(record: dict) -> list[str]:
    site_name = normalize_whitespace(str(record["site_name"]))
    state = str(record["state"]).strip().upper()
    state_name = STATE_NAMES.get(state, state)
    queries: list[str] = []

    def add(candidate: str) -> None:
        normalized = normalize_whitespace(candidate).strip(",")
        if not normalized:
            return
        if normalized.lower().endswith("usa"):
            queries.append(normalized)
            return

        has_inline_state = bool(re.search(rf"(,\s*{re.escape(state)}\b)|(\b{re.escape(state)}\b$)", normalized, re.IGNORECASE))
        if has_inline_state:
            queries.append(f"{normalized}, USA")
        else:
            queries.append(f"{normalized}, {state_name}, USA")

    for override in GEOCODE_QUERY_OVERRIDES.get((site_name, state), []):
        add(override)

    add(site_name)

    lowered = site_name.lower()
    if " near " in lowered:
        before, after = re.split(r"\bnear\b", site_name, maxsplit=1, flags=re.IGNORECASE)
        add(after)
        add(before)

    if lowered.startswith("near the "):
        add(site_name[9:])
    elif lowered.startswith("near "):
        add(site_name[5:])

    if lowered.startswith("former "):
        stripped = re.sub(r"^former\s+", "", site_name, flags=re.IGNORECASE)
        add(stripped)
        add(re.sub(r"\s+property\b", "", stripped, flags=re.IGNORECASE))

    if "/" in site_name:
        for part in site_name.split("/"):
            add(part)

    if "," in site_name:
        add(site_name.split(",", 1)[0])

    deduped: list[str] = []
    seen = set()
    for query in queries:
        if query not in seen:
            deduped.append(query)
            seen.add(query)

    return deduped


def enrich_with_geocodes(frame: pd.DataFrame, *, force_geocode: bool) -> pd.DataFrame:
    cache_path = raw_path("atsdr-pfas", "atsdr_pfas_geocode_cache.json")
    cache = load_cache(cache_path)
    latitude: list[float | None] = []
    longitude: list[float | None] = []
    matched_addresses: list[str | None] = []
    geocoders: list[str | None] = []
    query_used: list[str | None] = []

    for record in frame.to_dict("records"):
        geocode_key = f"{record['site_name']}::{record['state']}"
        manual_override = MANUAL_COORDINATE_OVERRIDES.get((record["site_name"], record["state"]))
        if manual_override:
            cache[geocode_key] = {
                "address": record["site_name"],
                "queryUsed": record["site_name"],
                "matchedAddress": manual_override["matchedAddress"],
                "latitude": manual_override["latitude"],
                "longitude": manual_override["longitude"],
                "matchScore": 1,
                "geocoder": "manual-override",
            }
        elif force_geocode or geocode_key not in cache:
            cache[geocode_key] = geocode_one_line_candidates(build_geocode_queries(record))

        cached = cache[geocode_key]
        latitude.append(cached.get("latitude"))
        longitude.append(cached.get("longitude"))
        matched_addresses.append(cached.get("matchedAddress"))
        geocoders.append(cached.get("geocoder"))
        query_used.append(cached.get("queryUsed"))

    save_cache(cache_path, cache)
    enriched = frame.copy()
    enriched["latitude"] = latitude
    enriched["longitude"] = longitude
    enriched["matched_address"] = matched_addresses
    enriched["geocoder"] = geocoders
    enriched["geocode_query"] = query_used
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
                "slug": build_capped_slug(
                    str(record["site_name"]),
                    str(record["state"]),
                    str(record["site_type"]),
                ),
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
                    "geocoder": record.get("geocoder"),
                    "geocodeQuery": record.get("geocode_query"),
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
        frame["geocoder"] = None
        frame["geocode_query"] = None

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
