"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/components/useApi";
import { useRoleGuard } from "@/components/auth/PersonaProvider";
import { PageHeader } from "@/components/shell/PageHeader";
import { LoadingBlock, ErrorState, EmptyState, InlineBanner } from "@/components/ui/States";
import { CaseCard } from "@/components/cases/CaseCard";
import { CaseHistoryModal } from "@/components/cases/CaseHistoryModal";
import { ROLES } from "@/lib/auth/personas.ts";
import { CASE_STATUSES, type CaseRecord, type CaseStatus } from "@/lib/cases/types.ts";

const COLUMN_HINT: Record<CaseStatus, string> = {
  Open: "Awaiting assignment",
  Assigned: "Picked up by an analyst",
  Acknowledged: "Under active review",
  Escalated: "Raised for urgent attention",
  Resolved: "Closed out",
};

export default function CasesPage() {
  const persona = useRoleGuard(["coordinator", "analyst"]);
  const caseActions = ROLES[persona.role].caseActions;
  const { data, loading, error, reload } = useApi<{ cases: CaseRecord[] }>("/api/cases");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyCaseId, setHistoryCaseId] = useState<string | null>(null);

  const cases = useMemo(() => data?.cases ?? [], [data]);
  const byStatus = useMemo(() => {
    const map: Record<CaseStatus, CaseRecord[]> = { Open: [], Assigned: [], Acknowledged: [], Escalated: [], Resolved: [] };
    for (const c of cases) map[c.status]?.push(c);
    return map;
  }, [cases]);

  async function mutate(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resBody = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resBody?.error || `Update failed (${res.status})`);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Case Board"
        description={
          caseActions === "review"
            ? "Review queue: you can acknowledge, escalate, and add notes — final assignment and closure stay with the operations team."
            : "Coordinate the response to promoted signals. Cases advance through a fixed review workflow."
        }
        right={
          !loading && !error ? (
            <span className="text-xs text-muted">
              <span className="tnum">{cases.length}</span> case{cases.length === 1 ? "" : "s"}
            </span>
          ) : null
        }
      />

      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {loading ? (
          <div className="mx-auto max-w-[1200px]">
            <LoadingBlock rows={4} label="Loading case board…" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-[1200px]">
            <ErrorState title="Couldn't load the case board" message={error} onRetry={reload} />
          </div>
        ) : cases.length === 0 ? (
          <div className="mx-auto max-w-[1200px]">
            <EmptyState
              icon={<span className="text-lg">◲</span>}
              title="No cases yet"
              message="Cases appear here once you promote an alert. Open an alert and choose “Promote to Case” to begin coordinating a response."
              action={
                <Link href="/alerts" className="inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline md:min-h-8">
                  Go to alerts →
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {actionError ? <InlineBanner tone="warn">{actionError}</InlineBanner> : null}
            <p className="text-xs text-muted md:hidden">Swipe horizontally to review all five workflow stages.</p>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {CASE_STATUSES.map((status) => (
                <Column
                  key={status}
                  status={status}
                  hint={COLUMN_HINT[status]}
                  cases={byStatus[status]}
                  busyId={busyId}
                  caseActions={caseActions}
                  onAction={mutate}
                  onOpenHistory={(c) => setHistoryCaseId(c.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {historyCaseId ? (
        <CaseHistoryModal caseId={historyCaseId} onClose={() => setHistoryCaseId(null)} />
      ) : null}
    </div>
  );
}

function Column({
  status,
  hint,
  cases,
  busyId,
  caseActions,
  onAction,
  onOpenHistory,
}: {
  status: CaseStatus;
  hint: string;
  cases: CaseRecord[];
  busyId: string | null;
  caseActions: "full" | "review" | "none";
  onAction: (id: string, body: Record<string, unknown>) => void;
  onOpenHistory: (c: CaseRecord) => void;
}) {
  return (
    <section className="flex w-[280px] shrink-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface-2/60 sm:w-[300px] xl:w-[214px]">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{status}</h2>
          <p className="text-[11px] text-muted-2">{hint}</p>
        </div>
        <span className="tnum flex h-6 min-w-6 items-center justify-center rounded-full border border-border bg-surface px-1.5 text-xs font-medium text-muted">
          {cases.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-3 px-3 pb-3">
        {cases.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface px-3 py-8 text-center text-xs text-muted-2">
            No cases in this stage
          </div>
        ) : (
          cases.map((c) => (
            <CaseCard key={c.id} c={c} busy={busyId === c.id} caseActions={caseActions} onAction={onAction} onOpenHistory={onOpenHistory} />
          ))
        )}
      </div>
    </section>
  );
}
