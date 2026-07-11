// Server-only (node:fs via loadDataset). Aggregates the monitored portfolio for
// the Dashboard: per-provider e-float, combined shared physical cash, and a real
// per-provider forecast derived from the daily-opening-balance trend. Numbers are
// computed from the generated dataset — nothing here is mocked.

import { loadDataset } from "@/lib/analytics";
import type { Balance, Cash, Provider } from "@/lib/analytics/types.ts";
import { collectAlerts, type AlertView } from "@/lib/alerts/collect.ts";
import { alertTypeLabel, agentArea } from "@/lib/display.ts";

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
  reducedConfidence: boolean; // a stale/conflicting feed makes this number less certain
}

/** Portfolio shared-cash risk: agents whose combined multi-provider cash-out
 *  demand approaches their single physical cash drawer. */
export interface SharedCashRisk {
  agents: number;
  worstMarginBdt: number | null; // most negative headroom across at-risk agents
}

export interface Overview {
  asOf: string | null;
  agentCount: number;
  combinedCash: number;
  cashSeries: number[];
  cashTrendPct: number;
  providers: ProviderOverview[];
  sharedCashRisk: SharedCashRisk;
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
      reducedConfidence: providerAlerts.some((a) => a.type === "STALE_FEED" || a.evidence.conflict === true),
    };
  });

  const scs = all.filter((a) => a.type === "SHARED_CASH_SHORTAGE");
  const sharedCashRisk: SharedCashRisk = {
    agents: new Set(scs.map((a) => a.agentId)).size,
    worstMarginBdt: scs.length ? Math.min(...scs.map((a) => Number(a.evidence.marginBdt ?? 0))) : null,
  };

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

  return { asOf, agentCount, combinedCash, cashSeries, cashTrendPct, providers, sharedCashRisk, alerts };
}

// ── Agent-scoped view (§5 "Multi-provider agent") ────────────────────────────
export interface AgentProvider {
  provider: Provider;
  float: number;
  series: number[];
  trendPct: number;
  forecast: Forecast;
  etaDays: number | null;
  reducedConfidence: boolean;
}

export interface AgentOverview {
  agentId: string;
  area: string;
  asOf: string | null;
  sharedCash: number;
  cashSeries: number[];
  cashTrendPct: number;
  /** Set when this agent's combined cash-out demand approaches their cash drawer. */
  sharedCashAtRisk: boolean;
  sharedCashMarginBdt: number | null;
  providers: AgentProvider[];
  alerts: AlertView[];
}

/** One agent's own float per provider, shared physical cash, and their alerts. */
export function agentOverview(agentId: string): AgentOverview {
  const ds = loadDataset(PORTFOLIO_SCENARIO);
  const bal = ds.balances.filter((b) => b.agentId === agentId);
  const cash = ds.cash.filter((c) => c.agentId === agentId);
  const asOf = bal.reduce<string | null>((mx, b) => (mx && mx > b.timestamp ? mx : b.timestamp), null);

  const alerts = collectAlerts().filter((a) => a.agentId === agentId);

  const providers: AgentProvider[] = PROVIDERS.map((provider) => {
    const rows = bal.filter((b) => b.provider === provider).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const float = rows.length ? rows[rows.length - 1].currentBalance : 0;
    const series = dailyOpeningSeries(rows.map((r) => ({ agentId, timestamp: r.timestamp, opening: r.openingBalance })));
    const { trendPct, forecast, etaDays } = classify(series);
    const reducedConfidence = alerts.some(
      (a) => a.provider === provider && (a.type === "STALE_FEED" || a.evidence.conflict === true),
    );
    return { provider, float, series, trendPct, forecast, etaDays, reducedConfidence };
  });

  const cashSorted = [...cash].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const sharedCash = cashSorted.length ? cashSorted[cashSorted.length - 1].currentCash : 0;
  const cashSeries = dailyOpeningSeries(cash.map((c) => ({ agentId, timestamp: c.timestamp, opening: c.openingCash })));
  const cashTrendPct = classify(cashSeries).trendPct;

  const scs = alerts.filter((a) => a.type === "SHARED_CASH_SHORTAGE");
  const sharedCashAtRisk = scs.length > 0;
  const sharedCashMarginBdt = scs.length ? Number(scs[0].evidence.marginBdt ?? 0) : null;

  return {
    agentId,
    area: agentArea(agentId),
    asOf,
    sharedCash,
    cashSeries,
    cashTrendPct,
    sharedCashAtRisk,
    sharedCashMarginBdt,
    providers,
    alerts,
  };
}

// ── Management-scoped view (§5 "Management") ──────────────────────────────────
export interface AreaRow {
  area: string;
  agentCount: number;
  total: number;
  high: number;
  medium: number;
  low: number;
  topProblem: string | null;
}

export interface ManagementOverview {
  asOf: string | null;
  areas: AreaRow[];
  byType: Array<{ label: string; count: number }>;
  totals: { agents: number; signals: number; high: number };
}

/** Area-level rollup: service risk by area, recurring problems, readiness. */
export function managementOverview(): ManagementOverview {
  const ds = loadDataset(PORTFOLIO_SCENARIO);
  const agentIds = [...new Set(ds.balances.map((b) => b.agentId))];
  const asOf = ds.balances.reduce<string | null>((mx, b) => (mx && mx > b.timestamp ? mx : b.timestamp), null);
  const all = collectAlerts();

  const areaAgents = new Map<string, Set<string>>();
  for (const id of agentIds) {
    const ar = agentArea(id);
    (areaAgents.get(ar) ?? areaAgents.set(ar, new Set()).get(ar)!).add(id);
  }

  const areas: AreaRow[] = [...areaAgents.entries()]
    .map(([area, ids]) => {
      const aa = all.filter((a) => agentArea(a.agentId) === area);
      const byType = new Map<string, number>();
      for (const x of aa) byType.set(alertTypeLabel(x.type), (byType.get(alertTypeLabel(x.type)) ?? 0) + 1);
      const topProblem = [...byType.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        area,
        agentCount: ids.size,
        total: aa.length,
        high: aa.filter((a) => a.severity === "HIGH").length,
        medium: aa.filter((a) => a.severity === "MEDIUM").length,
        low: aa.filter((a) => a.severity === "LOW").length,
        topProblem,
      };
    })
    .sort((a, b) => b.high - a.high || b.total - a.total || a.area.localeCompare(b.area));

  const byTypeMap = new Map<string, number>();
  for (const a of all) byTypeMap.set(alertTypeLabel(a.type), (byTypeMap.get(alertTypeLabel(a.type)) ?? 0) + 1);
  const byType = [...byTypeMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  return {
    asOf,
    areas,
    byType,
    totals: { agents: agentIds.length, signals: all.length, high: all.filter((a) => a.severity === "HIGH").length },
  };
}
