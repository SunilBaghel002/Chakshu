"""Unit tests for asynchronous job polling and execution management (Task 1.6)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from app.services.jobs import job_manager

client = TestClient(create_app())


def test_job_manager_lifecycle() -> None:
    """Test full job lifecycle in JobManager."""
    job = job_manager.create_job(job_type="test_job", metadata={"param": 42})
    assert job.job_id.startswith("j_")
    assert job.state == "queued"
    assert job.progress == 0.0

    # Progress update
    updated = job_manager.update_progress(job.job_id, 0.45, state="running")
    assert updated.state == "running"
    assert updated.progress == 0.45

    # Completion
    completed = job_manager.complete_job(job.job_id, result={"output": "ready"})
    assert completed.state == "succeeded"
    assert completed.progress == 1.0
    assert completed.result == {"output": "ready"}


def test_job_manager_failure() -> None:
    """Test job failure handling."""
    job = job_manager.create_job(job_type="failing_job")
    failed = job_manager.fail_job(
        job.job_id,
        code="FILE_UNREADABLE",
        message="Corrupt GeoTIFF",
        details={"source": "rasterio.open"},
    )
    assert failed.state == "failed"
    assert failed.error is not None
    assert failed.error["code"] == "FILE_UNREADABLE"
    assert failed.error["message"] == "Corrupt GeoTIFF"


def test_job_api_get_status() -> None:
    """Test GET /api/v1/jobs/{id} polling endpoint."""
    job = job_manager.create_job(job_type="api_poll_test")
    job_manager.update_progress(job.job_id, 0.65, state="running")

    res = client.get(f"/api/v1/jobs/{job.job_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["job_id"] == job.job_id
    assert data["state"] == "running"
    assert data["progress"] == 0.65
    assert data["result"] is None
    assert data["error"] is None


def test_job_api_not_found() -> None:
    """Test 404 error envelope when job does not exist."""
    res = client.get("/api/v1/jobs/j_nonexistent123")
    assert res.status_code == 404
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"


def test_job_api_list() -> None:
    """Test listing recent jobs."""
    res = client.get("/api/v1/jobs?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
