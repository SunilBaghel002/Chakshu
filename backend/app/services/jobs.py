"""Asynchronous job management and progress tracking service (Task 1.6, PRD 2 §8).

Manages background jobs (ingestion, change runs, detection), providing:
1. Thread-safe status and progress tracking.
2. Structured failure reporting conforming to PRD 4 §8 error envelopes.
3. Polling retrieval via /api/v1/jobs/{id}.
"""

from __future__ import annotations

import logging
import threading
import uuid
from typing import Any

from app.exceptions import NotFoundError
from app.schemas.aoi import JobResponse

log = logging.getLogger(__name__)


class JobManager:
    """In-memory thread-safe registry for asynchronous jobs."""

    def __init__(self) -> None:
        """Initialize job registry with locking mechanism."""
        self._lock = threading.Lock()
        self._jobs: dict[str, dict[str, Any]] = {}

    def create_job(
        self,
        job_type: str = "generic",
        metadata: dict[str, Any] | None = None,
    ) -> JobResponse:
        """Create a new job in queued state."""
        job_id = f"j_{uuid.uuid4().hex[:12]}"
        record: dict[str, Any] = {
            "job_id": job_id,
            "job_type": job_type,
            "state": "queued",
            "progress": 0.0,
            "result": None,
            "error": None,
            "metadata": metadata or {},
        }
        with self._lock:
            self._jobs[job_id] = record

        log.info("Created job %s (type=%s)", job_id, job_type)
        return JobResponse(
            job_id=job_id,
            state="queued",
            progress=0.0,
            result=None,
            error=None,
        )

    def update_progress(
        self,
        job_id: str,
        progress: float,
        state: str = "running",
    ) -> JobResponse:
        """Update job progress fraction and state."""
        clamped_progress = float(max(0.0, min(1.0, progress)))
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise NotFoundError(f"Job '{job_id}' not found.")
            job["progress"] = clamped_progress
            job["state"] = state

        return JobResponse(
            job_id=job["job_id"],
            state=job["state"],
            progress=job["progress"],
            result=job.get("result"),
            error=job.get("error"),
        )

    def complete_job(
        self,
        job_id: str,
        result: dict[str, Any] | None = None,
    ) -> JobResponse:
        """Mark job as succeeded with output payload."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise NotFoundError(f"Job '{job_id}' not found.")
            job["state"] = "succeeded"
            job["progress"] = 1.0
            job["result"] = result or {}

        log.info("Job %s succeeded", job_id)
        return JobResponse(
            job_id=job["job_id"],
            state="succeeded",
            progress=1.0,
            result=job["result"],
            error=None,
        )

    def fail_job(
        self,
        job_id: str,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
        trace_id: str | None = None,
    ) -> JobResponse:
        """Mark job as failed with an error envelope."""
        err_envelope = {
            "code": code,
            "message": message,
            "details": details or {},
            "trace_id": trace_id or f"t_{uuid.uuid4().hex[:8]}",
        }
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise NotFoundError(f"Job '{job_id}' not found.")
            job["state"] = "failed"
            job["error"] = err_envelope

        log.warning("Job %s failed: [%s] %s", job_id, code, message)
        return JobResponse(
            job_id=job["job_id"],
            state="failed",
            progress=job["progress"],
            result=None,
            error=err_envelope,
        )

    def get_job(self, job_id: str) -> JobResponse:
        """Retrieve current job state."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise NotFoundError(f"Job '{job_id}' not found.")
            return JobResponse(
                job_id=job["job_id"],
                state=job["state"],
                progress=job["progress"],
                result=job.get("result"),
                error=job.get("error"),
            )

    def list_jobs(self, limit: int = 50) -> list[JobResponse]:
        """List recently created jobs."""
        with self._lock:
            items = list(self._jobs.values())[-limit:]
            return [
                JobResponse(
                    job_id=j["job_id"],
                    state=j["state"],
                    progress=j["progress"],
                    result=j.get("result"),
                    error=j.get("error"),
                )
                for j in reversed(items)
            ]


# Process-wide singleton
job_manager = JobManager()
