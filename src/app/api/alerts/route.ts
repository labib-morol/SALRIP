import { collectAlerts } from "@/lib/alerts/collect.ts";

// GET /api/alerts — every detection alert across all scenarios, id-stamped,
// sorted most-urgent-first. Thin wrapper over the analytics engine.
export async function GET(): Promise<Response> {
  try {
    const alerts = collectAlerts();
    return Response.json({ alerts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load alerts";
    return Response.json({ error: message }, { status: 500 });
  }
}
