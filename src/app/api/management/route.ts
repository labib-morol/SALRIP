import { currentPersona } from "@/lib/auth/server.ts";
import { managementOverview } from "@/lib/overview.ts";

// GET /api/management — area-level rollup of service risk and recurring problems.
export async function GET(): Promise<Response> {
  const persona = await currentPersona();
  if (!persona) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  try {
    return Response.json(managementOverview());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load area overview";
    return Response.json({ error: message }, { status: 500 });
  }
}
