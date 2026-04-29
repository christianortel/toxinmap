from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Callable

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
ETL_ROOT = ROOT / "scripts" / "etl"

if str(ETL_ROOT) not in sys.path:
    sys.path.insert(0, str(ETL_ROOT))

from ingest_tri import build_industrial_site_rows, build_release_rows  # type: ignore  # noqa: E402
from loaders.postgres import (  # type: ignore  # noqa: E402
    load_health_concern_context,
    load_industrial_sites,
    load_pfas_sites,
    load_wastewater_sites,
    replace_hazardous_sites,
    replace_power_plants,
    replace_toxic_release_records,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Load repo-local ETL transformed artifacts into PostgreSQL/PostGIS."
    )
    parser.add_argument("--tri-year", type=int, default=2024)
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--skip-industrial", action="store_true")
    parser.add_argument("--skip-pfas", action="store_true")
    parser.add_argument("--skip-wastewater", action="store_true")
    parser.add_argument("--skip-health-context", action="store_true")
    parser.add_argument("--skip-power", action="store_true")
    parser.add_argument("--skip-hazardous", action="store_true")
    return parser.parse_args()


def transformed_path(*parts: str) -> Path:
    return ETL_ROOT / "transforms" / Path(*parts)


def cleaned_path(*parts: str) -> Path:
    return ETL_ROOT / "cleaned" / Path(*parts)


def read_rows(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f"Missing transformed artifact: {path}")

    if path.suffix.lower() == ".parquet":
        frame = pd.read_parquet(path)
    else:
        frame = pd.read_csv(path, low_memory=False)

    frame = frame.where(pd.notna(frame), None)
    return frame.to_dict("records")


def parse_listish(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if hasattr(value, "tolist") and not isinstance(value, (str, bytes, bytearray)):
        converted = value.tolist()
        if isinstance(converted, list):
            return [str(item).strip() for item in converted if str(item).strip()]
    text = str(value).strip()
    if not text:
        return []
    if text.startswith("[") and text.endswith("]"):
        try:
            parsed = json.loads(text.replace("'", '"'))
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except Exception:
            pass
    return [item.strip().strip("'").strip('"') for item in text.strip("[]").split(",") if item.strip()]


def normalize_registry_slug(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.startswith("frs-"):
        suffix = text[4:]
        if suffix.endswith(".0"):
            suffix = suffix[:-2]
        return f"frs-{suffix}"
    if text.endswith(".0"):
        return text[:-2]
    return text


def parse_metadata(value: object) -> dict:
    if isinstance(value, dict):
        return value
    return {}


def merge_unique_strings(*collections: object) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for collection in collections:
        for item in parse_listish(collection):
            normalized = item.strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                merged.append(normalized)
    return merged


def metadata_list(metadata: dict, key: str) -> list[str]:
    return parse_listish(metadata.get(key))


def metadata_stats(metadata: dict) -> list[dict]:
    raw_stats = metadata.get("sourceStats")
    if isinstance(raw_stats, list):
        return [stat for stat in raw_stats if isinstance(stat, dict)]
    if hasattr(raw_stats, "tolist") and not isinstance(raw_stats, (str, bytes, bytearray)):
        converted = raw_stats.tolist()
        if isinstance(converted, list):
            return [stat for stat in converted if isinstance(stat, dict)]
    return []


def normalize_row(row: dict) -> dict:
    normalized = row.copy()
    normalized["slug"] = normalize_registry_slug(row.get("slug"))
    normalized["metadata"] = parse_metadata(row.get("metadata"))
    normalized["source_ids"] = parse_listish(row.get("source_ids"))
    normalized["tags"] = parse_listish(row.get("tags"))
    return normalized


def build_echo_context_map(rows: list[dict]) -> dict[str, dict]:
    context_map: dict[str, dict] = {}
    for raw_row in rows:
        row = normalize_row(raw_row)
        slug = row.get("slug")
        if not slug:
            continue
        metadata = row["metadata"]
        stats = metadata_stats(metadata)
        case_count = None
        for stat in stats:
            if str(stat.get("label", "")).strip() == "Federal cases":
                try:
                    case_count = int(str(stat.get("value", "0")).strip())
                except ValueError:
                    case_count = None
                break
        context_map[slug] = {
            "source_ids": row["source_ids"],
            "official_signals": metadata_list(metadata, "officialSignals"),
            "emerging_concerns": metadata_list(metadata, "emergingConcerns"),
            "legal_historical_context": metadata_list(metadata, "legalHistoricalContext"),
            "case_count": case_count,
        }
    return context_map


def build_tri_context_map(rows: list[dict]) -> dict[str, dict]:
    context_map: dict[str, dict] = {}
    for raw_row in rows:
        row = normalize_row(raw_row)
        slug = row.get("slug")
        if not slug:
            continue
        metadata = row["metadata"]
        context_map[slug] = {
            "source_ids": row["source_ids"],
            "official_signals": metadata_list(metadata, "officialSignals"),
            "chemical_highlights": metadata_list(metadata, "chemicalHighlights"),
            "chemical_markers": metadata_list(metadata, "chemicalMarkers"),
            "signal_families": metadata_list(metadata, "signalFamilies"),
            "source_stats": metadata_stats(metadata),
        }
    return context_map


strict_power_generation_naics = {"221112", "221117"}
conditional_power_generation_naics = {"221118", "221119"}
cleanup_program_tokens = ("CERCL", "CORRACTS", "SEMS", "UST")
power_generation_name_tokens = (
    "GENERATING STATION",
    "POWER PLANT",
    "ENERGY FACILITY",
    "ENERGY CENTER",
    "PEAKING PLANT",
    "COGENERATION",
    "COMBUSTION TURBINE",
    "GENERATION",
)
hazard_name_tokens = (
    "LANDFILL",
    "SUPERFUND",
    "DISPOSAL",
    "HAZARDOUS",
    "REMEDIATION",
    "RECOVERY",
    "BROWNSFIELD",
    "DUMP",
    "SALVAGE",
    "INCINERAT",
    "WASTE ",
    "WASTE OIL",
    "SCRAP",
)


def matches_power_generation_name(name: str) -> bool:
    upper_name = name.upper()
    return any(token in upper_name for token in power_generation_name_tokens)


def matches_cleanup_program(program: str) -> bool:
    upper_program = program.upper()
    return any(token in upper_program for token in cleanup_program_tokens)


def matches_hazard_name(name: str) -> bool:
    upper_name = name.upper()
    if "WASTEWATER" in upper_name:
        upper_name = upper_name.replace("WASTEWATER", "")
    return any(token in upper_name for token in hazard_name_tokens)


def power_generation_class_label(naics_code: str) -> str:
    if naics_code == "221112":
        return "Fossil-fuel electric generation"
    if naics_code == "221117":
        return "Biomass electric generation"
    if naics_code == "221118":
        return "Other electric generation"
    if naics_code == "221119":
        return "Other generation context"
    return "Generation facility"


def is_power_plant_row(row: dict) -> bool:
    latitude = row.get("latitude")
    longitude = row.get("longitude")
    if latitude is None or longitude is None:
        return False
    naics_code = str(row.get("naics_code") or "").strip()
    facility_name = str(row.get("facility_name") or "").strip()
    return naics_code in strict_power_generation_naics or (
        naics_code in conditional_power_generation_naics and matches_power_generation_name(facility_name)
    )


def is_hazardous_site_row(row: dict) -> bool:
    latitude = row.get("latitude")
    longitude = row.get("longitude")
    if latitude is None or longitude is None:
        return False
    metadata = row["metadata"]
    programs = metadata_list(metadata, "programAcronyms")
    programs_joined = " ".join(programs).upper()
    facility_name = str(row.get("facility_name") or "").strip()
    naics_code = str(row.get("naics_code") or "").strip()
    tri_ids = metadata_list(metadata, "triIds")
    tri_linked = len(tri_ids) > 0
    return (
        any(matches_cleanup_program(program) for program in programs)
        or (
            (naics_code.startswith("5621") or naics_code.startswith("5622") or naics_code.startswith("5629"))
            and matches_hazard_name(facility_name)
        )
        or (
            matches_hazard_name(facility_name)
            and any(token in programs_joined for token in ("RCRAINFO", "TSCA", "ICIS", "AIR", "NPDES", "SEMS"))
        )
        or (
            tri_linked
            and any(token in programs_joined for token in ("RCRAINFO", "TSCA", "SEMS"))
            and any(token in facility_name.upper() for token in ("CHEM", "LANDFILL", "WASTE", "DISPOSAL", "RECOVERY", "METAL", "PETRO", "PLANT"))
        )
    )


def build_power_plant_rows(frs_rows: list[dict], tri_rows: list[dict], echo_rows: list[dict]) -> list[dict]:
    tri_context = build_tri_context_map(tri_rows)
    echo_context = build_echo_context_map(echo_rows)
    current_year = pd.Timestamp.utcnow().year
    output: list[dict] = []

    for raw_row in frs_rows:
        row = normalize_row(raw_row)
        if not is_power_plant_row(row):
            continue
        slug = row["slug"]
        metadata = row["metadata"]
        tri_match = tri_context.get(slug)
        echo_match = echo_context.get(slug)
        program_acronyms = metadata_list(metadata, "programAcronyms")
        tri_ids = metadata_list(metadata, "triIds")
        related_case_studies = metadata_list(metadata, "relatedCaseStudyIds")
        generation_class = power_generation_class_label(str(row.get("naics_code") or "").strip())
        tags = merge_unique_strings(
            row["tags"],
            ["community-pressure"],
            ["downstream"] if any("NPDES" in program.upper() for program in program_acronyms) else [],
        )
        source_ids = merge_unique_strings(
            row["source_ids"],
            tri_match["source_ids"] if tri_match else [],
            echo_match["source_ids"] if echo_match else [],
        )
        official_signals = merge_unique_strings(
            metadata_list(metadata, "officialSignals"),
            [f"Generation class: {generation_class}", f"Programs linked: {len(program_acronyms)}"],
            [f"TRI-linked ids: {len(tri_ids)}"] if tri_ids else [],
            tri_match["official_signals"] if tri_match else [],
            echo_match["official_signals"] if echo_match else [],
        )
        emerging_concerns = merge_unique_strings(
            metadata_list(metadata, "emergingConcerns"),
            ["Generation-facility infrastructure should be read as source context, not a direct local exposure measurement."],
            ["Water-linked permits can matter downstream around cooling-water and discharge pathways."]
            if any("NPDES" in program.upper() for program in program_acronyms)
            else [],
            echo_match["emerging_concerns"] if echo_match else [],
        )
        legal_historical_context = merge_unique_strings(
            metadata_list(metadata, "legalHistoricalContext"),
            ["Regulatory context is available through the FRS / ECHO generation-facility join."] if echo_match else [],
            echo_match["legal_historical_context"] if echo_match else [],
        )
        signal_families = merge_unique_strings(
            ["power-combustion", "air-toxics"],
            ["wastewater"] if any("NPDES" in program.upper() for program in program_acronyms) else [],
            metadata_list(metadata, "signalFamilies"),
            tri_match["signal_families"] if tri_match else [],
        )
        chemical_markers = merge_unique_strings(
            ["combustion-pollutants"],
            ["wastewater-indicators"] if any("NPDES" in program.upper() for program in program_acronyms) else [],
            metadata_list(metadata, "chemicalMarkers"),
            tri_match["chemical_markers"] if tri_match else [],
        )
        source_stats = [
            {"label": "Generation class", "value": generation_class},
            {"label": "Programs", "value": str(len(program_acronyms))},
            {"label": "TRI ids", "value": str(len(tri_ids))},
        ]
        if tri_match:
            source_stats.extend(
                stat
                for stat in tri_match["source_stats"]
                if str(stat.get("label", "")).strip() in {"TRI year", "Total releases"}
            )
        if echo_match and echo_match.get("case_count") is not None:
            source_stats.append({"label": "Federal cases", "value": str(echo_match["case_count"])})

        merged_metadata = {
            **metadata,
            "locationLabel": metadata.get("locationLabel"),
            "officialSignals": official_signals,
            "emergingConcerns": emerging_concerns,
            "legalHistoricalContext": legal_historical_context,
            "signalFamilies": signal_families,
            "chemicalMarkers": chemical_markers,
            "chemicalHighlights": ["Combustion pollutants"],
            "relatedCaseStudyIds": related_case_studies,
            "sourceStats": source_stats,
            "uncertaintyNote": "This DB-backed power-facility point is a generation and permitting context marker, not a complete emission or exposure history.",
        }

        output.append(
            {
                "slug": f"power-{slug}",
                "plant_name": row.get("facility_name") or slug,
                "fuel_type": generation_class,
                "capacity_mw": None,
                "permit_status": row.get("status"),
                "longitude": row.get("longitude"),
                "latitude": row.get("latitude"),
                "active_year": row.get("active_year") or current_year,
                "category": "Energy infrastructure",
                "subcategory": generation_class,
                "layer_group": "official",
                "evidence_type": "proxy",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": (
                    "Generation facility footprint with TRI-linked release context and cross-program regulatory linkage from transformed federal records."
                    if tri_match
                    else "Generation facility footprint with FRS-linked power infrastructure context from transformed federal records."
                ),
                "notes": "This appears because the FRS crosswalk exposes mappable generation facilities that widen the toxin map beyond industrial plants without pretending they are all direct release records.",
                "tags": tags,
                "source_ids": source_ids,
                "source_name": row.get("source_name"),
                "source_url": row.get("source_url"),
                "source_updated_at": row.get("source_updated_at"),
                "ingestion_version": "db_power_v1",
                "metadata": merged_metadata,
            }
        )

    return output


def build_hazardous_site_rows(frs_rows: list[dict], tri_rows: list[dict], echo_rows: list[dict]) -> list[dict]:
    tri_context = build_tri_context_map(tri_rows)
    echo_context = build_echo_context_map(echo_rows)
    current_year = pd.Timestamp.utcnow().year
    default_persistent_year = current_year - 1
    output: list[dict] = []

    for raw_row in frs_rows:
        row = normalize_row(raw_row)
        if not is_hazardous_site_row(row):
            continue
        slug = row["slug"]
        metadata = row["metadata"]
        tri_match = tri_context.get(slug)
        echo_match = echo_context.get(slug)
        program_acronyms = metadata_list(metadata, "programAcronyms")
        tri_ids = metadata_list(metadata, "triIds")
        related_case_studies = metadata_list(metadata, "relatedCaseStudyIds")
        has_cleanup_program = any(matches_cleanup_program(program) for program in program_acronyms)
        if has_cleanup_program:
            hazard_class = "Cleanup / legacy hazard site"
        elif str(row.get("naics_code") or "").strip().startswith("562"):
            hazard_class = "Waste and disposal facility"
        else:
            hazard_class = "Hazard-linked industrial site"
        tags = merge_unique_strings(
            row["tags"],
            ["community-pressure"],
            ["downstream"] if any("NPDES" in program.upper() for program in program_acronyms) else [],
            ["litigation"] if echo_match else [],
        )
        source_ids = merge_unique_strings(
            row["source_ids"],
            ["epa-sems"] if has_cleanup_program else [],
            tri_match["source_ids"] if tri_match else [],
            echo_match["source_ids"] if echo_match else [],
        )
        official_signals = merge_unique_strings(
            metadata_list(metadata, "officialSignals"),
            [f"Hazard class: {hazard_class}", f"Programs linked: {len(program_acronyms)}"],
            [f"Cleanup programs: {', '.join(program_acronyms[:4])}"] if program_acronyms else [],
            [f"TRI-linked ids: {len(tri_ids)}"] if tri_ids else [],
            tri_match["official_signals"] if tri_match else [],
            echo_match["official_signals"] if echo_match else [],
        )
        emerging_concerns = merge_unique_strings(
            metadata_list(metadata, "emergingConcerns"),
            ["Hazard and cleanup-linked sites can remain locally important long after a single emission snapshot stops making the risk legible."],
            ["Cleanup-program visibility is strong for legacy contamination geography, but present-day surrounding exposure still requires care."] if has_cleanup_program else [],
            echo_match["emerging_concerns"] if echo_match else [],
        )
        legal_historical_context = merge_unique_strings(
            metadata_list(metadata, "legalHistoricalContext"),
            ["Cleanup-program linkage indicates a legacy hazard or remediation footprint."] if has_cleanup_program else [],
            echo_match["legal_historical_context"] if echo_match else [],
        )
        signal_families = merge_unique_strings(
            ["legacy-hazard"],
            ["air-toxics"] if tri_match and "air-toxics" in tri_match["signal_families"] else [],
            ["wastewater"] if tri_match and "wastewater" in tri_match["signal_families"] else [],
            ["legal-pressure"] if echo_match else [],
            metadata_list(metadata, "signalFamilies"),
        )
        chemical_markers = merge_unique_strings(
            ["legacy-industrial-mixtures"],
            tri_match["chemical_markers"] if tri_match else [],
            metadata_list(metadata, "chemicalMarkers"),
        )
        chemical_highlights = merge_unique_strings(
            tri_match["chemical_highlights"] if tri_match else [],
            ["Legacy hazard context"] if (not tri_match and has_cleanup_program) else [],
        )
        source_stats = [
            {"label": "Hazard class", "value": hazard_class},
            {"label": "Programs", "value": str(len(program_acronyms))},
            {"label": "TRI ids", "value": str(len(tri_ids))},
        ]
        if tri_match:
            source_stats.extend(
                stat
                for stat in tri_match["source_stats"]
                if str(stat.get("label", "")).strip() in {"TRI year", "Total releases"}
            )
        if echo_match and echo_match.get("case_count") is not None:
            source_stats.append({"label": "Federal cases", "value": str(echo_match["case_count"])})

        merged_metadata = {
            **metadata,
            "locationLabel": metadata.get("locationLabel"),
            "officialSignals": official_signals,
            "emergingConcerns": emerging_concerns,
            "legalHistoricalContext": legal_historical_context,
            "signalFamilies": signal_families,
            "chemicalMarkers": chemical_markers,
            "chemicalHighlights": chemical_highlights,
            "relatedCaseStudyIds": related_case_studies,
            "sourceStats": source_stats,
            "uncertaintyNote": "This DB-backed hazard point is a cleanup, disposal, or legacy-hazard footprint marker, not a complete current exposure measurement.",
        }

        output.append(
            {
                "slug": f"hazard-{slug}",
                "site_name": row.get("facility_name") or slug,
                "site_class": hazard_class,
                "status": row.get("status"),
                "longitude": row.get("longitude"),
                "latitude": row.get("latitude"),
                "remediation_year": row.get("active_year") or default_persistent_year,
                "category": "Hazard registry",
                "subcategory": hazard_class,
                "layer_group": "official",
                "evidence_type": "proxy",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": (
                    "Hazard-linked site with cleanup / disposal context and TRI-linked industrial signals from transformed federal records."
                    if tri_match
                    else "Hazard-linked site with cleanup or disposal context from transformed federal records."
                ),
                "notes": "This appears because the federal crosswalk already exposes legacy-hazard, disposal, and cleanup-program footprints that should remain visible in the toxin map.",
                "tags": tags,
                "source_ids": source_ids,
                "source_name": row.get("source_name"),
                "source_url": row.get("source_url"),
                "source_updated_at": row.get("source_updated_at"),
                "ingestion_version": "db_hazard_v1",
                "metadata": merged_metadata,
            }
        )

    return output


def load_in_batches(
    label: str,
    rows: list[dict],
    loader: Callable[[list[dict]], int],
    batch_size: int,
) -> int:
    if not rows:
        print(f"{label}: no rows to load")
        return 0

    loaded = 0
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        loaded += loader(batch)
        print(f"{label}: loaded {loaded}/{len(rows)}")

    return loaded


def load_tri_release_rows(tri_year: int, batch_size: int) -> tuple[int, int]:
    normalized_path = cleaned_path("epa-tri", f"tri_basic_{tri_year}_US_normalized.parquet")
    if not normalized_path.exists():
        raise FileNotFoundError(
            f"Missing cleaned TRI artifact required for release rows: {normalized_path}"
        )

    frame = pd.read_parquet(normalized_path)
    industrial_rows = build_industrial_site_rows(frame, tri_year)
    release_rows = build_release_rows(frame, tri_year)

    loaded_sites = load_in_batches(
        label=f"TRI industrial summaries {tri_year}",
        rows=industrial_rows,
        loader=load_industrial_sites,
        batch_size=batch_size,
    )

    loaded_releases = 0
    for start in range(0, len(release_rows), batch_size):
        batch = release_rows[start : start + batch_size]
        reporting_year = tri_year if start == 0 else None
        loaded_releases += replace_toxic_release_records(batch, reporting_year=reporting_year)
        print(f"TRI release rows {tri_year}: loaded {loaded_releases}/{len(release_rows)}")

    return loaded_sites, loaded_releases


def main() -> None:
    args = parse_args()
    summary: dict[str, int] = {}

    if not args.skip_industrial:
        frs_rows = [
            row
            for row in read_rows(transformed_path("epa-frs", "frs_industrial_sites.parquet"))
            if parse_listish(row.get("tri_ids"))
        ]
        industrial_slugs = {str(row.get("slug") or "").strip() for row in frs_rows if row.get("slug")}
        summary["frsIndustrialSites"] = load_in_batches(
            label="FRS industrial sites",
            rows=frs_rows,
            loader=load_industrial_sites,
            batch_size=args.batch_size,
        )

        echo_facility_rows = [
            row
            for row in read_rows(transformed_path("epa-echo", "icis_fec_facility_updates.parquet"))
            if str(row.get("slug") or "").strip() in industrial_slugs
        ]
        summary["echoFacilityUpdates"] = load_in_batches(
            label="ECHO facility updates",
            rows=echo_facility_rows,
            loader=load_industrial_sites,
            batch_size=args.batch_size,
        )

        tri_sites, tri_releases = load_tri_release_rows(args.tri_year, args.batch_size)
        summary["triIndustrialSites"] = tri_sites
        summary["triReleaseRecords"] = tri_releases

    frs_transformed_rows: list[dict] | None = None
    tri_transformed_rows: list[dict] | None = None
    echo_transformed_rows: list[dict] | None = None

    def get_frs_transformed_rows() -> list[dict]:
        nonlocal frs_transformed_rows
        if frs_transformed_rows is None:
            frs_transformed_rows = read_rows(
                transformed_path("epa-frs", "frs_industrial_sites.parquet")
            )
        return frs_transformed_rows

    def get_tri_transformed_rows() -> list[dict]:
        nonlocal tri_transformed_rows
        if tri_transformed_rows is None:
            tri_transformed_rows = read_rows(
                transformed_path("epa-tri", f"tri_facility_summary_{args.tri_year}_US.parquet")
            )
        return tri_transformed_rows

    def get_echo_transformed_rows() -> list[dict]:
        nonlocal echo_transformed_rows
        if echo_transformed_rows is None:
            echo_transformed_rows = read_rows(
                transformed_path("epa-echo", "icis_fec_facility_updates.parquet")
            )
        return echo_transformed_rows

    if not args.skip_power:
        power_rows = build_power_plant_rows(
            get_frs_transformed_rows(),
            get_tri_transformed_rows(),
            get_echo_transformed_rows(),
        )
        summary["powerPlants"] = replace_power_plants(power_rows)

    if not args.skip_hazardous:
        hazardous_rows = build_hazardous_site_rows(
            get_frs_transformed_rows(),
            get_tri_transformed_rows(),
            get_echo_transformed_rows(),
        )
        summary["hazardousSites"] = replace_hazardous_sites(hazardous_rows)

    if not args.skip_health_context:
        echo_case_rows = read_rows(transformed_path("epa-echo", "icis_fec_case_context.parquet"))
        summary["echoHealthContext"] = load_in_batches(
            label="ECHO case context",
            rows=echo_case_rows,
            loader=load_health_concern_context,
            batch_size=args.batch_size,
        )

    if not args.skip_pfas:
        atsdr_rows = read_rows(transformed_path("atsdr-pfas", "atsdr_pfas_sites_load_rows.parquet"))
        summary["atsdrPfasSites"] = load_in_batches(
            label="ATSDR PFAS sites",
            rows=atsdr_rows,
            loader=load_pfas_sites,
            batch_size=args.batch_size,
        )

        usgs_pfas_rows = read_rows(
            transformed_path("usgs-pfas", "usgs_pfas_tapwater_load_rows.parquet")
        )
        summary["usgsPfasSites"] = load_in_batches(
            label="USGS PFAS sites",
            rows=usgs_pfas_rows,
            loader=load_pfas_sites,
            batch_size=args.batch_size,
        )

    if not args.skip_wastewater:
        npdes_rows = read_rows(
            transformed_path("epa-npdes", "npdes_wastewater_load_rows.parquet")
        )
        summary["npdesWastewaterSites"] = load_in_batches(
            label="NPDES wastewater sites",
            rows=npdes_rows,
            loader=load_wastewater_sites,
            batch_size=args.batch_size,
        )

        usgs_pharma_rows = read_rows(
            transformed_path("usgs-pharma", "great_lakes_pharma_load_rows.parquet")
        )
        summary["usgsPharmaSites"] = load_in_batches(
            label="USGS pharma wastewater sites",
            rows=usgs_pharma_rows,
            loader=load_wastewater_sites,
            batch_size=args.batch_size,
        )

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
