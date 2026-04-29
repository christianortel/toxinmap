from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[2]
ETL_ROOT = ROOT / "scripts" / "etl"
if str(ETL_ROOT) not in sys.path:
    sys.path.insert(0, str(ETL_ROOT))

from loaders.postgres import (  # type: ignore
    _connect,
    load_health_concern_context,
    load_industrial_sites,
    load_pfas_sites,
    load_wastewater_sites,
    replace_toxic_release_records,
)


INDUSTRIAL_SLUG = "idempotence-industrial-facility"
PFAS_SLUG = "idempotence-pfas-site"
WASTEWATER_SLUG = "idempotence-wastewater-site"
LEGAL_SLUG = "idempotence-legal-marker"
IDEMPOTENCE_FRS_ID = "IDEMPOTENCE-FRS-001"
RELEASE_YEAR = 2099
RELEASE_CHEMICAL = "Idempotence Test Chemical"


def normalize_database_url(raw_url: str) -> str:
    split = urlsplit(raw_url)
    hostname = split.hostname or "127.0.0.1"
    port = split.port or 5432
    username = split.username or "postgres"
    password = split.password or "postgres"

    if hostname == "localhost":
        hostname = "127.0.0.1"

    query = dict(parse_qsl(split.query, keep_blank_values=True))
    query.setdefault("connect_timeout", "5")

    netloc = f"{username}:{password}@{hostname}:{port}"
    return urlunsplit((split.scheme, netloc, split.path, urlencode(query), split.fragment))


def cleanup() -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("delete from health_concern_context where slug = %s", (LEGAL_SLUG,))
        cursor.execute("delete from pfas_sites where slug = %s", (PFAS_SLUG,))
        cursor.execute("delete from wastewater_sites where slug = %s", (WASTEWATER_SLUG,))
        cursor.execute(
            "delete from toxic_release_records where reporting_year = %s and chemical_name = %s",
            (RELEASE_YEAR, RELEASE_CHEMICAL),
        )
        cursor.execute("delete from industrial_sites where slug = %s", (INDUSTRIAL_SLUG,))
        connection.commit()


def count_rows() -> dict[str, int]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("select count(*) from industrial_sites where slug = %s", (INDUSTRIAL_SLUG,))
        industrial = int(cursor.fetchone()[0])

        cursor.execute("select count(*) from pfas_sites where slug = %s", (PFAS_SLUG,))
        pfas = int(cursor.fetchone()[0])

        cursor.execute("select count(*) from wastewater_sites where slug = %s", (WASTEWATER_SLUG,))
        wastewater = int(cursor.fetchone()[0])

        cursor.execute("select count(*) from health_concern_context where slug = %s", (LEGAL_SLUG,))
        legal = int(cursor.fetchone()[0])

        cursor.execute(
            "select count(*) from toxic_release_records where reporting_year = %s and chemical_name = %s",
            (RELEASE_YEAR, RELEASE_CHEMICAL),
        )
        releases = int(cursor.fetchone()[0])

    return {
        "industrial": industrial,
        "pfas": pfas,
        "wastewater": wastewater,
        "legal": legal,
        "releases": releases,
    }


def fetch_integrity_snapshot() -> dict[str, object]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            select
                source_ids,
                tags,
                metadata->'signalFamilies',
                metadata->'chemicalMarkers'
            from industrial_sites
            where slug = %s
            """,
            (INDUSTRIAL_SLUG,),
        )
        industrial_row = cursor.fetchone()

    if not industrial_row:
        raise RuntimeError("Expected industrial test row to exist before fetching integrity snapshot.")

    return {
        "sourceIds": industrial_row[0],
        "tags": industrial_row[1],
        "signalFamilies": industrial_row[2],
        "chemicalMarkers": industrial_row[3],
    }


def expect_counts(label: str, actual: dict[str, int], expected: dict[str, int]) -> None:
    if actual != expected:
        raise RuntimeError(
            f"{label} counts do not match expected values.\n"
            f"Expected: {json.dumps(expected, indent=2)}\n"
            f"Actual: {json.dumps(actual, indent=2)}"
        )


def expect_unique_strings(label: str, values: list[str]) -> None:
    if len(values) != len(set(values)):
        raise RuntimeError(f"{label} contains duplicate values after repeated loads: {values}")


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        env_local = ROOT / ".env.local"
        if env_local.exists():
            for raw_line in env_local.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if line.startswith("DATABASE_URL="):
                    database_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    if not database_url:
        raise RuntimeError("DATABASE_URL is required for loader idempotence validation.")

    os.environ["DATABASE_URL"] = normalize_database_url(database_url)

    industrial_rows = [
        {
            "slug": INDUSTRIAL_SLUG,
            "facility_name": "Idempotence Validation Facility",
            "operator_name": "Idempotence Operator",
            "naics_code": "325199",
            "status": "reported",
            "longitude": -78.892,
            "latitude": 35.995,
            "active_year": 2024,
            "date_range_label": "2024",
            "category": "Facility footprint",
            "subcategory": "Loader validation",
            "layer_group": "official",
            "evidence_type": "proxy",
            "confidence_level": "high",
            "geographic_level": "facility",
            "summary": "Synthetic industrial site used to verify idempotent loader behavior.",
            "notes": "Validation-only row.",
            "tags": ["idempotence", "validation", "industrial"],
            "source_ids": ["epa-frs", "epa-tri"],
            "source_name": "Idempotence Validator",
            "source_url": "https://example.test/idempotence/industrial",
            "source_updated_at": "2026-04-16T00:00:00+00:00",
            "ingestion_version": "idempotence_test_v1",
            "metadata": {
                "frsId": IDEMPOTENCE_FRS_ID,
                "signalFamilies": ["air-toxics", "industrial"],
                "chemicalMarkers": ["benzene", "pfas"],
            },
        }
    ]

    pfas_rows = [
        {
            "slug": PFAS_SLUG,
            "site_name": "Idempotence PFAS Site",
            "site_subtype": "sampling",
            "sampling_matrix": "drinking-water",
            "concentration_ppt": 42.0,
            "observed_year": 2024,
            "longitude": -78.891,
            "latitude": 35.996,
            "category": "PFAS validation",
            "subcategory": "Loader validation",
            "layer_group": "emerging",
            "evidence_type": "direct_measurement",
            "confidence_level": "high",
            "geographic_level": "site",
            "summary": "Synthetic PFAS row used to verify idempotent loader behavior.",
            "notes": "Validation-only row.",
            "tags": ["idempotence", "validation", "pfas"],
            "source_ids": ["atsdr-pfas"],
            "source_name": "Idempotence Validator",
            "source_url": "https://example.test/idempotence/pfas",
            "source_updated_at": "2026-04-16T00:00:00+00:00",
            "ingestion_version": "idempotence_test_v1",
            "metadata": {"signalFamilies": ["pfas"], "chemicalMarkers": ["pfoa"]},
        }
    ]

    wastewater_rows = [
        {
            "slug": WASTEWATER_SLUG,
            "facility_name": "Idempotence Wastewater Facility",
            "permit_id": "NCIDEMPOTENCE001",
            "discharge_type": "POTW",
            "flow_mgd": 1.25,
            "longitude": -78.89,
            "latitude": 35.994,
            "observed_year": 2024,
            "category": "Wastewater validation",
            "subcategory": "Loader validation",
            "layer_group": "emerging",
            "evidence_type": "proxy",
            "confidence_level": "high",
            "geographic_level": "facility",
            "summary": "Synthetic wastewater row used to verify idempotent loader behavior.",
            "notes": "Validation-only row.",
            "tags": ["idempotence", "validation", "wastewater"],
            "source_ids": ["epa-npdes"],
            "source_name": "Idempotence Validator",
            "source_url": "https://example.test/idempotence/wastewater",
            "source_updated_at": "2026-04-16T00:00:00+00:00",
            "ingestion_version": "idempotence_test_v1",
            "metadata": {"featureNumber": "001", "signalFamilies": ["wastewater"]},
        }
    ]

    legal_rows = [
        {
            "slug": LEGAL_SLUG,
            "title": "Idempotence Legal Marker",
            "concern_type": "Federal enforcement context",
            "narrative": "Synthetic legal row used to verify idempotent loader behavior.",
            "is_verified": True,
            "category": "Pressure point",
            "subcategory": "Loader validation",
            "layer_group": "legal",
            "evidence_type": "editorial_case_study",
            "confidence_level": "moderate",
            "geographic_level": "facility",
            "summary": "Synthetic legal row used to verify idempotent loader behavior.",
            "notes": "Validation-only row.",
            "tags": ["idempotence", "validation", "legal"],
            "source_ids": ["epa-echo"],
            "source_name": "Idempotence Validator",
            "source_url": "https://example.test/idempotence/legal",
            "source_updated_at": "2026-04-16T00:00:00+00:00",
            "ingestion_version": "idempotence_test_v1",
            "metadata": {"frsId": IDEMPOTENCE_FRS_ID},
        }
    ]

    release_rows = [
        {
            "site_slug": INDUSTRIAL_SLUG,
            "record_title": "Idempotence validation releases",
            "chemical_name": RELEASE_CHEMICAL,
            "cas_number": "000-00-0",
            "reporting_year": RELEASE_YEAR,
            "quantity_kg": 12.5,
            "release_medium": "water",
            "category": "Facility footprint",
            "subcategory": "Loader validation",
            "layer_group": "official",
            "evidence_type": "direct_measurement",
            "confidence_level": "high",
            "geographic_level": "facility",
            "summary": "Synthetic toxic release row used to verify replace semantics.",
            "notes": "Validation-only row.",
            "tags": ["idempotence", "validation", "tri"],
            "source_ids": ["epa-tri"],
            "source_name": "Idempotence Validator",
            "source_url": "https://example.test/idempotence/tri",
            "source_updated_at": "2026-04-16T00:00:00+00:00",
            "ingestion_version": "idempotence_test_v1",
            "metadata": {"signalFamilies": ["air-toxics"], "chemicalMarkers": ["benzene"]},
        }
    ]

    cleanup()

    try:
        initial_counts = count_rows()
        expect_counts(
            "Initial",
            initial_counts,
            {"industrial": 0, "pfas": 0, "wastewater": 0, "legal": 0, "releases": 0},
        )

        load_industrial_sites(industrial_rows)
        load_pfas_sites(pfas_rows)
        load_wastewater_sites(wastewater_rows)
        load_health_concern_context(legal_rows)
        replace_toxic_release_records(release_rows, reporting_year=RELEASE_YEAR)

        first_counts = count_rows()
        expect_counts(
            "After first load",
            first_counts,
            {"industrial": 1, "pfas": 1, "wastewater": 1, "legal": 1, "releases": 1},
        )

        load_industrial_sites(industrial_rows)
        load_pfas_sites(pfas_rows)
        load_wastewater_sites(wastewater_rows)
        load_health_concern_context(legal_rows)
        replace_toxic_release_records(release_rows, reporting_year=RELEASE_YEAR)

        second_counts = count_rows()
        expect_counts(
            "After second load",
            second_counts,
            {"industrial": 1, "pfas": 1, "wastewater": 1, "legal": 1, "releases": 1},
        )

        integrity_snapshot = fetch_integrity_snapshot()
        expect_unique_strings("industrial sourceIds", integrity_snapshot["sourceIds"])
        expect_unique_strings("industrial tags", integrity_snapshot["tags"])
        expect_unique_strings("industrial signalFamilies", integrity_snapshot["signalFamilies"])
        expect_unique_strings("industrial chemicalMarkers", integrity_snapshot["chemicalMarkers"])

        print("PASS loader idempotence validation")
        print(
            json.dumps(
                {
                    "counts": second_counts,
                    "industrialIntegrity": integrity_snapshot,
                },
                indent=2,
            )
        )
    finally:
        cleanup()


if __name__ == "__main__":
    main()
