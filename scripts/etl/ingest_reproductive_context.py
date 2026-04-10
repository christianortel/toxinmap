from utils.job import placeholder_job


if __name__ == "__main__":
    placeholder_job(
        source_slug="cdc-ephtracking",
        output_name="reproductive-context-placeholder.json",
        summary="Prepare carefully bounded reproductive-health context and public-health indicator records.",
        upstream_notes=[
            "Do not invent direct local fertility or infertility measurements where public data do not exist.",
            "Keep proxy, literature, and demographic context explicitly labeled.",
        ],
    )

