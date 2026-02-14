import { env } from "./env.js";
import { getSetting, setSetting } from "./settings.js";

const GEMINI_API_KEY_SETTING = "geminiApiKey";
const GEMINI_MODEL_SETTING = "geminiModel";

export function normalizeGeminiModel(value, fallback = "gemini-2.5-pro") {
  const model = String(value || "").trim();
  if (!model) return fallback;
  return model.startsWith("models/") ? model.slice("models/".length) : model;
}

export async function getGeminiSettings({ persistDefaults = true } = {}) {
  const [dbApiKey, dbModel] = await Promise.all([
    getSetting(GEMINI_API_KEY_SETTING),
    getSetting(GEMINI_MODEL_SETTING),
  ]);

  const apiKey = String(dbApiKey ?? env.GEMINI_API_KEY ?? "").trim();
  const model = normalizeGeminiModel(dbModel ?? env.GEMINI_MODEL, "gemini-2.5-pro");

  if (persistDefaults) {
    const writes = [];
    if (dbApiKey === null && apiKey) {
      writes.push(setSetting(GEMINI_API_KEY_SETTING, apiKey));
    }
    if (dbModel === null && model) {
      writes.push(setSetting(GEMINI_MODEL_SETTING, model));
    }
    if (writes.length) {
      await Promise.all(writes);
    }
  }

  return { apiKey, model };
}

export async function saveGeminiSettings({ apiKey, model }) {
  const updates = [];
  if (apiKey !== undefined) {
    updates.push(setSetting(GEMINI_API_KEY_SETTING, String(apiKey || "").trim()));
  }
  if (model !== undefined) {
    updates.push(setSetting(GEMINI_MODEL_SETTING, normalizeGeminiModel(model, "gemini-2.5-pro")));
  }
  if (updates.length) {
    await Promise.all(updates);
  }
}
