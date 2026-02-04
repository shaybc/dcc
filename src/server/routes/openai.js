// src/routes/openai.js
import express from "express";
import { z } from "zod";
import { env } from "../utils/env.js";
import { logError, logInfo } from "../utils/logger.js";
import { GeminiAIStudioClient } from "../services/ai/geminiAIStudioClient.js";

const openaiRouter = express.Router();

export default openaiRouter;

function normalizeGeminiModel(model) {
  if (!model) return "gemini-2.5-pro";
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
  const reqId = req._reqId || "no-id";
  try {
    const client = getClientForModel();
    const data = await client.listModels();

    const payload = {
      object: "list",
      data: (data.models || []).map(m => ({
        id: m.name?.startsWith("models/") ? m.name.slice("models/".length) : m.name,
        object: "model",
        created: 0,
        owned_by: "google"
      }))
    };
    logOpenAiResponse(reqId, "models_json", payload);
    res.json(payload);
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
  max_tokens: z.number().min(1).max(65536).optional(),
  tools: z.array(z.any()).optional(),
  tool_choice: z.any().optional(),
  stream_options: z.any().optional()
}).passthrough();

const CompletionSchema = z.object({
  model: z.string().optional(),
  stream: z.boolean().optional(),
  prompt: z.string().min(1),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(65536).optional()
});

openaiRouter.post("/completions", async (req, res) => {
  const reqId = req._reqId || "no-id";
  const t0 = Date.now();

  try {
    const parsed = CompletionSchema.parse(req.body);

    logInfo(`[OPENAI] id=${reqId} completions stream=${Boolean(parsed.stream)} model=${parsed.model || env.GEMINI_MODEL}`);

    const client = getClientForModel(parsed.model);

    const generationConfig = cleanUndefined({
      temperature: parsed.temperature,
      maxOutputTokens: parsed.max_tokens
    });

    const raw = await client.generateText({
      prompt: parsed.prompt,
      generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined
    });

    let text =
      raw?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("") || "";
    const originalText = text;
    logInfo(`[OPENAI] id=${reqId} completions_raw_prefix=${JSON.stringify(text.slice(0, 120))} raw_len=${text.length}`);
    text = stripSingleCodeFence(text);
    logInfo(`[OPENAI] id=${reqId} completions_after_fence_prefix=${JSON.stringify(text.slice(0, 120))} len=${text.length}`);
    const normalizedText = text.replace(/\r\n/g, "\n");
    const normalizedPrompt = parsed.prompt.replace(/\r\n/g, "\n");
    const commonPrefix = commonPrefixLength(normalizedText, normalizedPrompt);
    if (commonPrefix > 0 && commonPrefix < normalizedPrompt.length) {
      const mismatchIndex = commonPrefix;
      logInfo(`[OPENAI] id=${reqId} completions_prompt_mismatch_at=${mismatchIndex}`);
      logInfo(`[OPENAI] id=${reqId} completions_prompt_expected=${JSON.stringify(normalizedPrompt.slice(mismatchIndex, mismatchIndex + 80))}`);
      logInfo(`[OPENAI] id=${reqId} completions_prompt_actual=${JSON.stringify(normalizedText.slice(mismatchIndex, mismatchIndex + 80))}`);
    }
    logInfo(`[OPENAI] id=${reqId} completions_prompt_len=${normalizedPrompt.length} prompt_common_prefix=${commonPrefix}`);
    text = stripPromptEcho(text, parsed.prompt);
    logInfo(`[OPENAI] id=${reqId} completions_after_echo_prefix=${JSON.stringify(text.slice(0, 120))} len=${text.length}`);
    text = applyStopSequences(text, parsed.stop);
    logInfo(`[OPENAI] id=${reqId} completions_after_stop_prefix=${JSON.stringify(text.slice(0, 120))} len=${text.length}`);
    if (originalText && originalText === text) {
      logInfo(`[OPENAI] id=${reqId} completions_normalization_no_change`);
    }

    logInfo(`[OPENAI] id=${reqId} completions_text_len=${text.length} preview=${JSON.stringify(text.slice(0, 200))}`);

    const modelName = normalizeGeminiModel(parsed.model || env.GEMINI_MODEL);
    const created = Math.floor(Date.now() / 1000);
    const id = `cmpl_${Date.now()}`;

    if (parsed.stream) {
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

      writeSseWithLog(res, reqId, {
        id,
        object: "text_completion",
        created,
        model: modelName,
        choices: [{ index: 0, text, logprobs: null, finish_reason: null }]
      });

      writeSseWithLog(res, reqId, {
        id,
        object: "text_completion",
        created,
        model: modelName,
        choices: [{ index: 0, text: "", logprobs: null, finish_reason: "stop" }]
      });

      res.write("data: [DONE]\n\n");
      logOpenAiResponse(reqId, "completions_sse_done", "[DONE]");
      res.end();

      logInfo(`[OPENAI] id=${reqId} completions_stream_done total_ms=${Date.now() - t0}`);
      return;
    }

    const payload = {
      id,
      object: "text_completion",
      created,
      model: modelName,
      choices: [{ index: 0, text, logprobs: null, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
    logOpenAiResponse(reqId, "completions_json", payload);
    res.json(payload);

    logInfo(`[OPENAI] id=${reqId} completions_json_reply_ms=${Date.now() - t0}`);
  } catch (e) {
    const msg = String(e?.message || e);
    logError(`[OPENAI] id=${reqId} completions_ERROR ${msg}`);
    res.status(400).json({ error: { message: msg, type: "invalid_request_error" } });
  }
});

openaiRouter.post("/chat/completions", async (req, res) => {
  const reqId = req._reqId || "no-id";
  const t0 = Date.now();

  try {
    const parsed = ChatSchema.parse(req.body);

    const system = parsed.messages.find(m => m.role === "system")?.content;
    const systemText = typeof system === "string" ? system : "";

    const contents = parsed.messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: normalizeContentText(m.content) }]
      }))
      .filter(m => m.parts[0].text.trim().length > 0);

    logInfo(`[OPENAI] id=${reqId} chat.completions stream=${Boolean(parsed.stream)} model=${parsed.model || env.GEMINI_MODEL}`);

    if (!contents.length) {
      return res.status(400).json({ error: { message: "No user message content found", type: "invalid_request_error" } });
    }

    const client = getClientForModel(parsed.model);

    const generationConfig = cleanUndefined({
      temperature: parsed.temperature,
      maxOutputTokens: parsed.max_tokens
    });

    const requestPayload = {
      contents,
      system: systemText,
      generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined,
      tools: normalizeGeminiTools(parsed.tools),
      toolConfig: buildToolConfig(parsed.tool_choice)
    };

    if (parsed.stream) {
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

      let toolCallIndex = 0;
      let sawToolCalls = false;

      try {
        writeSseWithLog(res, reqId, {
          id: "chatcmpl_stream",
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: normalizeGeminiModel(parsed.model || env.GEMINI_MODEL),
          choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }]
        });

        for await (const chunk of client.streamGenerateText(requestPayload)) {
          if (!chunk) continue;
          const { text, functionCalls } = chunk;
          if (text) {
            writeSseWithLog(res, reqId, {
              id: "chatcmpl_stream",
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: normalizeGeminiModel(parsed.model || env.GEMINI_MODEL),
              choices: [{ index: 0, delta: { content: text }, finish_reason: null }]
            });
          }
          if (functionCalls?.length) {
            sawToolCalls = true;
            const toolCalls = functionCalls.map(call => {
              const currentIndex = toolCallIndex++;
              const id = `call_${Date.now()}_${currentIndex}`;
              return {
                index: currentIndex,
                id,
                type: "function",
                function: {
                  name: call.name,
                  arguments: JSON.stringify(call.args ?? {})
                }
              };
            });
            writeSseWithLog(res, reqId, {
              id: "chatcmpl_stream",
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: normalizeGeminiModel(parsed.model || env.GEMINI_MODEL),
              choices: [{ index: 0, delta: { tool_calls: toolCalls }, finish_reason: null }]
            });
          }
        }

        writeSseWithLog(res, reqId, {
          id: "chatcmpl_stream",
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: normalizeGeminiModel(parsed.model || env.GEMINI_MODEL),
          choices: [{ index: 0, delta: {}, finish_reason: sawToolCalls ? "tool_calls" : "stop" }]
        });

        res.write("data: [DONE]\n\n");
        logOpenAiResponse(reqId, "chat_completions_sse_done", "[DONE]");
        res.end();

        logInfo(`[OPENAI] id=${reqId} stream_done total_ms=${Date.now() - t0}`);
        return;
      } catch (err) {
        return handleStreamError(res, reqId, err);
      }
    }

    const rawResponse = await client.generateText(requestPayload);

    const { text, functionCalls } = extractGeminiTextAndCalls(rawResponse);

    logInfo(`[OPENAI] id=${reqId} gemini_text_len=${text.length} preview=${JSON.stringify(text.slice(0, 200))}`);

    const modelName = normalizeGeminiModel(parsed.model || env.GEMINI_MODEL);
    const created = Math.floor(Date.now() / 1000);
    const id = `chatcmpl_${Date.now()}`;

    // Non-stream JSON
    const message = {
      role: "assistant",
      content: text || null
    };
    if (functionCalls.length) {
      message.tool_calls = toOpenAiToolCalls(functionCalls);
    }

    const payload = {
      id,
      object: "chat.completion",
      created,
      model: modelName,
      choices: [
        {
          index: 0,
          message,
          finish_reason: functionCalls.length ? "tool_calls" : "stop"
        }
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };

    logInfo(`[OPENAI] id=${reqId} json_reply_ms=${Date.now() - t0}`);
    logOpenAiResponse(reqId, "chat_completions_json", payload);
    res.json(payload);
  } catch (e) {
    if (res.headersSent) {
      return handleStreamError(res, reqId, e);
    }
    const msg = String(e?.message || e);
    logError(`[OPENAI] id=${reqId} ERROR ${msg}`);
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

    logInfo(`[OPENAI] id=${reqId} embeddings model=${modelName}`);

    const client = getClientForModel(modelName);
    const inputs = Array.isArray(parsed.input) ? parsed.input : [parsed.input];

    const data = [];
    for (let i = 0; i < inputs.length; i++) {
      const raw = await client.embedText({ model: modelName, text: inputs[i] });
      const values = raw?.embedding?.values || [];
      data.push({ object: "embedding", index: i, embedding: values });
    }

    logInfo(`[OPENAI] id=${reqId} embeddings_ok count=${data.length} ms=${Date.now() - t0}`);

    const payload = {
      object: "list",
      data,
      usage: { prompt_tokens: 0, total_tokens: 0 }
    };
    logOpenAiResponse(reqId, "embeddings_json", payload);
    res.json(payload);
  } catch (e) {
    const msg = String(e?.message || e);
    logError(`[OPENAI] id=${reqId} embeddings_ERROR ${msg}`);
    res.status(400).json({ error: { message: msg, type: "invalid_request_error" } });
  }
});

function cleanUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeSseWithLog(res, reqId, payload) {
  logOpenAiResponse(reqId, "sse_chunk", payload);
  writeSse(res, payload);
}

function normalizeContentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === "string") return part;
        if (part?.text) return part.text;
        return JSON.stringify(part);
      })
      .join("\n");
  }
  if (content == null) return "";
  return String(content);
}

function buildToolConfig(toolChoice) {
  if (!toolChoice) return undefined;
  if (toolChoice === "none") {
    return { functionCallingConfig: { mode: "NONE" } };
  }
  if (toolChoice === "auto") {
    return { functionCallingConfig: { mode: "AUTO" } };
  }
  if (toolChoice?.type === "function" && toolChoice?.function?.name) {
    return {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [toolChoice.function.name]
      }
    };
  }
  return undefined;
}

function normalizeGeminiTools(tools) {
  if (!Array.isArray(tools) || !tools.length) return undefined;
  const functionDeclarations = tools
    .map(tool => {
      if (tool?.type !== "function" || !tool.function) return null;
      const { name, description, parameters } = tool.function;
      if (!name) return null;
      return {
        name,
        description,
        parameters
      };
    })
    .filter(Boolean);

  if (!functionDeclarations.length) return undefined;
  return [{ functionDeclarations }];
}

function extractGeminiTextAndCalls(rawResponse) {
  const parts = rawResponse?.candidates?.[0]?.content?.parts || [];
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

function toOpenAiToolCalls(functionCalls) {
  return functionCalls.map((call, index) => ({
    id: `call_${Date.now()}_${index}`,
    type: "function",
    function: {
      name: call.name,
      arguments: JSON.stringify(call.args ?? {})
    }
  }));
}

function handleStreamError(res, reqId, err) {
  const msg = String(err?.message || err);
  logError(`[OPENAI] id=${reqId} ERROR ${msg}`);
  if (!res.headersSent) {
    res.status(400).json({ error: { message: msg, type: "invalid_request_error" } });
    return;
  }
  writeSseWithLog(res, reqId, {
    id: "chatcmpl_stream",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "unknown",
    choices: [{ index: 0, delta: {}, finish_reason: "error" }]
  });
  res.write("data: [DONE]\n\n");
  logOpenAiResponse(reqId, "chat_completions_sse_done", "[DONE]");
  res.end();
}

function logOpenAiResponse(reqId, label, payload) {
  if (!env.OPENAI_RESPONSE_LOG_ENABLED) {
    return;
  }
  const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
  logInfo(`[OPENAI] id=${reqId} response_${label}=${serialized}`);
}

function stripPromptEcho(text, prompt) {
  if (!text || !prompt) {
    return text;
  }

  const normalizedText = text.replace(/\r\n/g, "\n");
  const normalizedPrompt = prompt.replace(/\r\n/g, "\n");

  if (normalizedText.startsWith(normalizedPrompt)) {
    return normalizedText.slice(normalizedPrompt.length);
  }

  if (text.startsWith(prompt)) {
    return text.slice(prompt.length);
  }

  const trimmedPrompt = prompt.trimEnd();
  if (trimmedPrompt && text.startsWith(trimmedPrompt)) {
    const remainder = text.slice(trimmedPrompt.length);
    return remainder.startsWith("\n") ? remainder.slice(1) : remainder;
  }

  return text;
}

function stripSingleCodeFence(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return text;
  }

  const match = trimmed.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
  if (!match) {
    return text;
  }

  return match[1].trimEnd();
}

function applyStopSequences(text, stop) {
  if (!stop || !text) {
    return text;
  }

  const stops = Array.isArray(stop) ? stop : [stop];
  const indices = stops
    .map(s => (s ? text.indexOf(s) : -1))
    .filter(i => i >= 0);

  if (!indices.length) {
    return text;
  }

  const cutoff = Math.min(...indices);
  return text.slice(0, cutoff);
}

function commonPrefixLength(a, b) {
  const maxLen = Math.min(a.length, b.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (a[i] !== b[i]) {
      return i;
    }
  }
  return maxLen;
}
