import { collectAlerts } from "@/lib/alerts/collect.ts";
import { currentPersona } from "@/lib/auth/server.ts";

// GET /api/alerts — detection alerts, id-stamped, most-urgent-first. Scoped by
// persona: an agent sees only their own signals (provider boundaries + least
// privilege); coordinators, analysts, and management see the full feed.
export async function GET(): Promise<Response> {
  try {
    const persona = await currentPersona();
    if (!persona) return Response.json({ error: "Sign in required" }, { status: 401 });
    let alerts = collectAlerts();
    if (persona?.role === "agent" && persona.agentId) {
      alerts = alerts.filter((a) => a.agentId === persona.agentId);
    }
    return Response.json({ alerts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load alerts";
    return Response.json({ error: message }, { status: 500 });
  }
}
