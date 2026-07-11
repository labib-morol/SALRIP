import type { DetectionAlert } from "../analytics/types.ts";
import type { NewCaseInput, Severity } from "./types.ts";

/** Default SLA to first response, by severity (hours). */
export const SLA_HOURS: Record<Severity, number> = { HIGH: 4, MEDIUM: 12, LOW: 24 };

export interface PromoteOptions {
  assignedTo?: string | null;
  slaHours?: number;
  now?: Date;
}

/**
 * Promote a DetectionAlert (from src/lib/analytics) into a new case. Starts in
 * `Open`, or `Assigned` if an assignee is provided. SLA due-time is derived from
 * severity unless overridden.
 */
export function caseFromAlert(alert: DetectionAlert, opts: PromoteOptions = {}): NewCaseInput {
  const now = opts.now ?? new Date();
  const assignedTo = opts.assignedTo ?? null;
  const slaHours = opts.slaHours ?? SLA_HOURS[alert.severity];
  return {
    alertType: alert.type,
    agentId: alert.agentId,
    provider: alert.provider,
    severity: alert.severity,
    status: assignedTo ? "Assigned" : "Open",
    assignedTo,
    evidence: alert.evidence,
    windowStart: alert.windowStart,
    windowEnd: alert.windowEnd,
    slaDueAt: new Date(now.getTime() + slaHours * 3_600_000).toISOString(),
  };
}
