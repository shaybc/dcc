import { normalizeDefinitionType } from "../parse.js";

export const DESTINATIONS = Object.freeze({
  CONTINUE: "continue",
  COPILOT: "copilot",
  GEMINI: "gemini"
});

export const EXPORT_COMPATIBILITY = Object.freeze({
  [DESTINATIONS.CONTINUE]: Object.freeze([
    "rules",
    "prompts",
    "workflows",
    "models",
    "agents",
    "mcpservers",
    "context",
    "docs",
    "configs"
  ]),
  [DESTINATIONS.COPILOT]: Object.freeze([
    "rules",
    "prompts",
    "agents"
  ]),
  [DESTINATIONS.GEMINI]: Object.freeze([
    "rules",
    "prompts"
  ])
});

export function getExportability(type, destination) {
  const normalizedDestination = String(destination || "").trim().toLowerCase();
  if (!EXPORT_COMPATIBILITY[normalizedDestination]) {
    return { supported: false, reason: "unknown_destination" };
  }

  const normalizedType = normalizeDefinitionType(type);
  if (!normalizedType) {
    return { supported: false, reason: "missing_type" };
  }

  const supported = EXPORT_COMPATIBILITY[normalizedDestination].includes(normalizedType);
  if (!supported) {
    return { supported: false, reason: "unsupported_type_for_destination" };
  }

  return { supported: true };
}
