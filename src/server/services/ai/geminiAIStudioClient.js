// src/services/ai/geminiAIStudioClient.js
import { logInfo } from "../../utils/logger.js";
import { getAiLogConfigSync, truncateAiLogPayload } from "../../utils/aiLogging.js";
export class GeminiAIStudioClient {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model; // e.g. "gemini-2.5-pro" or "text-embedding-004"
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  /**
   * Generate text (non-stream).
   */
  async generateText({ prompt, contents, generationConfig = undefined, system = undefined, tools = undefined, toolConfig = undefined }) {
    const modelPath = this.model.startsWith("models/") ? this.model : `models/${this.model}`;
    const url = `${this.baseUrl}/${modelPath}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = buildGeminiBody({ prompt, contents, generationConfig, system, tools, toolConfig });

    logGeminiHttpRequest({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json" },
      body
    });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const responsePayload = await r.text();
    logGeminiHttpResponse({ method: "POST", url, status: r.status, body: responsePayload });

    if (!r.ok) {
      throw new Error(`Gemini generateContent failed: ${r.status} ${responsePayload}`);
    }

    return JSON.parse(responsePayload || "{}");
  }

  /**
   * Embeddings: uses :embedContent.
   */
  async embedText({ model, text }) {
    const m = model || this.model;
    const modelPath = m.startsWith("models/") ? m : `models/${m}`;
    const url = `${this.baseUrl}/${modelPath}:embedContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      content: { parts: [{ text: String(text || "") }] }
    };

    logGeminiHttpRequest({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json" },
      body
    });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const responsePayload = await r.text();
    logGeminiHttpResponse({ method: "POST", url, status: r.status, body: responsePayload });

    if (!r.ok) {
      throw new Error(`Gemini embedContent failed: ${r.status} ${responsePayload}`);
    }

    return JSON.parse(responsePayload || "{}");
  }

  /**
   * List models.
   */
  async listModels() {
    const url = `${this.baseUrl}/models?key=${encodeURIComponent(this.apiKey)}`;

    logGeminiHttpRequest({
      method: "GET",
      url,
      headers: { "Content-Type": "application/json" }
    });

    const r = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const responsePayload = await r.text();
    logGeminiHttpResponse({ method: "GET", url, status: r.status, body: responsePayload });

    if (!r.ok) {
      throw new Error(`Gemini listModels failed: ${r.status} ${responsePayload}`);
    }

    return JSON.parse(responsePayload || "{}");
  }

  /**
   * Stream text chunks from Gemini.
   */
  async *streamGenerateText({ prompt, contents, generationConfig = undefined, system = undefined, tools = undefined, toolConfig = undefined }) {
    const modelPath = this.model.startsWith("models/") ? this.model : `models/${this.model}`;
    const url = `${this.baseUrl}/${modelPath}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;
    const body = buildGeminiBody({ prompt, contents, generationConfig, system, tools, toolConfig });

    logGeminiHttpRequest({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json" },
      body
    });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const t = await r.text();
      logGeminiHttpResponse({ method: "POST", url, status: r.status, body: t });
      throw new Error(`Gemini streamGenerateContent failed: ${r.status} ${t}`);
    }

    logGeminiHttpResponse({ method: "POST", url, status: r.status, body: "[stream opened]" });

    if (!r.body) return;

    const reader = r.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        const payload = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        const { text, functionCalls } = extractGeminiParts(parsed?.candidates?.[0]?.content);
        if (text || functionCalls.length) {
          yield { text, functionCalls };
        }
      }
    }
  }
}

function buildGeminiBody({ prompt, contents, generationConfig, system, tools, toolConfig }) {
  const resolvedContents = Array.isArray(contents) && contents.length
    ? contents
    : [{
        role: "user",
        parts: [{ text: String(prompt || "") }]
      }];

  return {
    contents: resolvedContents,
    ...(system && system.trim() ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(generationConfig ? { generationConfig } : {}),
    ...(tools ? { tools } : {}),
    ...(toolConfig ? { toolConfig } : {})
  };
}

function extractGeminiParts(content) {
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  let text = "";
  const functionCalls = [];

  for (const part of parts) {
    if (part?.text) {
      text += part.text;
    }
    if (part?.functionCall?.name) {
      functionCalls.push(part.functionCall);
    }
  }

  return { text, functionCalls };
}

function logGeminiHttpRequest({ method, url, headers, body }) {
  const aiLogConfig = getAiLogConfigSync();
  if (!aiLogConfig.aiClientTrafficEnabled) {
    return;
  }
  const safeUrl = redactUrlKey(url);
  const safeHeaders = { ...headers };
  logInfo(`[GEMINI] request ${method} ${safeUrl}`);
  logInfo(`[GEMINI] request_headers=${truncateAiLogPayload(safeHeaders, aiLogConfig.responseMaxLength)}`);
  if (body !== undefined) {
    logInfo(`[GEMINI] request_body=${truncateAiLogPayload(body, aiLogConfig.responseMaxLength)}`);
  }
}

function logGeminiHttpResponse({ method, url, status, body }) {
  const aiLogConfig = getAiLogConfigSync();
  if (!aiLogConfig.aiClientTrafficEnabled) {
    return;
  }
  const safeUrl = redactUrlKey(url);
  logInfo(`[GEMINI] response ${method} ${safeUrl} status=${status}`);
  if (body !== undefined) {
    logInfo(`[GEMINI] response_body=${truncateAiLogPayload(body, aiLogConfig.responseMaxLength)}`);
  }
}

function redactUrlKey(url) {
  if (!url) return url;
  return url.replace(/([?&]key=)[^&]+/g, "$1***redacted***");
}
