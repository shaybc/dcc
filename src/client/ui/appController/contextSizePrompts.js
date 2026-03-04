import { estimateTokens } from "./contextSizeEstimator.js";

function cleanPromptName(rawValue, fallbackLabel) {
  const value = String(rawValue || "").trim().replace(/^['"]|['"]$/g, "");
  return value || fallbackLabel;
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
    const nameMatch = chunk.match(/(?:^|\n)\s*name\s*:\s*([^\n]+)/i);
    const refMatch = chunk.match(/(?:^|\n)\s*dcc_use\s*:\s*([^\n]+)/i);
    const label = cleanPromptName(nameMatch?.[1] || refMatch?.[1], `Prompt ${index + 1}`);
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
    return [{
      id: "prompt-0",
      name: cleanPromptName(def.name, "Prompt"),
      tokens: estimateTokens(content),
      raw: content,
    }];
  }

  return [];
}
