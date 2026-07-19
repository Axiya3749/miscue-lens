import OpenAI from "openai";
import { tokenize, alignWords } from "./align";
import { phoneticSimilarity } from "./phonetics";
import { findNativeLanguage, NativeLanguageCode } from "./languages";

export type Classification = "interference_pattern" | "inconsistent_pattern";

export interface Miss {
  targetWord: string;
  spokenWord: string;
  classification: Classification;
  reasoning: string;
  reasoningNative: string | null;
}

interface Candidate {
  targetWord: string;
  spokenWord: string;
  sentence: string;
  phoneticSimilarity: number;
}

// Find the sentence a word belongs to, for context in the classification
// prompt. Falls back to the whole passage if splitting fails.
function findSentence(passageText: string, targetWord: string): string {
  const sentences = passageText.match(/[^.!?]+[.!?]*/g) || [passageText];
  const hit = sentences.find(s =>
    s.toLowerCase().includes(targetWord.toLowerCase())
  );
  return (hit || passageText).trim();
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    misses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          targetWord: { type: "string" },
          spokenWord: { type: "string" },
          classification: {
            type: "string",
            enum: ["interference_pattern", "inconsistent_pattern"]
          },
          reasoning: { type: "string" },
          reasoningNative: { type: ["string", "null"] }
        },
        required: [
          "targetWord",
          "spokenWord",
          "classification",
          "reasoning",
          "reasoningNative"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["misses"],
  additionalProperties: false
} as const;

const INSTRUCTIONS = [
  "You are a reading observation assistant. A student read an English passage aloud and misread some words. Classify each misread word descriptively; do not diagnose, screen for disability, estimate risk, assign probabilities, or create IEP content.",
  "",
  "Use exactly one of two categories:",
  "- interference_pattern: the target/spoken difference is explainable by a known difference between English and the student's native language, including sounds, spelling patterns, orthography, or script. In reasoning, cite the specific linguistic feature behind the call.",
  "- inconsistent_pattern: the difference does not fit a known interference explanation for that native language. Phrase this as worth a closer teacher look, not as a diagnosis or clinical concern.",
  "",
  "For native English, no significant L1 interference is expected. Use interference_pattern only if the pair is clearly explainable by a familiar English dialect/accent or English phonics feature; otherwise use inconsistent_pattern.",
  "",
  "You are given a phoneticSimilarity score from 0 to 1, where higher means the target and spoken words sound more alike. Treat it as useful context, not a hard rule.",
  "",
  "Respond with one classification per candidate, in the same order given.",
  "",
  "Bilingual field: if the student's native language is not English, fill reasoningNative with a natural translation of reasoning into the student's native language. Use the language's nativeName as the translation target. If the native language is English, set reasoningNative to null."
].join("\n");

export async function classifyMisses(
  openai: OpenAI,
  passageText: string,
  transcript: string,
  nativeLanguageCode: NativeLanguageCode
): Promise<Miss[]> {
  const nativeLanguage = findNativeLanguage(nativeLanguageCode);
  if (!nativeLanguage) {
    throw new Error(`Unsupported native language: ${nativeLanguageCode}`);
  }

  const targetWords = tokenize(passageText);
  const spokenWords = tokenize(transcript);
  const aligned = alignWords(targetWords, spokenWords);

  const candidates: Candidate[] = aligned
    .filter(pair => pair.op === "substitution" && pair.target && pair.spoken)
    .map(pair => ({
      targetWord: pair.target as string,
      spokenWord: pair.spoken as string,
      sentence: findSentence(passageText, pair.target as string),
      phoneticSimilarity: Math.round(
        phoneticSimilarity(pair.target as string, pair.spoken as string) * 100
      ) / 100
    }));

  if (candidates.length === 0) {
    return [];
  }

  const response = await openai.responses.create({
    model: "gpt-5.6",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({ nativeLanguage, candidates }),
    text: {
      format: {
        type: "json_schema",
        name: "miscue_classification",
        schema: RESPONSE_SCHEMA,
        strict: true
      }
    }
  });

  const parsed = JSON.parse(response.output_text) as { misses: Miss[] };
  return parsed.misses;
}
