import { estimateTokens } from "./contextSizeEstimator.js";

function cleanPromptName(rawValue, fallbackLabel) {
  const value = String(rawValue || "").trim().replace(/^['"]|['"]$/g, "");
  return value || fallbackLabel;
}

function getLastUriPart(uriValue) {
  const normalized = String(uriValue || "").trim().replace(/^['"]|['"]$/g, "");
  if (!normalized) return "";
  const withoutTrailingSlash = normalized.replace(/\/+$/, "");
  const segments = withoutTrailingSlash.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

function extractPromptsBlock(content) {
  const raw = String(content || "");
  const blockMatch = raw.match(/(^|\n)prompts\s*:\s*\n([\s\S]*?)(\n\S|$)/);
  if (!blockMatch) {
    return "";
  }
  return String(blockMatch[2] || "");
}

function extractPromptItemsFromBlock(blockContent) {
  const normalized = String(blockContent || "").trim();
  if (!normalized) {
    return [];
  }

  const chunks = normalized
    .split(/\n(?=\s*-\s+)/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return chunks.map((chunk, index) => {
    const dccUriMatch = chunk.match(/(?:^|\n)\s*dcc_uri\s*:\s*([^\n]+)/i);
    const dccUseMatch = chunk.match(/(?:^|\n)\s*dcc_use\s*:\s*([^\n]+)/i);
    const nameMatch = chunk.match(/(?:^|\n)\s*name\s*:\s*([^\n]+)/i);
    const uriPart = getLastUriPart(dccUriMatch?.[1] || dccUseMatch?.[1]);
    const label = cleanPromptName(uriPart || nameMatch?.[1], "Prompt");

    return {
      id: `${label}-${index}`,
      name: label,
      tokens: estimateTokens(chunk),
      raw: chunk,
    };
  });
}

export function extractPromptOptionsFromDefinition({ definition, normalizedType }) {
  const def = definition || {};
  const content = String(def.content || "");

  const promptsBlock = extractPromptsBlock(content);
  const blockPrompts = extractPromptItemsFromBlock(promptsBlock);
  if (blockPrompts.length > 0) {
    return blockPrompts;
  }

  if (normalizedType === "prompts") {
    const dccUriMatch = content.match(/(?:^|\n)\s*dcc_uri\s*:\s*([^\n]+)/i);
    const uriPart = getLastUriPart(dccUriMatch?.[1]);
    return [{
      id: "prompt-0",
      name: cleanPromptName(uriPart || def.name, "Prompt"),
      tokens: estimateTokens(content),
      raw: content,
    }];
  }

  return [];
}
