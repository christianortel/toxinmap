from __future__ import annotations

from utils.validation import validate_load_rows


def build_fixture_rows() -> dict[str, list[dict]]:
    return {
        "industrial_sites": [
            {
                "slug": "fixture-industrial-site",
                "facility_name": "Fixture Chemical Plant",
                "operator_name": "Fixture Operator",
                "naics_code": "325199",
                "status": "reported",
                "longitude": -77.0365,
                "latitude": 38.8977,
                "active_year": 2024,
                "date_range_label": "2024",
                "category": "Facility footprint",
                "subcategory": "Fixture industrial context",
                "layer_group": "official",
                "evidence_type": "direct_measurement",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": "Fixture industrial facility row.",
                "notes": "Fixture note.",
                "tags": ["downstream"],
                "source_ids": ["epa-tri", "epa-frs"],
                "source_name": "Fixture source",
                "source_url": "https://example.org/fixture-industrial",
                "source_updated_at": "2026-01-01T00:00:00+00:00",
                "ingestion_version": "fixture_v1",
                "metadata": {
                    "signalFamilies": ["air-toxics", "petrochemical"],
                    "chemicalMarkers": ["petrochemical-volatiles"],
                    "chemicalHighlights": ["Benzene", "Styrene"],
                    "relatedCaseStudyIds": ["fixture-case-study"],
                    "officialSignals": ["Fixture industrial signal"],
                    "emergingConcerns": ["Fixture emerging concern"],
                    "wildlifeSentinelContext": ["Fixture wildlife context"],
                    "reproductiveHealthContext": ["Fixture reproductive context"],
                    "legalHistoricalContext": ["Fixture legal context"],
                    "uncertaintyNote": "Fixture uncertainty note.",
                    "sourceStats": [{"label": "Fixture stat", "value": "1"}],
                },
            }
        ],
        "toxic_release_records": [
            {
                "site_slug": "fixture-industrial-site",
                "record_title": "Fixture release record",
                "chemical_name": "Benzene",
                "cas_number": "71-43-2",
                "reporting_year": 2024,
                "quantity_kg": 100.5,
                "release_medium": "air",
                "category": "Facility footprint",
                "subcategory": "TRI chemical release",
                "layer_group": "official",
                "evidence_type": "direct_measurement",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": "Fixture release row.",
                "notes": "Fixture release note.",
                "tags": [],
                "source_ids": ["epa-tri"],
                "source_name": "Fixture source",
                "source_url": "https://example.org/fixture-release",
                "source_updated_at": "2026-01-01T00:00:00+00:00",
                "ingestion_version": "fixture_v1",
                "metadata": {"unitOfMeasure": "kg"},
            }
        ],
        "health_concern_context": [
            {
                "slug": "fixture-health-context",
                "title": "Fixture enforcement case",
                "concern_type": "Federal enforcement context",
                "narrative": "Fixture narrative",
                "is_verified": True,
                "category": "Pressure point",
                "subcategory": "Federal compliance and enforcement",
                "layer_group": "legal",
                "evidence_type": "editorial_case_study",
                "confidence_level": "moderate",
                "geographic_level": "facility",
                "summary": "Fixture legal context row.",
                "notes": "Fixture health-context note.",
                "tags": ["litigation"],
                "source_ids": ["epa-echo"],
                "source_name": "Fixture source",
                "source_url": "https://example.org/fixture-health",
                "source_updated_at": "2026-01-01T00:00:00+00:00",
                "ingestion_version": "fixture_v1",
                "metadata": {
                    "relatedCaseStudyIds": ["fixture-case-study"],
                },
            }
        ],
        "pfas_sites": [
            {
                "slug": "fixture-pfas-site",
                "site_name": "Fixture PFAS Site",
                "site_subtype": "Tap water sample",
                "sampling_matrix": "tap_water",
                "concentration_ppt": 12.5,
                "observed_year": 2024,
                "longitude": -77.02,
                "latitude": 38.9,
                "category": "PFAS tap water sample",
                "subcategory": "Fixture PFAS sample",
                "layer_group": "emerging",
                "evidence_type": "direct_measurement",
                "confidence_level": "high",
                "geographic_level": "site",
                "summary": "Fixture PFAS row.",
                "notes": "Fixture PFAS note.",
                "tags": ["pfas"],
                "source_ids": ["usgs-pfas-tapwater"],
                "source_name": "Fixture source",
                "source_url": "https://example.org/fixture-pfas",
                "source_updated_at": "2026-01-01T00:00:00+00:00",
                "ingestion_version": "fixture_v1",
                "metadata": {
                    "signalFamilies": ["pfas"],
                    "chemicalMarkers": ["pfas"],
                    "chemicalHighlights": ["PFOA"],
                    "officialSignals": ["Fixture PFAS signal"],
                    "emergingConcerns": ["Fixture PFAS concern"],
                    "uncertaintyNote": "Fixture PFAS uncertainty.",
                },
            }
        ],
        "wastewater_sites": [
            {
                "slug": "fixture-wastewater-site",
                "facility_name": "Fixture Wastewater Plant",
                "permit_id": "NC0000001",
                "discharge_type": "POTW",
                "flow_mgd": 4.2,
                "longitude": -78.0,
                "latitude": 35.9,
                "observed_year": 2024,
                "category": "Wastewater discharge context",
                "subcategory": "Fixture wastewater context",
                "layer_group": "emerging",
                "evidence_type": "proxy",
                "confidence_level": "high",
                "geographic_level": "facility",
                "summary": "Fixture wastewater row.",
                "notes": "Fixture wastewater note.",
                "tags": ["downstream", "drinking-water"],
                "source_ids": ["epa-npdes", "epa-biosolids"],
                "source_name": "Fixture source",
                "source_url": "https://example.org/fixture-wastewater",
                "source_updated_at": "2026-01-01T00:00:00+00:00",
                "ingestion_version": "fixture_v1",
                "metadata": {
                    "signalFamilies": ["wastewater", "pfas"],
                    "chemicalMarkers": ["wastewater-indicators", "pfas"],
                    "chemicalHighlights": ["Carbamazepine", "PFOS"],
                    "officialSignals": ["Fixture wastewater signal"],
                    "emergingConcerns": ["Fixture wastewater concern"],
                    "wildlifeSentinelContext": ["Fixture wildlife context"],
                    "reproductiveHealthContext": ["Fixture reproductive context"],
                    "legalHistoricalContext": ["Fixture legal context"],
                    "uncertaintyNote": "Fixture wastewater uncertainty.",
                    "sourceStats": [{"label": "Permit", "value": "NC0000001"}],
                },
            }
        ],
    }


def main() -> None:
    fixtures = build_fixture_rows()
    for schema_name, rows in fixtures.items():
        validate_load_rows(rows, schema_name, job_name=f"{schema_name} fixtures")

    invalid_fixture = dict(fixtures["pfas_sites"][0])
    invalid_fixture["metadata"] = dict(invalid_fixture["metadata"])
    invalid_fixture["metadata"]["chemicalMarkers"] = []

    try:
        validate_load_rows([invalid_fixture], "pfas_sites", job_name="invalid fixture")
    except RuntimeError:
        print("PASS ETL fixture validation")
        print(f"Validated {len(fixtures)} fixture schema surfaces and rejected an invalid PFAS row.")
        return

    raise SystemExit("Expected invalid PFAS fixture to fail validation, but it passed.")


if __name__ == "__main__":
    main()
