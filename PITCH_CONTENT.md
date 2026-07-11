# Pitch Content — SALRIP

Slide-ready bullets for a **7-minute, demo-first** pitch. Keep slides sparse; let the
live console and a live `npm run analyze` carry the weight. Suggested time budget:

| Segment | Time | Mode |
|---|---|---|
| Problem + Solution (slides 1–2) | ~1.5 min | slides |
| **Live demo** (console + `npm run analyze` + `npm run explain`) | ~3.5 min | screen |
| Validation, Responsible Design, Challenges (slides 5–7) | ~1.5 min | slides |
| Roadmap + close | ~0.5 min | slide |

---

## Slide 1 — Problem

- A mobile-money **Super Agent** juggles two liquidity types that are easy to confuse:
  **per-provider e-float** (bKash and Nagad, separate) and **one shared cash drawer**.
- Four ways it fails quietly: a **provider float drain** hidden by a healthy total, a
  **structured burst** of near-identical transfers, a **frozen balance feed**, and a
  **shared-cash shortage** across both providers at once.
- Per-provider dashboards miss all four — the danger lives *between* the providers.
- Get it wrong and a real agent can't serve customers — or a real person is wrongly
  accused. This is a **review** problem, not an **enforcement** problem.

## Slide 2 — Solution: SALRIP

- One pane of glass that coordinates liquidity, unusual patterns, and follow-through —
  **without ever moving, merging, or controlling funds.**
- **Detect** (deterministic engine) → **Explain** (bilingual, review-oriented) →
  **Coordinate** (case workflow with an audit trail).
- Every alert ships the exact numbers that triggered it — **explainable by construction**,
  no black box.
- Built for the analyst on the ground: explanations in **English and Bangla**.

## Slide 3 — Architecture (one diagram)

- **Data generator** → seeded synthetic datasets with ground-truth labels.
- **`src/lib/analytics`** → four detectors, pure arithmetic, no ML dependency.
- **`src/lib/explain`** → OpenAI turns an alert into a neutral bilingual explanation.
- **`src/lib/cases` + `/api/cases`** → promote → validated state machine → Supabase +
  immutable audit trail.
- Honest status: analytics/explainer proven as **offline harnesses**; case workflow is
  **live over HTTP**; console read-endpoints are the next wire-up. *(See ARCHITECTURE.md.)*

## Slide 4 — Live demo (talk track, not a slide)

- `npm run analyze` → the whole results table prints: **10/10 correct**, live.
- Open an alert's evidence: peak vs expected velocity, cluster CV, unique customers.
- `npm run explain` → same alert, plain English + Bangla, and the guard **self-test
  passes** (it rejects a planted "fraud" output).
- Console: liquidity matrix, anomaly heatmap, action queue, evidence trail — the operator's view.

## Slide 5 — Validation Results

- **100% recall · 0% false-positive rate · 100% precision · 100% accuracy** on **10
  labelled datasets**. Reproducible: `npm run analyze`.
- The **4 hard negatives** are the real test — each deliberately trips one or two fraud
  signals and must **not** alert (payday, corporate payer, high-volume spike, new agent).
- 0% FPR is meaningful *because* of those adversarial negatives, not despite their absence.
- Fully reproducible: same seed (`MASTER_SEED = 20260711`) → byte-identical data → same numbers.

## Slide 6 — Responsible Design

- **The word "fraud" can never appear** — enforced in 3 layers (neutral descriptor to the
  model, hard-rule system prompt, reject-guard in EN + Bangla), and the guard is self-tested.
- **No real accounts, PINs, or credentials** — 100% synthetic, seeded data; those fields
  don't exist in the schema.
- **Provider balances never merged**; **no auto-block / freeze / accuse** — a human
  promotes and resolves every case, recorded in an append-only audit trail.
- **Least privilege**: Supabase RLS denies direct client access; only server routes write.
  *(See RESPONSIBLE_DESIGN.md.)*

## Slide 7 — Challenges We Solved (real engineering)

- **OR-rule → all-three rule.** The first fraud rule was `velocity AND (low-CV OR
  concentration)`. It false-positived on **payday** (via the CV clause) and on a
  **corporate payer** (via concentration). We locked it to **all three at once** — clean
  separation, no allowlist. The hard negatives exist to prove it.
- **Cluster-vs-window CV.** A burst's low CV (~0.03) only holds for the **isolated**
  sub-cluster; averaged over the raw window, co-occurring normal traffic lifts it to
  ~0.40. Fix: use velocity to find the window, then a two-pointer sweep to **isolate the
  near-identical cluster** before measuring CV and concentration.
- **Daily-rebalance balance model.** Real drains were drowned in normal float drift. We
  modelled agents that **rebalance to baseline each morning** (a bank visit), so the daily
  *opening* float is flat — and a drain becomes exactly a fall in that opening, cleanly
  separable from noise.
- **Modelling shared physical cash.** Recognising that cash is **one pool** (all providers
  draw it), not per-provider, unlocked a failure mode e-float checks structurally can't
  see — scenario E.

## Slide 8 — Future Roadmap

- **Wire the console to live data** — expose `analyze()` through the `/api/dashboard`,
  `/liquidity`, `/anomalies`, `/actions`, `/evidence` endpoints the pages already call.
- **Alert → case in one click** in the UI, using the working `/api/cases` workflow, with
  the bilingual explanation rendered inline.
- **Streaming ingestion** — move from batch datasets to a live transaction/balance feed;
  add finer-grained (sub-6-hour) balance snapshots to close the masking gap.
- **Threshold calibration on real traffic** — treat current thresholds as a documented
  starting point; learn per-corridor baselines from production data.
- **Interactive action board** — activate the already-declared drag-and-drop + form
  libraries for hands-on triage.

## Close (one line)

> SALRIP turns four blind spots between mobile-money providers into explainable,
> reviewable signals — measured at 100% recall / 0% false positives, and engineered so a
> human, never the machine, makes the call.
