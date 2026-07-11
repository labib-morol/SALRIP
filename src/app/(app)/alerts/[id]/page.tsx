"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/components/useApi";
import { usePersona } from "@/components/auth/PersonaProvider";
import { ROLES } from "@/lib/auth/personas.ts";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingBlock, ErrorState, EmptyState, InlineBanner } from "@/components/ui/States";
import { SeverityBadge, ProviderTag, ConfidenceBadge } from "@/components/ui/Badges";
import {
  alertTypeLabel,
  humaniseKey,
  taka,
  formatDateTime,
  relativeTime,
  ALERT_TYPE_META,
  alertConfidence,
  agentArea,
} from "@/lib/display.ts";
import type { Explanation } from "@/lib/explain";
import type { AlertView } from "@/lib/alerts/collect.ts";

interface DetailResponse {
  alert: AlertView;
  explanation: Explanation | null;
  explainError: string | null;
}

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, loading, error, reload } = useApi<DetailResponse>(`/api/alerts/${id}`);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link href="/alerts" className="hover:text-brand hover:underline">
            ← Alerts
          </Link>
        }
        title={data ? alertTypeLabel(data.alert.type) : loading ? "Loading alert…" : "Alert"}
        description={data ? ALERT_TYPE_META[data.alert.type].blurb : undefined}
      />

      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {loading ? (
          <LoadingBlock rows={5} label="Generating bilingual explanation…" />
        ) : error ? (
          error.startsWith("Alert not found") ? (
            <EmptyState
              icon={<span>?</span>}
              title="Alert not found"
              message="This signal is no longer in the active feed. It may have aged out of the detection window."
              action={
                <Link href="/alerts" className="text-sm font-medium text-brand hover:underline">
                  Back to alerts
                </Link>
              }
            />
          ) : (
            <ErrorState title="Couldn't load this alert" message={error} onRetry={reload} />
          )
        ) : data ? (
          <AlertDetail data={data} />
        ) : null}
      </div>
    </div>
  );
}

function AlertDetail({ data }: { data: DetailResponse }) {
  const { alert, explanation, explainError } = data;
  const confidence = alertConfidence(alert);

  return (
    <div className="space-y-6">
      {confidence.level === "reduced" ? <ReducedConfidenceBanner reason={confidence.reason} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      {/* Main column */}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Explanation" subtitle="Bilingual, review-oriented — generated for the operations analyst" />
          <div className="p-5">
            {explanation ? (
              <div className="space-y-5">
                <h3 className="text-base font-semibold text-ink">{explanation.title}</h3>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">English</div>
                  <p className="text-sm leading-relaxed text-ink-2">{explanation.english}</p>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">বাংলা</div>
                  <p className="bangla text-[15px] text-ink-2">{explanation.bangla}</p>
                </div>
                <div className="rounded-md border border-border bg-surface-2 p-4">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand">Recommended next step</div>
                  <p className="text-sm text-ink">{explanation.recommendedAction}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <InlineBanner tone="warn">
                  The bilingual explanation service is unavailable right now, so the evidence below is shown on its own.
                </InlineBanner>
                {explainError ? (
                  <p className="break-words font-mono text-xs text-muted">{explainError}</p>
                ) : null}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Evidence" subtitle="Signals the detector measured for this window" />
          <dl className="divide-y divide-border">
            {Object.entries(alert.evidence).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt className="text-sm text-muted">{humaniseKey(key)}</dt>
                <dd className="tnum break-words text-sm font-medium text-ink sm:text-right">{formatEvidenceValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* Side column */}
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <SeverityBadge severity={alert.severity} />
            <ProviderTag provider={alert.provider} />
          </div>
          {confidence.level === "reduced" ? (
            <div className="mt-3">
              <ConfidenceBadge />
            </div>
          ) : null}
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Agent" value={<span className="tnum">{alert.agentId}</span>} />
            <Row label="Area" value={agentArea(alert.agentId)} />
            <Row label="Window start" value={<span className="tnum">{formatDateTime(alert.windowStart)}</span>} />
            <Row label="Window end" value={<span className="tnum">{formatDateTime(alert.windowEnd)}</span>} />
            <Row label="Detected" value={relativeTime(alert.windowEnd)} />
          </dl>
        </Card>

        <ActionPanel alert={alert} />
      </div>
      </div>
    </div>
  );
}

/** Promote panel for roles that coordinate; a read-only note for those that don't. */
function ActionPanel({ alert }: { alert: AlertView }) {
  const persona = usePersona();
  if (ROLES[persona.role].canPromote) return <PromotePanel alert={alert} />;
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink">Reviewed by the operations team</h3>
      <p className="mt-1 text-xs text-muted">
        {persona.role === "agent"
          ? "This signal has been shared with your operations coordinator. They decide any next step — nothing here is automatic, and no action is taken against you."
          : "Signals are promoted into cases by the operations and risk teams. This view is read-only for your role."}
      </p>
    </Card>
  );
}

/** Prominent, review-oriented reliability caveat shown above everything else. */
function ReducedConfidenceBanner({ reason }: { reason: string | null }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[var(--radius-card)] border px-5 py-4"
      style={{ borderColor: "var(--sev-med)", background: "var(--sev-med-soft)" }}
      role="note"
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ background: "var(--sev-med)", color: "var(--surface)" }}
      >
        ◑
      </span>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--sev-med)" }}>
          Reduced confidence — provider data was late or conflicting during this window
        </h3>
        <p className="mt-1 text-sm text-ink-2">
          {reason ?? "Treat the figures below as indicative rather than exact and confirm against the provider before acting."}
        </p>
      </div>
    </div>
  );
}

function PromotePanel({ alert }: { alert: AlertView }) {
  const [state, setState] = useState<"idle" | "promoting" | "done">("idle");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function promote() {
    setState("promoting");
    setErr(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: alert.type,
          agentId: alert.agentId,
          provider: alert.provider,
          severity: alert.severity,
          windowStart: alert.windowStart,
          windowEnd: alert.windowEnd,
          evidence: alert.evidence,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Promote failed (${res.status})`);
      setCaseId(body.id ?? null);
      setState("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Promote failed");
      setState("idle");
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink">Coordinate a response</h3>
      <p className="mt-1 text-xs text-muted">
        Promote this signal into a case to assign an analyst, track SLA, and record the review on the Case Board.
      </p>

      {state === "done" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-ok px-3 py-2.5 text-sm" style={{ background: "var(--ok-soft)", color: "var(--ok)" }}>
            ✓ Case created{caseId ? <> · <span className="tnum">{caseId.slice(0, 8)}</span></> : null}
          </div>
          <Link
            href="/cases"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-brand bg-brand px-4 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover"
          >
            View on Case Board →
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {err ? <InlineBanner tone="warn">{err}</InlineBanner> : null}
          <Button variant="primary" size="md" className="w-full" loading={state === "promoting"} onClick={promote}>
            {state === "promoting" ? "Promoting…" : "Promote to Case"}
          </Button>
          <p className="text-[11px] text-muted-2">
            SLA is set automatically from severity ({alert.severity === "HIGH" ? "4h" : alert.severity === "MEDIUM" ? "12h" : "24h"} to first response).
          </p>
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

const MONEY_HINTS = ["amount", "cash", "demand", "balance", "opening", "margin", "float"];

function formatEvidenceValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    const k = key.toLowerCase();
    if (k.endsWith("pct")) return `${value}%`;
    if (k.includes("eta") || k.includes("days")) return value < 0 ? "—" : `${value} days`;
    if (MONEY_HINTS.some((h) => k.includes(h))) return taka(value);
    return new Intl.NumberFormat("en-US").format(value);
  }
  return String(value);
}
