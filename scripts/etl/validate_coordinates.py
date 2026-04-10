from utils.job import placeholder_job


if __name__ == "__main__":
    placeholder_job(
        source_slug="coordinate-validation",
        output_name="coordinate-validation-placeholder.json",
        summary="Validate coordinate ranges, null geometry, and CRS assumptions before loading records.",
        upstream_notes=[
            "Reject lat/lon pairs outside valid WGS84 ranges.",
            "Flag records that require polygon or watershed geometry instead of false precision points.",
        ],
    )

