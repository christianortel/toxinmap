from __future__ import annotations

import argparse
from datetime import datetime, timezone

import pandas as pd

from loaders.postgres import load_wastewater_sites
from utils.epa import (
    cleaned_path,
    ensure_zip_download,
    extract_zip,
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

NPDES_OUTFALLS_URL = "https://echo.epa.gov/files/echodownloads/npdes_outfalls_layer.zip"
NPDES_BIOSOLIDS_URL = "https://echo.epa.gov/files/echodownloads/npdes_biosolids_downloads.zip"
WASTEWATER_COMPONENT_KEYWORDS = ("POTW", "BIOSOLIDS", "CSO", "PRETREATMENT")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download, normalize, and optionally load EPA NPDES wastewater and biosolids context."
    )
    parser.add_argument("--states", default="", help="Optional comma-separated state filter, e.g. NC,LA,OH.")
    parser.add_argument("--limit", type=int, default=None, help="Optional record limit for local iteration.")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--load", action="store_true")
    return parser.parse_args()


def normalize_state_filter(states: str) -> set[str]:
    return {value.strip().upper() for value in states.split(",") if value.strip()}


def has_wastewater_signal(components: str | None) -> bool:
    normalized = (components or "").upper()
    return any(keyword in normalized for keyword in WASTEWATER_COMPONENT_KEYWORDS)


def parse_year(value: str | float | int | None) -> int | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    text = str(value).strip()
    if not text:
        return None

    try:
        return datetime.strptime(text, "%m/%d/%Y").year
    except ValueError:
        return None


def build_wastewater_frame(
    outfalls: pd.DataFrame,
    biosolids_permits: pd.DataFrame,
    state_filter: set[str],
) -> pd.DataFrame:
    outfalls = outfalls.copy()
    outfalls["permit_components"] = outfalls["permit_components"].fillna("").astype(str)
    outfalls["state_code"] = outfalls["state_code"].fillna("").astype(str).str.upper()

    if state_filter:
        outfalls = outfalls[outfalls["state_code"].isin(state_filter)].copy()
        biosolids_permits = biosolids_permits[
            biosolids_permits["cwp_state"].fillna("").astype(str).str.upper().isin(state_filter)
        ].copy()

    wastewater = outfalls[outfalls["permit_components"].map(has_wastewater_signal)].copy()

    biosolids_flags = (
        biosolids_permits[["npdes_id", "biosolids_flag", "cwp_permit_status_desc", "cwp_facility_type_indicator"]]
        .drop_duplicates(subset=["npdes_id"])
        .rename(
            columns={
                "npdes_id": "external_permit_nmbr",
                "biosolids_flag": "biosolids_flag",
                "cwp_permit_status_desc": "biosolids_permit_status_desc",
                "cwp_facility_type_indicator": "biosolids_facility_indicator",
            }
        )
    )

    wastewater = wastewater.merge(biosolids_flags, on="external_permit_nmbr", how="left")
    wastewater["biosolids_flag"] = wastewater["biosolids_flag"].fillna("N")
    wastewater["total_design_flow_nmbr"] = pd.to_numeric(wastewater["total_design_flow_nmbr"], errors="coerce")
    wastewater["latitude83"] = pd.to_numeric(wastewater["latitude83"], errors="coerce")
    wastewater["longitude83"] = pd.to_numeric(wastewater["longitude83"], errors="coerce")
    wastewater["observed_year"] = wastewater["permit_effective_date"].map(parse_year)
    wastewater["location_label"] = wastewater.apply(
        lambda row: ", ".join(
            value
            for value in [row.get("city"), row.get("state_code")]
            if isinstance(value, str) and value.strip()
        ),
        axis=1,
    )
    wastewater["state_case_studies"] = wastewater["state_code"].map(infer_case_studies)
    wastewater["tags"] = wastewater.apply(
        lambda row: sorted(
            {
                *infer_tags(row.get("state_case_studies", [])),
                "downstream",
                *(["drinking-water"] if "POTW" in row.get("permit_components", "").upper() else []),
                *(["biosolids"] if row.get("biosolids_flag") == "Y" else []),
            }
        ),
        axis=1,
    )

    return wastewater


def build_load_rows(frame: pd.DataFrame) -> list[dict]:
    rows: list[dict] = []
    updated_at = datetime.now(timezone.utc).isoformat()

    for record in frame.to_dict("records"):
        component_text = str(record.get("permit_components") or "")
        water_body = record.get("state_water_body_name")
        case_studies = record.get("state_case_studies", [])
        component_tokens = [token.strip() for token in component_text.split(",") if token.strip()]
        discharge_type = ", ".join(component_tokens[:2]) if component_tokens else "Wastewater context"

        summary_bits = ["EPA NPDES wastewater context point"]
        if water_body and isinstance(water_body, str) and water_body.strip():
            summary_bits.append(f"near {water_body.title()}")
        if record.get("total_design_flow_nmbr") is not None and pd.notna(record.get("total_design_flow_nmbr")):
            summary_bits.append(f"with {float(record['total_design_flow_nmbr']):.2f} MGD design flow")

        rows.append(
            {
                "slug": (
                    f"npdes-{slugify(str(record['external_permit_nmbr']))}-"
                    f"{slugify(str(record.get('perm_feature_nmbr') or 'facility'))}"
                ),
                "facility_name": record["facility_name"],
                "permit_id": record["external_permit_nmbr"],
                "discharge_type": discharge_type,
                "flow_mgd": float(record["total_design_flow_nmbr"])
                if pd.notna(record.get("total_design_flow_nmbr"))
                else None,
                "longitude": float(record["longitude83"]) if pd.notna(record.get("longitude83")) else None,
                "latitude": float(record["latitude83"]) if pd.notna(record.get("latitude83")) else None,
                "observed_year": record.get("observed_year"),
                "category": "Wastewater discharge context",
                "subcategory": discharge_type,
                "layer_group": "emerging",
                "evidence_type": "proxy",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": ". ".join(summary_bits) + ".",
                "notes": (
                    "NPDES wastewater and biosolids records show permitted discharge and treatment context. "
                    "They do not, by themselves, measure downstream contaminant concentration or personal exposure."
                ),
                "tags": record.get("tags", []),
                "source_ids": ["epa-npdes", "epa-biosolids"],
                "source_name": "EPA ECHO NPDES wastewater and biosolids downloads",
                "source_url": NPDES_OUTFALLS_URL,
                "source_updated_at": updated_at,
                "ingestion_version": "npdes_wastewater_v1",
                "metadata": {
                    "signalFamilies": [
                        "wastewater",
                        *(
                            ["pfas"]
                            if record.get("biosolids_flag") == "Y"
                            else []
                        ),
                    ],
                    "chemicalMarkers": [
                        "wastewater-indicators",
                        *(
                            ["pfas"]
                            if record.get("biosolids_flag") == "Y"
                            else []
                        ),
                    ],
                    "chemicalHighlights": [
                        *(
                            ["PFAS"]
                            if record.get("biosolids_flag") == "Y"
                            else []
                        ),
                        "Wastewater-associated compounds",
                    ],
                    "stateCode": record.get("state_code"),
                    "city": record.get("city"),
                    "county": record.get("fac_county_name"),
                    "locationLabel": record.get("location_label"),
                    "relatedCaseStudyIds": case_studies,
                    "permitStatus": record.get("permit_status_desc"),
                    "permitType": record.get("permit_type_desc"),
                    "permitComponents": component_tokens,
                    "majorMinorFlag": record.get("major_minor_flag"),
                    "subTypeDesc": record.get("sub_type_desc"),
                    "waterBody": water_body,
                    "biosolidsFlag": record.get("biosolids_flag"),
                    "biosolidsPermitStatus": record.get("biosolids_permit_status_desc"),
                    "officialSignals": [
                        "EPA NPDES permit and outfall context",
                        *(["EPA biosolids permit context"] if record.get("biosolids_flag") == "Y" else []),
                    ],
                    "emergingConcerns": [
                        "Wastewater systems can concentrate PFAS, pharmaceuticals, and other persistent compounds.",
                    ],
                    "wildlifeSentinelContext": [
                        "Aquatic species stress should be inferred only from dedicated monitoring or literature, not this permit record alone.",
                    ],
                    "reproductiveHealthContext": [
                        "This is infrastructure and permit context, not a reproductive-health measurement.",
                    ],
                    "legalHistoricalContext": [
                        "Permit and significant noncompliance fields can help frame regulatory pressure around discharge systems.",
                    ],
                    "uncertaintyNote": (
                        "These are permitted discharge-context records. They show plausible pathways and facility pressure points, "
                        "not direct downstream concentration measurements."
                    ),
                    "sourceStats": [
                        {"label": "Permit", "value": str(record.get("external_permit_nmbr"))},
                        {
                            "label": "Design flow",
                            "value": (
                                f"{float(record['total_design_flow_nmbr']):.2f} MGD"
                                if pd.notna(record.get("total_design_flow_nmbr"))
                                else "Not listed"
                            ),
                        },
                    ],
                    "sncStatus": record.get("cwp_current_snc_status"),
                    "currentViolation": record.get("cwp_current_viol"),
                    "currentStatus": record.get("cwa_current_status"),
                    "lastInspectionDate": record.get("cwp_date_last_inspection"),
                    "lastFormalEaDate": record.get("date_last_formal_ea"),
                },
            }
        )

    return rows


def main() -> None:
    args = parse_args()
    state_filter = normalize_state_filter(args.states)

    raw_outfalls_zip = raw_path("epa-npdes", "npdes_outfalls_layer.zip")
    raw_biosolids_zip = raw_path("epa-npdes", "npdes_biosolids_downloads.zip")
    raw_outfalls_zip = ensure_zip_download(NPDES_OUTFALLS_URL, raw_outfalls_zip, force=args.force_download)
    raw_biosolids_zip = ensure_zip_download(
        NPDES_BIOSOLIDS_URL,
        raw_biosolids_zip,
        force=args.force_download,
    )

    outfalls_files = extract_zip(
        raw_outfalls_zip,
        raw_path("epa-npdes", "outfalls_expanded"),
        members=["npdes_outfalls_layer.csv"],
    )
    biosolids_files = extract_zip(
        raw_biosolids_zip,
        raw_path("epa-npdes", "biosolids_expanded"),
        members=["NPDES_BIOSOLIDS_PERMITS.csv"],
    )

    outfalls = normalize_columns(pd.read_csv(outfalls_files[0], low_memory=False))
    biosolids_permits = normalize_columns(pd.read_csv(biosolids_files[0], low_memory=False))
    wastewater = build_wastewater_frame(outfalls, biosolids_permits, state_filter)

    if args.limit:
        wastewater = wastewater.head(args.limit).copy()

    cleaned_base = cleaned_path("epa-npdes", "npdes_wastewater_context")
    parquet_path, csv_path = write_dataframe(wastewater, cleaned_base)

    load_rows = build_load_rows(wastewater)
    validate_load_rows(load_rows, "wastewater_sites", job_name="EPA NPDES wastewater rows")
    transform_base = transform_path("epa-npdes", "npdes_wastewater_load_rows")
    write_dataframe(pd.DataFrame(load_rows), transform_base)

    loaded_records = load_wastewater_sites(load_rows) if args.load else 0

    write_loader_manifest(
        "npdes_wastewater_context",
        {
            "source": "epa-npdes",
            "outfalls_download_url": NPDES_OUTFALLS_URL,
            "biosolids_download_url": NPDES_BIOSOLIDS_URL,
            "raw_outfalls_zip": str(raw_outfalls_zip),
            "raw_biosolids_zip": str(raw_biosolids_zip),
            "cleaned_parquet": str(parquet_path),
            "cleaned_csv": str(csv_path),
            "records": len(load_rows),
            "loaded_to_database": bool(args.load),
            "loaded_records": loaded_records,
            "state_filter": sorted(state_filter),
            "component_keywords": list(WASTEWATER_COMPONENT_KEYWORDS),
        },
    )

    print(f"Normalized NPDES wastewater context: {parquet_path}")
    print(f"Wastewater rows: {len(load_rows)}")


if __name__ == "__main__":
    main()
