from utils.job import placeholder_job


if __name__ == "__main__":
    placeholder_job(
        source_slug="egrid-eia",
        output_name="power-plants-placeholder.json",
        summary="Prepare power-plant infrastructure context for official industrial burden framing.",
        upstream_notes=[
            "Normalize fuel type and capacity fields.",
            "Treat plant presence as context, not a complete emissions layer.",
        ],
    )

