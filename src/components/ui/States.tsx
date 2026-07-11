import type { ReactNode } from "react";

/** Shimmer skeleton line/box. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

/** Full-panel loading: N skeleton rows inside a bordered canvas. */
export function LoadingBlock({ rows = 5, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5" role="status" aria-live="polite">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
        {label}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Intentional empty state on a dotted canvas — reads as "designed", not blank. */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="canvas-grid flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-brand">
        {icon ?? <span className="text-lg">✓</span>}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Error surface — never a silent blank. Shows the real message + retry. */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-card)] border border-[var(--sev-high)] bg-[var(--sev-high-soft)] px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: "var(--sev-high)" }}
        >
          !
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--sev-high)]">{title}</h3>
          <p className="mt-1 break-words font-mono text-xs text-ink-2">{message}</p>
          {onRetry ? (
            <button
              onClick={onRetry}
              className="mt-3 rounded-md border border-[var(--sev-high)] bg-surface px-3 py-1.5 text-xs font-medium text-[var(--sev-high)] transition-colors hover:bg-white"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Inline banner for non-fatal notices (e.g. degraded backend). */
export function InlineBanner({ tone = "warn", children }: { tone?: "warn" | "info"; children: ReactNode }) {
  const map = {
    warn: { border: "var(--sev-med)", bg: "var(--sev-med-soft)", color: "var(--sev-med)" },
    info: { border: "var(--brand)", bg: "var(--surface-2)", color: "var(--brand)" },
  }[tone];
  return (
    <div
      className="rounded-md border px-4 py-2.5 text-sm"
      style={{ borderColor: map.border, background: map.bg, color: map.color }}
    >
      {children}
    </div>
  );
}
