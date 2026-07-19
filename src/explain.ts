import OpenAI from "openai";
import { findNativeLanguage, NativeLanguageCode } from "./languages";
import { Miss } from "./classify";

export interface Explanation {
  summary: string;
  tip: string;
  summaryNative: string | null;
  tipNative: string | null;
}

const NOT_A_DIAGNOSIS_LINE =
  "This is not a diagnosis and does not replace professional evaluation.";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    tip: { type: "string" },
    summaryNative: { type: ["string", "null"] },
    tipNative: { type: ["string", "null"] }
  },
  required: ["summary", "tip", "summaryNative", "tipNative"],
  additionalProperties: false
} as const;

const INSTRUCTIONS = [
  "You write short, plain-language reading observations for a teacher after a child reads an English passage aloud. The observations are descriptive only.",
  "",
  "Critical boundaries: do not output a risk score, probability, disability likelihood, dyslexia likelihood, screening result, diagnosis, or IEP content. Do not suggest legal or clinical next steps. Practice suggestions should be ordinary classroom or home reading practice, not an Individualized Education Program.",
  "",
  "The student has a native language object with code, name, nativeName, and text direction. Use it to frame whether observed misreads seem connected to known English-vs-native-language interference patterns. For English, no significant L1 interference is expected, so describe patterns as observations in the English reading attempt rather than as second-language transfer.",
  "",
  "Write:",
  "- summary: 2-4 sentences, plain language, no jargon. Describe whether the misses are mostly interference_pattern, mostly inconsistent_pattern, or a mix. Keep it encouraging and descriptive. End the summary with this exact final line: This is not a diagnosis and does not replace professional evaluation.",
  "- tip: one concrete, specific practice activity a parent or teacher could do in the next reading session. Do not call it an intervention, accommodation, service, or IEP goal.",
  "",
  "If there are no misread words, write an encouraging summary noting no specific misread-word pattern was detected, and a tip about continuing to build reading fluency and vocabulary. Still end the summary with the mandatory not-a-diagnosis line.",
  "",
  "Bilingual fields: if the student's native language is not English, fill summaryNative and tipNative with a natural translation into the student's native language. The native summary must also end with a natural translation of the mandatory not-a-diagnosis line. If the native language is English, set summaryNative and tipNative to null."
].join("\n");

function ensureDisclaimer(summary: string): string {
  const trimmed = summary.trim();
  if (trimmed.endsWith(NOT_A_DIAGNOSIS_LINE)) {
    return trimmed;
  }
  return `${trimmed}\n${NOT_A_DIAGNOSIS_LINE}`;
}

export async function generateExplanation(
  openai: OpenAI,
  nativeLanguageCode: NativeLanguageCode,
  misses: Miss[]
): Promise<Explanation> {
  const nativeLanguage = findNativeLanguage(nativeLanguageCode);
  if (!nativeLanguage) {
    throw new Error(`Unsupported native language: ${nativeLanguageCode}`);
  }

  const interferenceCount = misses.filter(
    m => m.classification === "interference_pattern"
  ).length;
  const inconsistentCount = misses.filter(
    m => m.classification === "inconsistent_pattern"
  ).length;

  const response = await openai.responses.create({
    model: "gpt-5.6",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      nativeLanguage,
      interferenceCount,
      inconsistentCount,
      misses
    }),
    text: {
      format: {
        type: "json_schema",
        name: "reading_explanation",
        schema: RESPONSE_SCHEMA,
        strict: true
      }
    }
  });

  const explanation = JSON.parse(response.output_text) as Explanation;
  return {
    ...explanation,
    summary: ensureDisclaimer(explanation.summary)
  };
}
