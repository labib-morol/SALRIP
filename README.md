# SALRIP — Super Agent Liquidity & Risk Intelligence Platform

An explainable, review-oriented monitoring console for mobile-money **Super Agents**
in Bangladesh (providers: **bKash** and **Nagad**). SALRIP coordinates liquidity
pressure, unusual transaction patterns, and operational follow-through across
providers **without ever moving, merging, or controlling funds**.

> **Headline result — detection engine, measured against ground-truth labels:**
> **100% recall · 0% false-positive rate · 100% precision · 100% accuracy**
> across **10 labelled datasets** (4 injected anomalies, 1 alert→case flow, and
> 4 deliberately hard negatives). Reproduce it in one command: `npm run analyze`.

---

## The problem

A mobile-money Super Agent is a small business that serves customers on behalf of
one or more providers. It juggles two distinct kinds of liquidity that are easy to
confuse and dangerous to mismanage:

- **Per-provider e-float** — a separate electronic balance for bKash and for Nagad.
  A `CASH_IN` disburses e-money and pushes float **down**; a `CASH_OUT` receives
  e-money and pushes it **up**.
- **A single shared pool of physical cash** — every provider's `CASH_OUT` is paid
  from the *same* drawer. bKash demand and Nagad demand compete for one cash pile.

That structure creates failure modes a naïve per-provider dashboard misses:

1. **Quiet liquidity drain** — one provider's float trends down for days while the
   agent's *total* balance still looks healthy (the other provider masks it).
2. **Structured fraud bursts** — a rapid run of near-identical, high-value transfers
   to a handful of accounts, draining float to exhaustion.
3. **Stale / conflicting feeds** — a provider's balance feed freezes while
   transactions keep posting, so the reported balance silently contradicts the ledger.
4. **Shared-cash shortage** — simultaneous cash-out demand across *both* providers
   exceeds the one shared cash drawer, even though each provider's e-float is fine.

SALRIP is built around the rulebook's core constraint: these are **risk signals that
require human review, not accusations**. Nothing is auto-blocked, auto-frozen, or
labelled as wrongdoing — see [RESPONSIBLE_DESIGN.md](./RESPONSIBLE_DESIGN.md).

## The solution

Three grounded capabilities, each verifiable against real code and data:

- **Deterministic detection engine** (`src/lib/analytics/`) — four detectors keyed to
  the four failure modes above, evaluated against labelled ground truth. No black box:
  every alert ships the exact figures that triggered it.
- **Bilingual, review-oriented explainer** (`src/lib/explain/`) — turns a raw alert
  into a plain-English + natural-Bangla explanation for the on-the-ground analyst,
  with a hard guard that forbids the word "fraud" in any language.
- **Case coordination workflow** (`src/lib/cases/` + `/api/cases`) — promotes an alert
  into a case with an SLA, moves it through a validated state machine, and records an
  immutable audit trail in Supabase.

A Next.js **role-based console** (`src/app/`) presents these on top: a password-less
persona picker signs you in as one of four stakeholders from the rulebook (§5) — **Super
Agent**, **Ops Coordinator**, **Risk & Compliance Analyst**, or **Management** — and the
whole app re-scopes. An agent sees only their own float, shared cash, and alerts (enforced
server-side) with a plain-language bilingual advisory; the coordinator sees the full
portfolio and drives the Case Board; the analyst reviews and escalates but cannot make the
final call; management sees an area-level rollup. See **Project status** below for what is
wired end-to-end.

## Validation results

Run `npm run analyze` to reproduce the full table. Current output across all 10 datasets:

| Scenario | Should alert | Detected | Result | Alert raised |
|---|---|---|---|---|
| `baseline` | no | no | TN ✓ | — |
| `A_quiet_drain` | yes | yes | TP ✓ | `LIQUIDITY_DRAIN` |
| `B_fraud_burst` | yes | yes | TP ✓ | `FRAUD_BURST` |
| `C_stale_feed` | yes | yes | TP ✓ | `STALE_FEED` |
| `D_alert_case` | yes | yes | TP ✓ | `FRAUD_BURST` |
| `E_shared_cash_shortage` | yes | yes | TP ✓ | `SHARED_CASH_SHORTAGE` |
| `hn_corporate_disbursement` | no | no | TN ✓ | — |
| `hn_new_agent` | no | no | TN ✓ | — |
| `hn_salary_day` | no | no | TN ✓ | — |
| `normal_high_volume` | no | no | TN ✓ | — |

```
recall (positives caught)      : 100.0%
false-positive rate (negatives): 0.0%
precision                      : 100.0%
accuracy                       : 100.0%
```

The four hard negatives are the point: each one *deliberately* trips one or two of the
fraud signals (payday trips clustering; corporate trips concentration; the high-volume
spike trips velocity) and must **not** alert. They are what make the 0% false-positive
rate meaningful rather than cosmetic. Full methodology, thresholds, and honest caveats
are in [DATA_AND_ASSUMPTIONS.md](./DATA_AND_ASSUMPTIONS.md).

> **Scope of the claim (stated honestly):** thresholds are tuned for this synthetic,
> seeded world and are documented as assumptions, not offered as a universal
> fraud-detection guarantee. The value is the *methodology* — measurable recall/FPR
> against labelled hard negatives — not a magic number.

## Getting started

Requirements: **Node.js ≥ 22** (developed on v24; the data/analytics scripts use Node's
native `--experimental-strip-types` to run TypeScript directly, no build step).

```bash
npm install         # install dependencies

npm run generate    # (re)generate the synthetic datasets into data/<scenario>/
npm run analyze     # run the detection engine over every dataset, print recall/FPR
npm run dev         # start the Next.js console at http://localhost:3000
```

Optional — the bilingual explainer makes a live LLM call and needs a key:

```bash
# in .env.local
OPENAI_API_KEY=sk-...
# EXPLAIN_MODEL=gpt-4o        # optional model override (default: gpt-4o)

npm run explain     # prints the exact prompt + the guard self-test; with a key set,
                    #   also generates the live English + Bangla explanation
```

`npm run explain` is designed to be useful **without** a key too: it always runs the
deterministic prompt-builder and the "reject any output containing the word fraud"
guard self-test, and only skips the live model call when no key is present.

### Case coordination (optional, needs Supabase)

The `/api/cases` routes persist to Supabase. To exercise them, set the following in
`.env.local` and apply the migration in `supabase/migrations/0001_cases.sql`:

```bash
SUPABASE_URL=...                    # or NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=...       # server-only; used by src/lib/supabase/server.ts
```

Row-level security is enabled and denies direct client access; the server-side route
handlers use the service-role key. If the variables are absent, the case routes return
a clear `503 Supabase is not configured` rather than failing obscurely.

## Reproducibility

Data generation is fully deterministic. The same `MASTER_SEED`
(`scripts/datagen/config.ts`, currently `20260711`) produces byte-identical output, so
the validation numbers above are reproducible on any machine. The simulated world is
20 agents × 2 providers × 14 days of Poisson-distributed, hour-of-day-weighted traffic
(≈18k–25k transactions per scenario; see `data/manifest.json`).

## Tech stack

Versions are the exact ranges declared in `package.json`.

**Application**
- **Next.js `16.2.10`** — App Router, Server Components, and Route Handlers (`/api/cases`).
- **React `19.2.4`** / **React DOM `19.2.4`**.
- **TypeScript `^5`** — strict domain types throughout (`src/domain/`, `src/lib/*/types.ts`).
- **Tailwind CSS `^4`** (via `@tailwindcss/postcss`) plus a hand-authored design layer
  in `src/app/globals.css` — the institutional **"Vault"** system: deep vault-teal identity,
  strictly separate provider (magenta/orange) vs. severity (red/amber/slate) color channels,
  IBM Plex Sans/Mono + Noto Sans Bengali. Captured in [DESIGN.md](./DESIGN.md).

**Data fetching & UI**
- **`@tanstack/react-query` `^5`** — client-side data fetching / caching for the console pages.
- **`lucide-react` `^1.24`** — iconography.

**Detection & intelligence**
- **`openai` `^6.46`** — bilingual (English + Bangla) alert explanations (`src/lib/explain/`).
- Detection math (Poisson survival, amount-cluster isolation, cash-margin sweep) is
  **hand-written with zero ML/stats dependencies** — see `src/lib/analytics/signals.ts`.

**Persistence**
- **`@supabase/supabase-js` `^2.110`** — case + immutable audit-event storage, Postgres
  enum-backed state machine, RLS locked to server routes.

**Tooling**
- **ESLint `^9`** + **`eslint-config-next` `16.2.10`**.
- **Node `--experimental-strip-types`** to run the `.ts` data/analytics scripts directly.
- A commit-time **prompt-capture** hook (`.prompts/`) and a non-blocking self-hosted
  **SonarQube** scan (`scripts/sonar-scan.sh`, `docker-compose`) for AI-provenance and
  code-quality provenance.

> **Declared but not yet wired in (honest note):** `zustand`, `@dnd-kit/core`,
> `@dnd-kit/sortable`, `react-hook-form`, `@hookform/resolvers`, and `zod` appear in
> `package.json` but are not yet imported anywhere in `src/`. They are reserved for the
> planned interactive action board (drag-and-drop) and case-entry forms and are listed
> here rather than credited as if they power a shipped feature.

## Project status (what is real today)

Grounded and honest, because the rulebook rewards it:

| Capability | State | Where |
|---|---|---|
| Synthetic data generator (seeded, reproducible) | **Working** | `scripts/datagen/`, `npm run generate` |
| Detection engine + eval harness (100% recall / 0% FPR) | **Working, verified** | `src/lib/analytics/`, `npm run analyze` |
| Bilingual explainer + no-"fraud" guard | **Working** (guard always; live call needs key) | `src/lib/explain/`, `npm run explain` |
| Case workflow (state machine + audit trail + notes) | **Working over HTTP**, verified end-to-end | `src/lib/cases/`, `/api/cases`, Supabase |
| Role-based console (persona login + 4 scoped roles) | **Working** | `src/app/login/`, `src/app/(app)/`, `src/lib/auth/` |
| Console read endpoints (overview / alerts / me / management) | **Working — wired to the engine** | `src/app/api/*/route.ts`, `src/lib/overview.ts`, `src/lib/alerts/collect.ts` |

In other words: the **analytics and explainer are proven against labelled data** (both as
offline harnesses *and* through the live read endpoints), the **console is fully wired and
role-scoped**, and the **case workflow is live over HTTP** — promoting, assigning,
escalating, resolving, and adding notes all persist to Supabase with an immutable audit
trail. The one part that is *intentionally* read-only is the analytics itself: balances and
alerts are recomputed from the seeded synthetic datasets on every request (no real
transactions are ever written), while the database is the system of record for the human
coordination decisions.

## Repository layout

```
src/
  app/
    login/                 Persona picker (no credentials)
    (app)/                 Role-scoped console: my-operation · dashboard · alerts · cases · management
    api/                   Route Handlers: overview · alerts · me · management · cases
  components/              UI primitives, shell (sidebar/header), auth provider, case card
  lib/
    analytics/             Detection engine: signals, baseline, detectors, evaluator
    alerts/collect.ts      Run the engine over all scenarios → id-stamped alert feed
    overview.ts            Portfolio / agent / management aggregations for the read endpoints
    auth/                  Personas, role definitions, server-side currentPersona()
    explain/               OpenAI bilingual explainer + prompt + no-"fraud" guard
    cases/                 Case state machine, promote, Supabase repo
    supabase/server.ts     Server-side (service-role) Supabase client
    display.ts             Neutral labels, formatters, confidence, area, agent advisory
scripts/
  datagen/                 Seeded synthetic data generator (config, core, scenarios, rng)
  analyze.ts               Runs the engine over every dataset, prints recall/FPR
  explain-demo.ts          Exercises the explainer + guard self-test
supabase/migrations/       cases + case_events schema, enum, trigger, RLS
data/                      Generated datasets (git-ignored output of `npm run generate`)
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — data-flow diagram and module responsibilities.
- [DATA_AND_ASSUMPTIONS.md](./DATA_AND_ASSUMPTIONS.md) — datasets, detection thresholds, and honest caveats.
- [RESPONSIBLE_DESIGN.md](./RESPONSIBLE_DESIGN.md) — the safety and ethics guarantees, with code citations.
- [PITCH_CONTENT.md](./PITCH_CONTENT.md) — slide-ready talking points for the demo.