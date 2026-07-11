// Server-only (node:fs via loadDataset). Aggregates the monitored portfolio for
// the Dashboard: per-provider e-float, combined shared physical cash, and a real
// per-provider forecast derived from the daily-opening-balance trend. Numbers are
// computed from the generated dataset — nothing here is mocked.

import { loadDataset } from "@/lib/analytics";
import type { Balance, Cash, Provider } from "@/lib/analytics/types.ts";
import { collectAlerts } from "@/lib/alerts/collect.ts";
import { alertTypeLabel } from "@/lib/display.ts";

const PROVIDERS: Provider[] = ["bKash", "Nagad"];
/** Baseline = the normal operating portfolio (20 agents, both providers). */
const PORTFOLIO_SCENARIO = "baseline";
const WINDOW_DAYS = 7;

export type Forecast = "declining" | "rising" | "stable";

export interface ProviderOverview {
  provider: Provider;
  float: number; // latest current balance summed across agents
  series: number[]; // daily opening totals over the window (for a sparkline)
  trendPct: number; // % change first→last day of the window
  forecast: Forecast;
  etaDays: number | null; // projected days to depletion if declining
  activeSignals: number; // live detection alerts naming this provider
  highSignals: number; // ...of which HIGH severity
}

export interface Overview {
  asOf: string | null;
  agentCount: number;
  combinedCash: number;
  cashSeries: number[];
  cashTrendPct: number;
  providers: ProviderOverview[];
  alerts: { total: number; high: number; medium: number; low: number; byType: Array<{ label: string; count: number }> };
}

/** Latest snapshot per agent, summed. */
function latestSumByAgent<T extends { agentId: string; timestamp: string }>(rows: T[], value: (r: T) => number): number {
  const latest = new Map<string, T>();
  for (const r of rows) {
    const prev = latest.get(r.agentId);
    if (!prev || r.timestamp > prev.timestamp) latest.set(r.agentId, r);
  }
  return [...latest.values()].reduce((s, r) => s + value(r), 0);
}

/** Daily opening total (first snapshot per agent per day, summed), last N days. */
function dailyOpeningSeries(rows: Array<{ agentId: string; timestamp: string; opening: number }>, days = WINDOW_DAYS): number[] {
  const perDay = new Map<string, Map<string, number>>(); // day -> agent -> first opening
  for (const r of [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    const day = r.timestamp.slice(0, 10);
    const agents = perDay.get(day) ?? perDay.set(day, new Map()).get(day)!;
    if (!agents.has(r.agentId)) agents.set(r.agentId, r.opening);
  }
  const days_ = [...perDay.keys()].sort();
  return days_.slice(-days).map((d) => [...perDay.get(d)!.values()].reduce((s, v) => s + v, 0));
}

function classify(series: number[]): { trendPct: number; forecast: Forecast; etaDays: number | null } {
  if (series.length < 2) return { trendPct: 0, forecast: "stable", etaDays: null };
  const first = series[0];
  const last = series[series.length - 1];
  const trendPct = first > 0 ? ((last - first) / first) * 100 : 0;
  let forecast: Forecast = "stable";
  if (trendPct <= -3) forecast = "declining";
  else if (trendPct >= 3) forecast = "rising";
  let etaDays: number | null = null;
  if (forecast === "declining") {
    const perDayDrop = (first - last) / (series.length - 1);
    etaDays = perDayDrop > 0 ? Math.round(last / perDayDrop) : null;
  }
  return { trendPct: Number(trendPct.toFixed(1)), forecast, etaDays };
}

export function buildOverview(): Overview {
  const ds = loadDataset(PORTFOLIO_SCENARIO);
  const balances: Balance[] = ds.balances;
  const cash: Cash[] = ds.cash;

  const agentCount = new Set(balances.map((b) => b.agentId)).size;
  const asOf = balances.reduce<string | null>((mx, b) => (mx && mx > b.timestamp ? mx : b.timestamp), null);

  const all = collectAlerts();

  const providers: ProviderOverview[] = PROVIDERS.map((provider) => {
    const rows = balances.filter((b) => b.provider === provider);
    const float = latestSumByAgent(rows, (r) => r.currentBalance);
    const series = dailyOpeningSeries(rows.map((r) => ({ agentId: r.agentId, timestamp: r.timestamp, opening: r.openingBalance })));
    const { trendPct, forecast, etaDays } = classify(series);
    const providerAlerts = all.filter((a) => a.provider === provider);
    return {
      provider,
      float,
      series,
      trendPct,
      forecast,
      etaDays,
      activeSignals: providerAlerts.length,
      highSignals: providerAlerts.filter((a) => a.severity === "HIGH").length,
    };
  });

  const combinedCash = latestSumByAgent(cash, (r) => r.currentCash);
  const cashSeries = dailyOpeningSeries(cash.map((r) => ({ agentId: r.agentId, timestamp: r.timestamp, opening: r.openingCash })));
  const cashTrendPct = classify(cashSeries).trendPct;

  const byTypeMap = new Map<string, number>();
  for (const a of all) {
    const label = alertTypeLabel(a.type);
    byTypeMap.set(label, (byTypeMap.get(label) ?? 0) + 1);
  }
  const alerts = {
    total: all.length,
    high: all.filter((a) => a.severity === "HIGH").length,
    medium: all.filter((a) => a.severity === "MEDIUM").length,
    low: all.filter((a) => a.severity === "LOW").length,
    byType: [...byTypeMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };

  return { asOf, agentCount, combinedCash, cashSeries, cashTrendPct, providers, alerts };
}
