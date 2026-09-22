"""Guest Session management service for Chakshu.

Specs: PRD 14 §1, §2, §5, §6 (S1, S2, S5, S6), PRD 15 §7.2
- Generates 32 random byte base64url tokens (43 chars).
- Stored as SHA-256 binary hash; plain token is NEVER stored in database.
- GUEST-XXXX label derived from first 4 hex digits of session UUID.
- IP HMAC-hashing: hmac_sha256(SERVER_SECRET, ip)[:16]; raw IP is never stored.
- Supports both Postgres persistence (via psycopg) and in-memory fallback.
- Guarantees token_hash and ip_hash are never present in API responses.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import uuid
from base64 import urlsafe_b64encode
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlparse

from app.services.geo_service import resolve_ip_location
from app.services.ua_service import parse_user_agent
from app.settings import settings

log = logging.getLogger(__name__)

SID_COOKIE_NAME = "sid"
GUEST_MAX_AGE_DAYS = 30
TOKEN_BYTES = 32

# In-memory session store (fast lookup & offline/no-DB fallback)
_in_memory_sessions: dict[str, dict[str, Any]] = {}


def generate_token() -> str:
    """Generate a 32-byte cryptographically secure random token as base64url (43 chars)."""
    return urlsafe_b64encode(secrets.token_bytes(TOKEN_BYTES)).decode("ascii").rstrip("=")


def hash_token(token: str) -> bytes:
    """Compute SHA-256 hash of token — only the hash is stored, never plain token."""
    return hashlib.sha256(token.encode("ascii")).digest()


def hash_ip(client_ip: str | None) -> bytes | None:
    """Compute 16-byte HMAC-SHA256 hash of client IP using SERVER_SECRET."""
    if not client_ip:
        return None
    secret = settings.SERVER_SECRET.encode("utf-8")
    return hmac.new(secret, client_ip.strip().encode("utf-8"), hashlib.sha256).digest()[:16]


def format_guest_label(session_id: uuid.UUID) -> str:
    """Generate the GUEST-XXXX public label from first 4 hex of session UUID."""
    return f"GUEST-{session_id.hex[:4].upper()}"


def clean_referrer(referrer: str | None) -> str | None:
    """Extract host only from referrer URL, stripping query parameters and paths."""
    if not referrer:
        return None
    try:
        parsed = urlparse(referrer)
        return parsed.netloc or None
    except Exception:
        return None


def create_guest_session(
    *,
    client_ip: str | None = None,
    user_agent: str | None = None,
    referrer: str | None = None,
    first_path: str = "/",
    screen: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Create a new anonymous guest session.

    Returns:
        tuple of (raw_token, session_dict)

    """
    token = generate_token()
    token_h = hash_token(token)
    session_id = uuid.uuid4()
    now = datetime.now(UTC)
    expires_at = now + timedelta(days=GUEST_MAX_AGE_DAYS)
    label = format_guest_label(session_id)

    # GeoIP resolution (offline only, loopback resolves to LOCAL)
    geo = resolve_ip_location(client_ip)
    ua = parse_user_agent(user_agent)
    ip_h = hash_ip(client_ip)
    ref_host = clean_referrer(referrer)

    session_record: dict[str, Any] = {
        "id": str(session_id),
        "token_hash": token_h,
        "user_id": None,
        "role": "guest",
        "label": label,
        "created_at": now,
        "last_seen_at": now,
        "expires_at": expires_at,
        "admin_since": None,
        "revoked_at": None,
        "first_path": first_path[:256] if first_path else "/",
        "referrer_host": ref_host[:256] if ref_host else None,
        "ua_raw": ua["ua_raw"],
        "ua_device": ua["ua_device"],
        "ua_browser": ua["ua_browser"],
        "ua_os": ua["ua_os"],
        "screen": screen[:32] if screen else None,
        "ip_hash": ip_h,
        "geo_city": geo["geo_city"],
        "geo_region": geo["geo_region"],
        "geo_country": geo["geo_country"],
    }

    # Store in memory cache
    _in_memory_sessions[token] = session_record

    # Persist to database if available
    db_url = getattr(settings, "DATABASE_URL", None)
    if db_url and not settings.OFFLINE:
        try:
            import psycopg

            with psycopg.connect(db_url, connect_timeout=2) as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO session (
                        id, token_hash, user_id, role, label,
                        created_at, last_seen_at, expires_at, first_path,
                        referrer_host, ua_raw, ua_device, ua_browser, ua_os,
                        screen, ip_hash, geo_city, geo_region, geo_country
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    ) ON CONFLICT (token_hash) DO NOTHING;
                    """,
                    (
                        session_record["id"],
                        session_record["token_hash"],
                        session_record["user_id"],
                        session_record["role"],
                        session_record["label"],
                        session_record["created_at"],
                        session_record["last_seen_at"],
                        session_record["expires_at"],
                        session_record["first_path"],
                        session_record["referrer_host"],
                        session_record["ua_raw"],
                        session_record["ua_device"],
                        session_record["ua_browser"],
                        session_record["ua_os"],
                        session_record["screen"],
                        session_record["ip_hash"],
                        session_record["geo_city"],
                        session_record["geo_region"],
                        session_record["geo_country"],
                    ),
                )
                conn.commit()
        except Exception as e:
            log.debug("Session DB insertion skipped/failed (fallback to memory): %s", e)

    return token, session_record


def resolve_session_by_token(token: str | None) -> dict[str, Any] | None:
    """Resolve session from token, updating last_seen timestamp."""
    if not token or not token.strip():
        return None

    cleaned_token = token.strip()

    # Fast memory cache hit
    if cleaned_token in _in_memory_sessions:
        session = _in_memory_sessions[cleaned_token]
        session["last_seen_at"] = datetime.now(UTC)
        return session

    # Query database by token_hash
    db_url = getattr(settings, "DATABASE_URL", None)
    if db_url and not settings.OFFLINE:
        try:
            import psycopg

            token_h = hash_token(cleaned_token)
            with psycopg.connect(db_url, connect_timeout=2) as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, token_hash, user_id, role, label, created_at,
                           last_seen_at, expires_at, admin_since, revoked_at,
                           first_path, referrer_host, ua_raw, ua_device, ua_browser,
                           ua_os, screen, ip_hash, geo_city, geo_region, geo_country
                    FROM session
                    WHERE token_hash = %s AND revoked_at IS NULL AND expires_at > now();
                    """,
                    (token_h,),
                )
                row = cur.fetchone()
                if row:
                    now = datetime.now(UTC)
                    session = {
                        "id": str(row[0]),
                        "token_hash": row[1],
                        "user_id": str(row[2]) if row[2] else None,
                        "role": row[3],
                        "label": row[4],
                        "created_at": row[5],
                        "last_seen_at": now,
                        "expires_at": row[7],
                        "admin_since": row[8],
                        "revoked_at": row[9],
                        "first_path": row[10],
                        "referrer_host": row[11],
                        "ua_raw": row[12],
                        "ua_device": row[13],
                        "ua_browser": row[14],
                        "ua_os": row[15],
                        "screen": row[16],
                        "ip_hash": row[17],
                        "geo_city": row[18],
                        "geo_region": row[19],
                        "geo_country": row[20],
                    }
                    _in_memory_sessions[cleaned_token] = session
                    # Update last_seen_at
                    cur.execute(
                        "UPDATE session SET last_seen_at = %s WHERE id = %s;",
                        (now, row[0]),
                    )
                    conn.commit()
                    return session
        except Exception as e:
            log.debug("Session DB lookup failed (falling back): %s", e)

    return None


def get_public_session_envelope(
    session_data: dict[str, Any], event_count: int = 0
) -> dict[str, Any]:
    """Format public Session object for frontend per PRD 14 §6.

    Strict security invariant: NEVER contains token_hash or ip_hash.
    """
    created = session_data.get("created_at")
    last_seen = session_data.get("last_seen_at")

    created_iso = (
        created.isoformat()
        if isinstance(created, datetime)
        else str(created or datetime.now(UTC).isoformat())
    )
    last_seen_iso = (
        last_seen.isoformat()
        if isinstance(last_seen, datetime)
        else str(last_seen or datetime.now(UTC).isoformat())
    )

    return {
        "id": str(session_data["id"]),
        "public_label": session_data.get("label", "GUEST"),
        "kind": "user" if session_data.get("user_id") else "guest",
        "role": session_data.get("role", "guest"),
        "user": None,  # Stage A anonymous-only: no app_user
        "created_at": created_iso,
        "last_seen_at": last_seen_iso,
        "counts": {
            "events": event_count,
            "decisions": 0,
            "uploads": 0,
        },
    }
