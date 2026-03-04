const TOKEN_OPTIONS = Object.freeze([
  { label: "2M", value: 2_000_000 },
  { label: "1M", value: 1_000_000 },
  { label: "200K", value: 200_000 },
  { label: "128K", value: 128_000 },
  { label: "64K", value: 64_000 },
  { label: "32K", value: 32_000 },
  { label: "16K", value: 16_000 },
  { label: "8K", value: 8_000 },
]);

const CATEGORY_META = Object.freeze({
  instructions: { label: "Instructions", colorClass: "instructions", description: "Prompt and instruction content sent to the model." },
  mcp: { label: "MCP definitions", colorClass: "mcp", description: "MCP server/tool definitions and protocol metadata." },
  prompt: { label: "Prompt", colorClass: "prompt", description: "Primary prompt body for this definition." },
  metadata: { label: "Metadata", colorClass: "metadata", description: "Definition schema/header fields and operational metadata." },
  free: { label: "Free space", colorClass: "free", description: "Remaining context budget." },
});

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function extractContextLengthCandidate(content) {
  const raw = String(content || "");
  const patterns = [
    /contextLength\s*:\s*(\d+)/i,
    /contextWindow\s*:\s*(\d+)/i,
    /maxInputTokens\s*:\s*(\d+)/i,
    /maxTokens\s*:\s*(\d+)/i,
    /num_ctx\s*:\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > 0) {
        return Math.floor(value);
      }
    }
  }
  return null;
}

function pickTypeCategory(normalizedType) {
  if (normalizedType === "mcpservers") return "mcp";
  if (normalizedType === "prompts") return "prompt";
  if (["rules", "docs", "context", "agents", "workflows", "configs"].includes(normalizedType)) return "instructions";
  return "metadata";
}

function formatTokenCount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function computeContextUsage({ content = "", normalizedType = "unknown", limitTokens = 1_000_000, selectedPromptTokens = 0 }) {
  const safeLimit = Number.isFinite(limitTokens) && limitTokens > 0 ? Math.floor(limitTokens) : 1_000_000;
  const totalDefinitionTokens = estimateTokens(content);
  const metadataTokens = Math.max(10, Math.ceil(totalDefinitionTokens * 0.08));
  const primaryTokens = Math.max(0, totalDefinitionTokens - metadataTokens);
  const primaryCategory = pickTypeCategory(normalizedType);

  const buckets = {
    instructions: 0,
    mcp: 0,
    prompt: 0,
    metadata: metadataTokens,
  };
  buckets[primaryCategory] += primaryTokens;
  const extraPromptTokens = Number.isFinite(Number(selectedPromptTokens)) ? Math.max(0, Math.floor(Number(selectedPromptTokens))) : 0;
  buckets.prompt += extraPromptTokens;

  const usedTokens = Math.min(safeLimit, Object.values(buckets).reduce((sum, value) => sum + value, 0));
  const freeTokens = Math.max(0, safeLimit - usedTokens);

  const categories = ["instructions", "prompt", "mcp", "metadata", "free"].map((key) => {
    const tokens = key === "free" ? freeTokens : buckets[key];
    const percent = safeLimit > 0 ? (tokens / safeLimit) * 100 : 0;
    return {
      key,
      tokens,
      percent,
      ...CATEGORY_META[key],
    };
  });

  const sortedForMatrix = categories
    .filter((entry) => entry.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);

  const matrixCells = 100;
  const assigned = [];
  let consumedCells = 0;
  sortedForMatrix.forEach((entry, index) => {
    if (entry.key === "free") return;
    const rawCells = Math.round((entry.tokens / safeLimit) * matrixCells);
    const cellCount = index === sortedForMatrix.length - 1
      ? Math.max(0, Math.min(matrixCells - consumedCells, rawCells))
      : Math.max(0, Math.min(matrixCells - consumedCells, rawCells));
    consumedCells += cellCount;
    for (let i = 0; i < cellCount; i += 1) {
      assigned.push(entry.key);
    }
  });
  while (assigned.length < matrixCells) assigned.push("free");

  return {
    limitTokens: safeLimit,
    usedTokens,
    freeTokens,
    categories,
    matrixCells: assigned,
    objectTypeLabel: CATEGORY_META[primaryCategory]?.label || "Metadata",
  };
}

export {
  TOKEN_OPTIONS,
  estimateTokens,
  extractContextLengthCandidate,
  computeContextUsage,
  formatTokenCount,
  formatPercent,
};
