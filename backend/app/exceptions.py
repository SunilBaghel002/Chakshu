"""Typed domain exceptions for Chakshu.

Every domain error inherits from ChakshuError and maps directly to the
error envelopes specified in PRD 4 §8 and PRD 5 §6.
"""

from __future__ import annotations

from typing import Any


class ChakshuError(Exception):
    """Base exception for all domain and operational errors in Chakshu."""

    code: str = "INTERNAL"
    http_status: int = 500
    user_message: str = "An internal error occurred."

    def __init__(
        self,
        message: str | None = None,
        details: dict[str, Any] | None = None,
        trace_id: str | None = None,
    ) -> None:
        """Initialize exception with user-facing message and structured details."""
        super().__init__(message or self.user_message)
        self.message = message or self.user_message
        self.details = details or {}
        self.trace_id = trace_id or "trace_local"

    def to_envelope(self) -> dict[str, Any]:
        """Convert exception to canonical JSON error envelope."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
                "trace_id": self.trace_id,
            }
        }


class ValidationError(ChakshuError):
    """Request body or query parameter malformed."""

    code = "VALIDATION_ERROR"
    http_status = 422
    user_message = "The request payload failed validation."


class NotFoundError(ChakshuError):
    """Requested resource does not exist."""

    code = "NOT_FOUND"
    http_status = 404
    user_message = "The requested entity could not be found."


class UnsupportedFileTypeError(ChakshuError):
    """Uploaded file format is not accepted."""

    code = "UNSUPPORTED_FILE_TYPE"
    http_status = 415
    user_message = (
        "That file type isn't supported. Chakshu reads GeoTIFF (.tif) and plain "
        "images (.png, .jpg, .webp)."
    )


class FileTooLargeError(ChakshuError):
    """Uploaded file exceeds size threshold."""

    code = "FILE_TOO_LARGE"
    http_status = 413
    user_message = "File exceeds allowed size limit."


class FileUnreadableError(ChakshuError):
    """Uploaded file could not be parsed or decompressed."""

    code = "FILE_UNREADABLE"
    http_status = 422
    user_message = (
        "I couldn't read this file — it may be corrupt or use a compression I "
        "don't support. Try re-exporting it as an uncompressed GeoTIFF."
    )


class NotGeoreferencedError(ChakshuError):
    """Image lacks spatial coordinate reference system or bounds."""

    code = "NOT_GEOREFERENCED"
    http_status = 200
    user_message = (
        "This image has no location information, so I can describe and label what's in it, "
        "but I can't place it on a map or compare it against the satellite archive. "
        "If you know where it is, add the coordinates and I'll do the full analysis."
    )


class ResolutionInsufficientError(ChakshuError):
    """Image ground sample distance cannot support requested operation."""

    code = "RESOLUTION_INSUFFICIENT"
    http_status = 200
    user_message = "Image resolution does not support this level of detail."


class NoArchiveDataError(ChakshuError):
    """No matching archive imagery found for spatial/temporal bounds."""

    code = "NO_ARCHIVE_DATA"
    http_status = 409
    user_message = "No archive scenes exist for this area; ingestion required first."


class NoUsableScenesError(ChakshuError):
    """Time window contains no cloud-free or usable scenes."""

    code = "NO_USABLE_SCENES"
    http_status = 422
    user_message = "The selected window contains no usable imagery."


class NoResultsError(ChakshuError):
    """Query returned no matching results."""

    code = "NO_RESULTS"
    http_status = 200
    user_message = "No matching items were found for your query."


class IntentUnsupportedError(ChakshuError):
    """Natural language query could not be routed to a deterministic handler."""

    code = "INTENT_UNSUPPORTED"
    http_status = 200
    user_message = (
        "I can't answer that from the data I have. I can tell you about changes in this area, "
        "counts and sizes of what's detected, when a change started, or show you a class "
        "on the map. Try one of those."
    )


class OfflineError(ChakshuError):
    """Network access attempted while OFFLINE=1."""

    code = "MODEL_UNAVAILABLE"
    http_status = 503
    user_message = "System is operating in air-gapped offline mode."


class VerifierRejectedError(ChakshuError):
    """Model prose contained numbers unverified against deterministic calculations."""

    code = "VERIFIER_REJECTED"
    http_status = 200
    user_message = "Model prose contained unverified measurements; degraded to template."


class RateLimitedError(ChakshuError):
    """External model rate limit encountered."""

    code = "RATE_LIMITED"
    http_status = 429
    user_message = "Upstream model rate limit reached."


class AuthRequiredError(ChakshuError):
    """Authentication required to access this resource (PRD 14 §6)."""

    code = "AUTH_REQUIRED"
    http_status = 401
    user_message = "Authentication required."


class RoleRequiredError(ChakshuError):
    """Caller lacks the required authorization role (PRD 14 §6)."""

    code = "ROLE_REQUIRED"
    http_status = 403
    user_message = "Admin role required."


class SessionExpiredError(ChakshuError):
    """Admin session has expired or timed out (PRD 14 §4)."""

    code = "SESSION_EXPIRED"
    http_status = 401
    user_message = "Admin session expired. Please re-authenticate."


class NoAdminConfiguredError(ChakshuError):
    """No admin user exists in the system (PRD 14 §4, PRD 16 §8)."""

    code = "NO_ADMIN_CONFIGURED"
    http_status = 503
    user_message = "NO ADMIN CONFIGURED · RUN scripts/make_admin.py"
