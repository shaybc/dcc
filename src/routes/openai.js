// src/routes/openai.js
import express from "express";
import { z } from "zod";
import { env } from "../utils/env.js";
import { GeminiAIStudioClient } from "../services/ai/geminiAIStudioClient.js";

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

openaiRouter.post("/chat/completions", async (req, res) => {
  const reqId = req._reqId || "no-id";
  const t0 = Date.now();

  try {
    const parsed = ChatSchema.parse(req.body);

    const system = parsed.messages.find(m => m.role === "system")?.content;
    const systemText = typeof system === "string" ? system : "";

    const userText = parsed.messages
      .filter(m => m.role === "user")
      .map(m => (typeof m.content === "string" ? m.content : ""))
      .join("\n\n")
      .trim();

    console.log(`[OPENAI] id=${reqId} chat.completions stream=${Boolean(parsed.stream)} model=${parsed.model || env.GEMINI_MODEL}`);

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

    console.log(`[OPENAI] id=${reqId} gemini_text_len=${text.length} preview=${JSON.stringify(text.slice(0, 200))}`);

    const modelName = normalizeGeminiModel(parsed.model || env.GEMINI_MODEL);
    const created = Math.floor(Date.now() / 1000);
    const id = `chatcmpl_${Date.now()}`;

    if (parsed.stream) {
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

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

      console.log(`[OPENAI] id=${reqId} stream_done total_ms=${Date.now() - t0}`);
      return;
    }

    // Non-stream JSON
    const payload = {
      id,
      object: "chat.completion",
      created,
      model: modelName,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: "stop"
        }
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };

    console.log(`[OPENAI] id=${reqId} json_reply_ms=${Date.now() - t0}`);
    res.json(payload);
  } catch (e) {
    const msg = String(e?.message || e);
    console.log(`[OPENAI] id=${reqId} ERROR ${msg}`);
    res.status(400).json({ error: { message: msg, type: "invalid_request_error" } });
  }
});

const EmbeddingsSchema = z.object({
  model: z.string().optional(),
  input: z.union([z.string(), z.array(z.string())])
});

openaiRouter.post("/embeddings", async (req, res) => {
  const reqId = req._reqId || "no-id";
  const t0 = Date.now();

  try {
    const parsed = EmbeddingsSchema.parse(req.body);
    const modelName = parsed.model || "text-embedding-004";

    console.log(`[OPENAI] id=${reqId} embeddings model=${modelName}`);

    const client = getClientForModel(modelName);
    const inputs = Array.isArray(parsed.input) ? parsed.input : [parsed.input];

    const data = [];
    for (let i = 0; i < inputs.length; i++) {
      const raw = await client.embedText({ model: modelName, text: inputs[i] });
      const values = raw?.embedding?.values || [];
      data.push({ object: "embedding", index: i, embedding: values });
    }

    console.log(`[OPENAI] id=${reqId} embeddings_ok count=${data.length} ms=${Date.now() - t0}`);

    res.json({
      object: "list",
      data,
      usage: { prompt_tokens: 0, total_tokens: 0 }
    });
  } catch (e) {
    const msg = String(e?.message || e);
    console.log(`[OPENAI] id=${reqId} embeddings_ERROR ${msg}`);
    res.status(400).json({ error: { message: msg, type: "invalid_request_error" } });
  }
});

function cleanUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}
