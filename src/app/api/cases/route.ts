import {
  CASE_STATUSES,
  caseFromAlert,
  createCase,
  type CaseStatus,
  listCases,
} from "@/lib/cases";
import { findAlert } from "@/lib/alerts/collect.ts";
import { currentPersona } from "@/lib/auth/server.ts";

function errorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message.includes("Supabase is not configured") ? 503 : 500;
  return Response.json({ error: message }, { status });
}

// GET /api/cases?status=Open&agentId=AGT-007
export async function GET(request: Request): Promise<Response> {
  try {
    const persona = await currentPersona();
    if (!persona) return Response.json({ error: "Sign in required" }, { status: 401 });
    if (persona.role !== "coordinator" && persona.role !== "analyst") {
      return Response.json({ error: "Case access is not available for this role" }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    const statusParam = params.get("status") ?? undefined;
    if (statusParam && !CASE_STATUSES.includes(statusParam as CaseStatus)) {
      return Response.json(
        { error: `invalid status "${statusParam}"; expected one of ${CASE_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    const cases = await listCases({
      status: statusParam as CaseStatus | undefined,
      agentId: params.get("agentId") ?? undefined,
    });
    return Response.json({ cases });
  } catch (err) {
    return errorResponse(err);
  }
}

interface PromoteBody { alertId?: string; }

// POST /api/cases — promote a DetectionAlert into a case
export async function POST(request: Request): Promise<Response> {
  const persona = await currentPersona();
  if (!persona) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (persona.role !== "coordinator" && persona.role !== "analyst") {
    return Response.json({ error: "This role cannot promote alerts" }, { status: 403 });
  }

  let body: PromoteBody;
  try {
    body = (await request.json()) as PromoteBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.alertId) return Response.json({ error: "provide `alertId`" }, { status: 400 });

  try {
    const alert = findAlert(body.alertId);
    if (!alert) return Response.json({ error: `Alert not found: ${body.alertId}` }, { status: 404 });
    const created = await createCase(caseFromAlert(alert), { actor: persona.name });
    return Response.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
