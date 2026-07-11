import { findAlert } from "@/lib/alerts/collect.ts";
import { explainAlert, type Explanation } from "@/lib/explain";
import { currentPersona } from "@/lib/auth/server.ts";

type Ctx = { params: Promise<{ id: string }> };

// In-process cache: an alert's bilingual explanation is deterministic enough to
// reuse, and each call hits the OpenAI API, so we don't regenerate per open.
const explanationCache = new Map<string, Explanation>();

// GET /api/alerts/:id — the alert plus its bilingual, review-oriented
// explanation. If explanation generation fails (e.g. OPENAI_API_KEY unset or
// upstream error) the alert + evidence are still returned; `explainError`
// carries the reason so the UI degrades instead of crashing.
export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  const alert = findAlert(id);
  if (!alert) {
    return Response.json({ error: `Alert not found: ${id}` }, { status: 404 });
  }

  // Agents may only open their own signals (provider-boundary / least-privilege).
  const persona = await currentPersona();
  if (persona?.role === "agent" && alert.agentId !== persona.agentId) {
    return Response.json({ error: `Alert not found: ${id}` }, { status: 404 });
  }

  let explanation: Explanation | null = explanationCache.get(id) ?? null;
  let explainError: string | null = null;

  if (!explanation) {
    try {
      explanation = await explainAlert(alert);
      explanationCache.set(id, explanation);
    } catch (err) {
      explainError = err instanceof Error ? err.message : "Explanation unavailable";
    }
  }

  return Response.json({ alert, explanation, explainError });
}
