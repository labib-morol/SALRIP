import { analyze } from "./detectors.ts";
import type { Dataset, DetectionAlert } from "./types.ts";

export interface ScenarioResult {
  scenario: string;
  shouldAlert: boolean;
  detected: boolean;
  correct: boolean;
  alertTypes: string[];
  outcome: "TP" | "TN" | "FP" | "FN";
}

/** A positive is "detected" only if an alert lands on the labelled target agent
 * (and provider, when specified) — not just any alert anywhere. */
function hitsTarget(ds: Dataset, alerts: DetectionAlert[]): boolean {
  const L = ds.label;
  if (!L.targetAgentId) return alerts.length > 0;
  return alerts.some(
    (a) => a.agentId === L.targetAgentId && (!L.targetProvider || a.provider === L.targetProvider),
  );
}

export function evaluateDataset(ds: Dataset): ScenarioResult {
  const alerts = analyze(ds);
  const detected = ds.label.shouldAlert ? hitsTarget(ds, alerts) : alerts.length > 0;
  const correct = detected === ds.label.shouldAlert;
  const outcome = ds.label.shouldAlert
    ? detected
      ? "TP"
      : "FN"
    : detected
      ? "FP"
      : "TN";
  return {
    scenario: ds.scenario,
    shouldAlert: ds.label.shouldAlert,
    detected,
    correct,
    alertTypes: [...new Set(alerts.map((a) => a.type))],
    outcome,
  };
}

export interface Summary {
  results: ScenarioResult[];
  recall: number;
  falsePositiveRate: number;
  precision: number;
  accuracy: number;
}

export function summarize(results: ScenarioResult[]): Summary {
  const tp = results.filter((r) => r.outcome === "TP").length;
  const fp = results.filter((r) => r.outcome === "FP").length;
  const fn = results.filter((r) => r.outcome === "FN").length;
  const tn = results.filter((r) => r.outcome === "TN").length;
  return {
    results,
    recall: tp + fn ? tp / (tp + fn) : 1,
    falsePositiveRate: fp + tn ? fp / (fp + tn) : 0,
    precision: tp + fp ? tp / (tp + fp) : 1,
    accuracy: (tp + tn) / results.length,
  };
}
