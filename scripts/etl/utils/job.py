from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from utils.paths import CLEANED_DIR, ensure_directories


def placeholder_job(
    *,
    source_slug: str,
    output_name: str,
    summary: str,
    upstream_notes: list[str],
) -> None:
    ensure_directories()
    payload = {
        "source_slug": source_slug,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "upstream_notes": upstream_notes,
        "status": "placeholder",
    }
    output_path = Path(CLEANED_DIR / output_name)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote placeholder metadata to {output_path}")

