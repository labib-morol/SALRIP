import { Rng } from "./rng.ts";
import type { Balance, Provider, Transaction, TxStatus, TxType } from "./types.ts";
import {
  AMOUNT_MEDIAN,
  AMOUNT_SIGMA,
  AREAS,
  CUSTOMER_POOL,
  DAILY_VOLUME_MAX,
  DAILY_VOLUME_MIN,
  HOUR_WEIGHTS,
  SIM_DAYS,
  OPENING_FLOAT_MAX,
  OPENING_FLOAT_MIN,
  PROVIDERS,
  SIM_START,
  STATUS_FAIL_RATE,
  STATUS_PENDING_RATE,
} from "./config.ts";

export interface Agent {
  agentId: string;
  area: string;
  /** normal daily volume per provider */
  dailyVolume: Record<Provider, number>;
  opening: Record<Provider, number>;
  customerPool: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_WEIGHT_SUM = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);

export function buildAgents(rng: Rng, count: number): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < count; i++) {
    const agentId = `AGT-${String(i + 1).padStart(3, "0")}`;
    const dailyVolume = {} as Record<Provider, number>;
    const opening = {} as Record<Provider, number>;
    for (const p of PROVIDERS) {
      dailyVolume[p] = rng.int(DAILY_VOLUME_MIN, DAILY_VOLUME_MAX);
      opening[p] = Math.round(rng.uniform(OPENING_FLOAT_MIN, OPENING_FLOAT_MAX));
    }
    const customerPool = Array.from(
      { length: CUSTOMER_POOL },
      (_, k) => `${agentId}-C${String(k + 1).padStart(4, "0")}`,
    );
    agents.push({ agentId, area: rng.pick(AREAS), dailyVolume, opening, customerPool });
  }
  return agents;
}

function status(rng: Rng): TxStatus {
  const r = rng.next();
  if (r < STATUS_FAIL_RATE) return "FAILED";
  if (r < STATUS_FAIL_RATE + STATUS_PENDING_RATE) return "PENDING";
  return "SUCCESS";
}

export interface GenOpts {
  days: number;
  startDayOffset?: number;
  cashOutProb?: number;
  amountMedian?: number;
  amountSigma?: number;
  volumeMultiplier?: number;
  customerIds?: string[]; // restrict the customer pool (for concentration scenarios)
  windowHours?: [number, number]; // only emit within [start,end] hours-from-SIM_START
}

let txCounter = 0;
function nextTxId(): string {
  txCounter += 1;
  return `TX-${String(txCounter).padStart(8, "0")}`;
}

/** Poisson, hour-of-day baseline traffic for one agent+provider. Reused by scenarios. */
export function genTransactions(
  rng: Rng,
  agent: Agent,
  provider: Provider,
  opts: GenOpts,
): Transaction[] {
  const {
    days,
    startDayOffset = 0,
    cashOutProb = 0.52,
    amountMedian = AMOUNT_MEDIAN,
    amountSigma = AMOUNT_SIGMA,
    volumeMultiplier = 1,
    customerIds = agent.customerPool,
    windowHours,
  } = opts;

  const baseDaily = agent.dailyVolume[provider] * volumeMultiplier;
  const txs: Transaction[] = [];

  for (let d = 0; d < days; d++) {
    const day = startDayOffset + d;
    for (let h = 0; h < 24; h++) {
      const lambda = (baseDaily * HOUR_WEIGHTS[h]) / HOUR_WEIGHT_SUM;
      const n = rng.poisson(lambda);
      for (let j = 0; j < n; j++) {
        const hoursFromStart = day * 24 + h;
        if (windowHours && (hoursFromStart < windowHours[0] || hoursFromStart >= windowHours[1])) {
          continue;
        }
        const ms =
          SIM_START.getTime() + day * DAY_MS + h * 3600_000 + Math.floor(rng.uniform(0, 3600_000));
        const type: TxType = rng.next() < cashOutProb ? "CASH_OUT" : "CASH_IN";
        const amount = Math.round(rng.lognormal(amountMedian, amountSigma) / 10) * 10;
        txs.push({
          txId: nextTxId(),
          agentId: agent.agentId,
          provider,
          customerId: rng.pick(customerIds),
          timestamp: new Date(ms).toISOString(),
          type,
          amount: Math.max(50, amount),
          status: status(rng),
        });
      }
    }
  }
  return txs;
}

/** Signed effect of a transaction on the agent's e-float. */
export function floatDelta(t: Transaction): number {
  if (t.status !== "SUCCESS") return 0;
  return t.type === "CASH_OUT" ? t.amount : -t.amount;
}

/**
 * Walk transactions chronologically to produce 6-hourly balance snapshots.
 * `manage` models a real agent actively rebalancing float back to its baseline
 * at the start of each day (bank visit). Managed agents therefore stay in a tight
 * band and show ~no multi-day decline; scenario A's draining leg sets manage=false
 * so an uncontrolled drain accumulates and becomes detectable against that band.
 */
export function computeBalances(
  agentId: string,
  provider: Provider,
  opening: number,
  txs: Transaction[],
  opts: { manage: boolean } = { manage: true },
): Balance[] {
  const sorted = [...txs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const snapshots: Balance[] = [];
  let float = opening;
  let cursor = 0;

  const startDay = new Date(SIM_START);
  const totalSnaps = SIM_DAYS * 4; // 6-hourly snapshots
  let dayOpening = opening;
  let lastDayIdx = -1;

  for (let s = 0; s < totalSnaps; s++) {
    const snapTime = startDay.getTime() + s * 6 * 3600_000;
    const dayIdx = Math.floor((snapTime - startDay.getTime()) / DAY_MS);
    if (dayIdx !== lastDayIdx) {
      if (opts.manage) float = opening; // daily rebalance to baseline float
      lastDayIdx = dayIdx;
      dayOpening = float;
    }
    // advance through all tx up to this snapshot time
    while (cursor < sorted.length && new Date(sorted[cursor].timestamp).getTime() <= snapTime) {
      float += floatDelta(sorted[cursor]);
      if (float < 0) float = 0; // an agent can't disburse e-float it doesn't hold
      cursor++;
    }
    snapshots.push({
      agentId,
      provider,
      timestamp: new Date(snapTime).toISOString(),
      openingBalance: Math.round(dayOpening),
      currentBalance: Math.round(float),
    });
  }
  return snapshots;
}
