import type { CaseStatus } from "./types.ts";

/**
 * Allowed status transitions for the coordination workflow:
 *
 *   Open ─▶ Assigned ─▶ Acknowledged ─┬▶ Resolved
 *                   └────────▶ Escalated ─┤
 *                                Escalated ◀┘ (de-escalate) ─▶ Resolved
 *
 * Resolved is terminal. Reassignment (changing assignedTo) is a separate action,
 * not a status transition.
 */
export const TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  Open: ["Assigned"],
  Assigned: ["Acknowledged", "Escalated"],
  Acknowledged: ["Escalated", "Resolved"],
  Escalated: ["Acknowledged", "Resolved"],
  Resolved: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  readonly from: CaseStatus;
  readonly to: CaseStatus;
  constructor(from: CaseStatus, to: CaseStatus) {
    const allowed = TRANSITIONS[from].join(", ") || "(none — terminal)";
    super(`Invalid case transition ${from} -> ${to}. Allowed from ${from}: ${allowed}`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function assertTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
