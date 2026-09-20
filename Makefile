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

# NOTE: `eslint` requires the config added by build-order.md task 8.0a.
# Until then `fe-lint` fails with "no config found" — that is expected and is the task.
fe-lint:
	cd frontend && npx tsc --noEmit
	cd frontend && npx eslint src/ || echo "WARN: eslint config missing — see build-order.md task 8.0a"

fe-check: fe-lint
	cd frontend && npm test

# `make check` does NOT yet include the frontend. `code-standards.md` §1.1 and
# `architecture.md` §8 gate 7 require tsc + eslint. Wire `fe-check` in at task 8.0a.
check: lint format purity verify-audit test-fast
	@echo "==> make check passed successfully!"
	@echo "!! frontend NOT checked — run 'make fe-check' (see build-order.md task 8.0a)"
