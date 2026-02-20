import { env } from "./env.js";
import { getSetting, setSetting } from "./settings.js";

const GEMINI_API_KEY_SETTING = "geminiApiKey";
const GEMINI_MODEL_SETTING = "geminiModel";
const GEMINI_CLIENT_SETTING = "geminiClient";
const GEMINI_CONNECTOR_ID_SETTING = "geminiConnectorId";
const GEMINI_CONNECTOR_BASE_URL_SETTING = "geminiConnectorBaseUrl";
const GEMINI_CONNECTOR_API_KEY_SETTING = "geminiConnectorApiKey";
const GEMINI_CONNECTOR_MODEL_SETTING = "geminiConnectorModel";

export function normalizeGeminiClient(value, fallback = "connector") {
  const client = String(value || "").trim().toLowerCase();
  if (client === "connector" || client === "aistudio") {
    return client;
  }
  return fallback;
}

export function normalizeGeminiModel(value, fallback = "gemini-2.5-pro") {
  const model = String(value || "").trim();
  if (!model) return fallback;
  return model.startsWith("models/") ? model.slice("models/".length) : model;
}

export async function getGeminiSettings({ persistDefaults = true } = {}) {
  const [dbApiKey, dbModel, dbClient, dbConnectorId, dbConnectorBaseUrl, dbConnectorApiKey, dbConnectorModel] = await Promise.all([
    getSetting(GEMINI_API_KEY_SETTING),
    getSetting(GEMINI_MODEL_SETTING),
    getSetting(GEMINI_CLIENT_SETTING),
    getSetting(GEMINI_CONNECTOR_ID_SETTING),
    getSetting(GEMINI_CONNECTOR_BASE_URL_SETTING),
    getSetting(GEMINI_CONNECTOR_API_KEY_SETTING),
    getSetting(GEMINI_CONNECTOR_MODEL_SETTING),
  ]);

  const apiKey = String(dbApiKey ?? env.GEMINI_API_KEY ?? "").trim();
  const model = normalizeGeminiModel(dbModel ?? env.GEMINI_MODEL, "gemini-2.5-pro");
  const client = normalizeGeminiClient(dbClient, "connector");
  const connectorId = String(dbConnectorId ?? "").trim();
  const connectorBaseUrl = String(dbConnectorBaseUrl ?? "").trim();
  const connectorApiKey = String(dbConnectorApiKey ?? "").trim();
  const connectorModel = normalizeGeminiModel(dbConnectorModel, "gemini-2.5-pro");

  if (persistDefaults) {
    const writes = [];
    if (dbApiKey === null && apiKey) {
      writes.push(setSetting(GEMINI_API_KEY_SETTING, apiKey));
    }
    if (dbModel === null && model) {
      writes.push(setSetting(GEMINI_MODEL_SETTING, model));
    }
    if (dbClient === null && client) {
      writes.push(setSetting(GEMINI_CLIENT_SETTING, client));
    }
    if (dbConnectorModel === null && connectorModel) {
      writes.push(setSetting(GEMINI_CONNECTOR_MODEL_SETTING, connectorModel));
    }
    if (writes.length) {
      await Promise.all(writes);
    }
  }

  return { apiKey, model, client, connectorId, connectorBaseUrl, connectorApiKey, connectorModel };
}

export async function saveGeminiSettings({ apiKey, model, client, connectorId, connectorBaseUrl, connectorApiKey, connectorModel }) {
  const updates = [];
  if (apiKey !== undefined) {
    updates.push(setSetting(GEMINI_API_KEY_SETTING, String(apiKey || "").trim()));
  }
  if (model !== undefined) {
    updates.push(setSetting(GEMINI_MODEL_SETTING, normalizeGeminiModel(model, "gemini-2.5-pro")));
  }
  if (client !== undefined) {
    updates.push(setSetting(GEMINI_CLIENT_SETTING, normalizeGeminiClient(client, "connector")));
  }
  if (connectorId !== undefined) {
    updates.push(setSetting(GEMINI_CONNECTOR_ID_SETTING, String(connectorId || "").trim()));
  }
  if (connectorBaseUrl !== undefined) {
    updates.push(setSetting(GEMINI_CONNECTOR_BASE_URL_SETTING, String(connectorBaseUrl || "").trim()));
  }
  if (connectorApiKey !== undefined) {
    updates.push(setSetting(GEMINI_CONNECTOR_API_KEY_SETTING, String(connectorApiKey || "").trim()));
  }
  if (connectorModel !== undefined) {
    updates.push(setSetting(GEMINI_CONNECTOR_MODEL_SETTING, normalizeGeminiModel(connectorModel, "gemini-2.5-pro")));
  }
  if (updates.length) {
    await Promise.all(updates);
  }
}
