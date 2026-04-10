from utils.job import placeholder_job


if __name__ == "__main__":
    placeholder_job(
        source_slug="editorial-reporting",
        output_name="case-studies-placeholder.json",
        summary="Prepare structured editorial case-study records with source references and methodology notes.",
        upstream_notes=[
            "Retain a strict separation between editorial synthesis and scientific evidence classes.",
            "Support source-linked callouts, related entities, and hero metadata.",
        ],
    )

