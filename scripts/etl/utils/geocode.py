from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


CENSUS_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
USER_AGENT = "toxinmap-etl/1.0"


def load_cache(cache_path: Path) -> dict[str, dict]:
    if not cache_path.exists():
        return {}

    try:
        return json.loads(cache_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_cache(cache_path: Path, cache: dict[str, dict]) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def census_geocode_one_line(address: str) -> dict:
    query = urlencode(
        {
            "address": address,
            "benchmark": "Public_AR_Current",
            "format": "json",
        }
    )
    request = Request(f"{CENSUS_GEOCODER_URL}?{query}", headers={"User-Agent": USER_AGENT})
    with urlopen(request) as response:
        payload = json.loads(response.read().decode("utf-8"))

    matches = payload.get("result", {}).get("addressMatches", [])
    if not matches:
        return {
            "address": address,
            "matchedAddress": None,
            "latitude": None,
            "longitude": None,
            "matchScore": None,
        }

    match = matches[0]
    coordinates = match.get("coordinates", {})
    return {
        "address": address,
        "matchedAddress": match.get("matchedAddress"),
        "latitude": coordinates.get("y"),
        "longitude": coordinates.get("x"),
        "matchScore": match.get("tigerLine", {}).get("side"),
    }
