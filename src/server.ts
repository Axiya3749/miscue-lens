import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import OpenAI, { toFile } from "openai";
import { PASSAGES } from "./passages";
import { classifyMisses } from "./classify";
import { generateExplanation } from "./explain";
import {
  SUPPORTED_NATIVE_LANGUAGES,
  NativeLanguageCode,
  isSupportedNativeLanguage
} from "./languages";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// GET /api/passages - list the fixed passage set (not strictly needed since
// the frontend also embeds this list, but useful if we want a single
// source of truth later).
app.get("/api/passages", (_req: Request, res: Response) => {
  res.json(PASSAGES);
});

// GET /api/languages - list supported native languages for the student.
app.get("/api/languages", (_req: Request, res: Response) => {
  res.json(SUPPORTED_NATIVE_LANGUAGES);
});

// POST /api/transcribe - accepts an audio file (field name "audio"),
// returns { transcript: string }.
app.post(
  "/api/transcribe",
  upload.single("audio"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file received." });
    }
    try {
      // The browser sends a Blob (in-memory Buffer here, via multer).
      // toFile() wraps that Buffer so the SDK can upload it like a real file.
      const file = await toFile(req.file.buffer, "reading.webm", {
        type: req.file.mimetype || "audio/webm"
      });

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-transcribe",
        // Speech-to-text models are trained to output fluent, "expected"
        // text and can silently auto-correct mispronunciations. This
        // instruction pushes back against that so real misreadings survive
        // into the transcript instead of being smoothed over.
        prompt:
          "Transcribe exactly what is spoken, word for word, including any mispronunciations, incorrect words, or made-up words. Do not correct errors to match the expected or most likely text."
      });

      res.json({ transcript: transcription.text });
    } catch (err) {
      console.error("Transcription failed:", err);
      res.status(500).json({ error: "Transcription failed." });
    }
  }
);

// POST /api/classify - accepts { passageText: string, transcript: string, nativeLanguage: string },
// returns { misses: { targetWord, spokenWord, classification, reasoning, reasoningNative }[] }.
app.post("/api/classify", async (req: Request, res: Response) => {
  const { passageText, transcript, nativeLanguage } = req.body ?? {};
  if (!passageText || !transcript || !nativeLanguage) {
    return res.status(400).json({
      error: "passageText, transcript, and nativeLanguage are required."
    });
  }
  if (!isSupportedNativeLanguage(nativeLanguage)) {
    return res.status(400).json({ error: "Unsupported nativeLanguage." });
  }
  try {
    const misses = await classifyMisses(
      openai,
      passageText,
      transcript,
      nativeLanguage as NativeLanguageCode
    );
    res.json({ misses });
  } catch (err) {
    console.error("Classification failed:", err);
    res.status(500).json({ error: "Classification failed." });
  }
});

// POST /api/explain - accepts { nativeLanguage: string, misses: [...] },
// returns { summary: string, tip: string, summaryNative: string | null, tipNative: string | null }.
app.post("/api/explain", async (req: Request, res: Response) => {
  const { nativeLanguage, misses } = req.body ?? {};
  if (!nativeLanguage || !misses) {
    return res
      .status(400)
      .json({ error: "nativeLanguage and misses are required." });
  }
  if (!isSupportedNativeLanguage(nativeLanguage)) {
    return res.status(400).json({ error: "Unsupported nativeLanguage." });
  }
  try {
    const explanation = await generateExplanation(
      openai,
      nativeLanguage as NativeLanguageCode,
      misses
    );
    res.json(explanation);
  } catch (err) {
    console.error("Explanation failed:", err);
    res.status(500).json({ error: "Explanation failed." });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
