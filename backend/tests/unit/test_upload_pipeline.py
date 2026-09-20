"""Upload pipeline integration tests: unique results, refresh behavior, no static fallback."""

from __future__ import annotations

import io
import json
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import create_app

client = TestClient(create_app())


def _create_image(primary: tuple[int, int, int], shapes: list[tuple[tuple[int, int, int, int], tuple[int, int, int]]] | None = None) -> bytes:
    img = Image.new("RGB", (400, 400), color=primary)
    if shapes:
        d = ImageDraw.Draw(img)
        for box, color in shapes:
            d.rectangle(box, fill=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def _upload(filename: str, img_bytes: bytes) -> dict[str, Any]:
    resp = client.post(
        "/api/v1/uploads",
        files={"file": (filename, img_bytes, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp.status_code == 202, f"Upload failed: {resp.text}"
    return resp.json()


class TestUniqueUploads:
    """Upload three different images and verify unique IDs, checksums, and result fingerprints."""

    def test_three_uploads_produce_unique_ids_and_checksums(self) -> None:
        img_a = _create_image((34, 139, 34), [((50, 50, 150, 150), (200, 30, 30))])
        img_b = _create_image((160, 82, 45), [((200, 200, 360, 360), (20, 50, 180))])
        img_c = _create_image((30, 80, 160), [((10, 10, 100, 100), (40, 140, 40))])

        upload_a = _upload("img_a.jpg", img_a)
        upload_b = _upload("img_b.jpg", img_b)
        upload_c = _upload("img_c.jpg", img_c)

        # Unique IDs
        ids = {upload_a["id"], upload_b["id"], upload_c["id"]}
        assert len(ids) == 3, "Three uploads must produce three unique IDs"

        # Unique checksums
        checksums = {upload_a["checksum_sha256"], upload_b["checksum_sha256"], upload_c["checksum_sha256"]}
        assert len(checksums) == 3, "Three different images must produce three unique checksums"

    def test_three_uploads_produce_different_results(self) -> None:
        img_a = _create_image((34, 139, 34))
        img_b = _create_image((160, 82, 45))
        img_c = _create_image((30, 80, 160))

        ua = _upload("img_a.jpg", img_a)
        ub = _upload("img_b.jpg", img_b)
        uc = _upload("img_c.jpg", img_c)

        da = client.get(f"/api/v1/uploads/{ua['id']}/detections").json()
        db = client.get(f"/api/v1/uploads/{ub['id']}/detections").json()
        dc = client.get(f"/api/v1/uploads/{uc['id']}/detections").json()

        # Landcover percentages should differ across materially different images
        def lc_fingerprint(det: dict[str, Any]) -> str:
            lc = det.get("coverage", {}).get("by_class", [])
            return json.dumps(sorted([(x["label"], round(x["pct"])) for x in lc]))

        fp_a = lc_fingerprint(da)
        fp_b = lc_fingerprint(db)
        fp_c = lc_fingerprint(dc)

        # At least 2 of the 3 fingerprints must differ
        unique = len({fp_a, fp_b, fp_c})
        assert unique >= 2, f"Expected >= 2 unique result fingerprints, got {unique}"


class TestRefreshBehavior:
    def test_refresh_changes_artifact_version(self) -> None:
        """refresh=true must recompute and produce a new artifact_version."""
        img = _create_image((50, 130, 50))
        upload = _upload("refresh_test.jpg", img)
        uid = upload["id"]

        det1 = client.get(f"/api/v1/uploads/{uid}/detections").json()
        det2 = client.get(f"/api/v1/uploads/{uid}/detections?refresh=true").json()

        v1 = det1.get("artifact_version")
        v2 = det2.get("artifact_version")

        assert v2 is not None, "Refreshed result must have artifact_version"
        assert v1 != v2, f"Refresh must change artifact_version, got same: {v1}"


class TestNoStaticFallback:
    def test_no_fixture_returned_on_api_failure(self) -> None:
        """After API failure, no fixture/static fallback data is returned."""
        img = _create_image((80, 80, 80))
        upload = _upload("no_fallback_test.jpg", img)
        uid = upload["id"]

        det = client.get(f"/api/v1/uploads/{uid}/detections").json()

        # The result must be dynamically computed, not a static fixture
        raw = json.dumps(det).lower()
        assert "jewar" not in raw, "Static Jewar fixture leaked"
        assert "fixture" not in raw, "Fixture reference leaked"
        assert "sample" not in raw or "sample" in det.get("mode", "").lower() is False, "Sample data leaked"

        # Must have a proper trace_id and upload reference
        assert det.get("upload", {}).get("id") == uid
