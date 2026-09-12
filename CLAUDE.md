# CLAUDE.md

You are implementing **Chakshu**, a satellite change-detection and image-understanding platform, for Smart India Hackathon 2026 problem statements **SIH26227** (Ministry of Defence) and **SIH26167** (ISRO/SAC).

## Before you write any code

Read these, in order. They are authoritative — if code disagrees with them, the code is wrong.

1. **`prd/ai-workflow-rules.md`** — read this one first and completely. It overrides your default instincts.
2. **`prd/project-overview.md`** — scope, and the one rule that governs everything
3. **`prd/architecture.md`** — layers, schema, the Resolution Gate, the three-tier answer stack
4. **`prd/data-contracts.md`** — exact shapes on the wire. Frozen once Phase 1 starts.
5. **`prd/feature-specs.md`** — the spec for whatever feature you are about to build
6. **`prd/code-standards.md`** — conventions, testing, forbidden actions
7. **`prd/build-order.md`** — which task is next, and what gate it must pass
8. **`PROGRESS.md`** — where the project actually stands right now

Then pick up the next unblocked task from `build-order.md` and follow the task protocol in `ai-workflow-rules.md` §3.

## The three rules that matter most

**1. The AI never produces a number.** Every area, count, date, distance and percentage displayed comes from deterministic geometry, arithmetic, or SQL. A language model may understand a question and phrase an answer — it may never be the source of a measurement. The Number Verifier enforces this and is not optional.

**2. Refusals are features.** The Resolution Gate declining to detect vehicles in 10 m imagery, an ungeoreferenced upload declining a temporal query, the verifier discarding a fabricated figure, the router returning `unsupported` — these are the project's credibility, not its gaps. Never make them more permissive. Fix the gate condition, never the refusal.

**3. Never weaken a guarantee to make progress.** No deleting, skipping, or loosening a test. No `type: ignore` or `as any` to silence a checker. No threshold tuned to make one demo case pass. If one of these looks like the only way forward, stop and ask.

## Commands

```bash
make check      # lint + types + all tests + purity check + audit verify. Run before claiming any task is done.
make test       # pytest
make test-fast  # unit only, no DB
make offline    # full suite with OFFLINE=1 — the no-network path
make types      # regenerate frontend types from the backend OpenAPI schema
make verify-audit
make freeze     # regenerate pinned dependency lock files
```

`make check` passing is the definition of done. Not `pytest`. All of it.

## Environment

Python 3.12 · Node 20 · Postgres 17 + PostGIS + pgvector (Docker) · CPU only, no GPU.
Cloud APIs (Gemini) are allowed when `OFFLINE=0`. Every feature must also work at `OFFLINE=1`.

## When you are unsure

Stop and ask. Do not guess at a library API, a coordinate convention, a threshold, or a scope question. The most expensive mistake available here is confidently writing 200 lines against an API that does not exist, or fabricating a benchmark number that ends up on a slide.

`prd/ai-workflow-rules.md` §5 lists exactly when to ask and when not to.
