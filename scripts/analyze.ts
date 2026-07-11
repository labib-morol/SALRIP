// Run the detection engine over every generated dataset and report recall / FPR
// against the ground-truth labels.  node --experimental-strip-types scripts/analyze.ts
import { analyze } from "../src/lib/analytics/detectors.ts";
import { evaluateDataset, summarize } from "../src/lib/analytics/evaluate.ts";
import { listScenarios, loadDataset } from "../src/lib/analytics/data.ts";

function main(): void {
  const scenarios = listScenarios();
  const results = scenarios.map((s) => evaluateDataset(loadDataset(s)));

  console.log("\nDetection results vs ground-truth labels:\n");
  console.table(
    results.map((r) => ({
      scenario: r.scenario,
      shouldAlert: r.shouldAlert,
      detected: r.detected,
      result: r.outcome + (r.correct ? " ✓" : " ✗"),
      alerts: r.alertTypes.join(",") || "-",
    })),
  );

  const s = summarize(results);
  console.log("\nAlerts raised (evidence):\n");
  for (const scenario of scenarios) {
    const alerts = analyze(loadDataset(scenario));
    for (const a of alerts) {
      console.log(`  [${scenario}] ${a.type} ${a.agentId}/${a.provider}`, JSON.stringify(a.evidence));
    }
  }

  console.log("\nSummary:");
  console.log(`  recall (positives caught)      : ${(s.recall * 100).toFixed(1)}%`);
  console.log(`  false-positive rate (negatives): ${(s.falsePositiveRate * 100).toFixed(1)}%`);
  console.log(`  precision                      : ${(s.precision * 100).toFixed(1)}%`);
  console.log(`  accuracy                       : ${(s.accuracy * 100).toFixed(1)}%\n`);

  const wrong = results.filter((r) => !r.correct);
  if (wrong.length) {
    console.error("Misclassified:", wrong.map((r) => `${r.scenario}(${r.outcome})`).join(", "));
    process.exit(1);
  }
  console.log("All scenarios classified correctly.\n");
}

main();
