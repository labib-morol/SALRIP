"use client";

import { useApi } from "@/components/useApi";
import { useRoleGuard } from "@/components/auth/PersonaProvider";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingBlock, ErrorState, EmptyState, InlineBanner } from "@/components/ui/States";
import { formatDateTime } from "@/lib/display.ts";
import type { ManagementOverview, AreaRow } from "@/lib/overview.ts";

export default function ManagementPage() {
  useRoleGuard(["management"]);
  const { data, loading, error, reload } = useApi<ManagementOverview>("/api/management");

  return (
    <div>
      <PageHeader
        title="Area Overview"
        description="Service risk by area, recurring problems, and overall operational readiness."
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
          <LoadingBlock rows={4} label="Loading area overview…" />
        ) : error ? (
          <ErrorState title="Couldn't load the area overview" message={error} onRetry={reload} />
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <StatTile label="Agents monitored" value={data.totals.agents} />
              <StatTile label="Active signals" value={data.totals.signals} />
              <StatTile label="High severity" value={data.totals.high} accent={data.totals.high > 0 ? "var(--sev-high)" : undefined} />
            </div>

            <AreaTable areas={data.areas} />

            <RecurringProblems byType={data.byType} total={data.totals.signals} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="tnum mt-1 text-2xl font-semibold" style={accent ? { color: accent } : { color: "var(--ink)" }}>
        {value}
      </div>
    </Card>
  );
}

function AreaTable({ areas }: { areas: AreaRow[] }) {
  if (areas.length === 0) {
    return (
      <EmptyState
        title="No area data available"
        message="Area readiness will appear here once monitored agents and their signals are available."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">Service risk by area</h2>
        <p className="mt-0.5 text-xs text-muted">Ordered by high-severity load. Higher rows need attention first.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
              <th scope="col" className="px-5 py-2.5 font-semibold">Area</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Agents</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Signals</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">High</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Med</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Low</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Most common</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {areas.map((a) => (
              <tr key={a.area} className="transition-colors hover:bg-surface-2">
                <td className="px-5 py-3 font-medium text-ink">{a.area}</td>
                <td className="tnum px-3 py-3 text-right text-muted">{a.agentCount}</td>
                <td className="tnum px-3 py-3 text-right text-ink">{a.total}</td>
                <td className="tnum px-3 py-3 text-right font-medium" style={{ color: a.high > 0 ? "var(--sev-high)" : "var(--muted-2)" }}>
                  {a.high}
                </td>
                <td className="tnum px-3 py-3 text-right" style={{ color: a.medium > 0 ? "var(--sev-med)" : "var(--muted-2)" }}>
                  {a.medium}
                </td>
                <td className="tnum px-3 py-3 text-right text-muted-2">{a.low}</td>
                <td className="px-5 py-3 text-muted">{a.topProblem ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RecurringProblems({ byType, total }: { byType: Array<{ label: string; count: number }>; total: number }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink">Recurring problems across the region</h2>
      <p className="mt-0.5 text-xs text-muted">What drives review volume, so improvement effort can be aimed.</p>
      {byType.length === 0 ? (
        <div className="mt-4">
          <InlineBanner tone="info">No active signals — the region is clear.</InlineBanner>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {byType.map((row) => {
            const pct = total > 0 ? (row.count / total) * 100 : 0;
            return (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-sm text-ink sm:w-48" title={row.label}>{row.label}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 6)}%` }} />
                </div>
                <div className="tnum w-8 shrink-0 text-right text-sm font-medium text-muted">{row.count}</div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
