// src/services/ai/geminiAIStudioClient.js
export class GeminiAIStudioClient {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model; // e.g. "gemini-2.5-flash" or "text-embedding-004"
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  /**
   * Generate text (non-stream).
   */
  async generateText({ prompt, generationConfig = undefined, system = undefined, tools = undefined }) {
    const modelPath = this.model.startsWith("models/") ? this.model : `models/${this.model}`;
    const url = `${this.baseUrl}/${modelPath}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const contents = [];

    if (system && system.trim()) {
      // Gemini API supports systemInstruction; keep system out of contents
    }

    contents.push({
      role: "user",
      parts: [{ text: String(prompt || "") }]
    });

    const body = {
      contents,
      ...(system && system.trim() ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      ...(generationConfig ? { generationConfig } : {}),
      ...(tools ? { tools } : {})
    };

    logGeminiRequest({
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
      throw new Error(`Gemini generateContent failed: ${r.status} ${t}`);
    }

    return await r.json();
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

    logGeminiRequest({
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
      throw new Error(`Gemini embedContent failed: ${r.status} ${t}`);
    }

    return await r.json();
  }

  /**
   * List models.
   */
  async listModels() {
    const url = `${this.baseUrl}/models?key=${encodeURIComponent(this.apiKey)}`;

    logGeminiRequest({
      method: "GET",
      url,
      headers: { "Content-Type": "application/json" }
    });

    const r = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Gemini listModels failed: ${r.status} ${t}`);
    }

    return await r.json();
  }
}

function logGeminiRequest({ method, url, headers, body }) {
  const safeUrl = redactUrlKey(url);
  const safeHeaders = { ...headers };
  console.log(`[GEMINI] ${method} ${safeUrl}`);
  console.log(`[GEMINI] headers=${JSON.stringify(safeHeaders)}`);
  if (body !== undefined) {
    console.log(`[GEMINI] body=${JSON.stringify(body)}`);
  }
}

function redactUrlKey(url) {
  if (!url) return url;
  return url.replace(/([?&]key=)[^&]+/g, "$1***redacted***");
}
