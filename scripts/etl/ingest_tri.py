from __future__ import annotations

import argparse
from datetime import datetime, timezone

import pandas as pd

from loaders.postgres import load_industrial_sites, replace_toxic_release_records
from utils.epa import (
    TRI_URL_TEMPLATE,
    cleaned_path,
    download_file,
    infer_case_studies,
    infer_tags,
    normalize_columns,
    raw_path,
    slugify,
    transform_path,
    write_dataframe,
    write_loader_manifest,
)
from utils.validation import validate_load_rows

POUNDS_TO_KG = 0.45359237


def infer_signal_families(*values: object) -> list[str]:
    text = " ".join(str(value or "") for value in values).lower()
    families: set[str] = {"air-toxics"}

    if any(token in text for token in ["petro", "chemical", "refin", "resin", "polymer", "plastic"]):
        families.add("petrochemical")
    if any(token in text for token in ["power", "electric", "utility", "combustion", "generation"]):
        families.add("power-combustion")
    if any(token in text for token in ["plastic", "phthalate", "bisphenol"]):
        families.add("plastics")
    if any(token in text for token in ["waste", "sewer", "treatment", "water utility"]):
        families.add("wastewater")

    return sorted(families)


def infer_chemical_markers(*values: object) -> list[str]:
    text = " ".join(str(value or "") for value in values).lower()
    markers: set[str] = set()

    if any(token in text for token in ["pfas", "perfluoro", "fluoro"]):
        markers.add("pfas")
    if any(token in text for token in ["benzene", "toluene", "xylene", "styrene", "ethylene", "propylene", "petro"]):
        markers.add("petrochemical-volatiles")
    if any(token in text for token in ["trichloro", "perchloro", "vinyl chloride", "chlorinated", "solvent"]):
        markers.add("chlorinated-solvents")
    if any(token in text for token in ["phthalate", "bisphenol", "plasticizer", "plastic", "vinyl"]):
        markers.add("plasticizers")
    if any(token in text for token in ["lead", "mercury", "arsenic", "chromium", "cadmium", "metal"]):
        markers.add("metals")
    if any(token in text for token in ["power", "combustion", "coal", "utility", "generation", "so2", "nox"]):
        markers.add("combustion-pollutants")
    if any(token in text for token in ["wastewater", "sewer", "treatment", "biosolids", "effluent"]):
        markers.add("wastewater-indicators")
    if not markers:
        markers.add("legacy-industrial-mixtures")

    return sorted(markers)


def infer_chemical_highlights(*values: object) -> list[str]:
    text = " ".join(str(value or "") for value in values).lower()
    highlights: list[str] = []

    mapping = [
        ("genx", "GenX"),
        ("pfoa", "PFOA"),
        ("pfos", "PFOS"),
        ("benzene", "Benzene"),
        ("toluene", "Toluene"),
        ("xylene", "Xylene"),
        ("styrene", "Styrene"),
        ("vinyl chloride", "Vinyl chloride"),
        ("trichloro", "Trichloroethylene"),
        ("perchloro", "Perchloroethylene"),
        ("bisphenol", "Bisphenol A"),
        ("phthalate", "Phthalates"),
        ("lead", "Lead"),
        ("mercury", "Mercury"),
        ("arsenic", "Arsenic"),
        ("chromium", "Chromium"),
        ("cadmium", "Cadmium"),
        ("1,3-butadiene", "1,3-Butadiene"),
    ]

    for needle, label in mapping:
        if needle in text and label not in highlights:
            highlights.append(label)

    return highlights[:4]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download, normalize, and optionally load EPA TRI basic data.")
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--geography", default="US", help="TRI geography code, e.g. US, NC, LA.")
    parser.add_argument("--limit", type=int, default=None, help="Optional row limit for local iteration.")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--load", action="store_true", help="Load normalized records into PostgreSQL/PostGIS.")
    return parser.parse_args()


def _as_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def build_industrial_site_rows(frame: pd.DataFrame, year: int) -> list[dict]:
    grouped = (
        frame.groupby("slug", dropna=False)
        .agg(
            facility_name=("facility_name", "first"),
            operator_name=("standard_parent_co_name", "first"),
            primary_naics=("primary_naics", "first"),
            state_code=("st", "first"),
            county_name=("county", "first"),
            city=("city", "first"),
            latitude=("latitude", "first"),
            longitude=("longitude", "first"),
            total_release_kg=("total_release_kg", "sum"),
            record_count=("chemical", "count"),
            top_chemical=("chemical", "first"),
            frs_id=("frs_id", "first"),
            trifd=("trifd", "first"),
            industry_sector=("industry_sector", "first"),
        )
        .reset_index()
    )

    rows: list[dict] = []
    for record in grouped.to_dict("records"):
        case_studies = infer_case_studies(record.get("state_code"))
        rows.append(
            {
                "slug": record["slug"],
                "facility_name": record["facility_name"],
                "operator_name": record.get("operator_name") or None,
                "naics_code": record.get("primary_naics") or None,
                "status": "reported",
                "longitude": float(record["longitude"]) if pd.notna(record["longitude"]) else None,
                "latitude": float(record["latitude"]) if pd.notna(record["latitude"]) else None,
                "active_year": year,
                "date_range_label": str(year),
                "category": "Facility footprint",
                "subcategory": record.get("industry_sector") or "Industrial release context",
                "layer_group": "official",
                "evidence_type": "direct_measurement",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": (
                    f"EPA TRI reporting facility with {int(record['record_count'])} chemical records and "
                    f"{record['total_release_kg']:.0f} kg of reported total releases in {year}."
                ),
                "notes": "TRI records are direct self-reported regulatory disclosures, not complete exposure histories.",
                "tags": infer_tags(case_studies),
                "source_ids": ["epa-tri", "epa-frs"],
                "source_name": "EPA TRI Basic Data Files",
                "source_url": TRI_URL_TEMPLATE.format(year=year, geography="US"),
                "source_updated_at": datetime.now(timezone.utc).isoformat(),
                "ingestion_version": f"tri_{year}",
                "metadata": {
                    "signalFamilies": infer_signal_families(
                        record.get("industry_sector"),
                        record.get("facility_name"),
                        record.get("primary_naics"),
                        record.get("top_chemical"),
                    ),
                    "chemicalMarkers": infer_chemical_markers(
                        record.get("industry_sector"),
                        record.get("facility_name"),
                        record.get("primary_naics"),
                        record.get("top_chemical"),
                    ),
                    "chemicalHighlights": infer_chemical_highlights(
                        record.get("top_chemical"),
                        record.get("industry_sector"),
                        record.get("facility_name"),
                    ),
                    "city": record.get("city"),
                    "county": record.get("county_name"),
                    "stateCode": record.get("state_code"),
                    "locationLabel": ", ".join(
                        [
                            value
                            for value in [
                                record.get("city"),
                                record.get("state_code"),
                            ]
                            if value
                        ]
                    ),
                    "relatedCaseStudyIds": case_studies,
                    "officialSignals": [
                        f"TRI facility disclosure for reporting year {year}",
                        f"Reported total releases: {record['total_release_kg']:.0f} kg",
                    ],
                    "emergingConcerns": [
                        "TRI covers regulated disclosures, not the full chemical universe.",
                    ],
                    "wildlifeSentinelContext": [
                        "No species-specific inference should be made from TRI facility records alone.",
                    ],
                    "reproductiveHealthContext": [
                        "TRI facility records are not direct reproductive-health measurements.",
                    ],
                    "legalHistoricalContext": [
                        "TRI reporting can be paired with compliance and enforcement records, but it is not an enforcement determination.",
                    ],
                    "uncertaintyNote": "TRI captures reported releases and transfers, not full downstream transport or dose.",
                    "sourceStats": [
                        {"label": "TRI year", "value": str(year)},
                        {"label": "Total releases", "value": f"{record['total_release_kg']:.0f} kg"},
                    ],
                    "frsId": record.get("frs_id"),
                    "triFacilityId": record.get("trifd"),
                },
            }
        )

    return rows


def build_release_rows(frame: pd.DataFrame, year: int) -> list[dict]:
    release_frame = frame.copy()
    for column in ("total_release_kg",):
        if column not in release_frame.columns:
            release_frame[column] = 0
        release_frame[column] = _as_number(release_frame[column]).fillna(0)

    release_frame["air_release_kg"] = release_frame.apply(
        lambda row: float(row["total_release_kg"]) if str(row.get("dominant_release_medium") or "").lower() == "air" else 0,
        axis=1,
    )
    release_frame["water_release_kg"] = release_frame.apply(
        lambda row: float(row["total_release_kg"]) if str(row.get("dominant_release_medium") or "").lower() == "water" else 0,
        axis=1,
    )

    grouped = (
        release_frame.groupby(
            ["slug", "chemical", "cas", "classification", "frs_id"],
            dropna=False,
        )
        .agg(
            total_release_kg=("total_release_kg", "sum"),
            air_release_kg=("air_release_kg", "sum"),
            water_release_kg=("water_release_kg", "sum"),
            row_count=("chemical", "count"),
            unit_of_measure=("unit_of_measure", "first"),
            tri_facility_ids=("trifd", lambda values: sorted({str(value).strip() for value in values if pd.notna(value) and str(value).strip()})),
        )
        .reset_index()
    )

    release_rows: list[dict] = []
    for record in grouped.to_dict("records"):
        air_release_kg = float(record.get("air_release_kg") or 0)
        water_release_kg = float(record.get("water_release_kg") or 0)
        dominant_release_medium = "water" if water_release_kg > air_release_kg else "air"
        chemical = str(record["chemical"]).strip()

        release_rows.append(
            {
                "site_slug": record["slug"],
                "record_title": f"{chemical} reported releases",
                "chemical_name": chemical,
                "cas_number": record.get("cas"),
                "reporting_year": year,
                "quantity_kg": float(record["total_release_kg"]) if pd.notna(record["total_release_kg"]) else None,
                "release_medium": dominant_release_medium,
                "category": "Facility footprint",
                "subcategory": record.get("classification") or "TRI chemical release",
                "layer_group": "official",
                "evidence_type": "direct_measurement",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": (
                    f"TRI chemical release record for {chemical} in {year}, aggregated from "
                    f"{int(record['row_count'])} source row{'s' if int(record['row_count']) != 1 else ''}."
                ),
                "notes": "Reported release quantities are based on TRI submissions and may reflect estimation methods.",
                "tags": [],
                "source_ids": ["epa-tri"],
                "source_name": "EPA TRI Basic Data Files",
                "source_url": TRI_URL_TEMPLATE.format(year=year, geography="US"),
                "source_updated_at": datetime.now(timezone.utc).isoformat(),
                "ingestion_version": f"tri_{year}",
                "metadata": {
                    "chemicalMarkers": infer_chemical_markers(
                        record.get("chemical"),
                        record.get("classification"),
                        record.get("release_medium"),
                    ),
                    "chemicalHighlights": infer_chemical_highlights(
                        record.get("chemical"),
                    ),
                    "unitOfMeasure": record.get("unit_of_measure"),
                    "trifd": record.get("tri_facility_ids", [None])[0],
                    "triFacilityIds": record.get("tri_facility_ids", []),
                    "frsId": record.get("frs_id"),
                    "airReleaseKg": air_release_kg,
                    "waterReleaseKg": water_release_kg,
                    "triSourceRowCount": int(record["row_count"]),
                },
            }
        )
    return release_rows


def main() -> None:
    args = parse_args()
    geography = args.geography.upper()
    url = TRI_URL_TEMPLATE.format(year=args.year, geography=geography)
    raw_file = raw_path("epa-tri", f"tri_basic_{args.year}_{geography}.csv")
    download_file(url, raw_file, force=args.force_download)

    frame = normalize_columns(pd.read_csv(raw_file, low_memory=False))
    if args.limit:
        frame = frame.head(args.limit).copy()

    frame["latitude"] = _as_number(frame["latitude"])
    frame["longitude"] = _as_number(frame["longitude"])
    frame["total_releases"] = _as_number(frame["total_releases"])
    frame["on_site_release_total"] = _as_number(frame["on_site_release_total"])
    frame["off_site_release_total"] = _as_number(frame["off_site_release_total"])

    frame["total_release_pounds"] = frame["total_releases"].fillna(
        frame["on_site_release_total"].fillna(0) + frame["off_site_release_total"].fillna(0)
    )
    frame["total_release_kg"] = frame["total_release_pounds"] * POUNDS_TO_KG
    frame["slug"] = frame.apply(
        lambda row: f"frs-{str(row['frs_id']).strip()}"
        if pd.notna(row.get("frs_id")) and str(row.get("frs_id")).strip()
        else f"tri-{slugify(str(row['trifd']))}",
        axis=1,
    )
    frame["dominant_release_medium"] = frame.apply(
        lambda row: "water"
        if (row.get("water") or 0) > max((row.get("fugitive_air") or 0), (row.get("stack_air") or 0))
        else "air",
        axis=1,
    )

    cleaned_file = cleaned_path("epa-tri", f"tri_basic_{args.year}_{geography}_normalized")
    parquet_path, csv_path = write_dataframe(frame, cleaned_file)

    industrial_site_rows = build_industrial_site_rows(frame, args.year)
    release_rows = build_release_rows(frame, args.year)
    validate_load_rows(industrial_site_rows, "industrial_sites", job_name="EPA TRI facility rows")
    validate_load_rows(release_rows, "toxic_release_records", job_name="EPA TRI release rows")

    transform_file = transform_path("epa-tri", f"tri_facility_summary_{args.year}_{geography}")
    facility_summary = pd.DataFrame(industrial_site_rows)
    write_dataframe(facility_summary, transform_file)

    loaded_sites = 0
    loaded_releases = 0
    if args.load:
        loaded_sites = load_industrial_sites(industrial_site_rows)
        loaded_releases = replace_toxic_release_records(release_rows, reporting_year=args.year)

    write_loader_manifest(
        f"tri_{args.year}_{geography}",
        {
            "source": "epa-tri",
            "download_url": url,
            "raw_file": str(raw_file),
            "cleaned_parquet": str(parquet_path),
            "cleaned_csv": str(csv_path),
            "industrial_site_records": len(industrial_site_rows),
            "release_records": len(release_rows),
            "loaded_industrial_sites": loaded_sites,
            "loaded_toxic_release_records": loaded_releases,
            "loaded_to_database": bool(args.load),
        },
    )

    print(f"Normalized TRI file: {parquet_path}")
    print(f"Facility records: {len(industrial_site_rows)}")
    print(f"Release records: {len(release_rows)}")


if __name__ == "__main__":
    main()
