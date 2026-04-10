from __future__ import annotations

import argparse
from datetime import datetime, timezone

import pandas as pd

from loaders.postgres import load_wastewater_sites
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
from utils.validation import validate_load_rows

USGS_GREAT_LAKES_RELEASE_URL = "https://www.usgs.gov/data/pesticides-pharmaceuticals-and-wastewater-indicator-compounds-water-and-bottom-sediment"
USGS_GREAT_LAKES_SITES_URL = "https://www.sciencebase.gov/catalog/file/get/60ae9fa0d34e4043c8539c8f?f=__disk__c5%2F50%2F04%2Fc55004c448751a910bf4edd5c811f04a5dfbdc19"
USGS_GREAT_LAKES_DATA_URL = "https://www.sciencebase.gov/catalog/file/get/60ae9fa0d34e4043c8539c8f?f=__disk__1f%2F8a%2F76%2F1f8a7618b1744778facacf3554c42949eaf46681"
USGS_GREAT_LAKES_DICT_URL = "https://www.sciencebase.gov/catalog/file/get/60ae9fa0d34e4043c8539c8f?f=__disk__be%2F49%2Fd1%2Fbe49d1c673d26eeb42f45062c42eb622269bd7c0"
TARGET_CHEM_CLASSES = {"pharm", "fragrance", "fecal indicator", "sterol", "alkylphenol", "phenolic", "deet"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download, summarize, and optionally load USGS pharmaceutical and wastewater-indicator sampling context."
    )
    parser.add_argument("--limit", type=int, default=None, help="Optional row limit for local iteration.")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--load", action="store_true")
    return parser.parse_args()


def is_detected(remark: object) -> bool:
    if remark is None or (isinstance(remark, float) and pd.isna(remark)):
        return True
    return str(remark).strip() != "<"


def read_csv_with_fallback(path: str | bytes | object) -> pd.DataFrame:
    try:
        return pd.read_csv(path, low_memory=False)
    except UnicodeDecodeError:
        return pd.read_csv(path, low_memory=False, encoding="latin-1")


def build_summary_frame(
    site_info: pd.DataFrame,
    sample_data: pd.DataFrame,
    data_dictionary: pd.DataFrame,
) -> pd.DataFrame:
    dictionary = data_dictionary.copy()
    dictionary["chemclass"] = dictionary["chemclass"].fillna("").astype(str).str.strip()
    dictionary["pname"] = dictionary["pname"].fillna("").astype(str).str.strip()

    samples = sample_data.copy()
    samples["remark"] = samples["remark"].where(samples["remark"].notna(), None)
    samples["detected"] = samples["remark"].map(is_detected)
    samples = samples[samples["medcd"].isin(["WS", "WSQ"])].copy()
    samples = samples.merge(dictionary[["pcode", "pname", "chemclass"]], on=["pcode", "pname"], how="left")
    samples["chemclass"] = samples["chemclass"].fillna("").astype(str).str.strip()

    target_samples = samples[
        samples["chemclass"].str.lower().isin(TARGET_CHEM_CLASSES) & samples["detected"]
    ].copy()

    grouped = (
        target_samples.groupby(["siteid", "chemclass"], dropna=False)
        .agg(
            analyte_count=("pname", "nunique"),
            detection_events=("pname", "count"),
            top_compounds=("pname", lambda values: list(pd.Series(values).value_counts().head(3).index)),
        )
        .reset_index()
    )

    per_site = (
        grouped.groupby("siteid", dropna=False)
        .agg(
            classes_present=("chemclass", lambda values: sorted({value for value in values if value})),
            pharmaceutical_count=(
                "analyte_count",
                lambda values: int(sum(
                    value for value, chemclass in zip(values, grouped.loc[values.index, "chemclass"])
                    if str(chemclass).lower() == "pharm"
                )),
            ),
            wastewater_indicator_count=(
                "analyte_count",
                lambda values: int(sum(
                    value for value, chemclass in zip(values, grouped.loc[values.index, "chemclass"])
                    if str(chemclass).lower() != "pharm"
                )),
            ),
            total_detection_events=("detection_events", "sum"),
            featured_compounds=("top_compounds", lambda values: [compound for group in values for compound in group][:6]),
        )
        .reset_index()
    )

    frame = site_info.merge(per_site, on="siteid", how="inner")
    frame["sample_year"] = 2019
    frame["location_label"] = frame.apply(
        lambda row: ", ".join(
            value
            for value in [row.get("river"), "Great Lakes tributary"]
            if isinstance(value, str) and value.strip()
        ),
        axis=1,
    )
    return frame


def build_load_rows(frame: pd.DataFrame) -> list[dict]:
    updated_at = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []

    for record in frame.to_dict("records"):
        featured_compounds = [compound for compound in record.get("featured_compounds", []) if compound][:4]
        classes_present = [value for value in record.get("classes_present", []) if value]
        summary = (
            f"USGS Great Lakes tributary sample site with {int(record['pharmaceutical_count'])} detected pharmaceutical analytes "
            f"and {int(record['wastewater_indicator_count'])} detected wastewater-indicator compounds in 2019."
        )

        rows.append(
            {
                "slug": f"usgs-pharma-{slugify(str(record['fieldnm']))}",
                "facility_name": record["sitenm"],
                "permit_id": None,
                "discharge_type": "Pharmaceutical and wastewater-indicator sampling",
                "flow_mgd": None,
                "longitude": float(record["longitude"]) if pd.notna(record.get("longitude")) else None,
                "latitude": float(record["latitude"]) if pd.notna(record.get("latitude")) else None,
                "observed_year": int(record["sample_year"]),
                "category": "Pharmaceutical sampling context",
                "subcategory": "USGS tributary sampling site",
                "layer_group": "emerging",
                "evidence_type": "direct_measurement",
                "confidence_level": "high",
                "geographic_level": "site",
                "summary": summary,
                "notes": (
                    "These are research sample sites from a Great Lakes tributary campaign. "
                    "They indicate observed pharmaceutical and wastewater-indicator detections at sampled locations, not a complete national map."
                ),
                "tags": sorted({"downstream", "drinking-water", "great-lakes", "research-context"}),
                "source_ids": ["usgs-pharma"],
                "source_name": "USGS Great Lakes tributary pharmaceutical and wastewater-indicator sampling",
                "source_url": USGS_GREAT_LAKES_RELEASE_URL,
                "source_updated_at": updated_at,
                "ingestion_version": "usgs_pharma_v1",
                "metadata": {
                    "signalFamilies": ["wastewater", "pharmaceuticals"],
                    "chemicalMarkers": ["pharmaceuticals", "wastewater-indicators"],
                    "chemicalHighlights": featured_compounds,
                    "siteId": record.get("siteid"),
                    "fieldCode": record.get("fieldnm"),
                    "river": record.get("river"),
                    "locationLabel": record.get("location_label"),
                    "classesPresent": classes_present,
                    "featuredCompounds": featured_compounds,
                    "officialSignals": ["USGS surface-water sampling site"],
                    "emergingConcerns": [
                        "Pharmaceutical residues and wastewater-indicator compounds were detected at this tributary site.",
                    ],
                    "wildlifeSentinelContext": [
                        "Aquatic ecosystem stress should be evaluated with dedicated ecological monitoring, not inferred from chemistry alone.",
                    ],
                    "reproductiveHealthContext": [
                        "These are environmental chemistry detections, not reproductive-health measurements.",
                    ],
                    "legalHistoricalContext": [
                        "Research detections may highlight watersheds worth deeper regulatory and public-interest scrutiny.",
                    ],
                    "uncertaintyNote": (
                        "This layer represents a limited Great Lakes tributary sampling campaign. It should be read as site-specific research evidence, "
                        "not broad U.S. pharmaceutical monitoring coverage."
                    ),
                    "sourceStats": [
                        {"label": "Pharma detects", "value": str(int(record["pharmaceutical_count"]))},
                        {"label": "Wastewater indicators", "value": str(int(record["wastewater_indicator_count"]))},
                    ],
                },
            }
        )

    return rows


def main() -> None:
    args = parse_args()

    raw_sites = raw_path("usgs-pharma", "great_lakes_site_info.csv")
    raw_data = raw_path("usgs-pharma", "great_lakes_water_sediment_data.csv")
    raw_dict = raw_path("usgs-pharma", "great_lakes_data_dictionary.csv")

    download_file(USGS_GREAT_LAKES_SITES_URL, raw_sites, force=args.force_download)
    download_file(USGS_GREAT_LAKES_DATA_URL, raw_data, force=args.force_download)
    download_file(USGS_GREAT_LAKES_DICT_URL, raw_dict, force=args.force_download)

    site_info = normalize_columns(read_csv_with_fallback(raw_sites))
    sample_data = normalize_columns(read_csv_with_fallback(raw_data))
    data_dictionary = normalize_columns(read_csv_with_fallback(raw_dict))

    summary_frame = build_summary_frame(site_info, sample_data, data_dictionary)
    if args.limit:
        summary_frame = summary_frame.head(args.limit).copy()

    cleaned_base = cleaned_path("usgs-pharma", "great_lakes_pharma_sampling_sites")
    parquet_path, csv_path = write_dataframe(summary_frame, cleaned_base)

    load_rows = build_load_rows(summary_frame)
    validate_load_rows(load_rows, "wastewater_sites", job_name="USGS pharma research rows")
    transform_base = transform_path("usgs-pharma", "great_lakes_pharma_load_rows")
    write_dataframe(pd.DataFrame(load_rows), transform_base)

    loaded_records = load_wastewater_sites(load_rows) if args.load else 0

    write_loader_manifest(
        "usgs_great_lakes_pharma",
        {
            "source": "usgs-pharma",
            "release_url": USGS_GREAT_LAKES_RELEASE_URL,
            "raw_site_file": str(raw_sites),
            "raw_data_file": str(raw_data),
            "raw_dictionary_file": str(raw_dict),
            "cleaned_parquet": str(parquet_path),
            "cleaned_csv": str(csv_path),
            "records": len(load_rows),
            "loaded_to_database": bool(args.load),
            "loaded_records": loaded_records,
            "chem_classes": sorted(TARGET_CHEM_CLASSES),
        },
    )

    print(f"Normalized USGS pharmaceutical context: {parquet_path}")
    print(f"Sampling-site rows: {len(load_rows)}")


if __name__ == "__main__":
    main()
