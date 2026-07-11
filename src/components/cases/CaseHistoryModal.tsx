"use client";

import { useEffect, useRef } from "react";
import { useApi } from "@/components/useApi";
import { LoadingBlock, ErrorState } from "@/components/ui/States";
import { StatusPill, SeverityBadge, ProviderMark } from "@/components/ui/Badges";
import { alertTypeLabel, formatDateTime, relativeTime, agentArea } from "@/lib/display.ts";
import type { CaseEvent, CaseRecord } from "@/lib/cases/types.ts";

interface CaseWithEvents extends CaseRecord {
  events: CaseEvent[];
}

/**
 * Full audit trail for one case. Surfaces the immutable case_events rows the
 * backend writes on every status change — who touched it, when, and what
 * changed — satisfying the alert-history / traceability requirement.
 */
export function CaseHistoryModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { data, loading, error, reload } = useApi<CaseWithEvents>(`/api/cases/${caseId}?events=1`);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Case history"
    >
      <div
        ref={dialogRef}
        className="mt-8 w-full max-w-[560px] rounded-[var(--radius-card)] border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Case history</h2>
            <p className="mt-0.5 text-xs text-muted">
              Every recorded change to this case, in order. This log is append-only.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-strong text-muted transition-colors hover:bg-surface-2 md:h-8 md:w-8"
          >
            ✕
          </button>
        </header>

        <div className="p-5">
          {loading ? (
            <LoadingBlock rows={3} label="Loading case history…" />
          ) : error ? (
            <ErrorState title="Couldn't load case history" message={error} onRetry={reload} />
          ) : data ? (
            <div className="space-y-5">
              {/* Case summary */}
              <div className="rounded-md border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">{alertTypeLabel(data.alertType)}</span>
                  <StatusPill status={data.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <SeverityBadge severity={data.severity} />
                  <span className="tnum">{data.agentId}</span>
                  <span className="text-border-strong">·</span>
                  {agentArea(data.agentId)}
                  <span className="text-border-strong">·</span>
                  <ProviderMark provider={data.provider} />
                </div>
                <div className="mt-2 text-xs text-muted-2">
                  Assigned to {data.assignedTo ?? "— unassigned"} · opened {relativeTime(data.createdAt)}
                </div>
              </div>

              {/* Timeline */}
              <Timeline events={data.events} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Timeline({ events }: { events: CaseEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">No history recorded for this case yet.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden
            className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface"
            style={{ background: "var(--brand)" }}
          />
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink">
            {e.fromStatus ? (
              <>
                <span className="font-medium">{e.fromStatus}</span>
                <span aria-hidden className="text-muted-2">
                  →
                </span>
              </>
            ) : null}
            <span className="font-semibold text-brand">{e.toStatus}</span>
          </div>
          {e.note ? <div className="mt-0.5 text-xs text-ink-2">{e.note}</div> : null}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-2">
            <span>{e.actor ?? "system"}</span>
            <span className="text-border-strong">·</span>
            <span className="tnum" title={formatDateTime(e.createdAt)}>
              {formatDateTime(e.createdAt)}
            </span>
            <span className="text-border-strong">·</span>
            <span>{relativeTime(e.createdAt)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
