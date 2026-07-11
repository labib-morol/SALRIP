import {
  CASE_STATUSES,
  caseFromAlert,
  createCase,
  type CaseStatus,
  listCases,
} from "@/lib/cases";
import type { DetectionAlert } from "@/lib/analytics/types.ts";

function errorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message.includes("Supabase is not configured") ? 503 : 500;
  return Response.json({ error: message }, { status });
}

// GET /api/cases?status=Open&agentId=AGT-007
export async function GET(request: Request): Promise<Response> {
  try {
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

interface PromoteBody extends Partial<DetectionAlert> {
  assignedTo?: string | null;
  slaHours?: number;
}

// POST /api/cases — promote a DetectionAlert into a case
export async function POST(request: Request): Promise<Response> {
  let body: PromoteBody;
  try {
    body = (await request.json()) as PromoteBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const required: Array<keyof DetectionAlert> = [
    "type",
    "agentId",
    "provider",
    "severity",
    "windowStart",
    "windowEnd",
  ];
  const missing = required.filter((k) => body[k] == null);
  if (missing.length) {
    return Response.json({ error: `missing alert fields: ${missing.join(", ")}` }, { status: 400 });
  }

  try {
    const alert: DetectionAlert = {
      type: body.type!,
      agentId: body.agentId!,
      provider: body.provider!,
      severity: body.severity!,
      windowStart: body.windowStart!,
      windowEnd: body.windowEnd!,
      evidence: body.evidence ?? {},
    };
    const created = await createCase(
      caseFromAlert(alert, { assignedTo: body.assignedTo ?? null, slaHours: body.slaHours }),
    );
    return Response.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
