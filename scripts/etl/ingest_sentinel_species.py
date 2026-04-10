from utils.job import placeholder_job


if __name__ == "__main__":
    placeholder_job(
        source_slug="literature-sentinel",
        output_name="sentinel-placeholder.json",
        summary="Prepare literature-curated wildlife sentinel records with study-geometry caveats.",
        upstream_notes=[
            "Do not imply full spatial coverage where only literature-defined clusters exist.",
            "Keep species, abnormality type, and methodological notes explicit.",
        ],
    )

