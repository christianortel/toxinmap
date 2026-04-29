from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Iterable


def _read_database_url_from_local_env() -> str | None:
    root = Path(__file__).resolve().parents[3]
    for candidate in (root / ".env.local", root / ".env"):
        if not candidate.exists():
            continue

        for raw_line in candidate.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            if key.strip() != "DATABASE_URL":
                continue

            normalized = value.strip().strip('"').strip("'")
            if normalized:
                return normalized

    return None


def _connect():
    database_url = os.environ.get("DATABASE_URL") or _read_database_url_from_local_env()
    if not database_url:
        raise RuntimeError("DATABASE_URL is required when --load is used.")

    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "psycopg is required for direct loading. Install scripts/etl requirements first."
        ) from exc

    return psycopg.connect(database_url, connect_timeout=10)


def _serialize_common_payload(record: dict) -> dict:
    def json_ready(value):
        if value is None:
            return None

        if isinstance(value, float) and math.isnan(value):
            return None

        try:
            if value != value:
                return None
        except Exception:
            pass

        if isinstance(value, dict):
            return {key: json_ready(item) for key, item in value.items()}

        if isinstance(value, (list, tuple, set)):
            return [json_ready(item) for item in value]

        if hasattr(value, "tolist") and not isinstance(value, (str, bytes, bytearray)):
            return json_ready(value.tolist())

        if hasattr(value, "item") and not isinstance(value, (str, bytes, bytearray)):
            try:
                return json_ready(value.item())
            except Exception:
                pass

        if hasattr(value, "isoformat") and not isinstance(value, (str, bytes, bytearray)):
            try:
                return value.isoformat()
            except Exception:
                pass

        return value

    payload = record.copy()
    payload["tags"] = json.dumps(json_ready(payload.get("tags", [])))
    payload["source_ids"] = json.dumps(json_ready(payload.get("source_ids", [])))
    payload["metadata"] = json.dumps(json_ready(payload.get("metadata", {})))
    return payload


def load_industrial_sites(rows: Iterable[dict]) -> int:
    records = list(rows)
    if not records:
        return 0

    statement = """
        insert into industrial_sites (
            slug,
            facility_name,
            operator_name,
            naics_code,
            status,
            location,
            active_year,
            date_range_label,
            category,
            subcategory,
            layer_group,
            evidence_type,
            confidence_level,
            geographic_level,
            summary,
            notes,
            tags,
            source_ids,
            source_name,
            source_url,
            source_updated_at,
            ingestion_version,
            metadata
        )
        values (
            %(slug)s,
            %(facility_name)s,
            %(operator_name)s,
            %(naics_code)s,
            %(status)s,
            case
                when %(longitude)s::double precision is not null
                    and %(latitude)s::double precision is not null
                then ST_SetSRID(
                    ST_Point(
                        %(longitude)s::double precision,
                        %(latitude)s::double precision
                    ),
                    4326
                )
                else null::geometry(Point, 4326)
            end,
            %(active_year)s,
            %(date_range_label)s,
            %(category)s,
            %(subcategory)s,
            %(layer_group)s,
            %(evidence_type)s,
            %(confidence_level)s,
            %(geographic_level)s,
            %(summary)s,
            %(notes)s,
            %(tags)s::jsonb,
            %(source_ids)s::jsonb,
            %(source_name)s,
            %(source_url)s,
            %(source_updated_at)s,
            %(ingestion_version)s,
            %(metadata)s::jsonb
        )
        on conflict (slug) do update set
            facility_name = coalesce(excluded.facility_name, industrial_sites.facility_name),
            operator_name = coalesce(excluded.operator_name, industrial_sites.operator_name),
            naics_code = coalesce(excluded.naics_code, industrial_sites.naics_code),
            status = coalesce(excluded.status, industrial_sites.status),
            location = coalesce(excluded.location, industrial_sites.location),
            active_year = coalesce(excluded.active_year, industrial_sites.active_year),
            date_range_label = coalesce(excluded.date_range_label, industrial_sites.date_range_label),
            category = coalesce(excluded.category, industrial_sites.category),
            subcategory = coalesce(excluded.subcategory, industrial_sites.subcategory),
            layer_group = coalesce(excluded.layer_group, industrial_sites.layer_group),
            evidence_type = coalesce(excluded.evidence_type, industrial_sites.evidence_type),
            confidence_level = coalesce(excluded.confidence_level, industrial_sites.confidence_level),
            geographic_level = coalesce(excluded.geographic_level, industrial_sites.geographic_level),
            summary = coalesce(excluded.summary, industrial_sites.summary),
            notes = coalesce(excluded.notes, industrial_sites.notes),
            tags = to_jsonb(
                array(
                    select distinct value
                    from jsonb_array_elements_text(
                        coalesce(industrial_sites.tags, '[]'::jsonb) || coalesce(excluded.tags, '[]'::jsonb)
                    ) as value
                    order by value
                )
            ),
            source_ids = to_jsonb(
                array(
                    select distinct value
                    from jsonb_array_elements_text(
                        coalesce(industrial_sites.source_ids, '[]'::jsonb) || coalesce(excluded.source_ids, '[]'::jsonb)
                    ) as value
                    order by value
                )
            ),
            source_name = coalesce(excluded.source_name, industrial_sites.source_name),
            source_url = coalesce(excluded.source_url, industrial_sites.source_url),
            source_updated_at = coalesce(excluded.source_updated_at, industrial_sites.source_updated_at),
            ingestion_version = coalesce(excluded.ingestion_version, industrial_sites.ingestion_version),
            metadata = jsonb_set(
                jsonb_set(
                    coalesce(industrial_sites.metadata, '{}'::jsonb) || coalesce(excluded.metadata, '{}'::jsonb),
                    '{signalFamilies}',
                    to_jsonb(
                        array(
                            select distinct value
                            from jsonb_array_elements_text(
                                coalesce(industrial_sites.metadata->'signalFamilies', '[]'::jsonb) ||
                                coalesce(excluded.metadata->'signalFamilies', '[]'::jsonb)
                            ) as value
                            order by value
                        )
                    ),
                    true
                ),
                '{chemicalMarkers}',
                to_jsonb(
                    array(
                        select distinct value
                        from jsonb_array_elements_text(
                            coalesce(industrial_sites.metadata->'chemicalMarkers', '[]'::jsonb) ||
                            coalesce(excluded.metadata->'chemicalMarkers', '[]'::jsonb)
                        ) as value
                        order by value
                    )
                ),
                true
            ),
            updated_at = now();
    """

    with _connect() as connection, connection.cursor() as cursor:
        cursor.executemany(statement, [_serialize_common_payload(record) for record in records])
        connection.commit()

    return len(records)


def replace_toxic_release_records(rows: Iterable[dict], reporting_year: int | None = None) -> int:
    records = list(rows)
    if not records:
        return 0

    statement = """
        insert into toxic_release_records (
            site_id,
            record_title,
            chemical_name,
            cas_number,
            reporting_year,
            quantity_kg,
            release_medium,
            category,
            subcategory,
            layer_group,
            evidence_type,
            confidence_level,
            geographic_level,
            summary,
            notes,
            tags,
            source_ids,
            source_name,
            source_url,
            source_updated_at,
            ingestion_version,
            metadata
        )
        values (
            (select id from industrial_sites where slug = %(site_slug)s),
            %(record_title)s,
            %(chemical_name)s,
            %(cas_number)s,
            %(reporting_year)s,
            %(quantity_kg)s,
            %(release_medium)s,
            %(category)s,
            %(subcategory)s,
            %(layer_group)s,
            %(evidence_type)s,
            %(confidence_level)s,
            %(geographic_level)s,
            %(summary)s,
            %(notes)s,
            %(tags)s::jsonb,
            %(source_ids)s::jsonb,
            %(source_name)s,
            %(source_url)s,
            %(source_updated_at)s,
            %(ingestion_version)s,
            %(metadata)s::jsonb
        );
    """

    with _connect() as connection, connection.cursor() as cursor:
        if reporting_year is not None:
            cursor.execute("delete from toxic_release_records where reporting_year = %s", (reporting_year,))

        cursor.executemany(statement, [_serialize_common_payload(record) for record in records])
        connection.commit()

    return len(records)


def load_health_concern_context(rows: Iterable[dict]) -> int:
    records = list(rows)
    if not records:
        return 0

    statement = """
        insert into health_concern_context (
            slug,
            title,
            concern_type,
            narrative,
            is_verified,
            category,
            subcategory,
            layer_group,
            evidence_type,
            confidence_level,
            geographic_level,
            summary,
            notes,
            tags,
            source_ids,
            source_name,
            source_url,
            source_updated_at,
            ingestion_version,
            metadata
        )
        values (
            %(slug)s,
            %(title)s,
            %(concern_type)s,
            %(narrative)s,
            %(is_verified)s,
            %(category)s,
            %(subcategory)s,
            %(layer_group)s,
            %(evidence_type)s,
            %(confidence_level)s,
            %(geographic_level)s,
            %(summary)s,
            %(notes)s,
            %(tags)s::jsonb,
            %(source_ids)s::jsonb,
            %(source_name)s,
            %(source_url)s,
            %(source_updated_at)s,
            %(ingestion_version)s,
            %(metadata)s::jsonb
        )
        on conflict (slug) do update set
            title = excluded.title,
            concern_type = excluded.concern_type,
            narrative = excluded.narrative,
            is_verified = excluded.is_verified,
            category = excluded.category,
            subcategory = excluded.subcategory,
            layer_group = excluded.layer_group,
            evidence_type = excluded.evidence_type,
            confidence_level = excluded.confidence_level,
            geographic_level = excluded.geographic_level,
            summary = excluded.summary,
            notes = excluded.notes,
            tags = excluded.tags,
            source_ids = excluded.source_ids,
            source_name = excluded.source_name,
            source_url = excluded.source_url,
            source_updated_at = excluded.source_updated_at,
            ingestion_version = excluded.ingestion_version,
            metadata = excluded.metadata,
            updated_at = now();
    """

    with _connect() as connection, connection.cursor() as cursor:
        cursor.executemany(statement, [_serialize_common_payload(record) for record in records])
        connection.commit()

    return len(records)


def load_pfas_sites(rows: Iterable[dict]) -> int:
    records = list(rows)
    if not records:
        return 0

    statement = """
        insert into pfas_sites (
            slug,
            site_name,
            site_subtype,
            sampling_matrix,
            concentration_ppt,
            observed_year,
            location,
            category,
            subcategory,
            layer_group,
            evidence_type,
            confidence_level,
            geographic_level,
            summary,
            notes,
            tags,
            source_ids,
            source_name,
            source_url,
            source_updated_at,
            ingestion_version,
            metadata
        )
        values (
            %(slug)s,
            %(site_name)s,
            %(site_subtype)s,
            %(sampling_matrix)s,
            %(concentration_ppt)s,
            %(observed_year)s,
            case
                when %(longitude)s::double precision is not null
                    and %(latitude)s::double precision is not null
                then ST_SetSRID(
                    ST_Point(
                        %(longitude)s::double precision,
                        %(latitude)s::double precision
                    ),
                    4326
                )
                else null::geometry(Point, 4326)
            end,
            %(category)s,
            %(subcategory)s,
            %(layer_group)s,
            %(evidence_type)s,
            %(confidence_level)s,
            %(geographic_level)s,
            %(summary)s,
            %(notes)s,
            %(tags)s::jsonb,
            %(source_ids)s::jsonb,
            %(source_name)s,
            %(source_url)s,
            %(source_updated_at)s,
            %(ingestion_version)s,
            %(metadata)s::jsonb
        )
        on conflict (slug) do update set
            site_name = excluded.site_name,
            site_subtype = excluded.site_subtype,
            sampling_matrix = excluded.sampling_matrix,
            concentration_ppt = excluded.concentration_ppt,
            observed_year = excluded.observed_year,
            location = coalesce(excluded.location, pfas_sites.location),
            category = excluded.category,
            subcategory = excluded.subcategory,
            layer_group = excluded.layer_group,
            evidence_type = excluded.evidence_type,
            confidence_level = excluded.confidence_level,
            geographic_level = excluded.geographic_level,
            summary = excluded.summary,
            notes = excluded.notes,
            tags = excluded.tags,
            source_ids = excluded.source_ids,
            source_name = excluded.source_name,
            source_url = excluded.source_url,
            source_updated_at = excluded.source_updated_at,
            ingestion_version = excluded.ingestion_version,
            metadata = excluded.metadata,
            updated_at = now();
    """

    with _connect() as connection, connection.cursor() as cursor:
        cursor.executemany(statement, [_serialize_common_payload(record) for record in records])
        connection.commit()

    return len(records)


def load_wastewater_sites(rows: Iterable[dict]) -> int:
    records = list(rows)
    if not records:
        return 0

    statement = """
        insert into wastewater_sites (
            slug,
            facility_name,
            permit_id,
            discharge_type,
            flow_mgd,
            outfall_location,
            observed_year,
            category,
            subcategory,
            layer_group,
            evidence_type,
            confidence_level,
            geographic_level,
            summary,
            notes,
            tags,
            source_ids,
            source_name,
            source_url,
            source_updated_at,
            ingestion_version,
            metadata
        )
        values (
            %(slug)s,
            %(facility_name)s,
            %(permit_id)s,
            %(discharge_type)s,
            %(flow_mgd)s,
            case
                when %(longitude)s is not null and %(latitude)s is not null
                then ST_SetSRID(ST_Point(%(longitude)s, %(latitude)s), 4326)
                else null
            end,
            %(observed_year)s,
            %(category)s,
            %(subcategory)s,
            %(layer_group)s,
            %(evidence_type)s,
            %(confidence_level)s,
            %(geographic_level)s,
            %(summary)s,
            %(notes)s,
            %(tags)s::jsonb,
            %(source_ids)s::jsonb,
            %(source_name)s,
            %(source_url)s,
            %(source_updated_at)s,
            %(ingestion_version)s,
            %(metadata)s::jsonb
        )
        on conflict (slug) do update set
            facility_name = excluded.facility_name,
            permit_id = excluded.permit_id,
            discharge_type = excluded.discharge_type,
            flow_mgd = excluded.flow_mgd,
            outfall_location = coalesce(excluded.outfall_location, wastewater_sites.outfall_location),
            observed_year = excluded.observed_year,
            category = excluded.category,
            subcategory = excluded.subcategory,
            layer_group = excluded.layer_group,
            evidence_type = excluded.evidence_type,
            confidence_level = excluded.confidence_level,
            geographic_level = excluded.geographic_level,
            summary = excluded.summary,
            notes = excluded.notes,
            tags = excluded.tags,
            source_ids = excluded.source_ids,
            source_name = excluded.source_name,
            source_url = excluded.source_url,
            source_updated_at = excluded.source_updated_at,
            ingestion_version = excluded.ingestion_version,
            metadata = excluded.metadata,
            updated_at = now();
    """

    with _connect() as connection, connection.cursor() as cursor:
        cursor.executemany(statement, [_serialize_common_payload(record) for record in records])
        connection.commit()

    return len(records)


def replace_power_plants(rows: Iterable[dict]) -> int:
    records = list(rows)

    statement = """
        insert into power_plants (
            slug,
            plant_name,
            fuel_type,
            capacity_mw,
            permit_status,
            location,
            active_year,
            category,
            subcategory,
            layer_group,
            evidence_type,
            confidence_level,
            geographic_level,
            summary,
            notes,
            tags,
            source_ids,
            source_name,
            source_url,
            source_updated_at,
            ingestion_version,
            metadata
        )
        values (
            %(slug)s,
            %(plant_name)s,
            %(fuel_type)s,
            %(capacity_mw)s,
            %(permit_status)s,
            case
                when %(longitude)s::double precision is not null
                    and %(latitude)s::double precision is not null
                then ST_SetSRID(
                    ST_Point(
                        %(longitude)s::double precision,
                        %(latitude)s::double precision
                    ),
                    4326
                )
                else null::geometry(Point, 4326)
            end,
            %(active_year)s,
            %(category)s,
            %(subcategory)s,
            %(layer_group)s,
            %(evidence_type)s,
            %(confidence_level)s,
            %(geographic_level)s,
            %(summary)s,
            %(notes)s,
            %(tags)s::jsonb,
            %(source_ids)s::jsonb,
            %(source_name)s,
            %(source_url)s,
            %(source_updated_at)s,
            %(ingestion_version)s,
            %(metadata)s::jsonb
        )
        on conflict (slug) do update set
            plant_name = excluded.plant_name,
            fuel_type = excluded.fuel_type,
            capacity_mw = excluded.capacity_mw,
            permit_status = excluded.permit_status,
            location = coalesce(excluded.location, power_plants.location),
            active_year = excluded.active_year,
            category = excluded.category,
            subcategory = excluded.subcategory,
            layer_group = excluded.layer_group,
            evidence_type = excluded.evidence_type,
            confidence_level = excluded.confidence_level,
            geographic_level = excluded.geographic_level,
            summary = excluded.summary,
            notes = excluded.notes,
            tags = excluded.tags,
            source_ids = excluded.source_ids,
            source_name = excluded.source_name,
            source_url = excluded.source_url,
            source_updated_at = excluded.source_updated_at,
            ingestion_version = excluded.ingestion_version,
            metadata = excluded.metadata,
            updated_at = now();
    """

    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("delete from power_plants")
        if records:
            cursor.executemany(statement, [_serialize_common_payload(record) for record in records])
        connection.commit()

    return len(records)


def replace_hazardous_sites(rows: Iterable[dict]) -> int:
    records = list(rows)

    statement = """
        insert into hazardous_sites (
            slug,
            site_name,
            site_class,
            status,
            boundary,
            remediation_year,
            category,
            subcategory,
            layer_group,
            evidence_type,
            confidence_level,
            geographic_level,
            summary,
            notes,
            tags,
            source_ids,
            source_name,
            source_url,
            source_updated_at,
            ingestion_version,
            metadata
        )
        values (
            %(slug)s,
            %(site_name)s,
            %(site_class)s,
            %(status)s,
            case
                when %(longitude)s::double precision is not null
                    and %(latitude)s::double precision is not null
                then ST_SetSRID(
                    ST_Point(
                        %(longitude)s::double precision,
                        %(latitude)s::double precision
                    ),
                    4326
                )
                else null::geometry(Geometry, 4326)
            end,
            %(remediation_year)s,
            %(category)s,
            %(subcategory)s,
            %(layer_group)s,
            %(evidence_type)s,
            %(confidence_level)s,
            %(geographic_level)s,
            %(summary)s,
            %(notes)s,
            %(tags)s::jsonb,
            %(source_ids)s::jsonb,
            %(source_name)s,
            %(source_url)s,
            %(source_updated_at)s,
            %(ingestion_version)s,
            %(metadata)s::jsonb
        )
        on conflict (slug) do update set
            site_name = excluded.site_name,
            site_class = excluded.site_class,
            status = excluded.status,
            boundary = coalesce(excluded.boundary, hazardous_sites.boundary),
            remediation_year = excluded.remediation_year,
            category = excluded.category,
            subcategory = excluded.subcategory,
            layer_group = excluded.layer_group,
            evidence_type = excluded.evidence_type,
            confidence_level = excluded.confidence_level,
            geographic_level = excluded.geographic_level,
            summary = excluded.summary,
            notes = excluded.notes,
            tags = excluded.tags,
            source_ids = excluded.source_ids,
            source_name = excluded.source_name,
            source_url = excluded.source_url,
            source_updated_at = excluded.source_updated_at,
            ingestion_version = excluded.ingestion_version,
            metadata = excluded.metadata,
            updated_at = now();
    """

    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("delete from hazardous_sites")
        if records:
            cursor.executemany(statement, [_serialize_common_payload(record) for record in records])
        connection.commit()

    return len(records)
