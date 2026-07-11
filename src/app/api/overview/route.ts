import { buildOverview } from "@/lib/overview.ts";

// GET /api/overview — portfolio aggregates for the Dashboard, computed from the
// generated dataset (per-provider float, combined cash, per-provider forecast,
// alert summary). No mock data.
export async function GET(): Promise<Response> {
  try {
    return Response.json(buildOverview());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build overview";
    return Response.json({ error: message }, { status: 500 });
  }
}
