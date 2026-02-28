import { env } from "./env.js";
import { getSetting, setSetting } from "./settings.js";

const DEFAULT_MAX_LENGTH = 300;

const aiLogConfig = {
  openAiResponseEnabled: env.OPENAI_RESPONSE_LOG_ENABLED,
  aiClientTrafficEnabled: false,
  responseMaxLength: DEFAULT_MAX_LENGTH,
};

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeMaxLength(value, fallback = DEFAULT_MAX_LENGTH) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(50, Math.min(99999, Math.round(numeric)));
}

export function getAiLogConfigSync() {
  return { ...aiLogConfig };
}

export function updateAiLogConfig(partial = {}) {
  if (partial.openAiResponseEnabled !== undefined) {
    aiLogConfig.openAiResponseEnabled = Boolean(partial.openAiResponseEnabled);
  }
  if (partial.aiClientTrafficEnabled !== undefined) {
    aiLogConfig.aiClientTrafficEnabled = Boolean(partial.aiClientTrafficEnabled);
  }
  if (partial.responseMaxLength !== undefined) {
    aiLogConfig.responseMaxLength = normalizeMaxLength(partial.responseMaxLength, aiLogConfig.responseMaxLength);
  }
  return getAiLogConfigSync();
}

export async function loadAiLogConfigFromSettings() {
  const [openAiResponseRaw, aiClientTrafficRaw, responseMaxLengthRaw] = await Promise.all([
    getSetting("openAiResponseLogEnabled"),
    getSetting("aiClientTrafficLogEnabled"),
    getSetting("aiResponseLogMaxLength"),
  ]);

  updateAiLogConfig({
    openAiResponseEnabled: parseBoolean(openAiResponseRaw, env.OPENAI_RESPONSE_LOG_ENABLED),
    aiClientTrafficEnabled: parseBoolean(aiClientTrafficRaw, false),
    responseMaxLength: normalizeMaxLength(responseMaxLengthRaw, DEFAULT_MAX_LENGTH),
  });

  await Promise.all([
    setSetting("openAiResponseLogEnabled", String(aiLogConfig.openAiResponseEnabled)),
    setSetting("aiClientTrafficLogEnabled", String(aiLogConfig.aiClientTrafficEnabled)),
    setSetting("aiResponseLogMaxLength", String(aiLogConfig.responseMaxLength)),
  ]);

  return getAiLogConfigSync();
}

export async function saveAiLogConfigToSettings({ openAiResponseEnabled, aiClientTrafficEnabled, responseMaxLength }) {
  const nextConfig = updateAiLogConfig({ openAiResponseEnabled, aiClientTrafficEnabled, responseMaxLength });

  await Promise.all([
    setSetting("openAiResponseLogEnabled", String(nextConfig.openAiResponseEnabled)),
    setSetting("aiClientTrafficLogEnabled", String(nextConfig.aiClientTrafficEnabled)),
    setSetting("aiResponseLogMaxLength", String(nextConfig.responseMaxLength)),
  ]);

  return nextConfig;
}

export function truncateAiLogPayload(value, maxLength = aiLogConfig.responseMaxLength) {
  const normalized = typeof value === "string" ? value : JSON.stringify(value);
  const safe = String(normalized ?? "").replace(/\s+/g, " ").trim();
  if (safe.length <= maxLength) return safe;
  return `${safe.slice(0, maxLength)}...`;
}
