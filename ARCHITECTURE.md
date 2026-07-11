# Architecture

SALRIP is a Next.js 16 (App Router) application with three grounded backend
capabilities — a **detection engine**, a **bilingual explainer**, and a **case
coordination workflow** — plus a synthetic **data generator** that makes the whole
thing measurable. This document maps the *real* modules and data paths in the repo,
and is explicit about which paths are live over HTTP today versus which run as
verified offline harnesses.

## System data flow

Solid arrows are wired and exercised today. Dashed arrows are the designed-but-not-yet
-implemented integration points (the console's read endpoints).

```mermaid
flowchart TD
    subgraph gen["Data generation (offline, seeded)"]
        DG["scripts/datagen/<br/>config · core · scenarios · rng"]
        DATA[("data/&lt;scenario&gt;/<br/>transactions · balances · cash · label")]
        DG -->|npm run generate| DATA
    end

    subgraph engine["Detection & intelligence (src/lib)"]
        AN["analytics/<br/>signals · baseline · detectors · evaluate"]
        EX["explain/<br/>prompt · guard · explainAlert"]
        CA["cases/<br/>stateMachine · promote · repo"]
    end

    subgraph harness["Offline harnesses (npm scripts)"]
        AZ["scripts/analyze.ts<br/>npm run analyze"]
        ED["scripts/explain-demo.ts<br/>npm run explain"]
    end

    subgraph web["Next.js app (src/app)"]
        MKT["Marketing / (about)<br/>server components"]
        OPS["(ops) console pages<br/>dashboard · anomalies · liquidity · actions · evidence"]
        APICASE["/api/cases<br/>/api/cases/[id]"]
        APIREAD["/api/dashboard · /liquidity<br/>/anomalies · /actions · /evidence"]
    end

    subgraph ext["External services"]
        OAI["OpenAI API<br/>bilingual explanation"]
        SUPA[("Supabase / Postgres<br/>cases · case_events (RLS)")]
    end

    DATA --> AN
    DATA --> AZ
    AN --> AZ
    AN --> ED
    ED --> EX
    EX --> OAI

    OPS -->|React Query via lib/api/client| APIREAD
    APIREAD -.->|not yet implemented:<br/>wire analyze() output here| AN
    OPS -->|promote / assign / transition| APICASE
    APICASE --> CA
    CA --> SUPA

    classDef todo stroke-dasharray:5 5,fill:#f0e8d8;
    class APIREAD todo;
```

**Reading the diagram in one sentence:** the detection engine and explainer are proven
against labelled data through the `analyze`/`explain` scripts; the case workflow is live
from the console through `/api/cases` into Supabase; and the console's *read* endpoints
(`/api/dashboard`, …) are the one clearly-scoped gap — the pages already call them via a
typed client, so the remaining work is to expose `analyze()`'s output through those routes.

## Request/runtime paths

### 1. Detection (offline, verified) — `npm run analyze`

```
data/<scenario>/*.json
  → src/lib/analytics/data.ts        load + shape into a Dataset
  → src/lib/analytics/detectors.ts   analyze(ds) = fraud + drain + stale + shared-cash
        ├─ signals.ts   Poisson survival velocity, dominant-cluster isolation, concentration
        └─ baseline.ts  per-agent/hour Poisson baseline + population fallback (new agents)
  → src/lib/analytics/evaluate.ts    compare alerts to ground-truth labels → recall/FPR
  → scripts/analyze.ts               print the results table + summary
```

The engine is **pure and dependency-free** (no ML/stats libraries): everything is
explicit arithmetic, which is what makes each alert's evidence auditable.

### 2. Explanation (offline harness; live call optional) — `npm run explain`

```
DetectionAlert
  → src/lib/explain/prompt.ts        buildUserPrompt() with a NEUTRAL_DESCRIPTOR
        (the raw type name, e.g. "FRAUD_BURST", is never sent to the model)
  → src/lib/explain/explain.ts       OpenAI chat completion, strict JSON schema
        → OpenAI API                 returns { title, english, bangla, recommendedAction }
  → assertNoForbiddenWords()         post-generation guard rejects any "fraud" (any language)
```

Deterministic parts (prompt build + guard self-test) run with no key; the live call is
gated on `OPENAI_API_KEY`.

### 3. Case coordination (live over HTTP) — `/api/cases`

```
Console / client
  → POST /api/cases                  promote a DetectionAlert → Case (Open/Assigned)
  → PATCH /api/cases/[id]            reassign and/or transition status
        → src/lib/cases/promote.ts   caseFromAlert(): SLA by severity (HIGH 4h / MED 12h / LOW 24h)
        → src/lib/cases/stateMachine.ts  validate transition (illegal move → 409)
        → src/lib/cases/repo.ts      write case + immutable case_events row
        → src/lib/supabase/server.ts service-role client (bypasses RLS)
        → Supabase Postgres          cases + case_events (enum, trigger, RLS deny-all)
```

The state machine is the safety spine of the workflow:

```
Open ──▶ Assigned ──▶ Acknowledged ──┬─▶ Resolved
                  └──▶ Escalated ◀───┘   (Escalated ⇄ Acknowledged; Resolved is terminal)
```

Every transition and reassignment writes an append-only `case_events` audit row, so a
case's full history is reconstructable — the provenance a reviewer needs.

## Module responsibilities

| Module | Responsibility | Key files |
|---|---|---|
| `scripts/datagen/` | Seeded, reproducible synthetic world (agents, Poisson traffic, injected scenarios, ground-truth labels) | `config.ts`, `core.ts`, `scenarios.ts`, `rng.ts` |
| `src/lib/analytics/` | Deterministic detectors + eval harness | `signals.ts`, `baseline.ts`, `detectors.ts`, `evaluate.ts` |
| `src/lib/explain/` | Bilingual, review-oriented explanation + hard no-"fraud" guard | `prompt.ts`, `explain.ts` |
| `src/lib/cases/` | Case lifecycle: promote → state machine → persistence + audit | `promote.ts`, `stateMachine.ts`, `repo.ts`, `types.ts` |
| `src/lib/supabase/` | Server-only Supabase client (service-role) | `server.ts` |
| `src/lib/api/client.ts` | Typed frontend client the console pages call | `client.ts` |
| `src/app/(ops)/` | Console surfaces (dashboard, anomalies, liquidity, actions, evidence) | `*/page.tsx`, `layout.tsx` |
| `src/app/api/cases/` | Route Handlers for the case workflow | `route.ts`, `[id]/route.ts` |

## Key design boundaries

- **Two liquidity models are kept separate.** Per-provider **e-float** (drives
  `LIQUIDITY_DRAIN`) and the single **shared physical cash pool** (drives
  `SHARED_CASH_SHORTAGE`) are modelled and detected independently. Provider balances are
  never merged into one number — that separation is both a correctness requirement and a
  responsible-design guarantee (see [RESPONSIBLE_DESIGN.md](./RESPONSIBLE_DESIGN.md)).
- **The type name never reaches the model.** The explainer sends a neutral behavioural
  descriptor, not `"FRAUD_BURST"`, and a post-generation guard is the backstop.
- **Cases are server-authored only.** RLS denies direct client access; all writes go
  through the `/api/cases` handlers using the service-role key.
- **TypeScript runs unbuilt for data work.** `analyze`/`generate`/`explain` use Node's
  native `--experimental-strip-types`, so the analytics path has no build step and no
  bundler between the code and the numbers it reports.

## Detector summary

| Detector | Fires on | Core signal(s) | Evidence surfaced |
|---|---|---|---|
| `detectFraud` | Structured burst | Poisson-velocity **AND** low amount-CV **AND** counterparty concentration, all measured on the *isolated* near-identical sub-cluster | peak vs expected velocity, cluster size, cluster CV, unique customers |
| `detectLiquidityDrain` | Per-provider float decline | ≥20% fall in **daily-opening** float over 7 days + aggregate-masking check | opening-decline %, start/end opening, depletion ETA, masked-by-aggregate |
| `detectStaleFeed` | Frozen/broken feed | Repeated non-advancing balance snapshots **while** transactions keep posting | frozen-snapshot count, tx-during-freeze, conflict flag |
| `detectSharedCashShortage` | Cross-provider cash crunch | Multi-provider simultaneous cash-out demand ≥80% of shared cash on hand | combined demand, available cash, margin (BDT), demand-vs-cash %, providers |

Thresholds, the "all-three" fraud rule, and why the looser OR-rule was rejected are
documented in [DATA_AND_ASSUMPTIONS.md](./DATA_AND_ASSUMPTIONS.md).
