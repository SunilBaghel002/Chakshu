"""Static detection path scanner: fail on fixture imports, demo fallback, or hardcoded results."""

from __future__ import annotations

import ast
import re
from pathlib import Path

# Production detection-path modules to scan
BACKEND_PRODUCTION_MODULES = [
    "adapters/gemini.py",
    "adapters/gemini_prompt.py",
    "adapters/worldcover.py",
    "services/detection.py",
    "services/annotate.py",
    "services/cv_detector.py",
    "domain/landcover.py",
    "domain/bbox.py",
    "api/uploads.py",
]

FRONTEND_UPLOAD_FILES = [
    "lib/api.ts",
    "components/UploadModal.tsx",
    "components/UploadStart.tsx",
    "App.tsx",
]


def _backend_app_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "app"


def _frontend_src_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "frontend" / "src"


class TestBackendNoStaticData:
    def test_no_fixture_imports_in_production_modules(self) -> None:
        """Production detection modules must not import fixture/demo data."""
        app_dir = _backend_app_dir()
        violations: list[str] = []

        for rel_path in BACKEND_PRODUCTION_MODULES:
            full = app_dir / rel_path
            if not full.exists():
                continue
            text = full.read_text(encoding="utf-8", errors="ignore")
            lower = text.lower()

            if "fixture" in lower and "import" in lower:
                # Check for actual fixture imports (not comments about them)
                for line_no, line in enumerate(text.splitlines(), 1):
                    stripped = line.strip()
                    if stripped.startswith("#") or stripped.startswith('"""') or stripped.startswith("'''"):
                        continue
                    if "import" in line.lower() and "fixture" in line.lower():
                        violations.append(f"{rel_path}:{line_no}: fixture import")

        assert not violations, f"Fixture imports in production modules: {violations}"

    def test_no_demo_mock_fallback_in_detection_path(self) -> None:
        """No demo/mock fallback behavior in detection path modules."""
        app_dir = _backend_app_dir()
        violations: list[str] = []

        forbidden_patterns = [
            r"demo_detection",
            r"mock_detection",
            r"sample_detection",
            r"static_detection",
            r"fallback_detection.*=.*\[",  # fallback_detection = [...]
            r"canned_.*=\s*[\"']",  # canned_ variables with string values
        ]

        for rel_path in BACKEND_PRODUCTION_MODULES:
            full = app_dir / rel_path
            if not full.exists():
                continue
            text = full.read_text(encoding="utf-8", errors="ignore")
            for line_no, line in enumerate(text.splitlines(), 1):
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                for pattern in forbidden_patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        violations.append(f"{rel_path}:{line_no}: matches '{pattern}'")

        assert not violations, f"Demo/mock fallback in production: {violations}"

    def test_no_coordinate_seeded_landcover(self) -> None:
        """WorldCover adapter must not generate landcover from coordinates."""
        wc = _backend_app_dir() / "adapters" / "worldcover.py"
        if not wc.exists():
            return
        text = wc.read_text(encoding="utf-8", errors="ignore")
        lower = text.lower()

        # Must not contain coordinate-based generation patterns
        assert "np.random" not in lower, "WorldCover uses random generation"
        assert "seed" not in lower or "# seed" in lower, "WorldCover uses coordinate seeding"
        assert "deterministic" not in lower or "no" in lower, "WorldCover has deterministic generation"

    def test_no_jewar_specific_output(self) -> None:
        """No Jewar, airport, or site-specific output in production detection modules."""
        app_dir = _backend_app_dir()
        violations: list[str] = []

        for rel_path in BACKEND_PRODUCTION_MODULES:
            full = app_dir / rel_path
            if not full.exists():
                continue
            text = full.read_text(encoding="utf-8", errors="ignore")
            lower = text.lower()

            for term in ["jewar", "noida", "san diego", "qualcomm", "bhadla"]:
                if term in lower:
                    # Exclude comments
                    for line_no, line in enumerate(text.splitlines(), 1):
                        stripped = line.strip()
                        if stripped.startswith("#") or stripped.startswith('"""'):
                            continue
                        if term in line.lower():
                            violations.append(f"{rel_path}:{line_no}: contains '{term}'")

        assert not violations, f"Site-specific content in production modules: {violations}"

    def test_no_hardcoded_detection_results(self) -> None:
        """Production modules must not contain hardcoded detection result arrays."""
        app_dir = _backend_app_dir()
        violations: list[str] = []

        # Patterns that indicate hardcoded detection results
        patterns = [
            r'"label":\s*"building".*"bbox"',  # Hardcoded detection with bbox
            r'"label":\s*"aircraft".*"bbox"',
            r'"label":\s*"vehicle".*"bbox"',
        ]

        for rel_path in BACKEND_PRODUCTION_MODULES:
            full = app_dir / rel_path
            if not full.exists():
                continue
            text = full.read_text(encoding="utf-8", errors="ignore")
            for line_no, line in enumerate(text.splitlines(), 1):
                stripped = line.strip()
                if stripped.startswith("#") or stripped.startswith('"""'):
                    continue
                for pattern in patterns:
                    if re.search(pattern, line):
                        violations.append(f"{rel_path}:{line_no}: hardcoded detection")

        assert not violations, f"Hardcoded detection results: {violations}"


class TestFrontendNoStaticUploadData:
    def test_no_fixture_fallback_in_upload_path(self) -> None:
        """Frontend upload/detection code must not fall back to fixtures on failure."""
        src_dir = _frontend_src_dir()
        violations: list[str] = []

        for rel_path in FRONTEND_UPLOAD_FILES:
            full = src_dir / rel_path
            if not full.exists():
                continue
            text = full.read_text(encoding="utf-8", errors="ignore")

            # Check for detection fixture imports
            if "detectionFixture" in text or "detection_fixture" in text:
                violations.append(f"{rel_path}: imports detection fixture")
            if "sampleDetection" in text or "sample_detection" in text:
                violations.append(f"{rel_path}: imports sample detection")

        assert not violations, f"Fixture/sample imports in frontend upload code: {violations}"
