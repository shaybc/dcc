// src/routes/openai.js
import express from "express";
import { z } from "zod";
import { env } from "../utils/env.js";
import { GeminiAIStudioClient } from "../services/ai/geminiAIStudioClient.js";
import { logAiCall } from "../services/ai/aiLogService.js";

export const openaiRouter = express.Router();

function normalizeGeminiModel(model) {
  if (!model) return "gemini-2.5-flash";
  return model.startsWith("models/") ? model.slice("models/".length) : model;
}

function getClientForModel(modelFromRequest) {
  const model = normalizeGeminiModel(modelFromRequest || env.GEMINI_MODEL);
  return new GeminiAIStudioClient({
    apiKey: env.GEMINI_API_KEY,
    model
  });
}

openaiRouter.get("/models", async (req, res) => {
  try {
    const client = getClientForModel();
    const data = await client.listModels();

    res.json({
      object: "list",
      data: (data.models || []).map(m => ({
        id: m.name?.startsWith("models/") ? m.name.slice("models/".length) : m.name,
        object: "model",
        created: 0,
        owned_by: "google"
      }))
    });
  } catch (e) {
    res.status(500).json({ error: { message: String(e?.message || e), type: "server_error" } });
  }
});

const ChatSchema = z.object({
  model: z.string().optional(),
  stream: z.boolean().optional(),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant", "tool"]),
    content: z.union([z.string(), z.array(z.any())]).optional()
  })).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(65536).optional()
});

/**
 * POST /v1/chat/completions
 * - Non-stream: JSON
 * - Stream: SSE chunks + [DONE]
 */
openaiRouter.post("/chat/completions", async (req, res) => {
  const t0 = Date.now();
  const endpoint = "/v1/chat/completions";

  try {
    const parsed = ChatSchema.parse(req.body);

    const system = parsed.messages.find(m => m.role === "system")?.content;
    const systemText = typeof system === "string" ? system : "";

    const userText = parsed.messages
      .filter(m => m.role === "user")
      .map(m => (typeof m.content === "string" ? m.content : ""))
      .join("\n\n")
      .trim();

    if (!userText) {
      return res.status(400).json({ error: { message: "No user message content found", type: "invalid_request_error" } });
    }

    const client = getClientForModel(parsed.model);

    const generationConfig = cleanUndefined({
      temperature: parsed.temperature,
      maxOutputTokens: parsed.max_tokens
    });

    const raw = await client.generateText({
      prompt: userText,
      system: systemText,
      generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined
    });

    const text =
      raw?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("") || "";

    const modelName = normalizeGeminiModel(parsed.model || env.GEMINI_MODEL);
    const created = Math.floor(Date.now() / 1000);
    const id = `chatcmpl_${Date.now()}`;

    // Log (prompt + context refs + reply preview)
    const promptFull = buildPromptFull({ systemText, userText });
    const contextRefs = extractContextRefs(parsed.messages);
    const replyPreview = makePreview(text, env.AI_LOG_REPLY_PREVIEW_CHARS);
    logAiCall({
      endpoint,
      model: modelName,
      isStream: Boolean(parsed.stream),
      latencyMs: Date.now() - t0,
      httpStatus: 200,
      promptFull,
      contextRefs,
      replyPreview
    });

    // STREAM
    if (parsed.stream) {
      startSse(res);

      writeSse(res, {
        id,
        object: "chat.completion.chunk",
        created,
        model: modelName,
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }]
      });

      writeSse(res, {
        id,
        object: "chat.completion.chunk",
        created,
        model: modelName,
        choices: [{ index: 0, delta: { content: text }, finish_reason: null }]
      });

      writeSse(res, {
        id,
        object: "chat.completion.chunk",
        created,
        model: modelName,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
      });

      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // NON-STREAM
    res.json({
      id,
      object: "chat.completion",
      created,
      model: modelName,
      choices: [
        { index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });
  } catch (e) {
    const msg = String(e?.message || e);

    // log failures best-effort
    try {
      const modelName = normalizeGeminiModel(req.body?.model || env.GEMINI_MODEL);
      const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const systemText = typeof messages.find(m => m?.role === "system")?.content === "string"
        ? messages.find(m => m?.role === "system").content
        : "";
      const userText = messages
        .filter(m => m?.role === "user" && typeof m?.content === "string")
        .map(m => m.content)
        .join("\n\n")
        .trim();

      logAiCall({
        endpoint,
        model: modelName,
        isStream: Boolean(req.body?.stream),
        latencyMs: Date.now() - t0,
        httpStatus: 400,
        promptFull: buildPromptFull({ systemText, userText }),
        contextRefs: extractContextRefs(messages),
        replyPreview: "",
        error: msg
      });
    } catch {}

    res.status(400).json({ error: { message: msg, type: "invalid_request_error" } });
  }
});

const CompletionsSchema = z.object({
  model: z.string().optional(),
  stream: z.boolean().optional(),
  prompt: z.union([z.string(), z.array(z.string())]),
  suffix: z.string().optional(), // for FIM-like workflows
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(65536).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional()
});

/**
 * POST /v1/completions (legacy)
 * Used by some Continue flows (notably autocomplete / legacy endpoint mode).
 *
 * We map it to Gemini generateContent by building an instruction.
 */
openaiRouter.post("/completions", async (req, res) => {
  const t0 = Date.now();
  const endpoint = "/v1/completions";

  try {
    const parsed = CompletionsSchema.parse(req.body);

    // Continue might send prompt as array; we join.
    const promptText = Array.isArray(parsed.prompt) ? parsed.prompt.join("\n") : parsed.prompt;

    const finalPrompt = buildLegacyCompletionPrompt({
      prompt: promptText,
      suffix: parsed.suffix,
      stop: parsed.stop
    });

    const client = getClientForModel(parsed.model);

    const generationConfig = cleanUndefined({
      temperature: parsed.temperature,
      maxOutputTokens: parsed.max_tokens
    });

    const raw = await client.generateText({
      prompt: finalPrompt,
      system: "",
      generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined
    });

    const completionText =
      raw?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("") || "";

    const modelName = normalizeGeminiModel(parsed.model || env.GEMINI_MODEL);
    const created = Math.floor(Date.now() / 1000);
    const id = `cmpl_${Date.now()}`;

    // Log minimal info
    logAiCall({
      endpoint,
      model: modelName,
      isStream: Boolean(parsed.stream),
      latencyMs: Date.now() - t0,
      httpStatus: 200,
      promptFull: `PROMPT:\n${promptText}${parsed.suffix ? `\n\nSUFFIX:\n${parsed.suffix}` : ""}`,
      contextRefs: [], // legacy endpoint doesn't carry clear context markers
      replyPreview: makePreview(completionText, env.AI_LOG_REPLY_PREVIEW_CHARS)
    });

    if (parsed.stream) {
      startSse(res);

      // OpenAI legacy streaming is also SSE "data: { ... }\n\n" and then [DONE]
      writeSse(res, {
        id,
        object: "text_completion",
        created,
        model: modelName,
        choices: [{ index: 0, text: completionText, logprobs: null, finish_reason: "stop" }]
      });

      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    res.json({
      id,
      object: "text_completion",
      created,
      model: modelName,
      choices: [{ index: 0, text: completionText, logprobs: null, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });
  } catch (e) {
    const msg = String(e?.message || e);

    try {
      const modelName = normalizeGeminiModel(req.body?.model || env.GEMINI_MODEL);
      const promptText = typeof req.body?.prompt === "string"
        ? req.body.prompt
        : Array.isArray(req.body?.prompt)
          ? req.body.prompt.join("\n")
          : "";

      logAiCall({
        endpoint,
        model: modelName,
        isStream: Boolean(req.body?.stream),
        latencyMs: Date.now() - t0,
        httpStatus: 400,
        promptFull: `PROMPT:\n${promptText}`,
        contextRefs: [],
        replyPreview: "",
        error: msg
      });
    } catch {}

    res.status(400).json({ error: { message: msg, type: "invalid_request_error" } });
  }
});

function startSse(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
}

function cleanUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function makePreview(text, maxChars) {
  const n = Math.max(0, Number(maxChars || 0));
  if (n === 0) return "";
  const t = String(text || "");
  return t.length <= n ? t : t.slice(0, n);
}

function buildPromptFull({ systemText, userText }) {
  const sys = (systemText || "").trim();
  const usr = (userText || "").trim();
  if (sys && usr) return `SYSTEM:\n${sys}\n\nUSER:\n${usr}`;
  if (sys) return `SYSTEM:\n${sys}`;
  return `USER:\n${usr}`;
}

/**
 * Legacy completions mapping strategy:
 * - If suffix exists, we instruct Gemini to output the missing middle.
 * - We ask to output only the completion (no explanations).
 */
function buildLegacyCompletionPrompt({ prompt, suffix, stop }) {
  const stopArr = Array.isArray(stop) ? stop : stop ? [stop] : [];
  const stopHint = stopArr.length ? `\nStop sequences: ${stopArr.map(s => JSON.stringify(s)).join(", ")}` : "";

  if (suffix && suffix.trim()) {
    return [
      "You are completing code/text between a PREFIX and a SUFFIX.",
      "Return ONLY the missing text that should go between them. No explanations, no markdown fences.",
      stopHint ? `\n${stopHint}` : "",
      "\nPREFIX:\n",
      prompt || "",
      "\n\nSUFFIX:\n",
      suffix
    ].join("");
  }

  return [
    "Continue the following text/code.",
    "Return ONLY the continuation. No explanations, no markdown fences.",
    stopHint ? `\n${stopHint}` : "",
    "\n\nINPUT:\n",
    prompt || ""
  ].join("");
}

function extractContextRefs(messages) {
  const refs = new Set();

  for (const m of messages || []) {
    const content = typeof m?.content === "string" ? m.content : "";
    if (!content) continue;

    if (content.includes("@codebase")) refs.add("codebase");

    const fileLineMatches = content.matchAll(/(?:^|\n)\s*(?:File|Path)\s*:\s*([^\n\r]+)\s*/gi);
    for (const mm of fileLineMatches) {
      const name = String(mm[1] || "").trim();
      if (name) refs.add(`file:${name}`);
    }

    const fencedHeaderMatches = content.matchAll(/```([a-zA-Z0-9_\-./\\]+)\s*\n/g);
    for (const mm of fencedHeaderMatches) {
      const name = String(mm[1] || "").trim();
      if (name && (name.includes("/") || name.includes("."))) refs.add(`file:${name}`);
    }

    const pathMatches = content.matchAll(/(?:^|\s)([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-./]+?\.[a-zA-Z0-9]{1,8})(?:\s|$)/g);
    for (const mm of pathMatches) {
      refs.add(`file:${mm[1]}`);
    }
  }

  return Array.from(refs).slice(0, 50);
}
