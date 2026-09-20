"""UI Lint Rules for Chakshu (PRD 10 §8.4 / PRD 9 §11 / PRD 11 §1.4).

Bans the following in frontend/src/components/:
1. Arbitrary Tailwind values (e.g. p-[13px], gap-[7px], w-[200px], z-[999]).
2. Numeric z-index (e.g. zIndex: 10, z-50, z-[...]).
3. Hex literals (e.g. #0B0D10, #F0B45F).
4. Hardcoded JSX strings (text directly inside JSX tags without constants or {COPY.*}).

Note: Per build order and prompt requirements ('Do not restyle any existing screen in this task'),
legacy pre-v2 components awaiting scheduled Stage A rebuilds in tasks 8.6–8.8 are allowlisted.
All new components, ui components, and scratch files are strictly checked.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
COMPONENTS_DIR = REPO_ROOT / "frontend" / "src" / "components"

# Pre-existing Phase 0-6 screens awaiting Phase 8 Stage A rewrite in tasks 8.6-8.8
LEGACY_PRE_V2_COMPONENTS = {
    "AmbientScanline.tsx",
    "AppHeader.tsx",
    "AskPanel.tsx",
    "ChangeCard.tsx",
    "DataStreamMarquee.tsx",
    "EvidenceConfidenceGauge.tsx",
    "EvidenceDrawer.tsx",
    "EvidenceTriptych.tsx",
    "GhostNumeral.tsx",
    "IconRail.tsx",
    "MapCursorInspector.tsx",
    "MapImageryToolbar.tsx",
    "MapPane.tsx",
    "MapReticleOverlay.tsx",
    "MapZoomControls.tsx",
    "ReviewQueueModal.tsx",
    "SatelliteIntelModal.tsx",
    "SearchModal.tsx",
    "StatusLine.tsx",
    "SuppressionPanel.tsx",
    "SwipeCompare.tsx",
    "TacticalTelemetryBar.tsx",
    "TemporalBar.tsx",
    "TimelineSlider.tsx",
    "UploadCanvasTab.tsx",
    "UploadModal.tsx",
    "UploadRejectionsTab.tsx",
    "UploadStart.tsx",
    "UploadTelemetryTab.tsx",
    "UploadTelemetryTab.test.tsx",
}

# 1. Arbitrary Tailwind values: any class matching -[<literal>] (excluding var(--...))
RE_TAILWIND_ARBITRARY = re.compile(r'\b[a-zA-Z0-9_:-]+-\[(?!var\(--)[^\]]+\]')

# 2. Numeric z-index: zIndex: <number>, or z-<number>, or z-[<anything>]
RE_NUMERIC_Z_INDEX_STYLE = re.compile(r'\bzIndex\s*:\s*\d+\b')
RE_NUMERIC_Z_INDEX_CLASS = re.compile(r'\bz-(?:\[[^\]]+\]|\d+)\b')

# 3. Hex literals: #[0-9a-fA-F]{3,8}
RE_HEX_LITERAL = re.compile(r'#[0-9a-fA-F]{3,8}\b')

# 4. Hardcoded JSX strings: text directly inside JSX tag >text<
RE_HARDCODED_JSX_STRING = re.compile(r'>\s*([A-Za-z][A-Za-z0-9\s,\'\"\.\?!—–:/-]{2,})\s*<')


def lint_file(file_path: Path) -> list[str]:
    violations: list[str] = []
    lines = file_path.read_text(encoding="utf-8").splitlines()
    rel_path = file_path.relative_to(REPO_ROOT)

    in_multi_comment = False

    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        # Handle comments
        if "/*" in stripped and "*/" in stripped:
            line_no_comment = re.sub(r'/\*.*?\*/', '', line)
        elif "/*" in stripped:
            in_multi_comment = True
            continue
        elif "*/" in stripped:
            in_multi_comment = False
            continue
        elif in_multi_comment:
            continue
        elif stripped.startswith("//"):
            continue
        else:
            line_no_comment = re.sub(r'//.*$', '', line)

        # 1. Arbitrary Tailwind values
        arb_match = RE_TAILWIND_ARBITRARY.search(line_no_comment)
        if arb_match:
            violations.append(
                f"{rel_path}:{idx}: Arbitrary Tailwind value '{arb_match.group(0)}' is banned. Use design system tokens."
            )

        # 2. Numeric z-index
        z_style_match = RE_NUMERIC_Z_INDEX_STYLE.search(line_no_comment)
        if z_style_match:
            violations.append(
                f"{rel_path}:{idx}: Numeric z-index '{z_style_match.group(0)}' is banned. Use --z-* ladder tokens."
            )
        z_class_match = RE_NUMERIC_Z_INDEX_CLASS.search(line_no_comment)
        if z_class_match:
            violations.append(
                f"{rel_path}:{idx}: Numeric z-index class '{z_class_match.group(0)}' is banned. Use z-index ladder tokens."
            )

        # 3. Hex literals
        hex_match = RE_HEX_LITERAL.search(line_no_comment)
        if hex_match:
            violations.append(
                f"{rel_path}:{idx}: Hex color literal '{hex_match.group(0)}' is banned. Use CSS custom properties from index.css."
            )

        # 4. Hardcoded JSX strings
        # Only in tsx files (skip test files)
        if file_path.suffix == ".tsx" and not file_path.name.endswith(".test.tsx"):
            jsx_match = RE_HARDCODED_JSX_STRING.search(line_no_comment)
            if jsx_match:
                content = jsx_match.group(1).strip()
                # Skip braces or self-closing tags
                if not (content.startswith('{') or content.endswith('}')):
                    violations.append(
                        f"{rel_path}:{idx}: Hardcoded JSX string '{content}' is banned. Move string to lib/copy.ts."
                    )

    return violations


def check_ui_lint() -> list[str]:
    violations: list[str] = []
    if not COMPONENTS_DIR.exists():
        return violations

    for file_path in COMPONENTS_DIR.rglob("*"):
        if not file_path.is_file() or file_path.suffix not in [".tsx", ".ts"]:
            continue

        # Check legacy allowlist
        if file_path.name in LEGACY_PRE_V2_COMPONENTS:
            continue

        file_violations = lint_file(file_path)
        violations.extend(file_violations)

    return violations


def main() -> int:
    print("Checking UI console lint rules (PRD 10 §8.4)...")
    violations = check_ui_lint()
    if violations:
        print(f"\nFAILED: Found {len(violations)} UI lint violation(s):\n", file=sys.stderr)
        for v in violations:
            print(f"  ❌ {v}", file=sys.stderr)
        return 1

    print("SUCCESS: UI console lint checks passed cleanly.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
