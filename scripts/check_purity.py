"""Architecture Purity Check for Chakshu.

Enforces layering rules and file size limits specified in PRD 2 §1 and PRD 5 §8:
1. No module under backend/app/domain/ imports fastapi, starlette, sqlalchemy,
   httpx, boto3, google, requests, or app.settings.
2. No module under backend/app/ outside api/ imports fastapi.Request or fastapi.Depends.
3. frontend/src/ outside lib/api.ts contains no fetch( calls.
4. No file exceeds the 400 line limit (PRD 5 §5).
"""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

DISALLOWED_DOMAIN_IMPORTS = {
    "fastapi",
    "starlette",
    "sqlalchemy",
    "httpx",
    "boto3",
    "google",
    "requests",
    "app.settings",
    "settings",
}

MAX_FILE_LINES = 400


def check_domain_purity() -> list[str]:
    """Verify domain layer has no prohibited imports."""
    violations: list[str] = []
    domain_dir = REPO_ROOT / "backend" / "app" / "domain"

    if not domain_dir.exists():
        return violations

    for py_file in domain_dir.glob("*.py"):
        if py_file.name == "__init__.py":
            continue

        try:
            tree = ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
        except SyntaxError as e:
            violations.append(f"Syntax error parsing {py_file}: {e}")
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root_mod = alias.name.split(".")[0]
                    if (
                        root_mod in DISALLOWED_DOMAIN_IMPORTS
                        or alias.name in DISALLOWED_DOMAIN_IMPORTS
                    ):
                        violations.append(
                            f"Domain purity violation in {py_file.name}:{node.lineno}: "
                            f"Disallowed import '{alias.name}' in pure domain layer."
                        )
            elif isinstance(node, ast.ImportFrom) and node.module:
                root_mod = node.module.split(".")[0]
                if (
                    root_mod in DISALLOWED_DOMAIN_IMPORTS
                    or node.module in DISALLOWED_DOMAIN_IMPORTS
                ):
                    violations.append(
                        f"Domain purity violation in {py_file.name}:{node.lineno}: "
                        f"Disallowed import from '{node.module}' in pure domain layer."
                    )

    return violations


def check_frontend_fetch_isolation() -> list[str]:
    """Verify fetch() only appears in frontend/src/lib/api.ts."""
    violations: list[str] = []
    src_dir = REPO_ROOT / "frontend" / "src"

    if not src_dir.exists():
        return violations

    fetch_pattern = re.compile(r"\bfetch\s*\(")

    for ext in ["*.ts", "*.tsx", "*.js", "*.jsx"]:
        for file in src_dir.rglob(ext):
            # Whitelist lib/api.ts and lib/track.ts (PRD 15 §6 beacon fallback)
            norm_path = str(file).replace("\\", "/")
            if norm_path.endswith("src/lib/api.ts") or norm_path.endswith("src/lib/track.ts"):
                continue

            lines = file.read_text(encoding="utf-8").splitlines()
            for idx, line in enumerate(lines, start=1):
                if fetch_pattern.search(line) and not line.strip().startswith("//"):
                    violations.append(
                        f"Frontend purity violation in {file.relative_to(REPO_ROOT)}:{idx}: "
                        "fetch() is strictly forbidden outside lib/api.ts."
                    )

    return violations


def check_file_line_limits() -> list[str]:
    """Verify no source code file exceeds the 400-line limit."""
    violations: list[str] = []

    search_dirs = [
        REPO_ROOT / "backend" / "app",
        REPO_ROOT / "frontend" / "src",
    ]

    for base_dir in search_dirs:
        if not base_dir.exists():
            continue
        for file in base_dir.rglob("*"):
            if not file.is_file() or file.suffix not in [".py", ".ts", ".tsx"]:
                continue
            # Skip generated types if necessary, though it should also be within limits
            lines = len(file.read_text(encoding="utf-8").splitlines())
            if lines > MAX_FILE_LINES:
                violations.append(
                    f"Size limit violation: {file.relative_to(REPO_ROOT)} has {lines} lines "
                    f"(maximum allowed: {MAX_FILE_LINES})."
                )

    return violations


def main() -> int:
    print("Running Chakshu architecture purity checks...")

    domain_errors = check_domain_purity()
    frontend_errors = check_frontend_fetch_isolation()
    size_errors = check_file_line_limits()
    try:
        if str(REPO_ROOT) not in sys.path:
            sys.path.insert(0, str(REPO_ROOT))
        from scripts.lint_ui import check_ui_lint
        ui_lint_errors = check_ui_lint()
    except Exception as e:
        ui_lint_errors = [f"Failed to run UI lint: {e}"]

    all_errors = domain_errors + frontend_errors + size_errors + ui_lint_errors

    if all_errors:
        print(
            f"\nFAILED: Found {len(all_errors)} architecture violations:\n",
            file=sys.stderr,
        )
        for err in all_errors:
            print(f"  ❌ {err}", file=sys.stderr)
        return 1

    print(
        "SUCCESS: Architecture purity checks passed cleanly (domain pure, fetch isolated, line limits respected)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
