import { currentPersona } from "@/lib/auth/server.ts";
import { agentOverview } from "@/lib/overview.ts";

// GET /api/me — the signed-in agent's own operation (float per provider, shared
// cash, their alerts). Agent role only.
export async function GET(): Promise<Response> {
  const persona = await currentPersona();
  if (!persona || persona.role !== "agent" || !persona.agentId) {
    return Response.json({ error: "This view is only available to an agent session." }, { status: 403 });
  }
  try {
    return Response.json(agentOverview(persona.agentId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load your operation";
    return Response.json({ error: message }, { status: 500 });
  }
}
