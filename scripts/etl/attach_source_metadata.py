from __future__ import annotations

import argparse
import json
from pathlib import Path

from utils.paths import LOADERS_DIR


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Attach source metadata to a loader manifest JSON file.")
    parser.add_argument("--manifest", required=True, help="Manifest filename inside scripts/etl/loaders.")
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--source-name", required=True)
    parser.add_argument("--evidence-type", required=True)
    parser.add_argument("--confidence-level", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_path = LOADERS_DIR / args.manifest
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    payload["source_metadata"] = {
        "source_id": args.source_id,
        "source_name": args.source_name,
        "evidence_type": args.evidence_type,
        "confidence_level": args.confidence_level,
    }

    manifest_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Updated {manifest_path}")


if __name__ == "__main__":
    main()
