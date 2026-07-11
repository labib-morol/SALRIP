// Exercise src/lib/explain against real detector output for B_fraud_burst and
// C_stale_feed. Deterministic parts (prompt build + no-"fraud" guard) always run;
// the live Claude call runs when credentials are available.
//   node --experimental-strip-types scripts/explain-demo.ts
import { analyze } from "../src/lib/analytics/detectors.ts";
import { loadDataset } from "../src/lib/analytics/data.ts";
import type { AlertType, DetectionAlert } from "../src/lib/analytics/types.ts";
import { explainAlert } from "../src/lib/explain/explain.ts";
import { assertNoForbiddenWords, buildUserPrompt } from "../src/lib/explain/prompt.ts";
import type { Explanation } from "../src/lib/explain/prompt.ts";

function pickAlert(scenario: string, type: AlertType): DetectionAlert {
  const alerts = analyze(loadDataset(scenario));
  const a = alerts.find((x) => x.type === type);
  if (!a) throw new Error(`No ${type} alert found in ${scenario}`);
  return a;
}

function guardSelfTest(): void {
  // Prove the safety net catches a violation even without any API call.
  const bad: Explanation = {
    title: "Possible fraud detected",
    english: "This looks like fraud.",
    bangla: "এটি প্রতারণা।",
    recommendedAction: "Investigate.",
  };
  let threw = false;
  try {
    assertNoForbiddenWords(bad);
  } catch {
    threw = true;
  }
  console.log(`Guard self-test (rejects a "fraud" output): ${threw ? "PASS" : "FAIL"}`);
  if (!threw) process.exit(1);
}

async function main(): Promise<void> {
  const cases: Array<[string, AlertType]> = [
    ["B_fraud_burst", "FRAUD_BURST"],
    ["C_stale_feed", "STALE_FEED"],
  ];

  guardSelfTest();

  const hasCreds = !!process.env.OPENAI_API_KEY;
  console.log(`\nLive OpenAI call: ${hasCreds ? "ENABLED" : "SKIPPED (no OPENAI_API_KEY)"}\n`);

  for (const [scenario, type] of cases) {
    const alert = pickAlert(scenario, type);
    console.log("=".repeat(72));
    console.log(`${scenario} -> ${type}  (${alert.agentId}/${alert.provider})`);
    console.log("-".repeat(72));
    console.log("Prompt sent to the model:\n");
    console.log(buildUserPrompt(alert));
    console.log();

    if (!hasCreds) continue;

    const explanation = await explainAlert(alert);
    assertNoForbiddenWords(explanation); // redundant with explainAlert, explicit here
    console.log("--- English ---");
    console.log(`${explanation.title}\n${explanation.english}`);
    console.log("--- বাংলা ---");
    console.log(explanation.bangla);
    console.log("--- Recommended action ---");
    console.log(explanation.recommendedAction);
    console.log();
  }

  if (!hasCreds) {
    console.log("To run the live bilingual test, provide credentials and re-run:");
    console.log("  export OPENAI_API_KEY=sk-...");
    console.log("  npm run explain    # optional: EXPLAIN_MODEL=gpt-4o-mini");
  } else {
    console.log("Live bilingual explanations generated; no forbidden words present.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
