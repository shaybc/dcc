// src/services/ai/geminiConnectorClient.js
import { logInfo } from "../../utils/logger.js";
import { getAiLogConfigSync, truncateAiLogPayload } from "../../utils/aiLogging.js";

export class GeminiConnectorClient {
  constructor({ apiKey, model, connectorId, baseUrl, embedConnectorId, textParam = "text", filesParam = "files", mode = "regular" }) {
    if (!connectorId) throw new Error("GeminiConnectorClient: connectorId is required");
    if (!baseUrl)     throw new Error("GeminiConnectorClient: baseUrl is required");

    this.apiKey          = apiKey;
    this.model           = model || "connector-model";
    this.connectorId     = connectorId;
    this.baseUrl         = baseUrl.replace(/\/$/, "");
    this.embedConnectorId = embedConnectorId || null;
    this.textParam       = textParam;
    this.filesParam      = filesParam;
    this.mode            = normalizeConnectorMode(mode);
  }

  async generateText({ prompt, contents, generationConfig, system, tools, toolConfig }) {
    const url = this._connectorUrl(this.connectorId);
    const body = this.mode === "raw"
      ? buildRawGeminiBody({ prompt, contents, generationConfig, system, tools, toolConfig })
      : this._buildRequestBody(this._flattenContents({ prompt, contents, system }), generationConfig);

    logConnectorHttpRequest({ method: "POST", url, body });

    const r = await fetch(url, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const t = await r.text();
      logConnectorHttpResponse({ method: "POST", url, status: r.status, body: t });
      throw new Error(`GeminiConnectorClient generateText failed: ${r.status} ${t}`);
    }

    const responsePayload = await r.text();
    logConnectorHttpResponse({ method: "POST", url, status: r.status, body: responsePayload });
    const json = JSON.parse(responsePayload || "{}");

    return this._normalizeToGeminiResponse(json);
  }

  async embedText({ model: _model, text }) {
    if (!this.embedConnectorId) {
      throw new Error(
        "GeminiConnectorClient: embedText is not supported by the Connector REST API. " +
        "Provide an embedConnectorId at construction to route embeddings to a dedicated connector."
      );
    }

    const url    = this._connectorUrl(this.embedConnectorId, "regular");
    const body   = { [this.textParam]: String(text || "") };

    logConnectorHttpRequest({ method: "POST", url, body });

    const r = await fetch(url, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const t = await r.text();
      logConnectorHttpResponse({ method: "POST", url, status: r.status, body: t });
      throw new Error(`GeminiConnectorClient embedText failed: ${r.status} ${t}`);
    }

    const responsePayload = await r.text();
    logConnectorHttpResponse({ method: "POST", url, status: r.status, body: responsePayload });
    const json = JSON.parse(responsePayload || "{}");

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
    const streamBody = text || functionCalls.length ? { text, functionCalls } : "[stream opened]";
    logConnectorStreamResponseBody(streamBody);

    if (text || functionCalls.length) {
      yield { text, functionCalls };
    }
  }

  _connectorUrl(connectorId, mode = this.mode) {
    const model = this.model.startsWith("models/") ? this.model.slice("models/".length) : this.model;
    const suffix = mode == "raw" ? `/v1beta/models/${encodeURIComponent(model)}:generateContent`: "";
    return `${this.baseUrl}/api/connectors/${encodeURIComponent(connectorId)}${suffix}`;
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
    if (Array.isArray(json?.candidates)) {
      return json;
    }

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

function normalizeConnectorMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return mode === "raw" ? "raw" : "regular";
}

function buildRawGeminiBody({ prompt, contents, generationConfig, system, tools, toolConfig }) {
  const resolvedContents = Array.isArray(contents) && contents.length
    ? contents
    : [{ role: "user", parts: [{ text: String(prompt || "") }] }];

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

function logConnectorStreamResponseBody(body) {
  const aiLogConfig = getAiLogConfigSync();
  if (!aiLogConfig.aiClientTrafficEnabled) {
    return;
  }
  logInfo(`[CONNECTOR] response_body=${truncateAiLogPayload(body, aiLogConfig.responseMaxLength)}`);
}

function logConnectorHttpRequest({ method, url, body }) {
  const aiLogConfig = getAiLogConfigSync();
  if (!aiLogConfig.aiClientTrafficEnabled) {
    return;
  }
  const safeUrl = url.replace(/([?&]key=)[^&]+/g, "$1***redacted***");
  logInfo(`[CONNECTOR] request ${method} ${safeUrl}`);
  if (body !== undefined) {
    logInfo(`[CONNECTOR] request_body=${truncateAiLogPayload(body, aiLogConfig.responseMaxLength)}`);
  }
}

function logConnectorHttpResponse({ method, url, status, body }) {
  const aiLogConfig = getAiLogConfigSync();
  if (!aiLogConfig.aiClientTrafficEnabled) {
    return;
  }
  const safeUrl = url.replace(/([?&]key=)[^&]+/g, "$1***redacted***");
  logInfo(`[CONNECTOR] response ${method} ${safeUrl} status=${status}`);
  if (body !== undefined) {
    logInfo(`[CONNECTOR] response_body=${truncateAiLogPayload(body, aiLogConfig.responseMaxLength)}`);
  }
}
