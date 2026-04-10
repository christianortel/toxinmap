from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


USER_AGENT = "toxinmap-etl/1.0"


def fetch_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(f"{url}{query}", headers={"User-Agent": USER_AGENT})
    with urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_arcgis_layer_metadata(layer_url: str) -> dict[str, Any]:
    return fetch_json(layer_url, {"f": "json"})


def fetch_arcgis_features(
    layer_url: str,
    *,
    where: str = "1=1",
    out_fields: str = "*",
    return_geometry: bool = True,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    metadata = fetch_arcgis_layer_metadata(layer_url)
    batch_size = int(metadata.get("maxRecordCount") or 2000)
    features: list[dict[str, Any]] = []
    offset = 0

    while True:
        remaining = batch_size if limit is None else min(batch_size, max(limit - len(features), 0))
        if remaining <= 0:
            break

        page = fetch_json(
            f"{layer_url}/query",
            {
                "f": "json",
                "where": where,
                "outFields": out_fields,
                "returnGeometry": "true" if return_geometry else "false",
                "outSR": 4326,
                "resultOffset": offset,
                "resultRecordCount": remaining,
            },
        )
        batch = page.get("features", [])
        features.extend(batch)

        if not batch or len(batch) < remaining or not page.get("exceededTransferLimit"):
            break

        offset += len(batch)

    return features[:limit] if limit is not None else features
