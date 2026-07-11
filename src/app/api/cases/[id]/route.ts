import {
  assignCase,
  CASE_STATUSES,
  CaseNotFoundError,
  type CaseStatus,
  getCase,
  InvalidTransitionError,
  listCaseEvents,
  transitionCase,
} from "@/lib/cases";

type Ctx = { params: Promise<{ id: string }> };

function errorResponse(err: unknown): Response {
  if (err instanceof CaseNotFoundError) return Response.json({ error: err.message }, { status: 404 });
  if (err instanceof InvalidTransitionError) return Response.json({ error: err.message }, { status: 409 });
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message.includes("Supabase is not configured") ? 503 : 500;
  return Response.json({ error: message }, { status });
}

// GET /api/cases/:id  (?events=1 to include the audit trail)
export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const found = await getCase(id);
    if (!found) return Response.json({ error: `Case not found: ${id}` }, { status: 404 });
    const withEvents = new URL(request.url).searchParams.get("events");
    if (withEvents) {
      return Response.json({ ...found, events: await listCaseEvents(id) });
    }
    return Response.json(found);
  } catch (err) {
    return errorResponse(err);
  }
}

interface PatchBody {
  status?: CaseStatus;
  assignedTo?: string;
  actor?: string;
  note?: string;
}

// PATCH /api/cases/:id — reassign and/or transition status
export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.status && !CASE_STATUSES.includes(body.status)) {
    return Response.json(
      { error: `invalid status "${body.status}"; expected one of ${CASE_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  if (body.assignedTo == null && body.status == null) {
    return Response.json({ error: "provide `assignedTo` and/or `status`" }, { status: 400 });
  }

  try {
    let result = await getCase(id);
    if (!result) throw new CaseNotFoundError(id);
    if (body.assignedTo != null) {
      result = await assignCase(id, body.assignedTo, { actor: body.actor });
    }
    if (body.status != null) {
      result = await transitionCase(id, body.status, { actor: body.actor, note: body.note });
    }
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
