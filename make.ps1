<#
.SYNOPSIS
    Chakshu build and verification runner for Windows PowerShell.
.DESCRIPTION
    Provides Windows parity for all `make` commands specified in CLAUDE.md.
#>
param(
    [Parameter(Position=0)]
    [ValidateSet("help", "check", "test", "test-fast", "offline", "types", "verify-audit", "freeze", "purity", "lint", "format")]
    [string]$Target = "help"
)

$ErrorActionPreference = "Stop"

function Run-Lint {
    Write-Host "--> Running ruff lint check..." -ForegroundColor Cyan
    python -m ruff check backend/
}

function Run-Format {
    Write-Host "--> Checking formatting with ruff..." -ForegroundColor Cyan
    python -m ruff format --check backend/
}

function Run-Purity {
    Write-Host "--> Running architecture purity check..." -ForegroundColor Cyan
    python scripts/check_purity.py
}

function Run-VerifyAudit {
    Write-Host "--> Verifying audit log hash chain integrity..." -ForegroundColor Cyan
    python scripts/verify_audit.py
}

function Run-TestFast {
    Write-Host "--> Running fast unit tests (no DB)..." -ForegroundColor Cyan
    python -m pytest backend/tests/unit -v
}

function Run-Test {
    Write-Host "--> Running full pytest suite..." -ForegroundColor Cyan
    python -m pytest backend/tests -v
}

function Run-Offline {
    Write-Host "--> Running offline suite (OFFLINE=1)..." -ForegroundColor Cyan
    $env:OFFLINE = "1"
    try {
        python -m pytest backend/tests -m offline -v
    } finally {
        $env:OFFLINE = $null
    }
}

function Run-Types {
    Write-Host "--> Generating frontend types from backend OpenAPI..." -ForegroundColor Cyan
    python scripts/generate_types.py
}

function Run-Freeze {
    Write-Host "--> Freezing dependencies into backend/requirements.txt..." -ForegroundColor Cyan
    python -m pip freeze > backend/requirements.txt
}

function Run-Check {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   Chakshu 'make check' Verification      " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Run-Lint
    Run-Format
    Run-Purity
    Run-VerifyAudit
    Run-TestFast
    Write-Host "==> All checks passed successfully!" -ForegroundColor Green
}

switch ($Target) {
    "lint"         { Run-Lint }
    "format"       { Run-Format }
    "purity"       { Run-Purity }
    "verify-audit" { Run-VerifyAudit }
    "test-fast"    { Run-TestFast }
    "test"         { Run-Test }
    "offline"      { Run-Offline }
    "types"        { Run-Types }
    "freeze"       { Run-Freeze }
    "check"        { Run-Check }
    Default {
        Write-Host "Usage: .\make.ps1 <target>"
        Write-Host "Available targets: check, test, test-fast, offline, types, verify-audit, freeze, purity, lint, format"
    }
}
