export * from "./types.ts";
export { hourOfDay, loadDataset, listScenarios, DATA_ROOT } from "./data.ts";
export { buildBaseline, MIN_BASELINE_DAYS } from "./baseline.ts";
export type { Baseline } from "./baseline.ts";
export {
  velocitySignal,
  dominantCluster,
  isClustered,
  isConcentrated,
  poissonSurvival,
} from "./signals.ts";
export {
  analyze,
  detectFraud,
  detectLiquidityDrain,
  detectStaleFeed,
  detectSharedCashShortage,
} from "./detectors.ts";
export { evaluateDataset, summarize } from "./evaluate.ts";
export type { ScenarioResult, Summary } from "./evaluate.ts";
