# SALRIP — Final Pitch and Live-Demo Runbook

## Presenter preflight (do this before judges arrive)

1. Open **https://salrip.vercel.app/login** in an incognito window.
2. If Vercel asks for a Vercel login, stop: Production Deployment Protection is
   still enabled. In Vercel, open Project → Settings → Deployment Protection,
   make Production public, then redeploy `main` and repeat this preflight.
3. Confirm the four persona cards appear. No password, PIN, OTP, wallet, or real
   provider credential is requested.
4. Keep two tabs ready: the app at `/login` and this runbook.
5. Do not regenerate data during the demo. The four opaque alert IDs below are
   deterministic for the tracked seeded dataset.

## Slide 1 — One agent, three liquidity realities

**On slide (sparse)**

> bKash float ≠ Nagad float ≠ shared physical cash

> Connected risk intelligence, without moving funds

**Speaker note (30 seconds)**

A Super Agent serves both bKash and Nagad. Each provider has a separate electronic
float, but every cash-out is paid from one physical drawer. Side-by-side balances
miss the interaction. SALRIP models all three resources separately, then connects
them through forecasts, cross-provider cash pressure, explainable alerts, and a
human-owned case workflow. This satisfies §6 and §16’s two-provider, separate-balance,
shared-cash, and connected-insight requirements.

## Slide 2 — Measured, explainable signals

**On slide (sparse)**

> 10 labelled datasets · 4 detectors · 4 hard negatives

> 100% recall · 0% FPR · 100% precision · 100% accuracy

**Speaker note (35 seconds)**

The figures are reproducible synthetic-test results, not a production guarantee.
`npm run analyze` evaluates target agent and provider against ground-truth labels.
Hard negatives include organic high volume, salary-day clustering, concentrated
corporate activity, and a new agent without enough history. In real traffic, false
positives are expected; every signal remains advisory and requires human review.

Detector coverage to narrate:

- Transaction/timing: Poisson velocity in a rolling window.
- Behaviour: near-identical amount clustering and counterparty concentration.
- Balance: per-provider daily-opening decline and depletion ETA.
- Data quality: repeated timestamps plus transaction/ledger conflict.
- Connected provider demand: simultaneous bKash + Nagad cash-out versus shared cash.
- Area: stable agent-to-area mapping powers the area filter and management roll-up;
  it is an operational reporting dimension, not a proxy used to accuse an agent.

## Slide 3 — Scenario A: hidden provider shortage (§11A)

**On slide (sparse)**

> One provider drains while the portfolio still looks healthy

> Provider · ETA · confidence · safe action

**Exact live click path**

1. At `/login`, choose **Nadia Islam — Ops Coordinator**.
2. On **Dashboard**, point out the separate bKash and Nagad e-float cards, the
   shared physical-cash card, forecast chip, and explicit confidence chip.
3. Choose **Alerts** in the sidebar.
4. In Agent, select **AGT-004** (or locate alert **`alr_0tex8fw`**).
5. Click **Liquidity Drain**.

**What the judge should see / what to say**

- Provider: **bKash**; agent: AGT-004.
- Evidence: 30.3% opening-balance decline, ৳329,544 → ৳229,614.
- Approximate pressure timing: **13.8 days depletion ETA**.
- **High confidence** appears explicitly in the side card.
- The bilingual explanation and Recommended next step call for confirmation and
  a provider-specific float top-up—not an automatic action.

This demonstrates §6 provider-aware liquidity, forecast, confidence, evidence,
careful language, and §7 shortage/provider/timing/safe-next-step requirements.

## Slide 4 — Scenario B: pressure plus unusual activity (§11B)

**On slide (sparse)**

> A connected signal, not a passive notification

> 11 observed vs 0.62 expected · 30 clustered · 3 customers · float to ৳0

**Exact live click path**

1. Use **Tanvir Ahmed — Risk & Compliance** (switch persona if needed).
2. Open **Review Queue**.
3. Locate alert **`alr_108z1cj`**, **Rapid Repeat Activity**, AGT-007, Nagad.
4. Click the row.

**What the judge should see / what to say**

- The UI never labels the person or activity as wrongdoing. It says “Rapid Repeat
  Activity” and “flagged for review.”
- Evidence explains why: peak velocity 11 vs 0.62 expected, cluster size 30,
  cluster CV 0.029, and only 3 customers.
- The same evidence panel connects the activity to liquidity pressure: Nagad float
  moved from ৳217,646 to **৳0** in the alert window (100% drop).
- The confidence indicator is explicit and the recommendation routes a human review
  with the Nagad liaison and agent; nothing is blocked.

This satisfies §7 unusual activity + why, meaningful analytics, evidence, careful
language, and §12’s requirement that insight be connected rather than two charts.

## Slide 5 — Scenario C: uncertainty must be visible (§11C)

**On slide (sparse)**

> Late data lowers confidence; it never becomes a confident verdict

**Exact live click path**

1. At `/login`, choose **Rahim Uddin — Super Agent**.
2. On **My Operation**, point out shared cash, separate provider float and forecast,
   and the **Reduced confidence** chip on bKash.
3. Under My Alerts, click **Stale Balance Feed**, alert **`alr_058zq3l`**.

**What the judge should see / what to say**

- A prominent **Reduced confidence — provider data was late or conflicting** banner.
- Evidence: 8 frozen snapshots, 88 transactions during the freeze, conflict = Yes.
- English and Bangla text explains the situation, uncertainty, evidence context,
  and safe step: compare with the agent’s own authorised records before relying on it.
- The copy explicitly says this is a data delay, not an account problem.

This satisfies §7’s missing/late/conflicting fallback and Bangla-alert requirement,
plus §9’s uncertainty and human-review boundary.

## Slide 6 — Scenario D: traceable coordination and closure (§11D)

**On slide (sparse)**

> Alert → owner → acknowledgement → escalation → resolution

> Every change has a person, time, note, and final status

**Exact live click path (pre-completed proof)**

1. Choose **Nadia Islam — Ops Coordinator**.
2. Open **Case Board** → **Resolved** column.
3. Find **Rapid Repeat Activity**, AGT-007, Nagad (case ID begins `701fb294`).
4. Click **History**.

**What the judge should see together in one real view**

- Received by: **Risk & Compliance review queue**.
- Current owner: **Tanvir Ahmed**.
- Provider escalation: **Nagad operations liaison**.
- Recommended next step: review provider/agent evidence; no automatic accusation.
- Final status: **Resolved**.
- Timeline: Nadia assigned → Tanvir acknowledged → Tanvir escalated with a provider
  liaison note → Nadia resolved with a no-automatic-restriction resolution note.

**Optional live mutation (only if the seeded board has an Open case)**

Nadia assigns an Open case to Tanvir → switch to Tanvir and Acknowledge → Escalate
with a note → switch to Nadia and Resolve. Analyst controls intentionally omit Assign,
Reassign, and Resolve; the API independently rejects those actions with 403.

This satisfies routing, ownership, acknowledgement/escalation, notes, provider-specific
escalation, history, visible resolution, and traceable human coordination.

## Slide 7 — Filters, roles, and provider boundaries (§7, §12, §14)

**On slide (sparse)**

> Right evidence, right role, least privilege

**Live beat (45 seconds)**

1. As Nadia or Tanvir, open **Alerts**.
2. Demonstrate all filters: **Provider**, **Severity**, **Area**, **Agent**, and
   **Time window**. Combine bKash + Khulna, then Clear filters.
3. Switch to Rahim. His page and API are scoped to AGT-003; another agent’s alert
   returns not found. Rahim cannot access the Case Board.
4. Switch to Sadia Karim — Management. Show area-level signal and readiness roll-up,
   then note that management has read-only alert access.

The persona picker collects no credential. Case APIs derive identity server-side;
the browser cannot forge an audit actor or fabricate alert evidence. RLS denies direct
database access. SALRIP has no provider write path and cannot move, merge, freeze,
reverse, or approve funds.

## Slide 8 — Close

**On slide (sparse)**

> See pressure early. Explain it safely. Coordinate the human response.

> SALRIP

**Closing line (20 seconds)**

SALRIP turns separate provider feeds and one shared cash reality into connected,
measurable, uncertainty-aware operations—while keeping providers distinct and humans
accountable for every decision.

---

# Rulebook audit matrix (presenter/reference notes)

## §6 Scope

| Requirement | Status | Exact implementation / UI proof |
|---|---|---|
| ≥2 separate providers | Done | `Provider = "bKash" | "Nagad"` in `analytics/types.ts`; distinct provider cards/tags on Dashboard and My Operation. |
| Shared cash + provider balances | Done | `Cash` versus `Balance` domain types; Dashboard/My Operation show one shared-cash card plus one e-float card per provider. |
| Demand, risk, projection, confidence | Done | `detectSharedCashShortage`, `detectLiquidityDrain`, `ForecastChip`/`TrendPill`, and explicit High/Reduced `ConfidenceBadge` on provider cards and alert detail. |
| Transaction/timing/balance/area/behaviour signals | Done | Velocity + time window, amount cluster + counterparties, balance decline/ETA, stale reconciliation, shared demand; `agentArea` supports filter/roll-up (not causal accusation). |
| Human review, explanation, evidence, safe recommendation | Done | Alert detail bilingual explanation/evidence; `/api/cases`, state machine, Case Board history/routing. |

## §7 Functional expectations

| Requirement | Status | Exact proof |
|---|---|---|
| Shared cash + separate balances | Done | Dashboard and My Operation top cards. |
| Provider/shared shortage + timing | Done | `alr_0tex8fw` bKash ETA 13.8 days; `alr_13j9min` bKash+Nagad demand, cash and negative margin in a 15-minute window. |
| Unusual type + why | Done | `alr_108z1cj`; evidence shows velocity, expected velocity, cluster CV/size, customer concentration, and float drop. |
| Careful user-facing language | Done | `ALERT_TYPE_META`, neutral explainer descriptor, forbidden-word post-check. `rg -ni "fraud" src/app src/components` returns zero. Internal enum/docs retain the dataset category name only. |
| Receiver + owner + next step + final status together | Done | Case Board → any case → History → Routing & decision. |
| Reduced confidence / fallback | Done | `alr_058zq3l`; banner + balance chip + safe confirmation copy. |
| Meaningful AI/APIs/analytics | Done | Deterministic analytics powers live APIs; optional OpenAI JSON explainer; deterministic bilingual fallback; Supabase case persistence. |
| Provider/agent/area/time filters | Done | Alerts filter bar; Severity is also available. Filtering is combined client-side over the engine feed. |
| Evidence + history | Done | Alert Evidence panel; append-only `case_events` timeline. |
| Bengali/English explanation | Done | Alert Explanation and agent advisory render English + বাংলা. |
| Bangla alert with situation/evidence/uncertainty/safe step | Done | Rahim → stale-feed alert `alr_058zq3l`; evidence is adjacent to bilingual explanation and reduced-confidence banner. |
| Provider escalation, notes, history, boundaries | Done | Routing block names provider liaison; escalation/resolution notes persist; event history; route handlers enforce persona permissions. |

## §9 Data and assumptions

Done in `DATA_AND_ASSUMPTIONS.md`: seeded generation and schema; modelling and
threshold assumptions; detector limitations; explicit “anomaly is not proof” rule;
expected real-world false positives despite synthetic 0%; missing/late-data fallback;
and the human-review/closure boundary.

## §10 Required deliverables

| Deliverable | Status | Location / caveat |
|---|---|---|
| Working prototype | Code and deployment succeed; public access must be preflighted | `https://salrip.vercel.app`; disable Vercel Production Deployment Protection if login is intercepted. |
| Source + README + setup + sample data | Done | Public GitHub repository, `README.md`, tracked `data/` (43 files). |
| Architecture diagram | Done | `ARCHITECTURE.md`. |
| Data/simulation note | Done | `DATA_AND_ASSUMPTIONS.md`. |
| ≥3 measured metrics | Done | Recall, FPR, precision, accuracy in README and `npm run analyze`. |
| Responsible-design note | Done | `RESPONSIBLE_DESIGN.md`. |
| Final presentation | Done | Sparse slides and exact live script in this file. |

## §12 Success criteria

- Connected insight: shared-cash detector combines both provider demands; quiet-drain
  detection prevents aggregate masking; Scenario B connects behaviour to float loss.
- Traceable coordination: alerts promote to cases, fixed transitions write actor/time/note,
  and Routing & decision exposes owner, receiver, next step, provider liaison, final state.
- Provider boundaries: per-provider balances remain separate; agent data is server-scoped;
  case access and role actions are server-enforced; engine evidence is resolved by alert ID.
- False positives and uncertainty: four hard negatives, explicit synthetic-only metric
  caveat, high/reduced confidence, and stale-feed fallback.
- End-to-end evidence: labelled files → detectors → live alert API/UI → case/history.

## §14 Guardrails

- Synthetic opaque IDs only; no real wallet, balance, account, phone, NID, PIN, OTP,
  password, or credential collection. Persona selection is not authentication claiming
  production identity assurance—it is a credential-free prototype role switch.
- Advisory only: no provider write integration and no block/freeze/reverse/accuse path.
- No authorization bypass: Supabase RLS denies client access; server route handlers enforce
  personas and allowed actions. Cross-provider analysis uses synthetic shared operational
  facts and preserves provider-specific balances; it does not claim access to confidential
  provider systems.

## §16 Literal submission checklist

- [x] At least two provider contexts represented distinctly.
- [x] Shared cash and provider-specific balances demonstrated.
- [x] Forward-looking liquidity insight demonstrated.
- [x] At least one anomaly category demonstrated with evidence.
- [x] Human-review and careful risk language included.
- [x] At least one alert demonstrates routing, ownership, acknowledgement or escalation, and a visible resolution status.
- [x] Repository, data, README, and architecture complete.
- [x] At least three metrics measured and explained.
- [x] Failure, uncertainty, and false-positive considerations shown.
- [x] Safety, privacy, boundaries, and limitations stated.
- [x] Final presentation ready.

The only external pre-demo gate is public Vercel access: complete the preflight at the
top and remove Production Deployment Protection if the Vercel login appears.
