// src/services/ai/geminiAIStudioClient.js
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
      throw new Error(`Gemini embedContent failed: ${r.status} ${t}`);
    }

    return await r.json();
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

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Gemini listModels failed: ${r.status} ${t}`);
    }

    return await r.json();
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
      throw new Error(`Gemini streamGenerateContent failed: ${r.status} ${t}`);
    }

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
        const text =
          parsed?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("") || "";
        if (text) {
          yield text;
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

function logGeminiHttpRequest({ method, url, headers, body }) {
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
