from utils.job import placeholder_job


if __name__ == "__main__":
    placeholder_job(
        source_slug="epa-sems",
        output_name="superfund-placeholder.json",
        summary="Prepare hazardous-site and cleanup-status records for legacy pollution context.",
        upstream_notes=[
            "Prefer polygon geometry where available.",
            "Track remediation status separately from present-day community interpretation.",
        ],
    )

