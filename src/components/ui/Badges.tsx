import type { AlertType, Provider } from "@/lib/analytics/types.ts";
import type { CaseStatus } from "@/lib/cases/types.ts";
import { PROVIDER_META, SEVERITY_META, alertTypeLabel, type Severity } from "@/lib/display.ts";

/**
 * Three categorical channels, kept visually distinct on purpose:
 *  - ProviderTag  → marked with a glyph + name (whose money)
 *  - SeverityBadge → filled pill with label (how urgent)
 *  - StatusPill    → ghost outline (workflow state)
 * A Nagad orange tag can never be mistaken for a MEDIUM amber badge because
 * one carries a glyph + provider name and the other is a solid urgency pill.
 */

export function ProviderTag({ provider, size = "sm" }: { provider: Provider; size?: "sm" | "md" }) {
  const m = PROVIDER_META[provider];
  const pad = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad}`}
      style={{ color: m.color, borderColor: m.color, background: m.soft }}
    >
      <span aria-hidden style={{ fontSize: "0.7em", lineHeight: 1 }}>
        {m.glyph}
      </span>
      {m.name}
    </span>
  );
}

/** Bare provider marker for tight rows (dot/diamond + name, no chrome). */
export function ProviderMark({ provider }: { provider: Provider }) {
  const m = PROVIDER_META[provider];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: m.color }}>
      <span aria-hidden style={{ fontSize: "0.65em" }}>
        {m.glyph}
      </span>
      {m.name}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color: m.color, background: m.soft }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

const STATUS_STYLE: Record<CaseStatus, { color: string; bg: string; border: string }> = {
  Open: { color: "var(--muted)", bg: "transparent", border: "var(--border-strong)" },
  Assigned: { color: "var(--brand)", bg: "var(--surface-2)", border: "var(--brand)" },
  Acknowledged: { color: "var(--ink-2)", bg: "var(--surface-2)", border: "var(--border-strong)" },
  Escalated: { color: "var(--sev-high)", bg: "var(--sev-high-soft)", border: "var(--sev-high)" },
  Resolved: { color: "var(--ok)", bg: "var(--ok-soft)", border: "var(--ok)" },
};

export function StatusPill({ status }: { status: CaseStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {status}
    </span>
  );
}

export function AlertTypeLabel({ type, className }: { type: AlertType; className?: string }) {
  return <span className={className}>{alertTypeLabel(type)}</span>;
}

/**
 * Reliability marker. Only rendered when confidence is reduced (a high-confidence
 * alert needs no badge) — a striped amber pill that reads as a caveat, visually
 * distinct from the solid severity badge and the outlined status pill.
 */
export function ConfidenceBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide ${
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-[11px]"
      }`}
      style={{ color: "var(--sev-med)", borderColor: "var(--sev-med)", background: "var(--sev-med-soft)" }}
      title="Provider data was late or conflicting during this window"
    >
      <span aria-hidden className="text-[0.85em] leading-none">
        ◑
      </span>
      Reduced confidence
    </span>
  );
}
