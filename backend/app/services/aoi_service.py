"""Area of Interest (AOI) management service (Task 1.7, PRD 3 §A1).

Capabilities:
1. Retrieval and creation of AOIs with automated UTM EPSG zone derivation.
2. PostgreSQL/PostGIS persistence with seamless offline fallback to fixture storage.
"""

from __future__ import annotations

import datetime
import json
import logging
import uuid
from pathlib import Path
from typing import Any

from app.exceptions import NotFoundError
from app.schemas.aoi import Aoi, AoiCreate
from app.settings import settings

log = logging.getLogger(__name__)


def derive_utm_epsg(geom: dict[str, Any]) -> int:
    """Derive UTM EPSG code from polygon centroid coordinates."""
    coords: list[list[float]] = []
    try:
        gtype = geom.get("type", "")
        if gtype == "Polygon":
            coords = geom.get("coordinates", [[]])[0]
        elif gtype == "MultiPolygon":
            coords = geom.get("coordinates", [[[]]])[0][0]
    except Exception:
        coords = []

    if not coords:
        return 32643  # Default to UTM 43N (Northern India)

    avg_lon = sum(pt[0] for pt in coords) / len(coords)
    avg_lat = sum(pt[1] for pt in coords) / len(coords)

    zone = int((avg_lon + 180) / 6) + 1
    return (32600 + zone) if avg_lat >= 0 else (32700 + zone)


class AoiService:
    """Service orchestrating Area of Interest persistence and retrieval."""

    def __init__(self, data_dir: Path | str = "data") -> None:
        """Initialize AOI service with data path for local caching."""
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.local_file = self.data_dir / "aoi_custom.json"
        self._fixture_path = (
            Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures" / "aoi.json"
        )

    def _load_local_aois(self) -> dict[str, Aoi]:
        """Load fixture AOIs combined with custom created AOIs."""
        aois: dict[str, Aoi] = {}

        # 1. Load fixtures
        if self._fixture_path.exists():
            try:
                with self._fixture_path.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        aois[item["id"]] = Aoi(**item)
            except Exception as e:
                log.warning("Could not read fixture AOIs: %s", e)

        # 2. Overlay custom local storage
        if self.local_file.exists():
            try:
                with self.local_file.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        aois[item["id"]] = Aoi(**item)
            except Exception as e:
                log.warning("Could not read custom local AOIs: %s", e)

        return aois

    def _save_local_aoi(self, aoi: Aoi) -> None:
        """Append a newly created AOI to local storage."""
        aois = self._load_local_aois()
        aois[aoi.id] = aoi
        try:
            with self.local_file.open("w", encoding="utf-8") as f:
                json.dump([a.model_dump() for a in aois.values()], f, indent=2)
        except Exception as e:
            log.warning("Could not persist AOI to local storage: %s", e)

    def list_aois(self) -> list[Aoi]:
        """Retrieve all known AOIs."""
        url = settings.DATABASE_URL
        if url and not settings.OFFLINE:
            try:
                import psycopg

                with psycopg.connect(url, connect_timeout=3) as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, name, ST_AsGeoJSON(geom) as geom_str, utm_epsg,
                               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                        FROM aoi ORDER BY created_at DESC;
                        """
                    )
                    rows = cur.fetchall()
                    if rows:
                        results: list[Aoi] = []
                        for r in rows:
                            results.append(
                                Aoi(
                                    id=str(r[0]),
                                    name=r[1],
                                    geom=json.loads(r[2]),
                                    utm_epsg=r[3],
                                    created_at=r[4],
                                )
                            )
                        return results
            except Exception as exc:
                log.info("Database unavailable (%s); using local/fixture AOIs", exc)

        return list(self._load_local_aois().values())

    def get_aoi(self, aoi_id: str) -> Aoi:
        """Retrieve a specific AOI by UUID."""
        url = settings.DATABASE_URL
        if url and not settings.OFFLINE:
            try:
                import psycopg

                with psycopg.connect(url, connect_timeout=3) as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, name, ST_AsGeoJSON(geom) as geom_str, utm_epsg,
                               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                        FROM aoi WHERE id = %s;
                        """,
                        (aoi_id,),
                    )
                    row = cur.fetchone()
                    if row:
                        return Aoi(
                            id=str(row[0]),
                            name=row[1],
                            geom=json.loads(row[2]),
                            utm_epsg=row[3],
                            created_at=row[4],
                        )
            except Exception as exc:
                log.info("Database unavailable (%s); using local/fixture AOIs", exc)

        aois = self._load_local_aois()
        if aoi_id in aois:
            return aois[aoi_id]

        raise NotFoundError(f"Area of Interest '{aoi_id}' not found.")

    def create_aoi(self, aoi_in: AoiCreate) -> Aoi:
        """Create and persist a new Area of Interest."""
        aoi_id = str(uuid.uuid4())
        utm_epsg = aoi_in.utm_epsg or derive_utm_epsg(aoi_in.geom)
        created_at = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

        aoi = Aoi(
            id=aoi_id,
            name=aoi_in.name,
            geom=aoi_in.geom,
            utm_epsg=utm_epsg,
            created_at=created_at,
        )

        url = settings.DATABASE_URL
        if url and not settings.OFFLINE:
            try:
                import psycopg

                with psycopg.connect(url, connect_timeout=3) as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO aoi (id, name, geom, utm_epsg)
                        VALUES (%s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s);
                        """,
                        (aoi_id, aoi.name, json.dumps(aoi.geom), utm_epsg),
                    )
                    conn.commit()
            except Exception as exc:
                log.info("Database insert failed (%s); storing locally", exc)

        self._save_local_aoi(aoi)
        return aoi


# Process-wide service instance
aoi_service = AoiService()
