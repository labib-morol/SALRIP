import type { AlertType, DetectionAlert } from "../analytics/types.ts";

/**
 * Neutral, review-oriented descriptions of each alert type. We deliberately do
 * NOT feed the raw type name (e.g. "FRAUD_BURST") to the model — the word must
 * not appear in the input, let alone the output. Matches the rulebook's
 * risk-interpretation rule: these are signals to review, not accusations.
 */
export const NEUTRAL_DESCRIPTOR: Record<AlertType, string> = {
  FRAUD_BURST:
    "a short burst of many repeated, near-identical high-value transactions involving only a few customer accounts, occurring alongside a dip in the agent's available balance",
  LIQUIDITY_DRAIN:
    "a sustained downward trend in one provider's opening balance for this agent, while the other provider looks healthy",
  STALE_FEED:
    "a provider's balance feed that has stopped updating (repeated, non-advancing snapshots) while transactions keep posting, so the reported balance no longer matches the transaction ledger",
  SHARED_CASH_SHORTAGE:
    "combined, near-simultaneous cash-out demand across more than one provider approaching or exceeding the agent's available shared physical cash, leaving little or no margin to serve customers",
};

/** Words that must never appear in the output, in any language. */
export const FORBIDDEN_WORDS = ["fraud", "fraudulent", "fraudster", "প্রতারণা", "জালিয়াতি", "প্রতারক"];

export const SYSTEM_PROMPT = `You explain automated monitoring alerts for a mobile-money "Super Agent" operations team in Bangladesh (providers: bKash and Nagad). For each alert you produce a bilingual explanation: clear, plain English and natural, fluent Bangla (Bengali).

HARD RULE — mandatory, overrides everything else:
- NEVER use the word "fraud" anywhere in your output, in any language or form. Do not use "fraudulent", "fraudster", or Bangla equivalents such as "প্রতারণা" or "জালিয়াতি".
- These alerts are RISK SIGNALS THAT REQUIRE REVIEW, not confirmed wrongdoing. Describe them only with neutral language: "unusual activity", "activity that requires review", "an anomaly to investigate" (Bangla: "অস্বাভাবিক কার্যকলাপ", "পর্যালোচনা প্রয়োজন", "খতিয়ে দেখা প্রয়োজন").
- Presume nothing about intent. Everything is framed as something an analyst should look into.

Style:
- Each of the English and Bangla explanations is 2-4 sentences: what was observed, why it was flagged, and what the analyst should check.
- Use the specific numbers provided. The Bangla is a natural translation of the same meaning, not a transliteration.
- Neutral, professional, non-alarming tone.`;

function formatEvidence(evidence: Record<string, unknown>): string {
  return Object.entries(evidence)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

export function buildUserPrompt(alert: DetectionAlert): string {
  return [
    `An automated monitoring rule flagged the following for review.`,
    ``,
    `What was observed: ${NEUTRAL_DESCRIPTOR[alert.type]}.`,
    `Agent: ${alert.agentId}`,
    `Provider: ${alert.provider}`,
    `Severity: ${alert.severity}`,
    `Window: ${alert.windowStart} to ${alert.windowEnd}`,
    `Supporting figures:`,
    formatEvidence(alert.evidence),
    ``,
    `Write the bilingual explanation for the operations analyst.`,
  ].join("\n");
}

/** Output schema — structured so the app gets parseable bilingual fields. */
export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short neutral headline (English)" },
    english: { type: "string", description: "2-4 sentence English explanation" },
    bangla: { type: "string", description: "2-4 sentence Bangla explanation" },
    recommendedAction: { type: "string", description: "What the analyst should check next (English)" },
  },
  required: ["title", "english", "bangla", "recommendedAction"],
  additionalProperties: false,
} as const;

export interface Explanation {
  title: string;
  english: string;
  bangla: string;
  recommendedAction: string;
}

/** Safety net: reject any explanation that slipped a forbidden word through. */
export function assertNoForbiddenWords(e: Explanation): void {
  const haystack = `${e.title}\n${e.english}\n${e.bangla}\n${e.recommendedAction}`.toLowerCase();
  const hit = FORBIDDEN_WORDS.find((w) => haystack.includes(w.toLowerCase()));
  if (hit) {
    throw new Error(
      `Explanation violated the no-"fraud" rule: contained "${hit}". Refusing to return it.`,
    );
  }
}
