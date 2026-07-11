import type { Baseline } from "./baseline.ts";
import { hourOfDay } from "./data.ts";
import type { Provider, Transaction } from "./types.ts";

export const VELOCITY_WINDOW_MIN = 15;
export const VELOCITY_MIN_COUNT = 5; // ignore tiny windows (avoids low-count noise)
export const VELOCITY_P = 1e-3; // Poisson tail significance
export const CLUSTER_TOLERANCE = 0.12; // amounts within ±~6% count as "near-identical"
export const CLUSTER_MIN_SIZE = 8;
export const AMOUNT_CV_LOW = 0.15;
export const CONCENTRATION_MAX_CUSTOMERS = 3;

/** P(X >= k) for X ~ Poisson(lambda). Correct at low counts (unlike a Gaussian z-score). */
export function poissonSurvival(k: number, lambda: number): number {
  if (k <= 0) return 1;
  // 1 - sum_{i=0}^{k-1} e^-l l^i / i!
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.max(0, 1 - cdf);
}

export interface VelocityResult {
  isHigh: boolean;
  lowConfidence: boolean;
  peakCount: number;
  expected: number;
  pValue: number;
  windowStart: string;
  windowEnd: string;
}

/** Peak 15-min arrival window for one agent/provider, tested against its Poisson baseline. */
export function velocitySignal(
  txs: Transaction[],
  agentId: string,
  provider: Provider,
  baseline: Baseline,
): VelocityResult | null {
  const rows = txs
    .filter((t) => t.status === "SUCCESS")
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (rows.length === 0) return null;

  const times = rows.map((t) => new Date(t.timestamp).getTime());
  const win = VELOCITY_WINDOW_MIN * 60_000;
  let best = { count: 0, start: 0, endIdx: 0, startIdx: 0 };
  let j = 0;
  for (let i = 0; i < times.length; i++) {
    if (i > j) j = i;
    while (j + 1 < times.length && times[j + 1] - times[i] < win) j++;
    const count = j - i + 1;
    if (count > best.count) best = { count, start: times[i], endIdx: j, startIdx: i };
  }

  const startIso = new Date(best.start).toISOString();
  const endIso = new Date(best.start + win).toISOString();
  const expected = baseline.expected(agentId, provider, hourOfDay(startIso), VELOCITY_WINDOW_MIN);
  const p = poissonSurvival(best.count, expected);
  const confident = baseline.confident(agentId, provider);
  return {
    isHigh: confident && best.count >= VELOCITY_MIN_COUNT && p < VELOCITY_P,
    lowConfidence: !confident,
    peakCount: best.count,
    expected,
    pValue: p,
    windowStart: startIso,
    windowEnd: endIso,
  };
}

function cv(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean === 0) return 0;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(v) / mean;
}

export interface Cluster {
  size: number;
  cv: number;
  uniqueCustomers: number;
  amountCenter: number;
}

/**
 * Isolate the dominant near-identical amount sub-cluster inside a window. This is
 * what makes the CV *and* concentration signals robust to co-occurring baseline
 * traffic (which would otherwise inflate both). Sorted-amount two-pointer for the
 * longest run within CLUSTER_TOLERANCE.
 */
export function dominantCluster(txs: Transaction[]): Cluster {
  const rows = txs
    .filter((t) => t.status === "SUCCESS")
    .sort((a, b) => a.amount - b.amount);
  if (rows.length === 0) return { size: 0, cv: 0, uniqueCustomers: 0, amountCenter: 0 };

  let best = { i: 0, j: 0 };
  let i = 0;
  for (let j = 0; j < rows.length; j++) {
    while (rows[j].amount / rows[i].amount > 1 + CLUSTER_TOLERANCE) i++;
    if (j - i > best.j - best.i) best = { i, j };
  }
  const slice = rows.slice(best.i, best.j + 1);
  const amounts = slice.map((t) => t.amount);
  return {
    size: slice.length,
    cv: cv(amounts),
    uniqueCustomers: new Set(slice.map((t) => t.customerId)).size,
    amountCenter: amounts[Math.floor(amounts.length / 2)],
  };
}

export const isClustered = (c: Cluster) => c.size >= CLUSTER_MIN_SIZE && c.cv < AMOUNT_CV_LOW;
export const isConcentrated = (c: Cluster) =>
  c.size >= CLUSTER_MIN_SIZE && c.uniqueCustomers <= CONCENTRATION_MAX_CUSTOMERS;
