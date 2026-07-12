"use client";

import Link from "next/link";
import { useApi } from "@/components/useApi";
import { useRoleGuard } from "@/components/auth/PersonaProvider";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { ProviderTag, SeverityBadge, ConfidenceBadge } from "@/components/ui/Badges";
import { taka, formatDateTime, alertTypeLabel, relativeTime, alertConfidence, agentAdvisory, compactTaka, PROVIDER_META } from "@/lib/display.ts";
import type { AgentOverview, AgentProvider } from "@/lib/overview.ts";
import type { AlertView } from "@/lib/alerts/collect.ts";

export default function MyOperationPage() {
  const persona = useRoleGuard(["agent"]);
  const { data, loading, error, reload } = useApi<AgentOverview>("/api/me");

  return (
    <div>
      <PageHeader
        title="My Operation"
        description={`${persona.name} · agent ${persona.agentId}${data ? ` · ${data.area}` : ""}`}
        right={
          data ? (
            <span className="text-xs text-muted">
              As of <span className="tnum">{data.asOf ? formatDateTime(data.asOf) : "—"}</span>
            </span>
          ) : null
        }
      />

      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        {loading ? (
          <LoadingBlock rows={3} label="Loading your operation…" />
        ) : error ? (
          <ErrorState title="Couldn't load your operation" message={error} onRetry={reload} />
        ) : data ? (
          <div className="space-y-6">
            {data.alerts.length > 0 ? <AdvisoryBanner alert={data.alerts[0]} /> : null}

            {/* Balances: shared cash + one card per provider e-float */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
              <BalanceCard
                label="Physical cash on hand"
                hint="Shared across both providers"
                value={data.sharedCash}
                trendPct={data.cashTrendPct}
                series={data.cashSeries}
                color="var(--brand)"
                atRisk={data.sharedCashAtRisk}
                marginBdt={data.sharedCashMarginBdt}
              />
              {data.providers.map((p) => (
                <ProviderFloatCard key={p.provider} p={p} />
              ))}
            </div>

            <AlertsPanel alerts={data.alerts} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Plain-language, bilingual nudge for the agent — the illustrative Bangla alert. */
function AdvisoryBanner({ alert }: { alert: AlertView }) {
  const a = agentAdvisory(alert);
  const reduced = alertConfidence(alert).level === "reduced";
  const tone = reduced ? "var(--sev-med)" : "var(--brand)";
  const soft = reduced ? "var(--sev-med-soft)" : "var(--surface-2)";
  return (
    <div className="rounded-[var(--radius-card)] border p-5" style={{ borderColor: tone, background: soft }}>
      <div className="flex items-center gap-2">
        <span aria-hidden style={{ color: tone }}>◆</span>
        <h2 className="text-sm font-semibold text-ink">{a.title}</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{a.english}</p>
      <p className="bangla mt-2 text-[15px] text-ink-2">{a.bangla}</p>
      <Link href={`/alerts/${alert.id}`} className="mt-3 inline-flex min-h-11 items-center text-xs font-medium text-brand hover:underline md:min-h-6">
        See the evidence →
      </Link>
    </div>
  );
}

function BalanceCard({
  label,
  hint,
  value,
  trendPct,
  series,
  color,
  atRisk,
  marginBdt,
}: {
  label: string;
  hint: string;
  value: number;
  trendPct: number;
  series: number[];
  color: string;
  atRisk?: boolean;
  marginBdt?: number | null;
}) {
  return (
    <Card className="p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{label}</h2>
      <div className="mt-0.5 text-[11px] text-muted-2">{hint}</div>
      <div className="tnum mt-3 text-2xl font-semibold text-ink">{taka(value)}</div>
      <div className="mt-2 flex items-end justify-between">
        <TrendPill trendPct={trendPct} />
        <Sparkline data={series} color={color} width={104} height={30} />
      </div>
      {atRisk ? (
        <div
          className="mt-3 rounded-md px-2.5 py-1.5 text-[11px] font-medium"
          style={{ color: "var(--sev-high)", background: "var(--sev-high-soft)" }}
        >
          Combined cash-out demand is near this drawer
          {marginBdt != null ? ` · ${marginBdt < 0 ? "short by " : "headroom "}${compactTaka(Math.abs(marginBdt))}` : ""}
        </div>
      ) : null}
    </Card>
  );
}

function ProviderFloatCard({ p }: { p: AgentProvider }) {
  const meta = PROVIDER_META[p.provider];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <ProviderTag provider={p.provider} />
        <ConfidenceBadge level={p.reducedConfidence ? "reduced" : "high"} compact />
      </div>
      <div className="tnum mt-3 text-2xl font-semibold text-ink">{taka(p.float)}</div>
      <div className="mt-2 flex items-end justify-between">
        <TrendPill trendPct={p.trendPct} forecast={p.forecast} etaDays={p.etaDays} />
        <Sparkline data={p.series} color={meta.color} width={104} height={30} />
      </div>
    </Card>
  );
}

function TrendPill({
  trendPct,
  forecast,
  etaDays,
}: {
  trendPct: number;
  forecast?: AgentProvider["forecast"];
  etaDays?: number | null;
}) {
  const declining = forecast === "declining" || (forecast === undefined && trendPct <= -3);
  const rising = forecast === "rising" || (forecast === undefined && trendPct >= 3);
  const tone = declining
    ? { color: "var(--sev-high)", bg: "var(--sev-high-soft)", arrow: "↓" }
    : rising
      ? { color: "var(--ok)", bg: "var(--ok-soft)", arrow: "↑" }
      : { color: "var(--sev-low)", bg: "var(--sev-low-soft)", arrow: "→" };
  return (
    <div className="flex flex-col gap-1">
      <span
        className="tnum inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
        style={{ color: tone.color, background: tone.bg }}
      >
        <span aria-hidden>{tone.arrow}</span>
        {trendPct > 0 ? "+" : ""}
        {trendPct}%
      </span>
      <span className="text-[11px] text-muted">
        {declining && etaDays != null ? `~${etaDays}d to depletion · 7-day trend` : "7-day trend"}
      </span>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: AlertView[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Alerts on your operation</h2>
          <p className="mt-0.5 text-xs text-muted">Signals to review — none of this is an accusation or an automatic action.</p>
        </div>
        <span className="text-xs text-muted">
          <span className="tnum">{alerts.length}</span> active
        </span>
      </div>
      {alerts.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No signals right now" message="Your float, shared cash, and activity look normal. New signals will appear here for you to review." />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {alerts.map((a) => (
            <li key={a.id}>
              <Link href={`/alerts/${a.id}`} className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:gap-4 sm:px-5">
                <SeverityBadge severity={a.severity} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{alertTypeLabel(a.type)}</span>
                    {alertConfidence(a).level === "reduced" ? <ConfidenceBadge compact /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{a.provider} · {relativeTime(a.windowEnd)}</span>
                </span>
                <span aria-hidden className="text-muted-2">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
