# Miscue Lens

A tool that listens to a student read an English passage aloud and flags whether each misread word looks like a **native-language interference pattern** (explainable by a known difference between English and the student's native language) or an **inconsistent pattern** (doesn't fit a known interference explanation — worth a closer teacher look). Built for OpenAI Build Week, Education track.

**This is a descriptive observation tool, not a diagnostic one.** It never outputs a risk score, probability, disability screening result, or IEP (Individualized Education Program) content. Every summary ends with an explicit "this is not a diagnosis and does not replace professional evaluation" line, enforced in code as well as in the prompt.

## How it works

1. A teacher picks the student's native language (currently English or Chinese — see "Scope" below) and a short passage.
2. The student reads the passage aloud into the mic.
3. The recording is transcribed with OpenAI's `gpt-4o-transcribe`.
4. The transcript is aligned against the original passage word-by-word (a Levenshtein-style dynamic-programming diff, `src/align.ts`) to find substitutions.
5. Each substitution is classified by `gpt-5.6` (via Structured Outputs) as `interference_pattern` or `inconsistent_pattern`, with reasoning citing the specific linguistic feature when applicable (`src/classify.ts`).
6. `gpt-5.6` generates a plain-language, teacher-facing summary and a practice tip — descriptive only, bilingual when the student's native language isn't English (`src/explain.ts`).

## Tech stack

Node/Express + TypeScript backend, single-file vanilla HTML/CSS/JS frontend, OpenAI SDK.

## Setup

```bash
npm install
cp .env.example .env   # then add your OPENAI_API_KEY
npm run dev
```

Open `http://localhost:3000`.

## How to test it

Pick a native language and a passage, click **Start Recording**, read the passage aloud — try deliberately swapping in a word or two (e.g. read "squirrels" as "elephants") to see both classification types — click **Stop**, then **Analyze Reading**. The results panel shows the transcript, each misread word with its classification and reasoning, and a summary with a practice tip. If the student's native language isn't English, a toggle switches the explanation into that language.

## How Codex and GPT-5.6 were used

The initial application — recording UI, passage picker, Express server scaffolding, the Whisper/gpt-4o-transcribe integration, and the word-alignment algorithm — was built iteratively in a Claude-assisted session. Partway through, the product direction changed from a fixed two-population model (native English / Chinese-background) to a general framework that works for a student with any native language. **Codex was used to execute that core rework**: it built `src/languages.ts` (the native-language registry), rewrote `src/classify.ts` and `src/explain.ts` around the `interference_pattern` / `inconsistent_pattern` model, added the `GET /api/languages` endpoint and wired it through `src/server.ts`, and updated the frontend's language dropdown, result labels, and bilingual toggle — while leaving the transcription and alignment logic untouched.

Codex session ID (primary build thread): `019f7829-221a-7080-b918-c0877658ace1`

Key product decisions made deliberately, not left to the model:
- Dropped stylus/gaze biometric tracking and a native-language baseline-reading step from the original concept — neither was buildable to a reliable, testable standard in the time available.
- Hard constraint that the tool never outputs a risk score, probability, or IEP content. This is enforced both in the model instructions and in code — `ensureDisclaimer()` in `src/explain.ts` appends the not-a-diagnosis line regardless of what the model returns.
- Scoped supported native languages to English and Chinese specifically because those are the two we could personally verify for translation and linguistic-reasoning accuracy. The language registry is data-driven (`src/languages.ts`) so more languages can be added once verified — the classification and explanation logic already generalizes to any entry in that list.

### Where GPT-5.6 is used specifically
- `src/classify.ts` — classifies each misread word via a strict JSON-schema Structured Outputs call to `model: "gpt-5.6"`.
- `src/explain.ts` — generates the summary and practice tip, also via `gpt-5.6` with Structured Outputs.

(Transcription uses `gpt-4o-transcribe`, a separate OpenAI model, since GPT-5.6 doesn't do audio transcription.)

## Scope and limitations

- Not a diagnostic tool. Outputs are descriptive observations for a teacher's own judgment, never a diagnosis, risk score, or legal/clinical recommendation.
- Supports English and Chinese native-language framing only, by design — see above.
- Small fixed set of practice passages, for demo reliability.
