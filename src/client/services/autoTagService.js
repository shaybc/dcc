import { runWithLoading } from "./loadingService.js";

function createClientRequestId() {
  return `autotag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTagList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)));
}

function parseSuggestedTags(rawText = "") {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return normalizeTagList(parsed);
    }
    if (Array.isArray(parsed?.tags)) {
      return normalizeTagList(parsed.tags);
    }
  } catch (_error) {
    // fall through to text parsing
  }

  return normalizeTagList(trimmed
    .split(/[\n,]/)
    .map((token) => token.replace(/^[-*\d.)\s]+/, "")));
}

export async function suggestTagsForDefinitionContent({ definitionContent = "", existingTags = [], availableTags = [] }) {
  const content = String(definitionContent || "").trim();
  if (!content) {
    throw new Error("Definition content is required before running auto-tag.");
  }

  const knownTags = normalizeTagList(availableTags);
  const currentTags = normalizeTagList(existingTags);
  const clientRequestId = createClientRequestId();

  const prompt = [
    "You suggest concise software definition tags.",
    "Given the definition content and available tags, propose the best tags.",
    "You may include new tags if none of the available tags fit.",
    "Keep tags lowercase and short (1-3 words).",
    "Return ONLY valid JSON with this shape: {\"tags\":[\"tag-one\",\"tag-two\"]}.",
    "Do not include markdown or explanations.",
    "",
    `Existing tags: ${JSON.stringify(currentTags)}`,
    `Available tags: ${JSON.stringify(knownTags)}`,
    "",
    "Definition content:",
    content
  ].join("\n");

  const response = await runWithLoading(
    async () => fetch("/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DCC-Feature": "definition-auto-tag",
        "X-DCC-Client-Request-Id": clientRequestId
      },
      body: JSON.stringify({
        prompt,
        max_tokens: 800,
        temperature: 0.2
      })
    }),
    {
      title: "Analyzing definition...",
      description: "AI is suggesting tags based on content and existing taxonomy.",
      timeout: 120000
    }
  );

  if (!response) {
    throw new Error("Auto-tag request was cancelled.");
  }
  if (!response.ok) {
    throw new Error(`Auto-tag request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const completionText = payload?.choices?.[0]?.text;
  const suggested = parseSuggestedTags(completionText);
  if (suggested.length === 0) {
    throw new Error("AI did not return any valid tags.");
  }

  return normalizeTagList([...currentTags, ...suggested]);
}

export async function loadAvailableDefinitionTags() {
  const response = await fetch("/api/definition-tags");
  if (!response.ok) return [];
  const payload = await response.json();
  return normalizeTagList(payload);
}
