from utils.job import placeholder_job


if __name__ == "__main__":
    placeholder_job(
        source_slug="usgs-hydrography",
        output_name="geographies-placeholder.json",
        summary="Prepare geography crosswalks for watersheds, counties, corridors, and editorial regions.",
        upstream_notes=[
            "Persist stable geography slugs for drawer, case-study, and API lookups.",
            "Support future basin-aware logic without overstating transport certainty.",
        ],
    )

