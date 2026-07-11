"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SeverityBadge, ProviderMark } from "@/components/ui/Badges";
import { alertTypeLabel, relativeTime, slaRemaining } from "@/lib/display.ts";
import { TRANSITIONS } from "@/lib/cases/stateMachine.ts";
import type { CaseRecord, CaseStatus } from "@/lib/cases/types.ts";

const ANALYSTS = ["Rakib H.", "Nadia I.", "Tanvir A.", "Sadia K."];

/** Label + emphasis for a legal (from → to) transition. */
function transitionAction(from: CaseStatus, to: CaseStatus): { label: string; primary: boolean } {
  if (to === "Resolved") return { label: "Resolve", primary: false };
  if (to === "Escalated") return { label: "Escalate", primary: false };
  if (to === "Acknowledged") return { label: from === "Escalated" ? "De-escalate" : "Acknowledge", primary: true };
  if (to === "Assigned") return { label: "Mark assigned", primary: true };
  return { label: to, primary: false };
}

export function CaseCard({
  c,
  busy,
  onAction,
}: {
  c: CaseRecord;
  busy: boolean;
  onAction: (id: string, body: Record<string, unknown>) => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const sla = c.status === "Resolved" ? null : slaRemaining(c.slaDueAt);
  const isOpen = c.status === "Open";
  // Open advances by *assigning* (which sets the assignee); other legal moves are status transitions.
  const transitions = TRANSITIONS[c.status].filter((to) => !(isOpen && to === "Assigned"));

  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between">
        <SeverityBadge severity={c.severity} />
        {sla ? (
          <span
            className="tnum text-[11px] font-medium"
            style={{ color: sla.breached ? "var(--sev-high)" : "var(--muted)" }}
            title="Time to first-response SLA"
          >
            {sla.breached ? "⚠ " : ""}
            {sla.text}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 text-sm font-medium text-ink">{alertTypeLabel(c.alertType)}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
        <span className="tnum">{c.agentId}</span>
        <span className="text-border-strong">·</span>
        <ProviderMark provider={c.provider} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs">
        <span className="text-muted">
          {c.assignedTo ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[9px] font-semibold text-brand-ink">
                {initials(c.assignedTo)}
              </span>
              {c.assignedTo}
            </span>
          ) : (
            <span className="text-muted-2">Unassigned</span>
          )}
        </span>
        <span className="text-muted-2">{relativeTime(c.createdAt)}</span>
      </div>

      {/* Actions — only legal moves are ever offered */}
      {c.status !== "Resolved" ? (
        <div className="mt-3 border-t border-border pt-3">
          {assigning ? (
            <AssignInline
              busy={busy}
              onCancel={() => setAssigning(false)}
              onPick={(name) => {
                setAssigning(false);
                onAction(c.id, { assignedTo: name });
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {isOpen ? (
                <ActionButton primary busy={busy} onClick={() => setAssigning(true)}>
                  Assign
                </ActionButton>
              ) : (
                <ActionButton busy={busy} onClick={() => setAssigning(true)}>
                  Reassign
                </ActionButton>
              )}
              {transitions.map((to) => {
                const a = transitionAction(c.status, to);
                return (
                  <ActionButton key={to} primary={a.primary} busy={busy} onClick={() => onAction(c.id, { status: to })}>
                    {a.label}
                  </ActionButton>
                );
              })}
            </div>
          )}
        </div>
      ) : c.resolvedAt ? (
        <div className="mt-3 border-t border-border pt-2.5 text-[11px] text-ok">Resolved {relativeTime(c.resolvedAt)}</div>
      ) : null}
    </Card>
  );
}

function AssignInline({
  busy,
  onPick,
  onCancel,
}: {
  busy: boolean;
  onPick: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-muted">Assign to analyst</div>
      <div className="flex flex-wrap gap-1.5">
        {ANALYSTS.map((name) => (
          <button
            key={name}
            disabled={busy}
            onClick={() => onPick(name)}
            className="rounded-md border border-border-strong bg-surface px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {name}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="text-[11px] text-muted-2 hover:text-muted">
        Cancel
      </button>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  primary = false,
  busy = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
        primary
          ? "bg-brand text-brand-ink hover:bg-brand-hover"
          : "border border-border-strong bg-surface text-ink hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
