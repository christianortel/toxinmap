from __future__ import annotations

import argparse
import zipfile
from datetime import datetime, timezone

import pandas as pd

from loaders.postgres import load_health_concern_context, load_industrial_sites
from utils.epa import (
    ECHO_FEC_DOWNLOAD_URL,
    cleaned_path,
    ensure_zip_download,
    first_existing_column,
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download, normalize, and optionally load EPA ECHO ICIS FE&C data.")
    parser.add_argument("--states", default="", help="Optional comma-separated state filter, e.g. NC,LA,OH.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--load", action="store_true")
    return parser.parse_args()


def normalize_state_filter(states: str) -> set[str]:
    return {value.strip().upper() for value in states.split(",") if value.strip()}


def normalize_registry_id(value: object) -> str:
    text = str(value or "").strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def discover_case_file(zip_path):
    with zipfile.ZipFile(zip_path) as archive:
        candidates = [name for name in archive.namelist() if name.lower().endswith((".csv", ".txt"))]
        for candidate in candidates:
            with archive.open(candidate) as handle:
                sample = normalize_columns(pd.read_csv(handle, low_memory=False, nrows=25))
                if "registry_id" in sample.columns and (
                    first_existing_column(sample, ["case_number", "case_id", "enforcement_case_id", "case_name"])
                    or first_existing_column(sample, ["law_section_code", "program_desc", "program_code"])
                ):
                    return candidate
    raise RuntimeError("Unable to find a usable ICIS FE&C case file in the ECHO download.")


def build_facility_updates(frame: pd.DataFrame) -> list[dict]:
    frame["state_code"] = frame[state_column].fillna("").astype(str)
    grouped = (
        frame.groupby("registry_id", dropna=False)
        .agg(
            facility_name=(facility_column, "first"),
            state_code=(state_column, "first"),
            city_name=(city_column, "first"),
            program_desc=(program_column, "first"),
            case_count=(case_number_column, "count"),
            latest_case_year=(case_year_column, "max"),
        )
        .reset_index()
    )

    rows: list[dict] = []
    for record in grouped.to_dict("records"):
        registry_id = normalize_registry_id(record.get("registry_id"))
        case_studies = infer_case_studies(record.get("state_code"))
        rows.append(
            {
                "slug": f"frs-{registry_id}",
                "facility_name": record.get("facility_name") or f"ECHO facility {registry_id}",
                "operator_name": None,
                "naics_code": None,
                "status": "regulated",
                "longitude": None,
                "latitude": None,
                "active_year": int(record["latest_case_year"]) if pd.notna(record.get("latest_case_year")) else None,
                "date_range_label": (
                    str(int(record["latest_case_year"])) if pd.notna(record.get("latest_case_year")) else "ECHO history"
                ),
                "category": "Facility footprint",
                "subcategory": "Compliance and enforcement context",
                "layer_group": "official",
                "evidence_type": "proxy",
                "confidence_level": "moderate",
                "geographic_level": "facility",
                "summary": (
                    f"ECHO ICIS FE&C context for {int(record['case_count'])} federal compliance or enforcement records."
                ),
                "notes": "ECHO FE&C records describe compliance and enforcement context, not direct exposure measurement.",
                "tags": infer_tags(case_studies),
                "source_ids": ["epa-echo", "epa-frs"],
                "source_name": "EPA ECHO ICIS FE&C Dataset",
                "source_url": ECHO_FEC_DOWNLOAD_URL,
                "source_updated_at": datetime.now(timezone.utc).isoformat(),
                "ingestion_version": "echo_fec_v1",
                "metadata": {
                    "signalFamilies": ["legal-pressure"],
                    "chemicalMarkers": ["legacy-industrial-mixtures"],
                    "locationLabel": ", ".join(
                        [
                            value
                            for value in [record.get("city_name"), record.get("state_code")]
                            if isinstance(value, str) and value
                        ]
                    ),
                    "relatedCaseStudyIds": case_studies,
                    "officialSignals": [
                        f"ICIS FE&C federal case count: {int(record['case_count'])}",
                    ],
                    "emergingConcerns": [
                        "Enforcement history can surface a place before environmental monitoring feels complete.",
                    ],
                    "wildlifeSentinelContext": [
                        "ECHO case history is regulatory context, not ecological outcome proof.",
                    ],
                    "reproductiveHealthContext": [
                        "ECHO records do not encode direct reproductive-health outcomes.",
                    ],
                    "legalHistoricalContext": [
                        f"Primary program context: {record.get('program_desc') or 'Federal enforcement context'}",
                    ],
                    "uncertaintyNote": "Compliance and enforcement histories can be important public-interest clues without acting as exposure proof.",
                    "sourceStats": [
                        {"label": "Federal cases", "value": str(int(record["case_count"]))},
                    ],
                    "frsId": registry_id,
                },
            }
        )

    return rows


def build_case_context_rows(frame: pd.DataFrame) -> list[dict]:
    rows: list[dict] = []
    seen_slugs: set[str] = set()
    for record in frame.to_dict("records"):
        case_number = str(record.get(case_number_column) or "").strip()
        if not case_number:
            continue

        state_code = str(record.get(state_column) or "").strip()
        registry_id = normalize_registry_id(record.get("registry_id"))
        case_studies = infer_case_studies(state_code)
        concern_type = str(record.get(program_column) or "").strip() or "Federal enforcement context"
        title = record.get(case_name_column) or f"ICIS FE&C case {case_number}"
        slug = f"echo-case-{slugify(case_number)}"
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        rows.append(
            {
                "slug": slug,
                "title": title,
                "concern_type": concern_type,
                "narrative": " | ".join(
                    value
                    for value in [
                        f"Case {case_number}",
                        str(record.get(status_column) or "").strip() or None,
                        concern_type,
                    ]
                    if value
                ),
                "is_verified": True,
                "category": "Pressure point",
                "subcategory": "Federal compliance and enforcement",
                "layer_group": "legal",
                "evidence_type": "editorial_case_study",
                "confidence_level": "moderate",
                "geographic_level": "facility",
                "summary": "Federal compliance or enforcement history surfaced through the EPA ECHO ICIS FE&C dataset.",
                "notes": "Administrative and enforcement context should be read separately from direct measurement claims.",
                "tags": infer_tags(case_studies),
                "source_ids": ["epa-echo"],
                "source_name": "EPA ECHO ICIS FE&C Dataset",
                "source_url": ECHO_FEC_DOWNLOAD_URL,
                "source_updated_at": datetime.now(timezone.utc).isoformat(),
                "ingestion_version": "echo_fec_v1",
                "metadata": {
                    "frsId": registry_id,
                    "caseNumber": case_number,
                    "relatedCaseStudyIds": case_studies,
                },
            }
        )

    return rows


def main() -> None:
    args = parse_args()
    state_filter = normalize_state_filter(args.states)
    raw_zip = raw_path("epa-echo", "case_downloads.zip")
    raw_zip = ensure_zip_download(ECHO_FEC_DOWNLOAD_URL, raw_zip, force=args.force_download)

    case_file = discover_case_file(raw_zip)
    with zipfile.ZipFile(raw_zip) as archive, archive.open(case_file) as handle:
        frame = normalize_columns(pd.read_csv(handle, low_memory=False, nrows=args.limit if args.limit else None))

    if "registry_id" in frame.columns:
        frame["registry_id"] = frame["registry_id"].apply(normalize_registry_id)

    global facility_column, state_column, city_column, program_column, case_number_column
    global case_year_column, case_name_column, status_column

    facility_column = first_existing_column(frame, ["fac_name", "facility_name", "primary_name"]) or "registry_id"
    state_column = first_existing_column(frame, ["fac_state", "state_code", "state"]) or "registry_id"
    city_column = first_existing_column(frame, ["fac_city", "city_name", "city"]) or state_column
    program_column = first_existing_column(frame, ["program_desc", "program_code", "program"]) or "registry_id"
    case_number_column = first_existing_column(
        frame,
        ["case_number", "case_id", "enforcement_case_id", "case_number_text"],
    ) or "registry_id"
    case_name_column = first_existing_column(frame, ["case_name", "case_title", "enforcement_case_name"]) or case_number_column
    status_column = first_existing_column(frame, ["case_status", "status", "status_desc"]) or program_column

    if state_filter:
        frame[state_column] = frame[state_column].fillna("").astype(str).str.upper()
        frame = frame[frame[state_column].isin(state_filter)].copy()

    case_year_column = first_existing_column(
        frame,
        ["fiscal_year", "activity_year", "case_year", "year"],
    )
    if case_year_column:
        frame[case_year_column] = pd.to_numeric(frame[case_year_column], errors="coerce")
    else:
        frame["derived_case_year"] = datetime.now(timezone.utc).year
        case_year_column = "derived_case_year"

    cleaned_base = cleaned_path("epa-echo", "icis_fec_normalized")
    parquet_path, csv_path = write_dataframe(frame, cleaned_base)

    facility_updates = build_facility_updates(frame)
    case_context_rows = build_case_context_rows(frame)
    validate_load_rows(facility_updates, "industrial_sites", job_name="EPA ECHO facility rows")
    validate_load_rows(case_context_rows, "health_concern_context", job_name="EPA ECHO case-context rows")
    write_dataframe(pd.DataFrame(facility_updates), transform_path("epa-echo", "icis_fec_facility_updates"))
    write_dataframe(pd.DataFrame(case_context_rows), transform_path("epa-echo", "icis_fec_case_context"))

    loaded_facilities = load_industrial_sites(facility_updates) if args.load else 0
    loaded_context = load_health_concern_context(case_context_rows) if args.load else 0

    write_loader_manifest(
        "echo_icis_fec",
        {
            "source": "epa-echo",
            "download_url": ECHO_FEC_DOWNLOAD_URL,
            "raw_archive": str(raw_zip),
            "case_file": case_file,
            "cleaned_parquet": str(parquet_path),
            "cleaned_csv": str(csv_path),
            "facility_updates": len(facility_updates),
            "case_context_rows": len(case_context_rows),
            "loaded_facility_updates": loaded_facilities,
            "loaded_health_context": loaded_context,
            "loaded_to_database": bool(args.load),
        },
    )

    print(f"Normalized ECHO case file: {case_file}")
    print(f"Facility compliance records: {len(facility_updates)}")
    print(f"Case context records: {len(case_context_rows)}")


if __name__ == "__main__":
    main()
