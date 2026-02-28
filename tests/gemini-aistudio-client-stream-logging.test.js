import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

import { GeminiAIStudioClient } from "../src/server/services/ai/geminiAIStudioClient.js";
import { updateAiLogConfig } from "../src/server/utils/aiLogging.js";

const LOG_DIR = path.resolve("log");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("streamGenerateText logs streamed SSE payload instead of placeholder body", async () => {
  updateAiLogConfig({ aiClientTrafficEnabled: true, responseMaxLength: 2000 });

  const originalFetch = global.fetch;

  const chunks = [
    'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
    'data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}]}\n',
    'data: [DONE]\n'
  ];

  try {
    global.fetch = async () => {
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        }
      });

      return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    };

    const client = new GeminiAIStudioClient({ apiKey: "test-key", model: "gemini-2.5-pro" });

    const output = [];
    for await (const part of client.streamGenerateText({ prompt: "test stream logging" })) {
      output.push(part.text);
    }

    assert.deepEqual(output, ["Hello", " world"]);
  } finally {
    global.fetch = originalFetch;
  }

  await wait(60);

  const files = fs.existsSync(LOG_DIR)
    ? fs.readdirSync(LOG_DIR).filter((name) => name.endsWith(".log")).sort()
    : [];
  assert.ok(files.length > 0, "expected log file to exist");

  const latestLog = path.join(LOG_DIR, files[files.length - 1]);
  const logText = fs.readFileSync(latestLog, "utf8");

  assert.match(logText, /\[GEMINI\] response_body=.*Hello.*world/s);
  assert.doesNotMatch(logText, /\[GEMINI\] response_body=\[stream opened\]/);
});
