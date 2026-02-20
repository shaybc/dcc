// src/services/ai/geminiConnectorClient.js
import { logInfo } from "../../utils/logger.js";

export class GeminiConnectorClient {
  constructor({ apiKey, model, connectorId, baseUrl, embedConnectorId, textParam = "text", filesParam = "files" }) {
    if (!connectorId) throw new Error("GeminiConnectorClient: connectorId is required");
    if (!baseUrl)     throw new Error("GeminiConnectorClient: baseUrl is required");

    this.apiKey          = apiKey;
    this.model           = model || "connector-model";
    this.connectorId     = connectorId;
    this.baseUrl         = baseUrl.replace(/\/$/, "");
    this.embedConnectorId = embedConnectorId || null;
    this.textParam       = textParam;
    this.filesParam      = filesParam;
  }

  async generateText({ prompt, contents, generationConfig, system }) {
    const url = this._connectorUrl(this.connectorId);
    const text = this._flattenContents({ prompt, contents, system });
    const body = this._buildRequestBody(text, generationConfig);

    logConnectorHttpRequest({ method: "POST", url, body });

    const r = await fetch(url, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`GeminiConnectorClient generateText failed: ${r.status} ${t}`);
    }

    const json = await r.json();
    logInfo(`[CONNECTOR] generateText response=${JSON.stringify(json).slice(0, 200)}`);

    return this._normalizeToGeminiResponse(json);
  }

  async embedText({ model: _model, text }) {
    if (!this.embedConnectorId) {
      throw new Error(
        "GeminiConnectorClient: embedText is not supported by the Connector REST API. " +
        "Provide an embedConnectorId at construction to route embeddings to a dedicated connector."
      );
    }

    const url    = this._connectorUrl(this.embedConnectorId);
    const body   = { [this.textParam]: String(text || "") };

    logConnectorHttpRequest({ method: "POST", url, body });

    const r = await fetch(url, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`GeminiConnectorClient embedText failed: ${r.status} ${t}`);
    }

    const json = await r.json();
    logInfo(`[CONNECTOR] embedText response=${JSON.stringify(json).slice(0, 200)}`);

    const raw = json?.response;
    let values = [];
    if (Array.isArray(raw)) {
      values = raw.map(Number);
    } else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          values = parsed.map(Number);
        } else {
          values = raw.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
        }
      } catch {
        values = raw.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
      }
    }

    return { embedding: { values } };
  }

  async listModels() {
    logInfo(`[CONNECTOR] listModels — returning synthetic model list (Connector API has no list-models endpoint)`);
    return {
      models: [
        {
          name:              `models/${this.model}`,
          displayName:       this.model,
          description:       "Model served via Connector API",
          supportedGenerationMethods: ["generateContent"]
        }
      ]
    };
  }

  async *streamGenerateText({ prompt, contents, generationConfig, system, tools, toolConfig }) {
    logInfo(`[CONNECTOR] streamGenerateText — simulated (no SSE on Connector API)`);

    const raw = await this.generateText({ prompt, contents, generationConfig, system, tools, toolConfig });

    const { text, functionCalls } = extractGeminiParts(raw?.candidates?.[0]?.content);

    if (text || functionCalls.length) {
      yield { text, functionCalls };
    }
  }

  _connectorUrl(connectorId) {
    return `${this.baseUrl}/api/connectors/${encodeURIComponent(connectorId)}`;
  }

  _headers() {
    return {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${this.apiKey}`
    };
  }

  _flattenContents({ prompt, contents, system }) {
    const parts = [];

    if (system && typeof system === "string" && system.trim()) {
      parts.push(`[System]: ${system.trim()}`);
    }

    if (Array.isArray(contents) && contents.length) {
      for (const turn of contents) {
        const role    = turn.role === "model" ? "assistant" : (turn.role || "user");
        const turnParts = Array.isArray(turn.parts) ? turn.parts : [];
        const turnText  = turnParts
          .map(p => (typeof p?.text === "string" ? p.text : ""))
          .join("");
        if (turnText.trim()) {
          parts.push(contents.length === 1 ? turnText : `${role}: ${turnText}`);
        }
      }
    } else if (prompt) {
      parts.push(String(prompt));
    }

    return parts.join("\n\n");
  }

  _buildRequestBody(text, generationConfig) {
    const body = { [this.textParam]: text };

    if (generationConfig && typeof generationConfig === "object") {
      if (generationConfig.temperature   !== undefined) body.temperature    = generationConfig.temperature;
      if (generationConfig.topP          !== undefined) body.topP           = generationConfig.topP;
      if (generationConfig.topK          !== undefined) body.topK           = generationConfig.topK;
      if (generationConfig.maxOutputTokens !== undefined) body.maxOutputTokens = generationConfig.maxOutputTokens;
    }

    return body;
  }

  _normalizeToGeminiResponse(json) {
    const resp = json?.response;

    if (resp && typeof resp === "object" && Array.isArray(resp.candidates)) {
      return resp;
    }

    const text = typeof resp === "string" ? resp : String(resp ?? "");

    return {
      candidates: [
        {
          content: {
            role:  "model",
            parts: [{ text }]
          },
          finishReason:  "STOP",
          safetyRatings: []
        }
      ],
      usageMetadata: {
        promptTokenCount:     0,
        candidatesTokenCount: 0,
        totalTokenCount:      0
      }
    };
  }
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

function logConnectorHttpRequest({ method, url, body }) {
  const safeUrl = url.replace(/([?&]key=)[^&]+/g, "$1***redacted***");
  logInfo(`[CONNECTOR] ${method} ${safeUrl}`);
  if (body !== undefined) {
    logInfo(`[CONNECTOR] body=${JSON.stringify(body).slice(0, 400)}`);
  }
}
