"use client";

import Link from "next/link";
import { useApi } from "@/components/useApi";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { LoadingBlock, ErrorState, InlineBanner } from "@/components/ui/States";
import { ProviderTag } from "@/components/ui/Badges";
import { taka, formatDateTime, PROVIDER_META } from "@/lib/display.ts";
import type { Overview, ProviderOverview, Forecast } from "@/lib/overview.ts";

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi<Overview>("/api/overview");

  return (
    <div>
      <PageHeader
        title="Portfolio Overview"
        description="Live float, shared cash, and risk posture across all monitored Super Agents."
        right={
          data ? (
            <span className="text-xs text-muted">
              As of <span className="tnum">{data.asOf ? formatDateTime(data.asOf) : "—"}</span>
            </span>
          ) : null
        }
      />

      <div className="mx-auto max-w-[1200px] px-8 py-7">
        {loading ? (
          <LoadingBlock rows={4} label="Loading portfolio…" />
        ) : error ? (
          <ErrorState title="Couldn't load the portfolio" message={error} onRetry={reload} />
        ) : data ? (
          <DashboardBody data={data} />
        ) : null}
      </div>
    </div>
  );
}

function DashboardBody({ data }: { data: Overview }) {
  return (
    <div className="space-y-6">
      {/* Top row: combined cash + two provider cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <CombinedCashCard data={data} />
        {data.providers.map((p) => (
          <ProviderCard key={p.provider} p={p} />
        ))}
      </div>

      {/* Risk posture */}
      <RiskPosture data={data} />
    </div>
  );
}

function CombinedCashCard({ data }: { data: Overview }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Combined Physical Cash</div>
          <div className="mt-0.5 text-[11px] text-muted-2">Shared pool · {data.agentCount} agents</div>
        </div>
        <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
          Pooled
        </span>
      </div>
      <div className="tnum mt-4 text-3xl font-semibold text-ink">{taka(data.combinedCash)}</div>
      <div className="mt-3 flex items-end justify-between">
        <ForecastChip forecast={data.cashTrendPct < -0.5 ? "declining" : data.cashTrendPct > 0.5 ? "rising" : "stable"} trendPct={data.cashTrendPct} etaDays={null} />
        <Sparkline data={data.cashSeries} color="var(--brand)" />
      </div>
    </Card>
  );
}

function ProviderCard({ p }: { p: ProviderOverview }) {
  const meta = PROVIDER_META[p.provider];
  return (
    <Card className="relative overflow-hidden p-5">
      {/* provider identity accent bar */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: meta.color }} aria-hidden />
      <div className="flex items-start justify-between">
        <ProviderTag provider={p.provider} size="md" />
        {p.activeSignals > 0 ? (
          <Link
            href={`/alerts?provider=${p.provider}`}
            className="rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors hover:brightness-95"
            style={{ color: "var(--sev-high)", borderColor: "var(--sev-high)", background: "var(--sev-high-soft)" }}
          >
            {p.activeSignals} signal{p.activeSignals > 1 ? "s" : ""}
            {p.highSignals > 0 ? ` · ${p.highSignals} high` : ""}
          </Link>
        ) : (
          <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-ok" style={{ background: "var(--ok-soft)" }}>
            No signals
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted">e-Float balance</div>
      <div className="tnum mt-3 text-3xl font-semibold text-ink">{taka(p.float)}</div>
      <div className="mt-3 flex items-end justify-between">
        <ForecastChip forecast={p.forecast} trendPct={p.trendPct} etaDays={p.etaDays} />
        <Sparkline data={p.series} color={meta.color} />
      </div>
    </Card>
  );
}

function ForecastChip({ forecast, trendPct, etaDays }: { forecast: Forecast; trendPct: number; etaDays: number | null }) {
  const map = {
    declining: { color: "var(--sev-high)", bg: "var(--sev-high-soft)", arrow: "↓", label: "Declining" },
    rising: { color: "var(--ok)", bg: "var(--ok-soft)", arrow: "↑", label: "Rising" },
    stable: { color: "var(--sev-low)", bg: "var(--sev-low-soft)", arrow: "→", label: "Stable" },
  }[forecast];
  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
        style={{ color: map.color, background: map.bg }}
      >
        <span aria-hidden>{map.arrow}</span>
        {map.label}
        <span className="tnum font-medium opacity-80">
          {trendPct > 0 ? "+" : ""}
          {trendPct}%
        </span>
      </span>
      <span className="text-[11px] text-muted">
        {forecast === "declining" && etaDays != null ? `~${etaDays}d to depletion · 7-day trend` : "7-day opening trend"}
      </span>
    </div>
  );
}

function RiskPosture({ data }: { data: Overview }) {
  const a = data.alerts;
  const tiles = [
    { label: "Active Signals", value: a.total, color: "var(--ink)" },
    { label: "High", value: a.high, color: "var(--sev-high)" },
    { label: "Medium", value: a.medium, color: "var(--sev-med)" },
    { label: "Low", value: a.low, color: "var(--sev-low)" },
  ];
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Risk Posture</h2>
          <p className="mt-0.5 text-xs text-muted">Signals awaiting review across the fleet</p>
        </div>
        <Link href="/alerts" className="text-xs font-medium text-brand hover:underline">
          View all alerts →
        </Link>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="px-5 py-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">{t.label}</div>
            <div className="tnum mt-1 text-2xl font-semibold" style={{ color: t.color }}>
              {t.value}
            </div>
          </div>
        ))}
      </div>
      {a.byType.length > 0 ? (
        <div className="border-t border-border px-5 py-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">By signal type</div>
          <div className="space-y-2.5">
            {a.byType.map((row) => {
              const pct = a.total > 0 ? (row.count / a.total) * 100 : 0;
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-44 shrink-0 text-sm text-ink">{row.label}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 6)}%` }} />
                  </div>
                  <div className="tnum w-8 shrink-0 text-right text-sm font-medium text-muted">{row.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-5 py-4">
          <InlineBanner tone="info">No active signals — the fleet is clear.</InlineBanner>
        </div>
      )}
    </Card>
  );
}
