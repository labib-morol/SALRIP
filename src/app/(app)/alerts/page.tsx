"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/components/useApi";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { SeverityBadge, ProviderMark, ConfidenceBadge } from "@/components/ui/Badges";
import {
  alertTypeLabel,
  relativeTime,
  formatDateTime,
  ALERT_TYPE_META,
  agentArea,
  alertConfidence,
  AREAS,
  type Severity,
  type Area,
} from "@/lib/display.ts";
import type { Provider } from "@/lib/analytics/types.ts";
import type { AlertView } from "@/lib/alerts/collect.ts";

const PROVIDERS: Array<Provider | "All"> = ["All", "bKash", "Nagad"];
const SEVERITIES: Array<Severity | "All"> = ["All", "HIGH", "MEDIUM", "LOW"];
const AREA_OPTIONS: Array<Area | "All"> = ["All", ...AREAS];

const TIME_WINDOWS = [
  { key: "All", label: "Any time", hours: 0 },
  { key: "24h", label: "Last 24h", hours: 24 },
  { key: "7d", label: "Last 7d", hours: 24 * 7 },
  { key: "30d", label: "Last 30d", hours: 24 * 30 },
] as const;
type TimeKey = (typeof TIME_WINDOWS)[number]["key"];

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><LoadingBlock label="Loading alerts…" /></div>}>
      <AlertsView />
    </Suspense>
  );
}

function AlertsView() {
  const search = useSearchParams();
  const initialProvider = (search.get("provider") as Provider | null) ?? "All";
  const { data, loading, error, reload } = useApi<{ alerts: AlertView[] }>("/api/alerts");

  const [now] = useState(Date.now);
  const [provider, setProvider] = useState<Provider | "All">(
    PROVIDERS.includes(initialProvider) ? initialProvider : "All",
  );
  const [severity, setSeverity] = useState<Severity | "All">("All");
  const [area, setArea] = useState<Area | "All">("All");
  const [agent, setAgent] = useState<string>("All");
  const [time, setTime] = useState<TimeKey>("All");

  const all = useMemo(() => data?.alerts ?? [], [data]);
  const agents = useMemo(
    () => Array.from(new Set(all.map((a) => a.agentId))).sort(),
    [all],
  );

  function clearFilters() {
    setProvider("All");
    setSeverity("All");
    setArea("All");
    setAgent("All");
    setTime("All");
  }

  const filtered = useMemo(() => {
    const hours = TIME_WINDOWS.find((w) => w.key === time)?.hours ?? 0;
    const cutoff = hours > 0 ? now - hours * 3600_000 : 0;
    return all.filter(
      (a) =>
        (provider === "All" || a.provider === provider) &&
        (severity === "All" || a.severity === severity) &&
        (area === "All" || agentArea(a.agentId) === area) &&
        (agent === "All" || a.agentId === agent) &&
        (cutoff === 0 || new Date(a.windowEnd).getTime() >= cutoff),
    );
  }, [all, provider, severity, area, agent, time, now]);

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Automated risk signals awaiting review. Ordered by severity."
        right={!loading && !error ? <span className="text-xs text-muted"><span className="tnum">{all.length}</span> active</span> : null}
      />

      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
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
          <FilterGroup label="Area">
            <Select label="Area" value={area} onChange={(v) => setArea(v as Area | "All")}>
              {AREA_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </FilterGroup>
          <FilterGroup label="Agent">
            <Select label="Agent" value={agent} onChange={setAgent}>
              <option value="All">All</option>
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </FilterGroup>
          <FilterGroup label="Time">
            <Select label="Time window" value={time} onChange={(v) => setTime(v as TimeKey)}>
              {TIME_WINDOWS.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </Select>
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
            message="Try widening the provider, severity, area, or agent filter to see more signals."
            action={
              <button onClick={clearFilters} className="min-h-11 px-2 text-sm font-medium text-brand hover:underline md:min-h-8">
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
      <div className="hidden grid-cols-[92px_minmax(0,1fr)_120px_150px_96px_28px] items-center gap-4 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted lg:grid">
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
              className="grid min-h-14 grid-cols-[84px_minmax(0,1fr)_20px] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[92px_minmax(0,1fr)_96px_20px] sm:gap-4 sm:px-5 lg:grid-cols-[92px_minmax(0,1fr)_120px_150px_96px_28px]"
            >
              <div>
                <SeverityBadge severity={a.severity} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{alertTypeLabel(a.type)}</span>
                  {alertConfidence(a).level === "reduced" ? <ConfidenceBadge compact /> : null}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  <span className="tnum">{a.agentId}</span> · {agentArea(a.agentId)} · {ALERT_TYPE_META[a.type].blurb}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted lg:hidden">
                  <ProviderMark provider={a.provider} />
                  <span aria-hidden>·</span>
                  <span>{relativeTime(a.windowEnd)}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <ProviderMark provider={a.provider} />
              </div>
              <div className="tnum hidden text-xs text-muted lg:block">{formatDateTime(a.windowStart)}</div>
              <div className="hidden text-xs text-muted sm:block">{relativeTime(a.windowEnd)}</div>
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
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${label} filter`}>
      <span aria-hidden className="text-xs font-medium uppercase tracking-wide text-muted-2">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={`${label} filter`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tnum h-11 appearance-none rounded-full border border-border-strong bg-surface pl-3 pr-8 text-xs font-medium text-ink transition-colors hover:bg-surface-2 focus:border-brand focus:outline-none md:h-8"
      >
        {children}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-2">
        ▼
      </span>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3 py-1 text-xs font-medium transition-colors md:min-h-8 ${
        active
          ? "border-brand bg-brand text-brand-ink"
          : "border-border-strong bg-surface text-muted hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
