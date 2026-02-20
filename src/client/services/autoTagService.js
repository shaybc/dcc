import { runWithLoading } from "./loadingService.js";

function createClientRequestId() {
  return `autotag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTagList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)));
}

function stripCodeFence(value = "") {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? String(match[1] || "").trim() : trimmed;
}

function parseSuggestedTags(rawText = "") {
  const trimmed = stripCodeFence(String(rawText || "").trim());
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

function buildAutoTagPrompt({ content, currentTags, knownTags }) {
  return [
    "You suggest concise software definition tags.",
    "Given the definition content and available tags, propose the best tags.",
    "You may include new tags if none of the available tags fit.",
    "Keep tags lowercase and short (1-3 words).",
    "Return ONLY valid JSON with this shape: {\"tags\":[\"tag-one\",\"tag-two\"]}.",
    "Do not include markdown or explanations.",
    "",
    `Existing tags: ${JSON.stringify(currentTags)}` ,
    `Available tags: ${JSON.stringify(knownTags)}`,
    "",
    "Definition content:",
    content
  ].join("\n");
}

async function requestTagsViaChatCompletions({ prompt, clientRequestId }) {
  const response = await fetch("/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-DCC-Feature": "definition-auto-tag",
      "X-DCC-Client-Request-Id": clientRequestId
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a taxonomy assistant for software definitions." },
        { role: "user", content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.2
    })
  });
  if (!response.ok) return "";
  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content || "").trim();
}

async function requestTagsViaCompletions({ prompt, clientRequestId }) {
  const response = await fetch("/v1/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-DCC-Feature": "definition-auto-tag",
      "X-DCC-Client-Request-Id": clientRequestId
    },
    body: JSON.stringify({ prompt, max_tokens: 800, temperature: 0.2 })
  });
  if (!response.ok) return "";
  const payload = await response.json();
  return String(payload?.choices?.[0]?.text || "").trim();
}

function inferTagsFromContent({ content, knownTags, currentTags }) {
  const haystack = String(content || "").toLowerCase();
  const inferred = knownTags.filter((tag) => {
    const normalized = String(tag || "").trim().toLowerCase();
    if (!normalized) return false;
    const compact = normalized.replace(/[_-]+/g, " ");
    return haystack.includes(normalized) || haystack.includes(compact);
  });

  return normalizeTagList([...currentTags, ...inferred]);
}

export async function suggestTagsForDefinitionContent({ definitionContent = "", existingTags = [], availableTags = [] }) {
  const content = String(definitionContent || "").trim();
  if (!content) {
    throw new Error("Definition content is required before running auto-tag.");
  }

  const knownTags = normalizeTagList(availableTags);
  const currentTags = normalizeTagList(existingTags);
  const clientRequestId = createClientRequestId();

  const prompt = buildAutoTagPrompt({ content, currentTags, knownTags });

  const completionText = await runWithLoading(
    async () => {
      const chatText = await requestTagsViaChatCompletions({ prompt, clientRequestId });
      if (chatText) return chatText;
      return requestTagsViaCompletions({ prompt, clientRequestId });
    },
    {
      title: "Analyzing definition...",
      description: "AI is suggesting tags based on content and existing taxonomy.",
      timeout: 120000
    }
  );

  if (completionText === null || completionText === undefined) {
    throw new Error("Auto-tag request was cancelled.");
  }

  const suggested = parseSuggestedTags(completionText);
  if (suggested.length > 0) {
    return normalizeTagList([...currentTags, ...suggested]);
  }

  const inferred = inferTagsFromContent({ content, knownTags, currentTags });
  if (inferred.length > currentTags.length) {
    return inferred;
  }

  throw new Error("No tags were suggested. Try adding more descriptive content and run auto-tag again.");
}

export async function loadAvailableDefinitionTags() {
  const response = await fetch("/api/definition-tags");
  if (!response.ok) return [];
  const payload = await response.json();
  return normalizeTagList(payload);
}
