import { buildBaseline } from "./baseline.ts";
import {
  dominantCluster,
  isClustered,
  isConcentrated,
  velocitySignal,
} from "./signals.ts";
import type { Balance, Dataset, DetectionAlert, Provider, Transaction } from "./types.ts";

const PROVIDERS: Provider[] = ["bKash", "Nagad"];
const HOUR_MS = 3600_000;

function byAgentProvider<T extends { agentId: string; provider: Provider }>(rows: T[]) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = `${r.agentId}:${r.provider}`;
    (m.get(k) ?? m.set(k, []).get(k)!).push(r);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Fraud burst — the LOCKED all-three rule: velocity AND CV-low AND concentration,
// with CV + concentration measured on the ISOLATED near-identical sub-cluster.
// ---------------------------------------------------------------------------
export function detectFraud(ds: Dataset): DetectionAlert[] {
  const baseline = buildBaseline(ds.transactions);
  const groups = byAgentProvider(ds.transactions);
  const alerts: DetectionAlert[] = [];

  for (const [k, txs] of groups) {
    const [agentId, provider] = k.split(":") as [string, Provider];
    const vel = velocitySignal(txs, agentId, provider, baseline);
    if (!vel || !vel.isHigh) continue; // low-confidence/new agents fall through here

    // Analyse a 2h window centred on the velocity peak, then isolate the cluster.
    const mid = new Date(vel.windowStart).getTime() + HOUR_MS / 8;
    const lo = new Date(mid - HOUR_MS).toISOString();
    const hi = new Date(mid + HOUR_MS).toISOString();
    const windowTx = txs.filter((t) => t.timestamp >= lo && t.timestamp < hi);
    const cluster = dominantCluster(windowTx);

    if (isClustered(cluster) && isConcentrated(cluster)) {
      alerts.push({
        type: "FRAUD_BURST",
        agentId,
        provider,
        severity: "HIGH",
        windowStart: lo,
        windowEnd: hi,
        evidence: {
          peakVelocity: vel.peakCount,
          expectedVelocity: Number(vel.expected.toFixed(2)),
          clusterSize: cluster.size,
          clusterCv: Number(cluster.cv.toFixed(3)),
          uniqueCustomers: cluster.uniqueCustomers,
          amountCenter: cluster.amountCenter,
        },
      });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Liquidity forecast — a drain is a sustained decline in the agent's DAILY
// OPENING float. A managed agent rebalances to baseline each day, so its daily
// opening is flat; an uncontrolled drain is exactly a fall in that opening. Using
// the daily opening (not noisy intraday snapshots) is what cleanly separates a
// real drain from intraday wobble. Includes the aggregate-masking check (A).
// ---------------------------------------------------------------------------
export const DRAIN_DECLINE_FRAC = 0.2; // >=20% fall in daily opening float over the window
export const DRAIN_WINDOW_DAYS = 7;

/** One (day -> opening float) point per day, most recent `days`. */
function dailyOpening(balances: Balance[], days = DRAIN_WINDOW_DAYS): Array<[string, number]> {
  const perDay = new Map<string, number>();
  for (const b of [...balances].sort((a, c) => a.timestamp.localeCompare(c.timestamp))) {
    const day = b.timestamp.slice(0, 10);
    if (!perDay.has(day)) perDay.set(day, b.openingBalance);
  }
  return [...perDay.entries()].slice(-days);
}

export function detectLiquidityDrain(ds: Dataset): DetectionAlert[] {
  const balGroups = byAgentProvider(ds.balances);
  const alerts: DetectionAlert[] = [];
  const declineByAgent = new Map<string, Map<Provider, number>>();

  for (const [k, series] of balGroups) {
    const [agentId, provider] = k.split(":") as [string, Provider];
    const opens = dailyOpening(series);
    if (opens.length < 4) continue;

    const startOpen = opens[0][1];
    const endOpen = opens[opens.length - 1][1];
    const declineFrac = startOpen > 0 ? (startOpen - endOpen) / startOpen : 0;
    (declineByAgent.get(agentId) ?? declineByAgent.set(agentId, new Map()).get(agentId)!).set(provider, declineFrac);
    if (declineFrac < DRAIN_DECLINE_FRAC) continue;

    const spanDays = opens.length - 1 || 1;
    const perDay = (startOpen - endOpen) / spanDays;
    const etaDays = perDay > 0 ? endOpen / perDay : Infinity;
    alerts.push({
      type: "LIQUIDITY_DRAIN",
      agentId,
      provider,
      severity: etaDays <= 3 ? "HIGH" : "MEDIUM",
      windowStart: `${opens[0][0]}T00:00:00.000Z`,
      windowEnd: `${opens[opens.length - 1][0]}T00:00:00.000Z`,
      evidence: {
        openingDeclinePct: Number((declineFrac * 100).toFixed(1)),
        startOpening: startOpen,
        endOpening: endOpen,
        depletionEtaDays: Number.isFinite(etaDays) ? Number(etaDays.toFixed(1)) : -1,
      },
    });
  }

  // aggregate-masking: does the agent's TOTAL opening float look healthy while
  // one provider drains? (scenario A). Total decline << provider decline = masked.
  for (const a of alerts) {
    const decl = declineByAgent.get(a.agentId);
    if (!decl) continue;
    const avg = PROVIDERS.reduce((s, p) => s + (decl.get(p) ?? 0), 0) / PROVIDERS.length;
    a.evidence.maskedByAggregate = avg < DRAIN_DECLINE_FRAC / 2;
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Stale / conflicting feed — non-advancing balance timestamps while tx flow,
// plus balance-vs-ledger reconciliation divergence (scenario C).
// ---------------------------------------------------------------------------
export const STALE_MIN_REPEATS = 3;

export function detectStaleFeed(ds: Dataset): DetectionAlert[] {
  const balGroups = byAgentProvider(ds.balances);
  const txGroups = byAgentProvider(ds.transactions);
  const alerts: DetectionAlert[] = [];

  for (const [k, series] of balGroups) {
    const [agentId, provider] = k.split(":") as [string, Provider];
    const counts = new Map<string, number>();
    for (const b of series) counts.set(b.timestamp, (counts.get(b.timestamp) ?? 0) + 1);
    let frozenTs = "";
    let repeats = 0;
    for (const [ts, n] of counts) {
      if (n > repeats) {
        repeats = n;
        frozenTs = ts;
      }
    }
    if (repeats < STALE_MIN_REPEATS) continue;

    // reconciliation: during the frozen window, do transactions keep flowing?
    const frozenMs = new Date(frozenTs).getTime();
    const windowTx = (txGroups.get(k) ?? []).filter((t) => {
      const ms = new Date(t.timestamp).getTime();
      return ms >= frozenMs && ms < frozenMs + repeats * 6 * HOUR_MS && t.status === "SUCCESS";
    });

    alerts.push({
      type: "STALE_FEED",
      agentId,
      provider,
      severity: "MEDIUM",
      windowStart: frozenTs,
      windowEnd: new Date(frozenMs + repeats * 6 * HOUR_MS).toISOString(),
      evidence: {
        frozenSnapshots: repeats,
        transactionsDuringFreeze: windowTx.length,
        conflict: windowTx.length > 0,
      },
    });
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Shared physical-cash shortage — combined near-simultaneous CASH_OUT demand
// across MULTIPLE providers approaching/exceeding the agent's single shared
// physical cash pool. Distinct from LIQUIDITY_DRAIN (per-provider e-float).
// ---------------------------------------------------------------------------
export const CASH_WINDOW_MIN = 15;
export const CASH_MARGIN_ALERT = 0.8; // demand >= 80% of cash on hand -> approaching
export const CASH_MARGIN_HIGH = 1.0; // demand >= cash on hand -> zero/negative margin

export function detectSharedCashShortage(ds: Dataset): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];

  // sorted (time, cash) snapshots per agent
  const cashByAgent = new Map<string, Array<{ t: number; cash: number }>>();
  for (const c of ds.cash) {
    const arr = cashByAgent.get(c.agentId) ?? cashByAgent.set(c.agentId, []).get(c.agentId)!;
    arr.push({ t: new Date(c.timestamp).getTime(), cash: c.currentCash });
  }
  for (const arr of cashByAgent.values()) arr.sort((a, b) => a.t - b.t);

  // physical cash on hand just before a moment
  const cashAt = (agentId: string, ms: number): number | null => {
    const arr = cashByAgent.get(agentId);
    if (!arr || arr.length === 0) return null;
    let v = arr[0].cash;
    for (const s of arr) {
      if (s.t <= ms) v = s.cash;
      else break;
    }
    return v;
  };

  // successful cash-out tx per agent (across all providers)
  const outByAgent = new Map<string, Transaction[]>();
  for (const t of ds.transactions) {
    if (t.status !== "SUCCESS" || t.type !== "CASH_OUT") continue;
    (outByAgent.get(t.agentId) ?? outByAgent.set(t.agentId, []).get(t.agentId)!).push(t);
  }

  const win = CASH_WINDOW_MIN * 60_000;
  for (const [agentId, rows] of outByAgent) {
    rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const times = rows.map((r) => new Date(r.timestamp).getTime());
    let best: { ratio: number; demand: number; avail: number; providers: Set<Provider>; start: number } | null = null;

    let j = 0;
    for (let i = 0; i < times.length; i++) {
      if (j < i) j = i;
      while (j + 1 < times.length && times[j + 1] - times[i] < win) j++;
      const providers = new Set<Provider>();
      let demand = 0;
      for (let k = i; k <= j; k++) {
        providers.add(rows[k].provider);
        demand += rows[k].amount;
      }
      if (providers.size < 2) continue; // "shared" = simultaneous multi-provider demand
      const avail = cashAt(agentId, times[i]);
      if (avail == null) continue;
      const ratio = avail <= 0 ? Infinity : demand / avail;
      if (!best || ratio > best.ratio) best = { ratio, demand, avail, providers, start: times[i] };
    }

    if (best && best.ratio >= CASH_MARGIN_ALERT) {
      alerts.push({
        type: "SHARED_CASH_SHORTAGE",
        agentId,
        provider: [...best.providers][0], // cross-provider; evidence lists all
        severity: best.ratio >= CASH_MARGIN_HIGH ? "HIGH" : "MEDIUM",
        windowStart: new Date(best.start).toISOString(),
        windowEnd: new Date(best.start + win).toISOString(),
        evidence: {
          combinedCashOutDemand: best.demand,
          availablePhysicalCash: best.avail,
          marginBdt: Math.round(best.avail - best.demand),
          demandVsCashPct: Number((best.ratio === Infinity ? 999 : best.ratio * 100).toFixed(0)),
          providers: [...best.providers].join("+"),
        },
      });
    }
  }
  return alerts;
}

export function analyze(ds: Dataset): DetectionAlert[] {
  return [
    ...detectFraud(ds),
    ...detectLiquidityDrain(ds),
    ...detectStaleFeed(ds),
    ...detectSharedCashShortage(ds),
  ];
}
