import type { AlertType, DetectionAlert, Provider } from "../analytics/types.ts";

/**
 * Persisted case for the coordination workflow. This is the operational shape;
 * it aligns field-for-field with the demo `Case` in scripts/datagen/types.ts
 * (assignedTo / status / createdAt / slaDueAt) but uses the review state machine
 * below instead of that dataset's NEW/ASSIGNED/IN_PROGRESS/CLOSED labels.
 */
export const CASE_STATUSES = ["Open", "Assigned", "Acknowledged", "Escalated", "Resolved"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export type Severity = DetectionAlert["severity"];
export type Evidence = DetectionAlert["evidence"];

export interface CaseRecord {
  id: string;
  alertType: AlertType;
  agentId: string;
  provider: Provider;
  severity: Severity;
  status: CaseStatus;
  assignedTo: string | null;
  evidence: Evidence;
  windowStart: string;
  windowEnd: string;
  slaDueAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/** Immutable audit row written on every status change. */
export interface CaseEvent {
  id: string;
  caseId: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  actor: string | null;
  note: string | null;
  createdAt: string;
}

/** Fields needed to create a case (id/timestamps are assigned by the DB). */
export interface NewCaseInput {
  alertType: AlertType;
  agentId: string;
  provider: Provider;
  severity: Severity;
  status: CaseStatus;
  assignedTo: string | null;
  evidence: Evidence;
  windowStart: string;
  windowEnd: string;
  slaDueAt: string | null;
}
