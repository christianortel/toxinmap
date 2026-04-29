from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


CENSUS_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
NOMINATIM_GEOCODER_URL = "https://nominatim.openstreetmap.org/search"
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


def empty_geocode_result(address: str) -> dict:
    return {
        "address": address,
        "queryUsed": address,
        "matchedAddress": None,
        "latitude": None,
        "longitude": None,
        "matchScore": None,
        "geocoder": "none",
    }


def nominatim_geocode_one_line(address: str) -> dict:
    query = urlencode(
        {
            "q": address,
            "format": "jsonv2",
            "limit": 1,
        }
    )
    request = Request(f"{NOMINATIM_GEOCODER_URL}?{query}", headers={"User-Agent": USER_AGENT})

    try:
        with urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError):
        return empty_geocode_result(address)

    if not payload:
        return empty_geocode_result(address)

    match = payload[0]
    latitude = match.get("lat")
    longitude = match.get("lon")
    return {
        "address": address,
        "queryUsed": address,
        "matchedAddress": match.get("display_name"),
        "latitude": float(latitude) if latitude is not None else None,
        "longitude": float(longitude) if longitude is not None else None,
        "matchScore": match.get("importance"),
        "geocoder": "nominatim",
    }


def census_geocode_one_line(address: str) -> dict:
    query = urlencode(
        {
            "address": address,
            "benchmark": "Public_AR_Current",
            "format": "json",
        }
    )
    request = Request(f"{CENSUS_GEOCODER_URL}?{query}", headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError):
        return nominatim_geocode_one_line(address)

    matches = payload.get("result", {}).get("addressMatches", [])
    if not matches:
        return nominatim_geocode_one_line(address)

    match = matches[0]
    coordinates = match.get("coordinates", {})
    return {
        "address": address,
        "queryUsed": address,
        "matchedAddress": match.get("matchedAddress"),
        "latitude": coordinates.get("y"),
        "longitude": coordinates.get("x"),
        "matchScore": match.get("tigerLine", {}).get("side"),
        "geocoder": "census",
    }


def geocode_one_line_candidates(addresses: list[str]) -> dict:
    deduped = []
    seen = set()

    for address in addresses:
        normalized = address.strip()
        if not normalized or normalized in seen:
            continue
        deduped.append(normalized)
        seen.add(normalized)

    if not deduped:
        return empty_geocode_result("")

    for address in deduped:
        result = census_geocode_one_line(address)
        if result.get("latitude") is not None and result.get("longitude") is not None:
            return result

    return empty_geocode_result(deduped[0])
