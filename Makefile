.PHONY: help check test test-fast offline types verify-audit freeze purity lint format fe-lint fe-check fe-install

PYTHON ?= python

help:
	@echo "Chakshu build and verification targets:"
	@echo "  make check        - Run lint, types, unit/integration tests, purity check, audit verify"
	@echo "  make test         - Run pytest suite"
	@echo "  make test-fast    - Run unit tests only (fast, no DB or network)"
	@echo "  make offline      - Run full test suite with OFFLINE=1"
	@echo "  make types        - Regenerate frontend types from backend OpenAPI schema"
	@echo "  make verify-audit - Verify SHA-256 hash chain integrity of the audit log"
	@echo "  make freeze       - Freeze pinned dependencies"
	@echo "  make purity       - Run architecture purity check"
	@echo "  make lint         - Run ruff linter"
	@echo "  make format       - Check formatting with ruff"
	@echo "  make fe-check     - Frontend: tsc --noEmit + eslint + vitest"
	@echo "  make fe-lint      - Frontend: eslint only"
	@echo "  make fe-install   - npm ci in frontend/"

lint:
	$(PYTHON) -m ruff check backend/

format:
	$(PYTHON) -m ruff format --check backend/

purity:
	$(PYTHON) scripts/check_purity.py

verify-audit:
	$(PYTHON) scripts/verify_audit.py

test-fast:
	$(PYTHON) -m pytest backend/tests/unit -v

test:
	$(PYTHON) -m pytest backend/tests -v

offline:
	OFFLINE=1 $(PYTHON) -m pytest backend/tests -m offline -v

types:
	$(PYTHON) scripts/generate_types.py

freeze:
	$(PYTHON) -m pip freeze > backend/requirements.txt

fe-install:
	cd frontend && npm ci

fe-lint:
	cd frontend && npm run typecheck
	cd frontend && npm run lint

fe-check: fe-lint
	cd frontend && npm test

check: lint format purity verify-audit test-fast fe-check
	@echo "==> make check passed successfully!"
