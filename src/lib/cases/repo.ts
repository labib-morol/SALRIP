import { supabaseServer } from "../supabase/server.ts";
import { assertTransition } from "./stateMachine.ts";
import type { CaseEvent, CaseRecord, CaseStatus, NewCaseInput } from "./types.ts";

const CASES = "cases";
const EVENTS = "case_events";

interface CaseRow {
  id: string;
  alert_type: CaseRecord["alertType"];
  agent_id: string;
  provider: CaseRecord["provider"];
  severity: CaseRecord["severity"];
  status: CaseStatus;
  assigned_to: string | null;
  evidence: CaseRecord["evidence"];
  window_start: string;
  window_end: string;
  sla_due_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

function rowToCase(r: CaseRow): CaseRecord {
  return {
    id: r.id,
    alertType: r.alert_type,
    agentId: r.agent_id,
    provider: r.provider,
    severity: r.severity,
    status: r.status,
    assignedTo: r.assigned_to,
    evidence: r.evidence,
    windowStart: r.window_start,
    windowEnd: r.window_end,
    slaDueAt: r.sla_due_at,
    resolutionNote: r.resolution_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
  };
}

async function writeEvent(
  caseId: string,
  from: CaseStatus | null,
  to: CaseStatus,
  actor: string | null,
  note: string | null,
): Promise<void> {
  const { error } = await supabaseServer()
    .from(EVENTS)
    .insert({ case_id: caseId, from_status: from, to_status: to, actor, note });
  if (error) throw new Error(`case_events insert failed: ${error.message}`);
}

export async function createCase(
  input: NewCaseInput,
  opts: { actor?: string | null } = {},
): Promise<CaseRecord> {
  const { data, error } = await supabaseServer()
    .from(CASES)
    .insert({
      alert_type: input.alertType,
      agent_id: input.agentId,
      provider: input.provider,
      severity: input.severity,
      status: input.status,
      assigned_to: input.assignedTo,
      evidence: input.evidence,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      sla_due_at: input.slaDueAt,
    })
    .select()
    .single<CaseRow>();
  if (error || !data) throw new Error(`case insert failed: ${error?.message}`);
  await writeEvent(data.id, null, data.status, opts.actor ?? null, "case created from alert review");
  return rowToCase(data);
}

export async function getCase(id: string): Promise<CaseRecord | null> {
  const { data, error } = await supabaseServer()
    .from(CASES)
    .select()
    .eq("id", id)
    .maybeSingle<CaseRow>();
  if (error) throw new Error(`case fetch failed: ${error.message}`);
  return data ? rowToCase(data) : null;
}

export async function listCases(filter: { status?: CaseStatus; agentId?: string } = {}): Promise<CaseRecord[]> {
  let q = supabaseServer().from(CASES).select().order("created_at", { ascending: false });
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.agentId) q = q.eq("agent_id", filter.agentId);
  const { data, error } = await q.returns<CaseRow[]>();
  if (error) throw new Error(`case list failed: ${error.message}`);
  return (data ?? []).map(rowToCase);
}

export async function listCaseEvents(caseId: string): Promise<CaseEvent[]> {
  const { data, error } = await supabaseServer()
    .from(EVENTS)
    .select()
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .returns<Array<{ id: string; case_id: string; from_status: CaseStatus | null; to_status: CaseStatus; actor: string | null; note: string | null; created_at: string }>>();
  if (error) throw new Error(`case_events list failed: ${error.message}`);
  return (data ?? []).map((e) => ({
    id: e.id,
    caseId: e.case_id,
    fromStatus: e.from_status,
    toStatus: e.to_status,
    actor: e.actor,
    note: e.note,
    createdAt: e.created_at,
  }));
}

/** Validate + apply a status transition, writing an audit event. */
export async function transitionCase(
  id: string,
  to: CaseStatus,
  opts: { actor?: string | null; note?: string | null } = {},
): Promise<CaseRecord> {
  const current = await getCase(id);
  if (!current) throw new CaseNotFoundError(id);
  assertTransition(current.status, to); // throws InvalidTransitionError

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: to, updated_at: now };
  if (to === "Resolved") {
    patch.resolved_at = now;
    if (opts.note != null) patch.resolution_note = opts.note;
  }
  const { data, error } = await supabaseServer()
    .from(CASES)
    .update(patch)
    .eq("id", id)
    .select()
    .single<CaseRow>();
  if (error || !data) throw new Error(`case update failed: ${error?.message}`);
  await writeEvent(id, current.status, to, opts.actor ?? null, opts.note ?? null);
  return rowToCase(data);
}

/** Set the assignee. An unassigned (Open) case moves to Assigned as a side effect. */
export async function assignCase(
  id: string,
  assignedTo: string,
  opts: { actor?: string | null } = {},
): Promise<CaseRecord> {
  const current = await getCase(id);
  if (!current) throw new CaseNotFoundError(id);

  const now = new Date().toISOString();
  const nextStatus: CaseStatus = current.status === "Open" ? "Assigned" : current.status;
  const { data, error } = await supabaseServer()
    .from(CASES)
    .update({ assigned_to: assignedTo, status: nextStatus, updated_at: now })
    .eq("id", id)
    .select()
    .single<CaseRow>();
  if (error || !data) throw new Error(`case assign failed: ${error?.message}`);
  if (nextStatus !== current.status) {
    await writeEvent(id, current.status, nextStatus, opts.actor ?? null, `assigned to ${assignedTo}`);
  }
  return rowToCase(data);
}

export class CaseNotFoundError extends Error {
  readonly id: string;
  constructor(id: string) {
    super(`Case not found: ${id}`);
    this.name = "CaseNotFoundError";
    this.id = id;
  }
}
