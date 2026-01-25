// src/services/ai/geminiAIStudioClient.js
import { env } from "../../utils/env.js";

/**
 * Gemini AI Studio (Google AI Studio) REST client
 * Base host: https://generativelanguage.googleapis.com
 *
 * We keep this client small and explicit, so it can be maintained easily.
 */
export class GeminiAIStudioClient {
  constructor({ apiKey, model }) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");
    this.apiKey = apiKey;
    this.model = model || "gemini-2.0-flash";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  /**
   * List models available to the API key.
   */
  async listModels() {
    const url = `${this.baseUrl}/models?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    if (!res.ok) throw new Error(`Gemini listModels failed (${res.status}): ${text}`);
    return JSON.parse(text);
  }

  /**
   * Generate content (non-stream).
   * @param {object} params
   * @param {string} params.prompt - user prompt text
   * @param {object} [params.generationConfig] - temperature/maxOutputTokens/etc
   * @param {string} [params.system] - optional system instruction
   */
  async generateText({ prompt, generationConfig = undefined, system = undefined }) {
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    };

    if (system && system.trim()) {
      // Gemini uses a separate "systemInstruction" field
      body.systemInstruction = { parts: [{ text: system }] };
    }

    if (generationConfig) {
      body.generationConfig = generationConfig;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`Gemini generateContent failed (${res.status}): ${text}`);
    return JSON.parse(text);
  }
}

async embedContent({ model, input }) {
  const m = model?.startsWith("models/") ? model : `models/${model}`;
  const url = `${this.baseUrl}/${m}:embedContent?key=${encodeURIComponent(this.apiKey)}`;

  const body = {
    content: { parts: [{ text: input }] }
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Gemini embedContent failed: ${r.status} ${t}`);
  }

  return await r.json();
}

/**
 * Factory so the rest of the app doesn’t need to know env specifics.
 */
export function getGeminiClient() {
  return new GeminiAIStudioClient({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL
  });
}
