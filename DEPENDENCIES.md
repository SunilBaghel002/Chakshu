# Project Dependencies & Licenses (Chakshu)

Authoritative inventory of third-party software libraries and licenses per `PRD/05_code-standards.md` §11 and `PRD/01_project-overview.md` §7.
All dependencies must use permissive licenses (MIT, BSD, Apache-2.0). **Copyleft (GPL, AGPL) and CC-BY-NC are strictly forbidden.**

---

## 1. Frontend Dependencies (`frontend/package.json`)

| Package | Version | License | Source / Repository | Purpose & Justification |
|---|---|---|---|---|
| `react` | 19.0.0 | MIT | https://github.com/facebook/react | Core UI library |
| `react-dom` | 19.0.0 | MIT | https://github.com/facebook/react | React DOM renderer |
| `react-router-dom` | 7.18.4 | MIT | https://github.com/remix-run/react-router | Client-side routing for `/`, `/console`, `/admin`, `/privacy` (Gated, Task 8.0) |
| `clsx` | 2.1.1 | MIT | https://github.com/lukeed/clsx | Class name utility |
| `tailwind-merge` | 3.0.2 | MIT | https://github.com/dcastil/tailwind-merge | Conflict-free utility class merging |
| `lucide-react` | 1.16.0 | ISC | https://github.com/lucide-icons/lucide | Permissive iconography |
| `zod` | 3.24.2 | MIT | https://github.com/colinhacks/zod | Runtime schema validation & API contract parsing |
| `leaflet` | 1.9.4 | BSD-2-Clause | https://github.com/Leaflet/Leaflet | Interactive raster map pane (Phase 1–6 legacy, to be replaced by MapLibre GL in 8.20) |

### Frontend Dev Dependencies

| Package | Version | License | Source / Repository | Purpose |
|---|---|---|---|---|
| `vite` | 6.1.0 | MIT | https://github.com/vitejs/vite | Fast build tool & dev server |
| `@vitejs/plugin-react` | 4.3.4 | MIT | https://github.com/vitejs/vite-plugin-react | Babel/FastRefresh React support for Vite |
| `typescript` | 5.7.3 | Apache-2.0 | https://github.com/microsoft/TypeScript | Static type checker |
| `tailwindcss` | 4.3.3 | MIT | https://github.com/tailwindlabs/tailwindcss | CSS design tokens & utilities |
| `@tailwindcss/vite` | 4.3.3 | MIT | https://github.com/tailwindlabs/tailwindcss | Tailwind v4 Vite plugin |
| `vitest` | 5.0.0 | MIT | https://github.com/vitest-dev/vitest | Unit test runner |
| `jsdom` | 29.1.1 | MIT | https://github.com/jsdom/jsdom | DOM environment for Vitest |
| `@testing-library/react` | 16.3.3 | MIT | https://github.com/testing-library/react-testing-library | Component testing |
| `@testing-library/dom` | 10.4.2 | MIT | https://github.com/testing-library/dom-testing-library | DOM testing |
| `eslint` | 9.20.0 | MIT | https://github.com/eslint/eslint | JavaScript/TypeScript linter (Task 8.0a) |
| `@eslint/js` | 9.20.0 | MIT | https://github.com/eslint/eslint | Official ESLint JS rules |
| `typescript-eslint` | 8.24.0 | MIT | https://github.com/typescript-eslint/typescript-eslint | TypeScript rules for ESLint 9 |

---

## 2. Self-Hosted Typography Assets (`frontend/public/fonts/`)

| Font Family | Files | License | Upstream Source | Purpose |
|---|---|---|---|---|
| **Inter** | `Inter-Regular.woff2` (variable 100–900) | SIL OFL 1.1 | https://github.com/rsms/inter | Primary UI & body typography |
| **JetBrains Mono** | `JetBrainsMono-Regular.woff2` (variable 100–800) | SIL OFL 1.1 | https://github.com/JetBrains/JetBrainsMono | Monospace data tables, coordinates, telemetry |

---

## 3. Backend Dependencies (`backend/pyproject.toml`)

| Package | Version Range | License | Source / Repository | Purpose |
|---|---|---|---|---|
| `fastapi` | ^0.115.0 | MIT | https://github.com/fastapi/fastapi | REST API framework |
| `uvicorn` | ^0.34.0 | BSD-3-Clause | https://github.com/encode/uvicorn | ASGI web server |
| `pydantic` | ^2.10.0 | MIT | https://github.com/pydantic/pydantic | Data contracts & validation |
| `pydantic-settings` | ^2.7.0 | MIT | https://github.com/pydantic/pydantic-settings | Environment settings |
| `numpy` | ^2.2.0 | BSD-3-Clause | https://github.com/numpy/numpy | Array math & spectral indexing |
| `scipy` | ^1.15.0 | BSD-3-Clause | https://github.com/scipy/scipy | Spatial correlation, image transforms |
| `shapely` | ^2.0.0 | BSD-3-Clause | https://github.com/shapely/shapely | Vector geometry & spatial topology |
| `sqlalchemy` | ^2.0.0 | MIT | https://github.com/sqlalchemy/sqlalchemy | SQL database ORM |
| `psycopg2-binary` | ^2.9.10 | LGPL with linking exception (or BSD psycopg) | https://github.com/psycopg/psycopg2 | PostgreSQL adapter |
| `pgvector` | ^0.3.6 | PostgreSQL | https://github.com/pgvector/pgvector-python | Vector retrieval adapter |
| `pillow` | ^11.1.0 | HPND | https://github.com/python-pillow/Pillow | Raster thumbnail & triptych rendering |
| `httpx` | ^0.28.0 | BSD-3-Clause | https://github.com/encode/httpx | HTTP client for ingestion |
| `pytest` | ^8.3.0 | MIT | https://github.com/pytest-dev/pytest | Test runner |
| `ruff` | ^0.9.0 | MIT | https://github.com/astral-sh/ruff | Python linter and formatter |
| `mypy` | ^1.14.0 | MIT | https://github.com/python/mypy | Python type checker |

---

## 4. Prohibited Dependency Checklist

- [x] **No GPL / AGPL copyleft licenses** in shipped client or server bundles.
- [x] **No CC-BY-NC non-commercial weights** in shipped models.
- [x] **No external CDN requests** at runtime (`OFFLINE=1` compliant).
- [x] **No heavy worker queues** (Redis, Celery, RabbitMQ) — pure `BackgroundTasks`.
- [x] **No heavy external vector databases** (Pinecone, Qdrant, Milvus) — pure `pgvector`.
