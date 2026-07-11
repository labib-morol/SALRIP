import OpenAI from "openai";
import type { DetectionAlert } from "../analytics/types.ts";
import {
  assertNoForbiddenWords,
  buildUserPrompt,
  type Explanation,
  OUTPUT_SCHEMA,
  SYSTEM_PROMPT,
} from "./prompt.ts";

/** Default model. Override with EXPLAIN_MODEL if you use a different OpenAI model. */
export const DEFAULT_MODEL = process.env.EXPLAIN_MODEL ?? "gpt-4o";

export interface ExplainOptions {
  client?: OpenAI;
  model?: string;
}

/**
 * Turn a DetectionAlert into a bilingual (English + Bangla), review-oriented
 * explanation via the OpenAI API. The prompt forbids the word "fraud" (and its
 * Bangla equivalents); a post-generation guard rejects any output that slips one
 * through, so a violation fails loudly rather than reaching a user.
 */
export async function explainAlert(
  alert: DetectionAlert,
  opts: ExplainOptions = {},
): Promise<Explanation> {
  const client = opts.client ?? new OpenAI(); // resolves OPENAI_API_KEY
  const model = opts.model ?? DEFAULT_MODEL;

  const completion = await client.chat.completions.create({
    model,
    max_completion_tokens: 2000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(alert) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "alert_explanation", strict: true, schema: OUTPUT_SCHEMA },
    },
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new Error(`Model refused to explain alert ${alert.type} for ${alert.agentId}: ${message.refusal}`);
  }
  if (!message?.content) {
    throw new Error("No content in model response");
  }

  const parsed = JSON.parse(message.content) as Explanation;
  assertNoForbiddenWords(parsed);
  return parsed;
}
