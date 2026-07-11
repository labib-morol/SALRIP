import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Balance, Dataset, Label, Transaction } from "./types.ts";

/** Asia/Dhaka is UTC+6, no DST — local hour-of-day from an ISO-UTC timestamp. */
export function hourOfDay(iso: string): number {
  return (new Date(iso).getUTCHours() + 6) % 24;
}

export const DATA_ROOT = join(process.cwd(), "data");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function loadDataset(scenario: string, root = DATA_ROOT): Dataset {
  const dir = join(root, scenario);
  return {
    scenario,
    transactions: readJson<Transaction[]>(join(dir, "transactions.json")),
    balances: readJson<Balance[]>(join(dir, "balances.json")),
    label: readJson<Label>(join(dir, "labels.json")),
  };
}

/** All scenario folders under data/ (baseline first, if present). */
export function listScenarios(root = DATA_ROOT): string[] {
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  return dirs.sort((a, b) => (a === "baseline" ? -1 : b === "baseline" ? 1 : a.localeCompare(b)));
}
