"""Offline IP Geolocation service using MaxMind GeoLite2 City.

Specs: PRD 15 §7.1 (T7)
- Zero network lookups. Never contacts an external geocoding/IP API.
- If GeoLite2-City.mmdb is absent, geo fields remain NULL.
- Loopback & private IP ranges resolve strictly to LOCAL (never a fabricated city).
"""

from __future__ import annotations

import contextlib
import ipaddress
import logging
from pathlib import Path
from typing import Any

from app.settings import ROOT_DIR, settings

log = logging.getLogger(__name__)

_reader: Any = None
_reader_loaded: bool = False


def _get_reader(db_path: Path | None = None) -> Any:
    """Lazily load and cache GeoLite2 MMDB reader without network calls."""
    global _reader, _reader_loaded
    if _reader_loaded:
        return _reader

    path = db_path or settings.GEOIP_DB_PATH
    if not path.is_absolute():
        path = ROOT_DIR / path

    if path.exists() and path.is_file():
        try:
            import geoip2.database

            _reader = geoip2.database.Reader(str(path))
            log.info("Loaded offline GeoLite2 database from %s", path)
        except Exception as e:
            log.warning("Failed to initialize GeoLite2 reader from %s: %s", path, e)
            _reader = None
    else:
        _reader = None

    _reader_loaded = True
    return _reader


def is_local_or_private_ip(ip_str: str) -> bool:
    """Check whether an IP address belongs to loopback, private, or link-local ranges."""
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        return bool(ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved)
    except ValueError:
        # Malformed or localhost string
        return ip_str.strip().lower() in ("localhost", "127.0.0.1", "::1", "testclient")


def resolve_ip_location(ip_str: str | None) -> dict[str, str | None]:
    """Resolve geographic location from IP address strictly offline.

    Returns:
        dict with keys: geo_city, geo_region, geo_country.
        - Private/loopback ranges return geo_country='LOCAL', geo_city=None, geo_region=None.
        - Absent database or unresolvable IP returns all None (NULL in DB).

    """
    if not ip_str or not ip_str.strip():
        return {"geo_city": None, "geo_region": None, "geo_country": None}

    cleaned_ip = ip_str.strip()

    # Rule: Private/loopback ranges are tagged geo_country = 'LOCAL' and skipped
    if is_local_or_private_ip(cleaned_ip):
        return {
            "geo_city": None,
            "geo_region": None,
            "geo_country": "LOCAL",
        }

    reader = _get_reader()
    if reader is None:
        # DB absent: degrade gracefully to NULL with zero network calls
        return {"geo_city": None, "geo_region": None, "geo_country": None}

    try:
        response = reader.city(cleaned_ip)
        city = response.city.name
        region = (
            response.subdivisions.most_specific.name
            if response.subdivisions and response.subdivisions.most_specific
            else None
        )
        country = response.country.name or response.country.iso_code
        return {
            "geo_city": city,
            "geo_region": region,
            "geo_country": country,
        }
    except Exception:
        # Address not found in DB or invalid lookup
        return {"geo_city": None, "geo_region": None, "geo_country": None}


def close_reader() -> None:
    """Close GeoLite2 reader cleanly if open."""
    global _reader, _reader_loaded
    if _reader is not None:
        with contextlib.suppress(Exception):
            _reader.close()
        _reader = None
    _reader_loaded = False
