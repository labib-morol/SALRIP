import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BUILDERS } from "./scenarios.ts";
import type { DatasetBundle, Transaction } from "./types.ts";

const OUT = join(process.cwd(), "data");

function writeJson(dir: string, name: string, data: unknown): void {
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n");
}

function inWindow(t: Transaction, agentId: string, provider: string, startIso: string, endIso: string): boolean {
  return (
    t.agentId === agentId &&
    t.provider === provider &&
    t.timestamp >= startIso &&
    t.timestamp < endIso &&
    t.status === "SUCCESS"
  );
}

function cv(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean === 0) return 0;
  const varc = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(varc) / mean;
}

interface WindowStat {
  scenario: string;
  /** the injected pattern in isolation (what the generator guarantees) */
  clusterCount: number;
  clusterUnique: number;
  clusterCv: number;
  /** everything in the window incl. co-occurring baseline (what a naive detector sees) */
  windowCount: number;
  windowCv: number;
}

function statsFor(ts: Transaction[]) {
  const amounts = ts.map((t) => t.amount);
  return { count: ts.length, unique: new Set(ts.map((t) => t.customerId)).size, cv: cv(amounts) };
}

/**
 * Two views of the labelled window:
 *  - cluster: only the injected burst tx (txId "BURST-*") — proves the generator
 *    embedded the claimed near-identical / concentrated pattern.
 *  - window: cluster + co-occurring baseline — shows the real, harder signal a
 *    window-average detector sees, which is why velocity gates the CV/concentration test.
 */
function windowStat(b: DatasetBundle): WindowStat | null {
  const L = b.label;
  if (!L.targetAgentId || !L.targetProvider || !L.windowStart || !L.windowEnd) return null;
  const win = b.transactions.filter((t) =>
    inWindow(t, L.targetAgentId!, L.targetProvider!, L.windowStart!, L.windowEnd!),
  );
  const cluster = win.filter((t) => t.txId.startsWith("BURST-"));
  const w = statsFor(win);
  const c = cluster.length ? statsFor(cluster) : w; // no injected cluster -> use window
  return {
    scenario: b.scenario,
    clusterCount: c.count,
    clusterUnique: c.unique,
    clusterCv: c.cv,
    windowCount: w.count,
    windowCv: w.cv,
  };
}

function main(): void {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const manifest: Array<Record<string, unknown>> = [];
  const stats: WindowStat[] = [];
  let eStat: { providers: number; demand: number } | null = null;

  for (const build of BUILDERS) {
    const b = build();
    if (b.scenario === "E_shared_cash_shortage") {
      const target = b.label.targetAgentId;
      const burst = b.transactions.filter(
        (t) => t.txId.startsWith("BURST-") && t.agentId === target && t.type === "CASH_OUT",
      );
      eStat = {
        providers: new Set(burst.map((t) => t.provider)).size,
        demand: burst.reduce((a, t) => a + t.amount, 0),
      };
    }
    const dir = join(OUT, b.scenario);
    mkdirSync(dir, { recursive: true });
    writeJson(dir, "transactions.json", b.transactions);
    writeJson(dir, "balances.json", b.balances);
    writeJson(dir, "cash.json", b.cash);
    writeJson(dir, "labels.json", b.label);
    if (b.alerts) writeJson(dir, "alerts.json", b.alerts);
    if (b.cases) writeJson(dir, "cases.json", b.cases);

    manifest.push({
      scenario: b.scenario,
      shouldAlert: b.label.shouldAlert,
      anomalyType: b.label.anomalyType,
      transactions: b.transactions.length,
      balances: b.balances.length,
      tripsSignals: b.label.tripsSignals,
    });
    const s = windowStat(b);
    if (s) stats.push(s);
  }
  writeJson(OUT, "manifest.json", manifest);

  // ---- report ----
  console.log("\nDatasets written to data/:\n");
  console.table(manifest.map((m) => ({ scenario: m.scenario, shouldAlert: m.shouldAlert, tx: m.transactions })));

  console.log("\nInjected-cluster vs mixed-window stats (cluster = generator guarantee):\n");
  console.table(
    stats.map((s) => ({
      scenario: s.scenario,
      clTx: s.clusterCount,
      clUniq: s.clusterUnique,
      clusterCV: s.clusterCv.toFixed(3),
      winTx: s.windowCount,
      windowCV: s.windowCv.toFixed(3),
    })),
  );

  // ---- assertions: the INJECTED pattern must sit where the labels claim ----
  const byName = Object.fromEntries(stats.map((s) => [s.scenario, s]));
  const checks: Array<[string, boolean]> = [
    ["B fraud burst cluster CV < 0.15 (near-identical)", byName["B_fraud_burst"].clusterCv < 0.15],
    ["B fraud burst cluster <= 3 customers", byName["B_fraud_burst"].clusterUnique <= 3],
    ["hn_salary_day cluster CV < 0.15 (clustered amounts)", byName["hn_salary_day"].clusterCv < 0.15],
    ["hn_salary_day cluster many customers (> 15)", byName["hn_salary_day"].clusterUnique > 15],
    ["hn_corporate cluster CV > 0.30 (NOT clustered)", byName["hn_corporate_disbursement"].clusterCv > 0.3],
    ["hn_corporate cluster <= 3 customers (concentrated)", byName["hn_corporate_disbursement"].clusterUnique <= 3],
    ["normal_high_volume window CV > 0.30 (diverse amounts)", byName["normal_high_volume"].windowCv > 0.3],
    ["E cash-out demand spans 2 providers (shared)", (eStat?.providers ?? 0) === 2],
    ["E combined cash-out demand >= 55k (exceeds thin cash)", (eStat?.demand ?? 0) >= 55_000],
  ];
  console.log("\nSanity assertions:\n");
  let ok = true;
  for (const [name, pass] of checks) {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) ok = false;
  }
  if (!ok) {
    console.error("\nOne or more dataset properties did not match their labels.");
    process.exit(1);
  }
  console.log("\nAll dataset properties match their labels.\n");
}

main();
