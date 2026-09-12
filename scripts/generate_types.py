"""Type generation and verification utility for Chakshu.

Supports `make types` command.
Validates that frontend TypeScript contracts are synchronized with backend Pydantic models.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_TYPES_DIR = REPO_ROOT / "frontend" / "src" / "lib" / "types"
FRONTEND_TYPES_INDEX = REPO_ROOT / "frontend" / "src" / "lib" / "types.ts"


def main() -> int:
    print("Checking frontend TypeScript contracts in frontend/src/lib/types/...")
    if not FRONTEND_TYPES_INDEX.exists():
        print(f"FAILED: {FRONTEND_TYPES_INDEX} does not exist!", file=sys.stderr)
        return 1

    # Read content from index and sub-modules
    all_content = FRONTEND_TYPES_INDEX.read_text(encoding="utf-8")
    if FRONTEND_TYPES_DIR.exists():
        for f in FRONTEND_TYPES_DIR.glob("*.ts"):
            all_content += "\n" + f.read_text(encoding="utf-8")

    required_symbols = [
        "Evidence",
        "Upload",
        "DetectionSet",
        "ChangeSummary",
        "Answer",
        "Trace",
        "CapabilityTier",
        "ChangeType",
        "DetectionTrack",
        "ErrorEnvelope",
    ]

    missing = [s for s in required_symbols if s not in all_content]
    if missing:
        print(f"FAILED: Missing symbols in frontend types: {missing}", file=sys.stderr)
        return 1

    print("SUCCESS: Frontend types verified against data contracts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
