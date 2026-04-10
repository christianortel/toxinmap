from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from typing import Any


ALLOWED_LAYER_GROUPS = {"official", "emerging", "wildlife", "reproductive", "legal"}
ALLOWED_EVIDENCE_TYPES = {
    "direct_measurement",
    "proxy",
    "screening_signal",
    "literature_evidence",
    "editorial_case_study",
}
ALLOWED_CONFIDENCE_LEVELS = {"low", "moderate", "high"}
ALLOWED_GEOGRAPHIC_LEVELS = {
    "facility",
    "site",
    "watershed",
    "county",
    "state",
    "regional",
    "national",
    "global",
    "literature-cluster",
}
ALLOWED_SIGNAL_FAMILIES = {
    "pfas",
    "wastewater",
    "air-toxics",
    "petrochemical",
    "legacy-hazard",
    "pharmaceuticals",
    "plastics",
    "power-combustion",
    "wildlife-sentinel",
    "reproductive-context",
    "legal-pressure",
}
ALLOWED_CHEMICAL_MARKERS = {
    "pfas",
    "petrochemical-volatiles",
    "chlorinated-solvents",
    "pharmaceuticals",
    "plasticizers",
    "combustion-pollutants",
    "wastewater-indicators",
    "metals",
    "legacy-industrial-mixtures",
}
COMMON_METADATA_LIST_FIELDS = {
    "officialSignals",
    "emergingConcerns",
    "wildlifeSentinelContext",
    "reproductiveHealthContext",
    "legalHistoricalContext",
    "relatedCaseStudyIds",
}
COMMON_METADATA_STRING_LIST_FIELDS = {
    "chemicalHighlights",
}


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _is_string_list(value: Any, *, allow_empty: bool = False) -> bool:
    return (
        isinstance(value, list)
        and (allow_empty or len(value) > 0)
        and all(isinstance(item, str) and item.strip() for item in value)
    )


def _validate_coordinates(row: dict[str, Any], errors: list[str]) -> None:
    latitude = row.get("latitude")
    longitude = row.get("longitude")

    if latitude is None and longitude is None:
        return

    if latitude is None or longitude is None:
        errors.append("latitude and longitude must either both be present or both be omitted")
        return

    if not _is_number(latitude) or not -90 <= float(latitude) <= 90:
        errors.append(f"invalid latitude: {latitude!r}")
    if not _is_number(longitude) or not -180 <= float(longitude) <= 180:
        errors.append(f"invalid longitude: {longitude!r}")


def _validate_common_row(row: dict[str, Any], errors: list[str]) -> None:
    if not isinstance(row.get("category"), str) or not row["category"].strip():
        errors.append("missing category")
    if not isinstance(row.get("subcategory"), str) or not row["subcategory"].strip():
        errors.append("missing subcategory")
    if row.get("layer_group") not in ALLOWED_LAYER_GROUPS:
        errors.append(f"invalid layer_group: {row.get('layer_group')!r}")
    if row.get("evidence_type") not in ALLOWED_EVIDENCE_TYPES:
        errors.append(f"invalid evidence_type: {row.get('evidence_type')!r}")
    if row.get("confidence_level") not in ALLOWED_CONFIDENCE_LEVELS:
        errors.append(f"invalid confidence_level: {row.get('confidence_level')!r}")
    if row.get("geographic_level") not in ALLOWED_GEOGRAPHIC_LEVELS:
        errors.append(f"invalid geographic_level: {row.get('geographic_level')!r}")
    if not isinstance(row.get("summary"), str) or not row["summary"].strip():
        errors.append("missing summary")
    if not isinstance(row.get("notes"), str) or not row["notes"].strip():
        errors.append("missing notes")
    if not _is_string_list(row.get("source_ids")):
        errors.append("source_ids must be a non-empty list of strings")
    if not isinstance(row.get("source_name"), str) or not row["source_name"].strip():
        errors.append("missing source_name")
    if not isinstance(row.get("source_url"), str) or not row["source_url"].strip():
        errors.append("missing source_url")
    if not isinstance(row.get("ingestion_version"), str) or not row["ingestion_version"].strip():
        errors.append("missing ingestion_version")
    if row.get("tags") is not None and not _is_string_list(row.get("tags", []), allow_empty=True):
        errors.append("tags must be a list of strings")
    if not isinstance(row.get("metadata"), dict):
        errors.append("metadata must be a dictionary")
    _validate_coordinates(row, errors)


def _validate_metadata(row: dict[str, Any], errors: list[str], *, require_signal_families: bool) -> None:
    metadata = row.get("metadata")
    if not isinstance(metadata, dict):
        return

    signal_families = metadata.get("signalFamilies")
    chemical_markers = metadata.get("chemicalMarkers")
    chemical_highlights = metadata.get("chemicalHighlights")
    if require_signal_families:
        if not _is_string_list(signal_families):
            errors.append("metadata.signalFamilies must be a non-empty list of strings")
        else:
            invalid = sorted(set(signal_families) - ALLOWED_SIGNAL_FAMILIES)
            if invalid:
                errors.append(f"metadata.signalFamilies contains invalid values: {', '.join(invalid)}")
        if not _is_string_list(chemical_markers):
            errors.append("metadata.chemicalMarkers must be a non-empty list of strings")
        else:
            invalid = sorted(set(chemical_markers) - ALLOWED_CHEMICAL_MARKERS)
            if invalid:
                errors.append(f"metadata.chemicalMarkers contains invalid values: {', '.join(invalid)}")
        if chemical_highlights is not None and not _is_string_list(chemical_highlights, allow_empty=True):
            errors.append("metadata.chemicalHighlights must be a list of strings")
    elif signal_families is not None:
        if not _is_string_list(signal_families, allow_empty=True):
            errors.append("metadata.signalFamilies must be a list of strings")
        else:
            invalid = sorted(set(signal_families) - ALLOWED_SIGNAL_FAMILIES)
            if invalid:
                errors.append(f"metadata.signalFamilies contains invalid values: {', '.join(invalid)}")
        if chemical_markers is not None:
            if not _is_string_list(chemical_markers, allow_empty=True):
                errors.append("metadata.chemicalMarkers must be a list of strings")
            else:
                invalid = sorted(set(chemical_markers) - ALLOWED_CHEMICAL_MARKERS)
                if invalid:
                    errors.append(f"metadata.chemicalMarkers contains invalid values: {', '.join(invalid)}")
        if chemical_highlights is not None and not _is_string_list(chemical_highlights, allow_empty=True):
            errors.append("metadata.chemicalHighlights must be a list of strings")

    for field in COMMON_METADATA_LIST_FIELDS:
        if field in metadata and not (
            isinstance(metadata[field], list)
            and all(isinstance(item, str) and item.strip() for item in metadata[field])
        ):
            errors.append(f"metadata.{field} must be a list of strings when present")

    for field in COMMON_METADATA_STRING_LIST_FIELDS:
        if field in metadata and not _is_string_list(metadata[field], allow_empty=True):
            errors.append(f"metadata.{field} must be a list of strings when present")

    if "sourceStats" in metadata:
        source_stats = metadata["sourceStats"]
        if not isinstance(source_stats, list) or any(
            not isinstance(item, dict)
            or not isinstance(item.get("label"), str)
            or not item["label"].strip()
            or not isinstance(item.get("value"), str)
            or not item["value"].strip()
            for item in source_stats
        ):
            errors.append("metadata.sourceStats must be a list of {label, value} objects")

    if "uncertaintyNote" in metadata and (
        not isinstance(metadata["uncertaintyNote"], str) or not metadata["uncertaintyNote"].strip()
    ):
        errors.append("metadata.uncertaintyNote must be a non-empty string when present")


def _validate_industrial_site_row(row: dict[str, Any], errors: list[str]) -> None:
    if not isinstance(row.get("slug"), str) or not row["slug"].strip():
        errors.append("missing slug")
    if not isinstance(row.get("facility_name"), str) or not row["facility_name"].strip():
        errors.append("missing facility_name")


def _validate_release_row(row: dict[str, Any], errors: list[str]) -> None:
    if not isinstance(row.get("site_slug"), str) or not row["site_slug"].strip():
        errors.append("missing site_slug")
    if not isinstance(row.get("record_title"), str) or not row["record_title"].strip():
        errors.append("missing record_title")
    if not isinstance(row.get("chemical_name"), str) or not row["chemical_name"].strip():
        errors.append("missing chemical_name")
    if row.get("reporting_year") is None or not _is_number(row["reporting_year"]):
        errors.append("missing reporting_year")


def _validate_health_context_row(row: dict[str, Any], errors: list[str]) -> None:
    if not isinstance(row.get("slug"), str) or not row["slug"].strip():
        errors.append("missing slug")
    if not isinstance(row.get("title"), str) or not row["title"].strip():
        errors.append("missing title")
    if not isinstance(row.get("concern_type"), str) or not row["concern_type"].strip():
        errors.append("missing concern_type")
    if not isinstance(row.get("narrative"), str) or not row["narrative"].strip():
        errors.append("missing narrative")
    if not isinstance(row.get("is_verified"), bool):
        errors.append("is_verified must be a boolean")


def _validate_pfas_row(row: dict[str, Any], errors: list[str]) -> None:
    if not isinstance(row.get("slug"), str) or not row["slug"].strip():
        errors.append("missing slug")
    if not isinstance(row.get("site_name"), str) or not row["site_name"].strip():
        errors.append("missing site_name")


def _validate_wastewater_row(row: dict[str, Any], errors: list[str]) -> None:
    if not isinstance(row.get("slug"), str) or not row["slug"].strip():
        errors.append("missing slug")
    if not isinstance(row.get("facility_name"), str) or not row["facility_name"].strip():
        errors.append("missing facility_name")
    if not isinstance(row.get("discharge_type"), str) or not row["discharge_type"].strip():
        errors.append("missing discharge_type")


def validate_load_rows(rows: Iterable[dict[str, Any]], schema_name: str, *, job_name: str | None = None) -> list[dict[str, Any]]:
    records = list(rows)
    errors: list[str] = []
    slug_like_values: list[str] = []

    require_signal_families = schema_name in {"industrial_sites", "pfas_sites", "wastewater_sites"}

    for index, row in enumerate(records):
        row_errors: list[str] = []
        if not isinstance(row, dict):
            row_errors.append(f"row is not a dictionary: {type(row)!r}")
            errors.append(f"row {index + 1}: {'; '.join(row_errors)}")
            continue

        _validate_common_row(row, row_errors)
        _validate_metadata(row, row_errors, require_signal_families=require_signal_families)

        if schema_name == "industrial_sites":
            _validate_industrial_site_row(row, row_errors)
            if isinstance(row.get("slug"), str):
                slug_like_values.append(row["slug"])
        elif schema_name == "toxic_release_records":
            _validate_release_row(row, row_errors)
            if isinstance(row.get("site_slug"), str):
                slug_like_values.append(f"{row['site_slug']}::{row.get('record_title')}")
        elif schema_name == "health_concern_context":
            _validate_health_context_row(row, row_errors)
            if isinstance(row.get("slug"), str):
                slug_like_values.append(row["slug"])
        elif schema_name == "pfas_sites":
            _validate_pfas_row(row, row_errors)
            if isinstance(row.get("slug"), str):
                slug_like_values.append(row["slug"])
        elif schema_name == "wastewater_sites":
            _validate_wastewater_row(row, row_errors)
            if isinstance(row.get("slug"), str):
                slug_like_values.append(row["slug"])
        else:
            row_errors.append(f"unsupported schema_name: {schema_name}")

        if row_errors:
            identifier = row.get("slug") or row.get("site_slug") or row.get("record_title") or f"row {index + 1}"
            errors.append(f"{identifier}: {'; '.join(row_errors)}")

    duplicates = sorted(value for value, count in Counter(slug_like_values).items() if count > 1)
    for duplicate in duplicates:
        errors.append(f"duplicate identifier in {schema_name}: {duplicate}")

    if errors:
        context = f" for {job_name}" if job_name else ""
        detail = "\n".join(f"- {message}" for message in errors)
        raise RuntimeError(f"Load-row validation failed for {schema_name}{context}:\n{detail}")

    return records
