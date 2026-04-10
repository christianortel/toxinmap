from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "raw"
CLEANED_DIR = ROOT / "cleaned"
TRANSFORMS_DIR = ROOT / "transforms"
LOADERS_DIR = ROOT / "loaders"


def ensure_directories() -> None:
    for path in (RAW_DIR, CLEANED_DIR, TRANSFORMS_DIR, LOADERS_DIR):
        path.mkdir(parents=True, exist_ok=True)

