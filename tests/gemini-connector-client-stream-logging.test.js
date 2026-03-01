import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

import { GeminiConnectorClient } from "../src/server/services/ai/geminiConnectorClient.js";
import { updateAiLogConfig } from "../src/server/utils/aiLogging.js";

const LOG_DIR = path.resolve("log");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("connector streamGenerateText logs simulated stream response body", async () => {
  updateAiLogConfig({ aiClientTrafficEnabled: true, responseMaxLength: 2000 });

  const originalFetch = global.fetch;

  try {
    global.fetch = async () => new Response(
      JSON.stringify({ response: "connector stream text" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    const client = new GeminiConnectorClient({
      apiKey: "test-key",
      model: "gemini-2.5-pro",
      connectorId: "abc",
      baseUrl: "https://connector.example.com"
    });

    const chunks = [];
    for await (const part of client.streamGenerateText({ prompt: "test connector stream" })) {
      chunks.push(part.text);
    }

    assert.deepEqual(chunks, ["connector stream text"]);
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

  assert.match(logText, /\[CONNECTOR\] response_body=.*connector stream text/s);
  assert.doesNotMatch(logText, /\[CONNECTOR\] response_body=\[stream opened\]/);
});
