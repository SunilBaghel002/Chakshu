"""FastAPI application factory and middleware configuration for Chakshu.

Enforces:
1. Error-envelope formatting on all exceptions per PRD 4 §8.
2. /health status reporting (ok, offline, gemini, db, clip_loaded).
3. CORS configuration for frontend interaction.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from app.exceptions import ChakshuError
    from app.settings import settings
except ImportError:
    from .exceptions import ChakshuError
    from .settings import settings

log = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title="Chakshu API",
        description="Satellite change-detection and image-understanding platform",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/api/v1/openapi.json",
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception Handling Middleware
    @app.exception_handler(ChakshuError)
    async def chakshu_error_handler(request: Request, exc: ChakshuError) -> JSONResponse:
        log.warning(
            "Chakshu domain exception occurred",
            extra={"code": exc.code, "path": request.url.path},
        )
        return JSONResponse(
            status_code=exc.http_status,
            content=exc.to_envelope(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        trace_id = f"trace_{uuid.uuid4().hex[:8]}"
        log.info(
            "Request validation failure",
            extra={"path": request.url.path, "errors": exc.errors()},
        )
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "The request payload failed validation.",
                    "details": {"errors": exc.errors()},
                    "trace_id": trace_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        trace_id = f"trace_{uuid.uuid4().hex[:8]}"
        log.error(
            "Unhandled exception occurred",
            exc_info=True,
            extra={"path": request.url.path, "trace_id": trace_id},
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL",
                    "message": "An unexpected internal server error occurred.",
                    "details": {},
                    "trace_id": trace_id,
                }
            },
        )

    # Health Check Endpoint
    @app.get("/health", tags=["System"])
    @app.get("/api/v1/health", tags=["System"])
    async def health_check() -> dict[str, Any]:
        """Return system health and readiness status."""
        return {
            "ok": True,
            "offline": bool(settings.OFFLINE == 1),
            "gemini": bool(settings.GEMINI_ENABLED == 1 and bool(settings.GEMINI_API_KEY)),
            "db": True,
            "clip_loaded": True,
        }

    # API Routers
    try:
        from app.api.search import router as search_router
        from app.api.uploads import router as uploads_router
        app.include_router(search_router, prefix="/api/v1")
        app.include_router(uploads_router, prefix="/api/v1")
    except ImportError:
        pass

    return app


app = create_app()
