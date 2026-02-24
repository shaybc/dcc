import path from "path";
import { GeminiAIStudioClient } from "../../services/ai/geminiAIStudioClient.js";
import { env } from "../../utils/env.js";
import { getGeminiSettings } from "../../utils/geminiSettings.js";
import { PROJECT_TYPES, PROJECT_TYPE_VALUES } from "./constants.js";
import { readFileWithLimit } from "./filesystem.js";
import { normalizeProjectType } from "./technology.js";

const AI_ENABLED = env.PROJECT_SCAN_AI_ENABLED;

async function getAiClient() {
  if (!AI_ENABLED) {
    return null;
  }
  const gemini = await getGeminiSettings();
  if (!gemini.apiKey) {
    return null;
  }
  return new GeminiAIStudioClient({ apiKey: gemini.apiKey, model: gemini.model });
}

function collectPotentialAiSignals(entries) {
  const names = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
  const preferred = ["README.md", "README", "setup.py", "Makefile", "Dockerfile", "composer.json", "package-lock.json", "yarn.lock"];

  const selected = [];
  for (const fileName of preferred) {
    if (names.includes(fileName)) {
      selected.push(fileName);
    }
  }

  for (const fileName of names) {
    if (selected.length >= 16) {
      break;
    }
    if (!selected.includes(fileName)) {
      selected.push(fileName);
    }
  }

  return selected;
}

async function readSignalSnippets(repoPath, fileNames) {
  const snippets = [];
  for (const fileName of fileNames.slice(0, 8)) {
    const absolute = path.join(repoPath, fileName);
    const content = await readFileWithLimit(absolute, 700);
    if (content) {
      snippets.push({ fileName, snippet: content });
    }
  }
  return snippets;
}

function extractGeminiText(rawResponse) {
  return rawResponse?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "";
}

function parseJsonObject(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (_secondError) {
      return null;
    }
  }
}

export async function detectUnknownProjectWithAi(repoPath, entries, deterministicSignals = []) {
  const aiClient = await getAiClient();
  if (!aiClient) {
    return null;
  }

  const rootFileNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort((a, b) => a.localeCompare(b)).slice(0, 30);
  if (!rootFileNames.length) {
    return null;
  }

  const snippets = await readSignalSnippets(repoPath, collectPotentialAiSignals(entries));
  const prompt = [
    "You classify software repositories by ecosystem.",
    `Allowed projectType values: ${Array.from(PROJECT_TYPE_VALUES).join(", ")}.`,
    "Pick the single best-matching ecosystem from the allowed values.",
    "if none apply try to guess based on the file names and snippets and your knowledge,",
    "If still uncertain, return unknown.",
    "Return strict JSON only, no markdown:",
    '{"projectType":"unknown","confidence":0,"detectedSignals":[],"reason":""}',
    "- detectedSignals should be short file-based clues.",
    "- confidence must be a number between 0 and 1.",
    `Repository path: ${repoPath}`,
    `Root files: ${JSON.stringify(rootFileNames)}`,
    `Deterministic signals: ${JSON.stringify(deterministicSignals.slice(0, 24))}`,
    `File snippets: ${JSON.stringify(snippets)}`,
  ].join("\n");

  try {
    const raw = await aiClient.generateText({
      prompt,
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    });

    const parsed = parseJsonObject(extractGeminiText(raw));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const projectType = normalizeProjectType(parsed.projectType);
    const confidence = Number(parsed.confidence);
    const detectedSignals = Array.isArray(parsed.detectedSignals)
      ? parsed.detectedSignals.map((signal) => String(signal || "").trim()).filter(Boolean).slice(0, 6)
      : [];

    if (projectType === PROJECT_TYPES.UNKNOWN || !Number.isFinite(confidence) || confidence < 0.6) {
      return null;
    }

    return {
      projectType,
      detectedSignals,
      confidence,
      reason: String(parsed.reason || "").trim(),
    };
  } catch (_error) {
    return null;
  }
}
