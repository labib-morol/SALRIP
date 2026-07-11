import { deriveSeed, Rng } from "./rng.ts";
import { buildAgents, computeBalances, computeCash, genTransactions } from "./core.ts";
import type { Agent } from "./core.ts";
import type {
  Alert,
  Balance,
  Case,
  Cash,
  DatasetBundle,
  Provider,
  Transaction,
  TxStatus,
} from "./types.ts";
import {
  AGENT_COUNT,
  ANALYSTS,
  MASTER_SEED,
  PROVIDERS,
  SIM_DAYS,
  SIM_START,
  THRESHOLDS,
} from "./config.ts";

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;
const isoAt = (hoursFromStart: number) =>
  new Date(SIM_START.getTime() + hoursFromStart * HOUR_MS).toISOString();

let burstCounter = 0;
function burstTxId(): string {
  burstCounter += 1;
  return `BURST-${String(burstCounter).padStart(6, "0")}`;
}

/** A dense, hand-shaped burst — used for fraud (low CV, few customers) and its legit look-alikes. */
function injectBurst(
  rng: Rng,
  agentId: string,
  provider: Provider,
  o: {
    count: number;
    startHour: number;
    spanMin: number;
    amountBase: number;
    amountSigma: number; // small = near-identical
    customerIds: string[];
    cashOutProb: number;
    status?: TxStatus;
  },
): Transaction[] {
  const startMs = SIM_START.getTime() + o.startHour * HOUR_MS;
  const out: Transaction[] = [];
  for (let i = 0; i < o.count; i++) {
    const ms = startMs + Math.floor(rng.uniform(0, o.spanMin * 60_000));
    const amount = Math.max(50, Math.round((o.amountBase * (1 + rng.normal(0, o.amountSigma))) / 10) * 10);
    out.push({
      txId: burstTxId(),
      agentId,
      provider,
      customerId: rng.pick(o.customerIds),
      timestamp: new Date(ms).toISOString(),
      type: rng.next() < o.cashOutProb ? "CASH_OUT" : "CASH_IN",
      amount,
      status: o.status ?? "SUCCESS",
    });
  }
  return out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function assembleBalances(
  agents: Agent[],
  txs: Transaction[],
  unmanaged: Set<string> = new Set(),
): Balance[] {
  const out: Balance[] = [];
  for (const a of agents) {
    for (const p of PROVIDERS) {
      const sub = txs.filter((t) => t.agentId === a.agentId && t.provider === p);
      out.push(
        ...computeBalances(a.agentId, p, a.opening[p], sub, {
          manage: !unmanaged.has(`${a.agentId}:${p}`),
        }),
      );
    }
  }
  return out;
}

/** Shared physical-cash series per agent (all providers). `openingOverride`
 *  lets a scenario give one agent a thin cash pool. */
function assembleCash(
  agents: Agent[],
  txs: Transaction[],
  opts: { openingOverride?: Record<string, number> } = {},
): Cash[] {
  const out: Cash[] = [];
  for (const a of agents) {
    const sub = txs.filter((t) => t.agentId === a.agentId);
    const opening = opts.openingOverride?.[a.agentId] ?? a.openingCash;
    out.push(...computeCash(a.agentId, opening, sub, { manage: true }));
  }
  return out;
}

function genAllBaseline(rng: Rng, agents: Agent[]): Transaction[] {
  const txs: Transaction[] = [];
  for (const a of agents) {
    for (const p of PROVIDERS) {
      txs.push(...genTransactions(rng, a, p, { days: SIM_DAYS }));
    }
  }
  return txs;
}

function newRng(label: string): Rng {
  return new Rng(deriveSeed(MASTER_SEED, label));
}

// ---------------------------------------------------------------------------
// baseline — nothing anomalous
// ---------------------------------------------------------------------------
export function buildBaseline(): DatasetBundle {
  const rng = newRng("baseline");
  const agents = buildAgents(rng, AGENT_COUNT);
  const transactions = genAllBaseline(rng, agents);
  const balances = assembleBalances(agents, transactions);
  const cash = assembleCash(agents, transactions);
  return {
    scenario: "baseline",
    transactions,
    balances,
    cash,
    label: {
      scenario: "baseline",
      shouldAlert: false,
      anomalyType: "none",
      tripsSignals: [],
      rationale: "Healthy multi-provider traffic; per-agent Poisson baseline for detectors to learn from.",
    },
  };
}

// ---------------------------------------------------------------------------
// A — one provider quietly draining while the agent's TOTAL looks healthy
// ---------------------------------------------------------------------------
export function buildQuietDrain(): DatasetBundle {
  const rng = newRng("A_quiet_drain");
  const agents = buildAgents(rng, AGENT_COUNT);
  const target = agents[3];
  const drainProvider: Provider = "bKash";
  const drainStartDay = 8;
  const txs: Transaction[] = [];

  for (const a of agents) {
    for (const p of PROVIDERS) {
      if (a === target && p === drainProvider) {
        // normal until the drain window, then cash-in-heavy (net outflow of float)
        txs.push(...genTransactions(rng, a, p, { days: drainStartDay }));
        txs.push(
          ...genTransactions(rng, a, p, {
            days: SIM_DAYS - drainStartDay,
            startDayOffset: drainStartDay,
            cashOutProb: 0.35, // flips net float direction downward
          }),
        );
      } else {
        txs.push(...genTransactions(rng, a, p, { days: SIM_DAYS }));
      }
    }
  }
  // leave the draining leg unmanaged (no daily rebalance) so the drain accumulates
  const balances = assembleBalances(agents, txs, new Set([`${target.agentId}:${drainProvider}`]));
  const cash = assembleCash(agents, txs);
  return {
    scenario: "A_quiet_drain",
    transactions: txs,
    balances,
    cash,
    label: {
      scenario: "A_quiet_drain",
      shouldAlert: true,
      anomalyType: "liquidity_drain",
      targetAgentId: target.agentId,
      targetProvider: drainProvider,
      windowStart: isoAt(drainStartDay * 24),
      windowEnd: isoAt(SIM_DAYS * 24),
      tripsSignals: ["per_provider_balance_trend"],
      rationale:
        "bKash float trends down across the window while Nagad stays healthy, so the agent's TOTAL cash looks fine. Detector must watch per-provider trend, not just aggregate.",
    },
  };
}

// ---------------------------------------------------------------------------
// B — fraud burst: near-identical high-value tx, few customers, liquidity dip
// ---------------------------------------------------------------------------
export function buildFraudBurst(): DatasetBundle {
  const rng = newRng("B_fraud_burst");
  const agents = buildAgents(rng, AGENT_COUNT);
  const target = agents[6];
  const provider: Provider = "Nagad";
  const burstHour = 10 * 24 + 15; // day 10, 15:00
  const txs = genAllBaseline(rng, agents);

  const few = target.customerPool.slice(0, 3);
  const burst = injectBurst(rng, target.agentId, provider, {
    count: 34,
    startHour: burstHour,
    spanMin: 90,
    amountBase: 24_000,
    amountSigma: 0.03, // CV ~ 0.03 << 0.15
    customerIds: few,
    cashOutProb: 0, // all cash-in (e-money disbursed out) -> drains Nagad float
  });
  txs.push(...burst);

  const balances = assembleBalances(agents, txs);
  const cash = assembleCash(agents, txs);
  return {
    scenario: "B_fraud_burst",
    transactions: txs,
    balances,
    cash,
    label: {
      scenario: "B_fraud_burst",
      shouldAlert: true,
      anomalyType: "fraud_burst",
      targetAgentId: target.agentId,
      targetProvider: provider,
      windowStart: isoAt(burstHour),
      windowEnd: isoAt(burstHour + 2),
      tripsSignals: ["velocity", "amount_cv_low", "counterparty_concentration"],
      rationale:
        "34 near-identical ~24k BDT e-money disbursements to 3 accounts inside 90 min, draining Nagad float to exhaustion. Trips velocity AND (low amount-CV AND concentration).",
    },
  };
}

// ---------------------------------------------------------------------------
// C — one provider's feed goes stale/conflicting for a window
// ---------------------------------------------------------------------------
export function buildStaleFeed(): DatasetBundle {
  const rng = newRng("C_stale_feed");
  const agents = buildAgents(rng, AGENT_COUNT);
  const target = agents[2];
  const provider: Provider = "bKash";
  const staleStartH = 6 * 24; // day 6 00:00
  const staleEndH = 8 * 24; // day 8 00:00
  const txs = genAllBaseline(rng, agents);
  const balances = assembleBalances(agents, txs);

  // Freeze the balance feed for target/provider during the window: snapshots keep
  // repeating the last pre-window value + a frozen timestamp, while transactions
  // keep flowing -> balance and tx sums CONFLICT (a stale/broken feed).
  const frozenTs = isoAt(staleStartH);
  let frozenValue: number | null = null;
  for (const b of balances) {
    if (b.agentId !== target.agentId || b.provider !== provider) continue;
    const h = (new Date(b.timestamp).getTime() - SIM_START.getTime()) / HOUR_MS;
    if (h < staleStartH) frozenValue = b.currentBalance;
    else if (h >= staleStartH && h < staleEndH && frozenValue !== null) {
      b.currentBalance = frozenValue;
      b.timestamp = frozenTs; // stale: timestamp stops advancing
    }
  }
  return {
    scenario: "C_stale_feed",
    transactions: txs,
    balances,
    cash: assembleCash(agents, txs),
    label: {
      scenario: "C_stale_feed",
      shouldAlert: true,
      anomalyType: "stale_feed",
      targetAgentId: target.agentId,
      targetProvider: provider,
      windowStart: frozenTs,
      windowEnd: isoAt(staleEndH),
      tripsSignals: ["feed_staleness", "balance_tx_reconciliation"],
      rationale:
        "bKash balance snapshots freeze (repeated value + non-advancing timestamp) for 48h while transactions keep posting, so balance contradicts the tx ledger.",
    },
  };
}

// ---------------------------------------------------------------------------
// D — an alert flowing into the case-assignment system
// ---------------------------------------------------------------------------
export function buildAlertCase(): DatasetBundle {
  const base = buildFraudBurst();
  const rng = newRng("D_alert_case");
  const L = base.label;
  const alert: Alert = {
    alertId: "ALT-000001",
    type: "FRAUD_BURST",
    agentId: L.targetAgentId!,
    provider: L.targetProvider!,
    severity: "HIGH",
    detectedAt: L.windowEnd!,
    windowStart: L.windowStart!,
    windowEnd: L.windowEnd!,
    evidence: {
      txCount: 34,
      uniqueCustomers: 3,
      amountCv: 0.03,
      signals: L.tripsSignals,
    },
  };
  const assignee = ANALYSTS[rng.int(0, ANALYSTS.length - 1)];
  const created = new Date(L.windowEnd!);
  const kase: Case = {
    caseId: "CASE-000001",
    alertId: alert.alertId,
    assignedTo: assignee,
    status: "ASSIGNED",
    createdAt: created.toISOString(),
    slaDueAt: new Date(created.getTime() + 4 * HOUR_MS).toISOString(),
  };
  return {
    scenario: "D_alert_case",
    transactions: base.transactions,
    balances: base.balances,
    cash: base.cash,
    alerts: [alert],
    cases: [kase],
    label: {
      ...L,
      scenario: "D_alert_case",
      rationale:
        "Same fraud burst as (B), promoted to an Alert and routed to an analyst as a Case with a 4h SLA — demonstrates the alert -> case-assignment flow.",
    },
  };
}

// ---------------------------------------------------------------------------
// normal_high_volume — legit demand spike; MUST NOT alert
// ---------------------------------------------------------------------------
export function buildHighVolume(): DatasetBundle {
  const rng = newRng("normal_high_volume");
  const agents = buildAgents(rng, AGENT_COUNT);
  const spikeStartDay = 9;
  const txs: Transaction[] = [];
  for (const a of agents) {
    for (const p of PROVIDERS) {
      txs.push(...genTransactions(rng, a, p, { days: spikeStartDay }));
      txs.push(
        ...genTransactions(rng, a, p, {
          days: 3,
          startDayOffset: spikeStartDay,
          volumeMultiplier: 2.4, // high velocity ...
          // ... but full customer pool (high diversity) + normal amount sigma (high CV)
        }),
      );
      txs.push(
        ...genTransactions(rng, a, p, { days: SIM_DAYS - spikeStartDay - 3, startDayOffset: spikeStartDay + 3 }),
      );
    }
  }
  const balances = assembleBalances(agents, txs);
  return {
    scenario: "normal_high_volume",
    transactions: txs,
    balances,
    cash: assembleCash(agents, txs),
    label: {
      scenario: "normal_high_volume",
      shouldAlert: false,
      anomalyType: "none",
      targetAgentId: agents[0].agentId, // representative agent for window stats
      targetProvider: "bKash",
      windowStart: isoAt(spikeStartDay * 24),
      windowEnd: isoAt((spikeStartDay + 3) * 24),
      tripsSignals: ["velocity"],
      rationale:
        "Organic 2.4x demand spike: high velocity but high amount-CV and high counterparty diversity. Velocity alone must NOT alert — measures FPR of the velocity signal.",
    },
  };
}

// ---------------------------------------------------------------------------
// hard negative 1 — salary/DPS day: same round amount, MANY customers
// ---------------------------------------------------------------------------
export function buildHnSalaryDay(): DatasetBundle {
  const rng = newRng("hn_salary_day");
  const agents = buildAgents(rng, AGENT_COUNT);
  const target = agents[5];
  const provider: Provider = "bKash";
  const payHour = 7 * 24 + 10; // day 7, 10:00
  const txs = genAllBaseline(rng, agents);
  // low CV (everyone withdraws ~15,000) but drawn from the FULL pool -> diverse
  txs.push(
    ...injectBurst(rng, target.agentId, provider, {
      count: 40,
      startHour: payHour,
      spanMin: 150,
      amountBase: 15_000,
      amountSigma: 0.04, // low CV -> trips clustering
      customerIds: target.customerPool, // high diversity -> does NOT trip concentration
      cashOutProb: 1,
    }),
  );
  const balances = assembleBalances(agents, txs);
  return {
    scenario: "hn_salary_day",
    transactions: txs,
    balances,
    // a competent agent restocks physical cash for a known payday rush, so the
    // 600k of withdrawals never exhausts the pool -> no shared-cash shortage
    cash: assembleCash(agents, txs, { openingOverride: { [target.agentId]: 900_000 } }),
    label: {
      scenario: "hn_salary_day",
      shouldAlert: false,
      anomalyType: "none",
      targetAgentId: target.agentId,
      targetProvider: provider,
      windowStart: isoAt(payHour),
      windowEnd: isoAt(payHour + 3),
      tripsSignals: ["velocity", "amount_cv_low"],
      rationale:
        "Payday cash-outs: ~40 near-identical 15k amounts (trips clustering) but from ~40 different customers (does NOT trip concentration). Under the all-three rule it correctly clears — shows why clustering alone must never alert.",
    },
  };
}

// ---------------------------------------------------------------------------
// hard negative 2 — corporate disbursement: few customers, high-value, fast
// ---------------------------------------------------------------------------
export function buildHnCorporate(): DatasetBundle {
  const rng = newRng("hn_corporate_disbursement");
  const agents = buildAgents(rng, AGENT_COUNT);
  const target = agents[8];
  const provider: Provider = "Nagad";
  const startHour = 5 * 24 + 11; // day 5, 11:00
  const txs = genAllBaseline(rng, agents);
  // few payers, high value, fast — but VARIED amounts (high CV, does not cluster)
  txs.push(
    ...injectBurst(rng, target.agentId, provider, {
      count: 28,
      startHour,
      spanMin: 80,
      amountBase: 40_000,
      amountSigma: 0.45, // high CV -> does NOT trip clustering
      customerIds: target.customerPool.slice(0, 2), // few -> trips concentration
      cashOutProb: 0, // corporate disbursement: e-money paid out to recipients
    }),
  );
  const balances = assembleBalances(agents, txs);
  return {
    scenario: "hn_corporate_disbursement",
    transactions: txs,
    balances,
    cash: assembleCash(agents, txs),
    label: {
      scenario: "hn_corporate_disbursement",
      shouldAlert: false,
      anomalyType: "none",
      targetAgentId: target.agentId,
      targetProvider: provider,
      windowStart: isoAt(startHour),
      windowEnd: isoAt(startHour + 2),
      tripsSignals: ["velocity", "counterparty_concentration"],
      rationale:
        "Legit corporate payer settling through one agent: trips velocity AND concentration but NOT clustering (amounts vary). Under the all-three rule it correctly clears — shows why concentration alone must never alert.",
    },
  };
}

// ---------------------------------------------------------------------------
// hard negative 3 — brand-new agent with no baseline history
// ---------------------------------------------------------------------------
export function buildHnNewAgent(): DatasetBundle {
  const rng = newRng("hn_new_agent");
  const agents = buildAgents(rng, AGENT_COUNT);
  const txs = genAllBaseline(rng, agents);

  // a fresh agent that only starts trading in the last 2 days -> no history
  const newAgent = buildAgents(rng, 1)[0];
  newAgent.agentId = "AGT-NEW";
  const all = [...agents, newAgent];
  for (const p of PROVIDERS) {
    txs.push(
      ...genTransactions(rng, newAgent, p, {
        days: 2,
        startDayOffset: SIM_DAYS - 2,
        volumeMultiplier: 1.3,
      }),
    );
  }
  const balances = assembleBalances(all, txs);
  const cash = assembleCash(all, txs);
  return {
    scenario: "hn_new_agent",
    transactions: txs,
    balances,
    cash,
    label: {
      scenario: "hn_new_agent",
      shouldAlert: false,
      anomalyType: "none",
      targetAgentId: "AGT-NEW",
      windowStart: isoAt((SIM_DAYS - 2) * 24),
      windowEnd: isoAt(SIM_DAYS * 24),
      tripsSignals: ["velocity_no_baseline"],
      rationale:
        "AGT-NEW has <2 days of history, so per-agent velocity z-scores are undefined. Detector must fall back to the population baseline with a low-confidence flag, not fire.",
    },
  };
}

// ---------------------------------------------------------------------------
// E — shared physical-cash shortage: simultaneous cash-out demand across BOTH
// providers against a thin shared cash pool (zero/negative margin).
// ---------------------------------------------------------------------------
export function buildSharedCashShortage(): DatasetBundle {
  const rng = newRng("E_shared_cash_shortage");
  const agents = buildAgents(rng, AGENT_COUNT);
  const target = agents[10];
  // healthy enough for normal traffic, but the simultaneous spike exceeds it
  const openingCash = 120_000;
  const spikeHour = 9 * 24 + 14; // day 9, 14:00
  const txs = genAllBaseline(rng, agents);

  // ~160k of near-simultaneous cash-out demand split across bKash AND Nagad in a
  // ~10-min span — combined demand exceeds the ~120k shared cash on hand.
  const spanMin = 10;
  for (const p of PROVIDERS) {
    txs.push(
      ...injectBurst(rng, target.agentId, p, {
        count: 8,
        startHour: spikeHour,
        spanMin,
        amountBase: 10_000,
        amountSigma: 0.05,
        customerIds: target.customerPool,
        cashOutProb: 1, // all cash-out -> draws the shared physical cash pool
      }),
    );
  }

  const balances = assembleBalances(agents, txs);
  const cash = assembleCash(agents, txs, { openingOverride: { [target.agentId]: openingCash } });
  return {
    scenario: "E_shared_cash_shortage",
    transactions: txs,
    balances,
    cash,
    label: {
      scenario: "E_shared_cash_shortage",
      shouldAlert: true,
      anomalyType: "shared_cash_shortage",
      targetAgentId: target.agentId,
      // agent-level, cross-provider — no single targetProvider
      windowStart: isoAt(spikeHour),
      windowEnd: isoAt(spikeHour + 1),
      tripsSignals: ["shared_cash_multiprovider", "cash_margin_low"],
      rationale:
        "~160k BDT of simultaneous cash-out demand across bKash AND Nagad within 10 min against ~120k physical cash on hand — combined multi-provider demand exceeds the shared cash pool (negative margin). Distinct from LIQUIDITY_DRAIN, which watches per-provider e-float.",
    },
  };
}

export const BUILDERS: Array<() => DatasetBundle> = [
  buildBaseline,
  buildQuietDrain,
  buildFraudBurst,
  buildStaleFeed,
  buildAlertCase,
  buildHighVolume,
  buildHnSalaryDay,
  buildHnCorporate,
  buildHnNewAgent,
  buildSharedCashShortage,
];
