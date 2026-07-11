# Responsible Design

SALRIP is a **decision-support** tool for a domain — mobile-money risk — where a wrong
automated action can wrongly deprive a real person of their livelihood. The rulebook is
explicit that flagged activity is a *signal to review*, not a verdict. Every guarantee
below is enforced in code, not just asserted; each is cited to the file and line that
makes it true, so a reviewer can check rather than trust.

## 1. We never output the word "fraud"

Calling activity "fraud" presumes intent and guilt. Our detectors surface *statistical
anomalies*; only a human reviewer can conclude wrongdoing. So the word is banned from the
entire explanation path, in **English and Bangla**, and enforced in three layers.

**Layer 1 — the model never even receives the loaded label.** The raw detector type
(e.g. `FRAUD_BURST`) is never sent to the LLM. Instead each type maps to a neutral
behavioural description (`src/lib/explain/prompt.ts`):

```ts
export const NEUTRAL_DESCRIPTOR: Record<AlertType, string> = {
  FRAUD_BURST:
    "a short burst of many repeated, near-identical high-value transactions involving
     only a few customer accounts, occurring alongside a dip in the agent's available balance",
  // ...LIQUIDITY_DRAIN, STALE_FEED, SHARED_CASH_SHORTAGE
};
```

**Layer 2 — the system prompt forbids it as a hard rule.** `SYSTEM_PROMPT` in the same
file instructs the model, verbatim:

> *HARD RULE — mandatory, overrides everything else: NEVER use the word "fraud" anywhere
> in your output, in any language or form... These alerts are RISK SIGNALS THAT REQUIRE
> REVIEW, not confirmed wrongdoing.*

It directs the model to neutral framing only — "unusual activity", "activity that
requires review", "অস্বাভাবিক কার্যকলাপ", "পর্যালোচনা প্রয়োজন".

**Layer 3 — a post-generation guard rejects any output that slips through.** Even if the
model disobeyed, the explanation is checked against an explicit forbidden-words list
covering English *and* Bangla, and a violation throws rather than returning to a user
(`src/lib/explain/prompt.ts`):

```ts
export const FORBIDDEN_WORDS = ["fraud", "fraudulent", "fraudster", "প্রতারণা", "জালিয়াতি", "প্রতারক"];

export function assertNoForbiddenWords(e: Explanation): void {
  const haystack = `${e.title}\n${e.english}\n${e.bangla}\n${e.recommendedAction}`.toLowerCase();
  const hit = FORBIDDEN_WORDS.find((w) => haystack.includes(w.toLowerCase()));
  if (hit) {
    throw new Error(`Explanation violated the no-"fraud" rule: contained "${hit}". Refusing to return it.`);
  }
}
```

`explainAlert()` (`src/lib/explain/explain.ts`) calls this guard on every response before
returning. The guard is **self-tested**: `scripts/explain-demo.ts` feeds it a deliberately
bad explanation (`"This looks like fraud." / "এটি প্রতারণা।"`) and fails the run if the guard
does *not* reject it — so the safety net is proven to work on every `npm run explain`, with
or without an API key.

## 2. No real accounts, PINs, or credentials are ever touched

All data is **synthetic and generated locally** (`scripts/datagen/`, `npm run generate`).
The transaction schema contains only opaque identifiers — `txId`, `agentId`, `customerId`,
`provider`, `timestamp`, `type`, `amount`, `status` — and there is **no field anywhere in
the codebase** for a PIN, password, national ID, phone number, or any real credential.
`customerId` is a synthetic pseudonymous token (`buildAgents` in `scripts/datagen/core.ts`),
used purely to measure counterparty concentration; it maps to no real person.

The generator is seeded (`MASTER_SEED = 20260711`), so the "world" is a reproducible
fiction, not a sample of anyone's real activity.

## 3. Provider data boundaries are preserved — bKash and Nagad are never merged

A super agent's bKash e-float and Nagad e-float are **separate balances**, and SALRIP keeps
them separate end to end. This is both a correctness property and a data-governance one:
provider balances are not pooled into a single figure that could leak one provider's
position into another's view.

- Balances are modelled, stored, and detected **per `(agentId, provider)`**
  (`byAgentProvider` in `src/lib/analytics/detectors.ts`; the `Balance` type carries a
  `provider` field).
- `detectLiquidityDrain` watches **per-provider** daily-opening float, and its
  aggregate-masking check exists *specifically to prevent* a healthy-looking total from
  hiding one provider's decline — the opposite of merging.
- The one place cash is deliberately shared — `SHARED_CASH_SHORTAGE` — models the agent's
  single **physical cash drawer**, which really is one pool. Even there the detector
  records *which* providers contributed (`providers: "bKash+Nagad"` in the evidence) rather
  than collapsing them.

## 4. No automatic blocking, freezing, or accusing — a human is always in the loop

SALRIP **cannot move, hold, freeze, or reverse money, and it never does.** It has no
write-path to any provider. The marketing copy states this as scope
(*"without moving, merging, or controlling funds"*), and the architecture enforces it:
the only external write in the system is a **case record in our own Supabase database**.

Detection produces an alert; an alert only becomes actionable when a human **promotes it
into a case** and works it through a validated review workflow
(`src/lib/cases/stateMachine.ts`):

```
Open → Assigned → Acknowledged → Resolved       (with Escalated ⇄ Acknowledged; Resolved terminal)
```

- Illegal transitions are refused (`assertTransition` → `InvalidTransitionError` → HTTP `409`),
  so a case can't skip review — e.g. nothing jumps straight to `Resolved`.
- Every status change and reassignment writes an **immutable audit event**
  (`case_events`, append-only) recording who did what and when
  (`writeEvent` in `src/lib/cases/repo.ts`), so any outcome is fully traceable to a person.
- Severity sets an **SLA for human response**, not an automated action
  (`SLA_HOURS` in `src/lib/cases/promote.ts`: HIGH 4h, MEDIUM 12h, LOW 24h).

Nothing in the pipeline penalises an agent. The terminal state is a **human decision**,
recorded with its rationale.

## 5. Least-privilege data access

Case data is locked down by default. The Supabase migration enables Row-Level Security on
both tables and grants **no** anon/authenticated policies
(`supabase/migrations/0001_cases.sql`):

```sql
alter table public.cases       enable row level security;
alter table public.case_events enable row level security;
-- no policies granted → direct client access is denied
```

All reads and writes go through the server-side Route Handlers, which use the service-role
key and are the only code that touches the database
(`src/lib/supabase/server.ts` is documented "never import this into client components").
When credentials are absent the routes fail **safely and legibly** (`503 Supabase is not
configured`) rather than in an undefined state.

## 6. Honest about limitations

Per the rulebook's emphasis on honest risk interpretation, we state the boundaries plainly
(full detail in [DATA_AND_ASSUMPTIONS.md](./DATA_AND_ASSUMPTIONS.md)):

- **Thresholds are tuned for this synthetic world**, documented as assumptions, and not
  claimed as universal fraud detection.
- **The detectors flag; they do not adjudicate.** 100% recall / 0% FPR is measured against
  *our* labelled datasets — a rigorous, reproducible check of the method, not a promise
  about the messiness of real production traffic.
- **Balance snapshots are 6-hourly**, so sub-window troughs can be partially masked at
  snapshot granularity.
- **E-float is floored at 0**, so over-disbursement appears as float exhaustion rather than
  as rejected transactions; a richer model would fail transactions on insufficient float.

Naming these is deliberate: a risk tool that hides its own uncertainty is itself a risk.

## Summary

| Guarantee | Enforced by | Evidence |
|---|---|---|
| No "fraud" in output (EN + BN) | 3-layer: neutral descriptor + system prompt + reject-guard, self-tested | `src/lib/explain/prompt.ts`, `explain.ts`, `scripts/explain-demo.ts` |
| No real accounts / PINs / credentials | Fully synthetic, seeded data; no credential fields exist | `scripts/datagen/`, transaction schema |
| Provider balances never merged | Per-`(agent, provider)` modelling + anti-masking check | `src/lib/analytics/detectors.ts` |
| No auto block/freeze/accuse; human in loop | Validated case state machine + immutable audit trail; no money write-path | `src/lib/cases/`, `supabase/migrations/0001_cases.sql` |
| Least-privilege data access | RLS deny-all + server-only service-role client | `supabase/migrations/0001_cases.sql`, `src/lib/supabase/server.ts` |
| Honest limitations | Documented assumptions and caveats | `DATA_AND_ASSUMPTIONS.md` |
