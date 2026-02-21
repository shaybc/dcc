export const DCC_DEFINITION_TYPE_VALUES = [
  "prompt",
  "agent",
  "config",
  "model",
  "mcp_server",
  "rule",
  "doc",
  "context",
  "workflow"
];

const DCC_TO_INTERNAL = {
  prompt: "prompt",
  agent: "agent",
  config: "config",
  model: "model",
  mcp_server: "mcpServer",
  rule: "rule",
  doc: "doc",
  context: "context",
  workflow: "workflow"
};

const INTERNAL_TO_DCC = Object.fromEntries(Object.entries(DCC_TO_INTERNAL).map(([dccType, internalType]) => [internalType, dccType]));

export function normalizeDccDefinitionType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return DCC_DEFINITION_TYPE_VALUES.includes(normalized) ? normalized : "";
}

export function dccDefinitionTypeToInternal(value) {
  const normalized = normalizeDccDefinitionType(value);
  return normalized ? DCC_TO_INTERNAL[normalized] : "";
}

export function internalDefinitionTypeToDcc(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (INTERNAL_TO_DCC[normalized]) return INTERNAL_TO_DCC[normalized];
  if (normalized === "mcpserver") return "mcp_server";
  if (normalized.endsWith("s")) {
    const singular = normalized.slice(0, -1);
    if (INTERNAL_TO_DCC[singular]) return INTERNAL_TO_DCC[singular];
  }
  return "";
}
