// Server-only. Runs the detection engine across every generated scenario and
// returns a flat, id-stamped alert list. Both /api/alerts and /api/alerts/[id]
// go through here so a detail id resolves to exactly the same alert the list
// showed. Ids are an opaque hash (never the scenario/type name) so nothing
// leaks the word the product is forbidden from surfacing.

// (module uses node:fs via loadDataset, so it only ever runs server-side)
import { analyze, listScenarios, loadDataset } from "@/lib/analytics";
import type { DetectionAlert } from "@/lib/analytics/types.ts";

export interface AlertView extends DetectionAlert {
  id: string;
}

/** Deterministic short id from the alert's identifying fields (FNV-1a → base36). */
function alertId(a: DetectionAlert): string {
  const key = `${a.type}|${a.agentId}|${a.provider}|${a.windowStart}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "alr_" + (h >>> 0).toString(36).padStart(7, "0");
}

let cache: AlertView[] | null = null;

/** All alerts across all scenarios, id-stamped. Cached for the process. */
export function collectAlerts(): AlertView[] {
  if (cache) return cache;
  const out: AlertView[] = [];
  const seen = new Set<string>();
  for (const scenario of listScenarios()) {
    let alerts: DetectionAlert[];
    try {
      alerts = analyze(loadDataset(scenario));
    } catch {
      continue; // a malformed scenario shouldn't sink the whole feed
    }
    for (const a of alerts) {
      const id = alertId(a);
      if (seen.has(id)) continue; // same signal detected in >1 scenario → dedupe
      seen.add(id);
      out.push({ ...a, id });
    }
  }
  // Most urgent first, then most recent window.
  const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
  out.sort((a, b) => rank[b.severity] - rank[a.severity] || b.windowEnd.localeCompare(a.windowEnd));
  cache = out;
  return out;
}

export function findAlert(id: string): AlertView | null {
  return collectAlerts().find((a) => a.id === id) ?? null;
}
