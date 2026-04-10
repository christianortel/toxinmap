from __future__ import annotations

import argparse
from datetime import datetime, timezone

import pandas as pd

from loaders.postgres import load_pfas_sites
from utils.arcgis import fetch_arcgis_features, fetch_arcgis_layer_metadata, fetch_json
from utils.epa import cleaned_path, transform_path, write_dataframe, write_json, write_loader_manifest, slugify
from utils.validation import validate_load_rows

USGS_PFAS_DASHBOARD_URL = "https://geonarrative.usgs.gov/pfasustapwater/"
USGS_PFAS_ARCGIS_ITEM_ID = "8c7764199ed6492a99d1a532f236b96e"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download, normalize, and optionally load USGS PFAS dashboard context.")
    parser.add_argument("--limit", type=int, default=None, help="Optional feature limit for local iteration.")
    parser.add_argument("--load", action="store_true")
    return parser.parse_args()


def polygon_centroid(ring: list[list[float]]) -> tuple[float | None, float | None]:
    if not ring:
        return None, None

    points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    if len(points) < 3:
        return None, None

    area = 0.0
    centroid_x = 0.0
    centroid_y = 0.0

    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        cross = (x1 * y2) - (x2 * y1)
        area += cross
        centroid_x += (x1 + x2) * cross
        centroid_y += (y1 + y2) * cross

    if area == 0:
        mean_x = sum(point[0] for point in points) / len(points)
        mean_y = sum(point[1] for point in points) / len(points)
        return mean_x, mean_y

    area *= 0.5
    return centroid_x / (6 * area), centroid_y / (6 * area)


def fetch_dashboard_item_data() -> dict:
    return fetch_json(f"https://www.arcgis.com/sharing/rest/content/items/{USGS_PFAS_ARCGIS_ITEM_ID}/data", {"f": "json"})


def discover_layer_urls(dashboard_data: dict) -> tuple[str, str]:
    web_map_id = None
    for widget in dashboard_data.get("desktopView", {}).get("widgets", []):
        for dataset in widget.get("datasets", []):
            data_source = dataset.get("dataSource", {})
            if data_source.get("itemId"):
                web_map_id = data_source["itemId"]
                break
        if web_map_id:
            break

    if not web_map_id:
        raise RuntimeError("Could not discover the USGS PFAS dashboard web map item.")

    web_map = fetch_json(f"https://www.arcgis.com/sharing/rest/content/items/{web_map_id}/data", {"f": "json"})
    point_layer = None
    summary_layer = None

    for layer in web_map.get("operationalLayers", []):
        title = str(layer.get("title", "")).lower()
        if "concentrations" in title:
            point_layer = layer.get("url")
        elif "source" in title:
            summary_layer = layer.get("url")

    if not point_layer or not summary_layer:
        raise RuntimeError("Could not resolve the expected USGS PFAS ArcGIS layer URLs.")

    return point_layer, summary_layer


def build_points_frame(layer_url: str, limit: int | None) -> pd.DataFrame:
    features = fetch_arcgis_features(layer_url, limit=limit)
    rows: list[dict] = []
    for feature in features:
        attributes = feature.get("attributes", {})
        geometry = feature.get("geometry", {})
        rows.append(
            {
                **attributes,
                "longitude": geometry.get("x"),
                "latitude": geometry.get("y"),
            }
        )
    return pd.DataFrame(rows)


def build_summary_frame(layer_url: str, limit: int | None) -> pd.DataFrame:
    features = fetch_arcgis_features(layer_url, limit=limit)
    rows: list[dict] = []
    for feature in features:
        attributes = feature.get("attributes", {})
        geometry = feature.get("geometry", {})
        rings = geometry.get("rings") or []
        centroid_lon, centroid_lat = polygon_centroid(rings[0]) if rings else (None, None)

        rows.append(
            {
                **attributes,
                "centroid_longitude": centroid_lon,
                "centroid_latitude": centroid_lat,
            }
        )
    return pd.DataFrame(rows)


def build_load_rows(frame: pd.DataFrame) -> list[dict]:
    updated_at = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []

    for record in frame.to_dict("records"):
        station_name = str(record.get("Station_name") or "").strip()
        site_type = str(record.get("Site_type") or "Tap water sample").strip()
        study = str(record.get("Study") or "USGS PFAS study").strip()
        sum_pfas = pd.to_numeric(record.get("SUM_PFAS"), errors="coerce")
        detects = pd.to_numeric(record.get("DETECTS"), errors="coerce")
        sample_year = pd.to_numeric(record.get("SampleYear"), errors="coerce")

        rows.append(
            {
                "slug": f"usgs-pfas-{slugify(study)}-{slugify(station_name)}",
                "site_name": station_name,
                "site_subtype": site_type,
                "sampling_matrix": "tap_water",
                "concentration_ppt": float(sum_pfas) if pd.notna(sum_pfas) else None,
                "observed_year": int(sample_year) if pd.notna(sample_year) else None,
                "longitude": float(record["longitude"]) if pd.notna(record.get("longitude")) else None,
                "latitude": float(record["latitude"]) if pd.notna(record.get("latitude")) else None,
                "category": "PFAS tap water sample",
                "subcategory": site_type,
                "layer_group": "emerging",
                "evidence_type": "direct_measurement",
                "confidence_level": "high",
                "geographic_level": "site",
                "summary": (
                    f"USGS PFAS reconnaissance sample with {int(detects) if pd.notna(detects) else 0} reported PFAS detects"
                    f" and {float(sum_pfas):.1f} ng/L summed PFAS."
                    if pd.notna(sum_pfas)
                    else "USGS PFAS reconnaissance sample record."
                ),
                "notes": (
                    "USGS sampling records reflect observed tap-water sample results at listed sites. "
                    "They are not a complete national tap-water coverage map."
                ),
                "tags": sorted({"pfas", "tap-water", slugify(site_type)}),
                "source_ids": ["usgs-pfas-tapwater", "usgs-pfas"],
                "source_name": "USGS PFAS in U.S. Tapwater Interactive Dashboard",
                "source_url": USGS_PFAS_DASHBOARD_URL,
                "source_updated_at": updated_at,
                "ingestion_version": "usgs_pfas_dashboard_v1",
                "metadata": {
                    "signalFamilies": ["pfas"],
                    "chemicalMarkers": ["pfas"],
                    "chemicalHighlights": ["PFAS"],
                    "study": study,
                    "pfasDetects": int(detects) if pd.notna(detects) else None,
                    "sumPfasNgL": float(sum_pfas) if pd.notna(sum_pfas) else None,
                    "officialSignals": ["USGS tap-water PFAS sampling result"],
                    "emergingConcerns": ["Unsampled locations should not be interpreted as PFAS-free."],
                    "uncertaintyNote": "This layer represents sampled locations from a national reconnaissance, not universal household tap-water coverage.",
                },
            }
        )

    return rows


def main() -> None:
    args = parse_args()
    dashboard_data = fetch_dashboard_item_data()
    point_layer_url, summary_layer_url = discover_layer_urls(dashboard_data)

    point_metadata = fetch_arcgis_layer_metadata(point_layer_url)
    summary_metadata = fetch_arcgis_layer_metadata(summary_layer_url)
    points_frame = build_points_frame(point_layer_url, args.limit)
    summary_frame = build_summary_frame(summary_layer_url, args.limit)

    raw_payload = {
        "dashboardUrl": USGS_PFAS_DASHBOARD_URL,
        "pointLayer": {
            "url": point_layer_url,
            "name": point_metadata.get("name"),
            "fields": [field.get("name") for field in point_metadata.get("fields", [])],
        },
        "summaryLayer": {
            "url": summary_layer_url,
            "name": summary_metadata.get("name"),
            "fields": [field.get("name") for field in summary_metadata.get("fields", [])],
        },
    }
    raw_manifest = write_json(cleaned_path("usgs-pfas", "usgs_pfas_dashboard_sources.json"), raw_payload)

    points_base = cleaned_path("usgs-pfas", "usgs_pfas_tapwater_points")
    points_parquet, points_csv = write_dataframe(points_frame, points_base)
    summary_base = transform_path("usgs-pfas", "usgs_pfas_source_summary")
    summary_parquet, summary_csv = write_dataframe(summary_frame, summary_base)

    load_rows = build_load_rows(points_frame)
    validate_load_rows(load_rows, "pfas_sites", job_name="USGS PFAS tap-water rows")
    transform_base = transform_path("usgs-pfas", "usgs_pfas_tapwater_load_rows")
    write_dataframe(pd.DataFrame(load_rows), transform_base)

    loaded_records = load_pfas_sites(load_rows) if args.load else 0

    write_loader_manifest(
        "usgs_pfas_dashboard",
        {
            "source": "usgs-pfas-tapwater",
            "dashboard_url": USGS_PFAS_DASHBOARD_URL,
            "raw_manifest": str(raw_manifest),
            "point_layer_url": point_layer_url,
            "summary_layer_url": summary_layer_url,
            "points_parquet": str(points_parquet),
            "points_csv": str(points_csv),
            "summary_parquet": str(summary_parquet),
            "summary_csv": str(summary_csv),
            "point_records": len(points_frame),
            "summary_records": len(summary_frame),
            "loaded_to_database": bool(args.load),
            "loaded_records": loaded_records,
        },
    )

    print(f"Normalized USGS PFAS tap-water points: {points_parquet}")
    print(f"Tap-water sample rows: {len(load_rows)}")
    print(f"Source-summary rows: {len(summary_frame)}")


if __name__ == "__main__":
    main()
