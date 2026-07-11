import { hourOfDay } from "./data.ts";
import type { Provider, Transaction } from "./types.ts";

/** Days of history below which a per-agent baseline is untrustworthy (grilling: new-agent). */
export const MIN_BASELINE_DAYS = 5;

interface Cell {
  hourCounts: number[]; // total tx per hour-of-day bucket
  days: Set<string>; // distinct calendar days seen
}

export interface Baseline {
  /** Expected tx count in a `minutes`-long window for this agent/provider/hour. */
  expected(agentId: string, provider: Provider, hod: number, minutes: number): number;
  /** True when the agent/provider has enough history to trust its own baseline. */
  confident(agentId: string, provider: Provider): boolean;
}

const key = (a: string, p: Provider) => `${a}:${p}`;
const dayOf = (iso: string) => iso.slice(0, 10);

export function buildBaseline(transactions: Transaction[]): Baseline {
  const cells = new Map<string, Cell>();
  const pop = new Map<Provider, Cell>(); // population fallback, per provider
  const agentsPerProvider = new Map<Provider, Set<string>>();

  for (const t of transactions) {
    if (t.status !== "SUCCESS") continue;
    const hod = hourOfDay(t.timestamp);
    const k = key(t.agentId, t.provider);
    let cell = cells.get(k);
    if (!cell) cells.set(k, (cell = { hourCounts: new Array(24).fill(0), days: new Set() }));
    cell.hourCounts[hod]++;
    cell.days.add(dayOf(t.timestamp));

    let pc = pop.get(t.provider);
    if (!pc) pop.set(t.provider, (pc = { hourCounts: new Array(24).fill(0), days: new Set() }));
    pc.hourCounts[hod]++;
    pc.days.add(dayOf(t.timestamp));

    let ap = agentsPerProvider.get(t.provider);
    if (!ap) agentsPerProvider.set(t.provider, (ap = new Set()));
    ap.add(t.agentId);
  }

  const perHourRate = (cell: Cell, hod: number, agents = 1) => {
    const days = Math.max(cell.days.size, 1);
    return cell.hourCounts[hod] / days / agents;
  };

  return {
    confident(agentId, provider) {
      const cell = cells.get(key(agentId, provider));
      return !!cell && cell.days.size >= MIN_BASELINE_DAYS;
    },
    expected(agentId, provider, hod, minutes) {
      const cell = cells.get(key(agentId, provider));
      let hourly: number;
      if (cell && cell.days.size >= MIN_BASELINE_DAYS) {
        hourly = perHourRate(cell, hod);
      } else {
        // fallback: population average per agent for this provider/hour + low confidence
        const pc = pop.get(provider);
        const agents = agentsPerProvider.get(provider)?.size ?? 1;
        hourly = pc ? perHourRate(pc, hod, agents) : 0;
      }
      return Math.max(hourly * (minutes / 60), 1e-6);
    },
  };
}
