from __future__ import annotations

import argparse
from datetime import datetime, timezone

import pandas as pd

from loaders.postgres import load_industrial_sites
from utils.epa import (
    FRS_DOWNLOAD_URL,
    cleaned_path,
    ensure_zip_download,
    extract_zip,
    first_existing_column,
    infer_case_studies,
    infer_tags,
    normalize_columns,
    raw_path,
    transform_path,
    write_dataframe,
    write_loader_manifest,
)
from utils.validation import validate_load_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download, normalize, and optionally load EPA FRS facilities and linkages.")
    parser.add_argument("--states", default="", help="Optional comma-separated state filter, e.g. NC,LA,OH.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--load", action="store_true")
    return parser.parse_args()


def normalize_state_filter(states: str) -> set[str]:
    return {value.strip().upper() for value in states.split(",") if value.strip()}


def infer_signal_families(*values: object) -> list[str]:
    text = " ".join(str(value or "") for value in values).lower()
    families: set[str] = set()

    if any(token in text for token in ["tri", "air", "emission", "release"]):
        families.add("air-toxics")
    if any(token in text for token in ["petro", "chemical", "refin", "resin", "polymer", "plastic"]):
        families.add("petrochemical")
    if any(token in text for token in ["power", "electric", "utility", "generation", "combustion"]):
        families.add("power-combustion")
    if any(token in text for token in ["water", "sewer", "waste", "potw", "biosolids"]):
        families.add("wastewater")

    if not families:
        families.add("petrochemical")

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
    if any(token in text for token in ["power", "combustion", "coal", "utility", "generation"]):
        markers.add("combustion-pollutants")
    if any(token in text for token in ["water", "waste", "sewer", "potw", "biosolids"]):
        markers.add("wastewater-indicators")
    if not markers:
        markers.add("legacy-industrial-mixtures")

    return sorted(markers)


def build_crosswalk(
    facilities: pd.DataFrame,
    program_links: pd.DataFrame,
    naics: pd.DataFrame,
    state_filter: set[str],
) -> pd.DataFrame:
    facilities["registry_id"] = facilities["registry_id"].fillna("").astype(str).str.strip()
    program_links["registry_id"] = program_links["registry_id"].fillna("").astype(str).str.strip()
    naics["registry_id"] = naics["registry_id"].fillna("").astype(str).str.strip()

    facilities = facilities[facilities["registry_id"] != ""].copy()
    program_links = program_links[program_links["registry_id"] != ""].copy()
    naics = naics[naics["registry_id"] != ""].copy()

    if state_filter:
        facilities = facilities[facilities["fac_state"].isin(state_filter)].copy()
        program_links = program_links[program_links["state_code"].isin(state_filter)].copy()

    if naics.empty:
        naics_summary = pd.DataFrame(columns=["registry_id", "naics_code"])
    else:
        naics_summary = naics.groupby("registry_id", dropna=False).agg(naics_code=("naics_code", "first")).reset_index()

    program_links["pgm_sys_acrnm"] = program_links["pgm_sys_acrnm"].fillna("").astype(str)
    program_summary = (
        program_links.groupby("registry_id", dropna=False)
        .agg(
            program_acronyms=("pgm_sys_acrnm", lambda values: sorted({value for value in values if value})),
            tri_ids=(
                "pgm_sys_id",
                lambda values: sorted(
                    {
                        value
                        for value, acronym in zip(values, program_links.loc[values.index, "pgm_sys_acrnm"])
                        if isinstance(value, str) and "TRI" in str(acronym).upper()
                    }
                ),
            ),
            county_fips=("fips_code", "first"),
            state_code=("state_code", "first"),
            city_name=("city_name", "first"),
        )
        .reset_index()
    )

    frame = (
        facilities.merge(program_summary, on="registry_id", how="left")
        .merge(naics_summary, on="registry_id", how="left")
        .drop_duplicates(subset=["registry_id"])
    )

    frame["slug"] = frame["registry_id"].apply(lambda value: f"frs-{str(value).strip()}")
    frame["related_case_studies"] = frame["fac_state"].apply(infer_case_studies)
    frame["tags"] = frame["related_case_studies"].apply(infer_tags)
    frame["location_label"] = frame.apply(
        lambda row: ", ".join([value for value in [row.get("fac_city"), row.get("fac_state")] if isinstance(value, str) and value]),
        axis=1,
    )
    return frame


def read_filtered_related_rows(path: str, registry_ids: set[str], column_name: str) -> pd.DataFrame:
    chunks: list[pd.DataFrame] = []
    for chunk in pd.read_csv(path, low_memory=False, chunksize=250000):
        normalized = normalize_columns(chunk)
        normalized[column_name] = normalized[column_name].fillna("").astype(str).str.strip()
        filtered = normalized[normalized[column_name].astype(str).isin(registry_ids)].copy()
        if not filtered.empty:
            chunks.append(filtered)

    if not chunks:
        return pd.DataFrame(columns=[column_name])

    return pd.concat(chunks, ignore_index=True)


def build_load_rows(frame: pd.DataFrame) -> list[dict]:
    rows: list[dict] = []
    for record in frame.to_dict("records"):
        facility_name = record.get("fac_name")
        if not isinstance(facility_name, str) or not facility_name.strip():
            facility_name = f"FRS facility {record.get('registry_id')}"

        program_acronyms = record.get("program_acronyms")
        if not isinstance(program_acronyms, list):
            program_acronyms = []

        tri_ids = record.get("tri_ids")
        if not isinstance(tri_ids, list):
            tri_ids = []

        rows.append(
            {
                "slug": record["slug"],
                "facility_name": facility_name,
                "operator_name": None,
                "naics_code": record.get("naics_code") or None,
                "status": "registered",
                "longitude": float(record["longitude_measure"]) if pd.notna(record.get("longitude_measure")) else None,
                "latitude": float(record["latitude_measure"]) if pd.notna(record.get("latitude_measure")) else None,
                "active_year": None,
                "date_range_label": "FRS current",
                "category": "Facility footprint",
                "subcategory": "Facility normalization",
                "layer_group": "official",
                "evidence_type": "proxy",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": "FRS facility identity row used as the canonical join surface for TRI and ECHO records.",
                "notes": "FRS is identity infrastructure. It improves linkage across EPA systems but is not direct contamination evidence.",
                "tags": record.get("tags", []),
                "source_ids": ["epa-frs"],
                "source_name": "EPA Facility Registry Service",
                "source_url": FRS_DOWNLOAD_URL,
                "source_updated_at": datetime.now(timezone.utc).isoformat(),
                "ingestion_version": "frs_v1",
                "metadata": {
                    "signalFamilies": infer_signal_families(
                        record.get("naics_code"),
                        record.get("program_acronyms", []),
                        record.get("fac_name"),
                    ),
                    "chemicalMarkers": infer_chemical_markers(
                        record.get("naics_code"),
                        record.get("program_acronyms", []),
                        record.get("fac_name"),
                    ),
                    "city": record.get("fac_city"),
                    "county": record.get("fac_county"),
                    "stateCode": record.get("fac_state"),
                    "countyFips": record.get("county_fips"),
                    "locationLabel": record.get("location_label"),
                    "relatedCaseStudyIds": record.get("related_case_studies", []),
                    "officialSignals": ["FRS registry match", "EPA cross-program facility linkage"],
                    "emergingConcerns": ["FRS linkage does not indicate release magnitude or downstream transport."],
                    "wildlifeSentinelContext": ["No wildlife inference should be made from FRS identity records alone."],
                    "reproductiveHealthContext": ["FRS records are not direct reproductive-health measurements."],
                    "legalHistoricalContext": ["FRS identity rows support later joins to regulatory context, not legal conclusions."],
                    "uncertaintyNote": "FRS records help normalize facilities across datasets, but linkage gaps and stale identifiers still occur.",
                    "sourceStats": [
                        {"label": "Programs linked", "value": str(len(program_acronyms))},
                        {"label": "TRI ids", "value": str(len(tri_ids))},
                    ],
                    "frsId": record.get("registry_id"),
                    "programAcronyms": program_acronyms,
                    "triIds": tri_ids,
                },
            }
        )

    return rows


def main() -> None:
    args = parse_args()
    state_filter = normalize_state_filter(args.states)
    raw_zip = raw_path("epa-frs", "frs_downloads.zip")
    raw_zip = ensure_zip_download(FRS_DOWNLOAD_URL, raw_zip, force=args.force_download)
    extracted = extract_zip(
        raw_zip,
        raw_path("epa-frs", "expanded"),
        members=[
            "FRS_FACILITIES.csv",
            "FRS_PROGRAM_LINKS.csv",
            "FRS_NAICS_CODES.csv",
        ],
    )

    file_map = {path.name: path for path in extracted}
    facilities = normalize_columns(
        pd.read_csv(file_map["FRS_FACILITIES.csv"], low_memory=False, nrows=args.limit if args.limit else None)
    )
    facilities["registry_id"] = facilities["registry_id"].fillna("").astype(str).str.strip()

    if args.limit:
        registry_ids = {value for value in facilities["registry_id"] if value}
        program_links = read_filtered_related_rows(file_map["FRS_PROGRAM_LINKS.csv"], registry_ids, "registry_id")
        naics = read_filtered_related_rows(file_map["FRS_NAICS_CODES.csv"], registry_ids, "registry_id")
    else:
        program_links = normalize_columns(pd.read_csv(file_map["FRS_PROGRAM_LINKS.csv"], low_memory=False))
        naics = normalize_columns(pd.read_csv(file_map["FRS_NAICS_CODES.csv"], low_memory=False))
        program_links["registry_id"] = program_links["registry_id"].fillna("").astype(str).str.strip()
        naics["registry_id"] = naics["registry_id"].fillna("").astype(str).str.strip()

    crosswalk = build_crosswalk(facilities, program_links, naics, state_filter)
    cleaned_base = cleaned_path("epa-frs", "frs_facility_crosswalk")
    parquet_path, csv_path = write_dataframe(crosswalk, cleaned_base)

    load_rows = build_load_rows(crosswalk)
    validate_load_rows(load_rows, "industrial_sites", job_name="EPA FRS facility rows")
    transform_base = transform_path("epa-frs", "frs_industrial_sites")
    write_dataframe(pd.DataFrame(load_rows), transform_base)

    loaded_records = load_industrial_sites(load_rows) if args.load else 0

    write_loader_manifest(
        "frs_facility_crosswalk",
        {
            "source": "epa-frs",
            "download_url": FRS_DOWNLOAD_URL,
            "raw_archive": str(raw_zip),
            "cleaned_parquet": str(parquet_path),
            "cleaned_csv": str(csv_path),
            "records": len(load_rows),
            "loaded_to_database": bool(args.load),
            "loaded_records": loaded_records,
            "state_filter": sorted(state_filter),
        },
    )

    print(f"Normalized FRS facilities: {parquet_path}")
    print(f"Facility identity rows: {len(load_rows)}")


if __name__ == "__main__":
    main()
