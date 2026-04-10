from __future__ import annotations

import json
import re
import shutil
import urllib.request
import zipfile
from pathlib import Path

import pandas as pd

from utils.paths import CLEANED_DIR, LOADERS_DIR, RAW_DIR, TRANSFORMS_DIR, ensure_directories

TRI_URL_TEMPLATE = "https://data.epa.gov/efservice/downloads/tri/mv_tri_basic_download/{year}_{geography}/csv"
FRS_DOWNLOAD_URL = "https://echo.epa.gov/files/echodownloads/frs_downloads.zip"
ECHO_FEC_DOWNLOAD_URL = "https://echo.epa.gov/files/echodownloads/case_downloads.zip"


def download_file(url: str, output_path: Path, force: bool = False) -> Path:
    ensure_directories()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists() and not force:
        return output_path

    with urllib.request.urlopen(url) as response, output_path.open("wb") as handle:
        shutil.copyfileobj(response, handle)

    return output_path


def extract_zip(zip_path: Path, destination: Path, members: list[str] | None = None) -> list[Path]:
    ensure_directories()
    destination.mkdir(parents=True, exist_ok=True)
    extracted_paths: list[Path] = []

    with zipfile.ZipFile(zip_path) as archive:
      targets = members or archive.namelist()
      for member in targets:
          archive.extract(member, destination)
          extracted_paths.append(destination / member)

    return extracted_paths


def ensure_zip_download(url: str, output_path: Path, force: bool = False) -> Path:
    zip_path = download_file(url, output_path, force=force)
    if zipfile.is_zipfile(zip_path):
        return zip_path

    retry_path = output_path
    try:
        zip_path.unlink(missing_ok=True)
    except PermissionError:
        retry_path = output_path.with_name(f"{output_path.stem}_refresh{output_path.suffix}")
        retry_path.unlink(missing_ok=True)

    zip_path = download_file(url, retry_path, force=True)
    if not zipfile.is_zipfile(zip_path):
        zip_path.unlink(missing_ok=True)
        raise zipfile.BadZipFile(f"Downloaded file from {url} is not a valid zip archive.")

    return zip_path


def read_dataframe(path: Path, *, nrows: int | None = None) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".parquet":
        return pd.read_parquet(path)

    return pd.read_csv(path, low_memory=False, nrows=nrows)


def write_dataframe(frame: pd.DataFrame, base_path: Path) -> tuple[Path, Path]:
    ensure_directories()
    base_path.parent.mkdir(parents=True, exist_ok=True)
    parquet_path = base_path.with_suffix(".parquet")
    csv_path = base_path.with_suffix(".csv")
    frame.to_parquet(parquet_path, index=False)
    frame.to_csv(csv_path, index=False)
    return parquet_path, csv_path


def write_json(path: Path, payload: dict) -> Path:
    ensure_directories()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def normalize_columns(frame: pd.DataFrame) -> pd.DataFrame:
    normalized = frame.copy()
    normalized.columns = [normalize_column_name(column) for column in normalized.columns]
    return normalized


def normalize_column_name(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"^[0-9]+\.\s*", "", value)
    value = value.replace("%", "pct")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def first_existing_column(frame: pd.DataFrame, candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate in frame.columns:
            return candidate
    return None


def write_loader_manifest(name: str, payload: dict) -> Path:
    return write_json(LOADERS_DIR / f"{name}.json", payload)


def raw_path(*parts: str) -> Path:
    return RAW_DIR.joinpath(*parts)


def cleaned_path(*parts: str) -> Path:
    return CLEANED_DIR.joinpath(*parts)


def transform_path(*parts: str) -> Path:
    return TRANSFORMS_DIR.joinpath(*parts)


FEATURED_CASE_STUDIES_BY_STATE = {
    "DE": ["delaware-pharmaceutical-estuary"],
    "LA": ["gulf-coast-petrochemical-corridor"],
    "MI": ["midwest-biosolids-and-farms", "great-lakes-sentinel-fish"],
    "NC": ["cape-fear-pfas-plume"],
    "NJ": ["delaware-pharmaceutical-estuary"],
    "NY": ["great-lakes-sentinel-fish"],
    "OH": ["ohio-river-consent-decree", "great-lakes-sentinel-fish"],
    "PA": ["delaware-pharmaceutical-estuary", "ohio-river-consent-decree"],
    "WI": ["midwest-biosolids-and-farms"],
    "WV": ["ohio-river-consent-decree"],
}


FEATURED_TAGS_BY_CASE_STUDY = {
    "cape-fear-pfas-plume": ["downstream", "drinking-water", "community-pressure"],
    "delaware-pharmaceutical-estuary": ["downstream", "drinking-water"],
    "gulf-coast-petrochemical-corridor": ["downstream", "community-pressure", "litigation"],
    "great-lakes-sentinel-fish": ["downstream", "wildlife-anomaly"],
    "midwest-biosolids-and-farms": ["downstream", "fertility-context", "drinking-water"],
    "ohio-river-consent-decree": ["downstream", "litigation", "community-pressure"],
}


def infer_case_studies(state_code: str | None) -> list[str]:
    if not state_code:
        return []
    return FEATURED_CASE_STUDIES_BY_STATE.get(state_code.upper(), [])


def infer_tags(case_studies: list[str]) -> list[str]:
    tags: list[str] = []
    for case_study in case_studies:
        tags.extend(FEATURED_TAGS_BY_CASE_STUDY.get(case_study, []))
    return sorted(set(tags))
