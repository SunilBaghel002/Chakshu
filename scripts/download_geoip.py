"""Offline GeoLite2 database download helper.

Specs: PRD 15 §7.1
- Downloads GeoLite2-City.tar.gz using MaxMind credentials in .env.
- Extracts GeoLite2-City.mmdb into data/geoip/.
- Never called at runtime or during evaluation.
"""

from __future__ import annotations

import os
import sys
import tarfile
from io import BytesIO
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GEOIP_DIR = REPO_ROOT / "data" / "geoip"
MMDB_FILE = GEOIP_DIR / "GeoLite2-City.mmdb"


def download_geoip() -> int:
    """Download and extract GeoLite2-City.mmdb into data/geoip/."""
    account_id = os.environ.get("MAXMIND_ACCOUNT_ID")
    license_key = os.environ.get("MAXMIND_LICENSE_KEY")

    if not account_id or not license_key:
        print(
            "INFO: MAXMIND_ACCOUNT_ID or MAXMIND_LICENSE_KEY not set in environment or .env.\n"
            "Chakshu runs 100% offline without it; loopback/local IPs resolve to 'LOCAL' and\n"
            "missing DB returns NULL with zero network calls.\n"
            "To download the database:\n"
            "1. Register at https://www.maxmind.com for a free GeoLite2 account.\n"
            "2. Set MAXMIND_ACCOUNT_ID and MAXMIND_LICENSE_KEY in .env.\n"
            "3. Re-run this script.",
            file=sys.stderr,
        )
        return 0

    GEOIP_DIR.mkdir(parents=True, exist_ok=True)
    download_url = (
        "https://download.maxmind.com/app/geoip_download"
        f"?edition_id=GeoLite2-City&license_key={license_key}&suffix=tar.gz"
    )

    print("Connecting to MaxMind to fetch GeoLite2-City archive...")
    try:
        import httpx

        auth = (account_id, license_key)
        with httpx.Client(timeout=60.0) as client:
            resp = client.get(download_url, auth=auth, follow_redirects=True)
            resp.raise_for_status()

            with tarfile.open(fileobj=BytesIO(resp.content), mode="r:gz") as tar:
                for member in tar.getmembers():
                    if member.name.endswith(".mmdb"):
                        mmdb_bytes = tar.extractfile(member)
                        if mmdb_bytes:
                            MMDB_FILE.write_bytes(mmdb_bytes.read())
                            print(f"SUCCESS: Extracted {MMDB_FILE.name} to {GEOIP_DIR}")
                            return 0

        print("ERROR: GeoLite2-City.mmdb not found inside the archive.", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERROR: Failed to download GeoLite2 database: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(download_geoip())
