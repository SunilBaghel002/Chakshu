"""Chakshu backend application package."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure `backend` directory is in sys.path so `app.*` imports resolve
# regardless of whether uvicorn/python is launched from repository root or backend.
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
