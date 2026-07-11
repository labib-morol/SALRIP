"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/components/useApi";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { SeverityBadge, ProviderMark } from "@/components/ui/Badges";
import { alertTypeLabel, relativeTime, formatDateTime, ALERT_TYPE_META, type Severity } from "@/lib/display.ts";
import type { Provider } from "@/lib/analytics/types.ts";
import type { AlertView } from "@/lib/alerts/collect.ts";

const PROVIDERS: Array<Provider | "All"> = ["All", "bKash", "Nagad"];
const SEVERITIES: Array<Severity | "All"> = ["All", "HIGH", "MEDIUM", "LOW"];

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-8 py-7"><LoadingBlock label="Loading alerts…" /></div>}>
      <AlertsView />
    </Suspense>
  );
}

function AlertsView() {
  const search = useSearchParams();
  const initialProvider = (search.get("provider") as Provider | null) ?? "All";
  const { data, loading, error, reload } = useApi<{ alerts: AlertView[] }>("/api/alerts");

  const [provider, setProvider] = useState<Provider | "All">(
    PROVIDERS.includes(initialProvider) ? initialProvider : "All",
  );
  const [severity, setSeverity] = useState<Severity | "All">("All");

  const all = data?.alerts ?? [];
  const filtered = useMemo(
    () =>
      all.filter(
        (a) => (provider === "All" || a.provider === provider) && (severity === "All" || a.severity === severity),
      ),
    [all, provider, severity],
  );

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Automated risk signals awaiting review. Ordered by severity."
        right={!loading && !error ? <span className="text-xs text-muted"><span className="tnum">{all.length}</span> active</span> : null}
      />

      <div className="mx-auto max-w-[1200px] px-8 py-7">
        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <FilterGroup label="Provider">
            {PROVIDERS.map((p) => (
              <Chip key={p} active={provider === p} onClick={() => setProvider(p)}>
                {p}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Severity">
            {SEVERITIES.map((s) => (
              <Chip key={s} active={severity === s} onClick={() => setSeverity(s)}>
                {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </Chip>
            ))}
          </FilterGroup>
        </div>

        {loading ? (
          <LoadingBlock label="Loading alerts…" />
        ) : error ? (
          <ErrorState title="Couldn't load alerts" message={error} onRetry={reload} />
        ) : all.length === 0 ? (
          <EmptyState
            title="No active alerts"
            message="The detection engine has flagged nothing for review. New signals will appear here automatically."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<span className="text-lg">⌕</span>}
            title="No alerts match these filters"
            message="Try widening the provider or severity filter to see more signals."
            action={
              <button
                onClick={() => {
                  setProvider("All");
                  setSeverity("All");
                }}
                className="text-sm font-medium text-brand hover:underline"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <AlertsTable alerts={filtered} />
        )}
      </div>
    </div>
  );
}

function AlertsTable({ alerts }: { alerts: AlertView[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[92px_1fr_120px_150px_96px_28px] items-center gap-4 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <div>Severity</div>
        <div>Signal</div>
        <div>Provider</div>
        <div>Window start</div>
        <div>Detected</div>
        <div />
      </div>
      <ul className="divide-y divide-border">
        {alerts.map((a) => (
          <li key={a.id}>
            <Link
              href={`/alerts/${a.id}`}
              className="grid grid-cols-[92px_1fr_120px_150px_96px_28px] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
            >
              <div>
                <SeverityBadge severity={a.severity} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{alertTypeLabel(a.type)}</div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  <span className="tnum">{a.agentId}</span> · {ALERT_TYPE_META[a.type].blurb}
                </div>
              </div>
              <div>
                <ProviderMark provider={a.provider} />
              </div>
              <div className="tnum text-xs text-muted">{formatDateTime(a.windowStart)}</div>
              <div className="text-xs text-muted">{relativeTime(a.windowEnd)}</div>
              <div className="text-muted-2" aria-hidden>
                ›
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-2">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-brand bg-brand text-brand-ink"
          : "border-border-strong bg-surface text-muted hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
