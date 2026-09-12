"""Unit test verifying architecture purity rules."""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

from scripts.check_purity import (  # noqa: E402
    check_domain_purity,
    check_file_line_limits,
    check_frontend_fetch_isolation,
)


def test_domain_layer_is_pure() -> None:
    """Domain layer modules must not import frameworks, DB, or HTTP clients."""
    violations = check_domain_purity()
    assert len(violations) == 0, f"Domain purity violated: {violations}"


def test_frontend_fetch_is_isolated() -> None:
    """fetch() must not appear in frontend outside lib/api.ts."""
    violations = check_frontend_fetch_isolation()
    assert len(violations) == 0, f"Fetch isolation violated: {violations}"


def test_file_line_limits() -> None:
    """No source file exceeds 400 lines."""
    violations = check_file_line_limits()
    assert len(violations) == 0, f"Line limits exceeded: {violations}"
