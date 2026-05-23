import test from "node:test";
import assert from "node:assert/strict";

import { GeminiConnectorClient } from "../src/server/services/ai/geminiConnectorClient.js";

test("raw connector mode sends Gemini payload with tools to Gemini generateContent endpoint", async () => {
  const originalFetch = global.fetch;
  let capturedUrl = "";
  let capturedBody = null;

  try {
    global.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(options.body);
      return new Response(JSON.stringify({
        response: {
          candidates: [{
            content: {
              role: "model",
              parts: [{ functionCall: { name: "read_file", args: { path: "README.md" } } }]
            },
            finishReason: "STOP"
          }]
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const client = new GeminiConnectorClient({
      apiKey: "test-key",
      model: "gemini-2.5-pro",
      connectorId: "abc",
      baseUrl: "https://connector.example.com",
      mode: "raw"
    });

    const response = await client.generateText({
      contents: [{ role: "user", parts: [{ text: "read README" }] }],
      system: "You are a coding agent.",
      tools: [{ functionDeclarations: [{ name: "read_file", parameters: { type: "object" } }] }],
      toolConfig: { functionCallingConfig: { mode: "AUTO" } }
    });

    assert.equal(capturedUrl, "https://connector.example.com/api/connectors/abc/v1beta/models/gemini-2.5-pro:generateContent");
    assert.deepEqual(capturedBody.tools, [{ functionDeclarations: [{ name: "read_file", parameters: { type: "object" } }] }]);
    assert.deepEqual(capturedBody.toolConfig, { functionCallingConfig: { mode: "AUTO" } });
    assert.equal(capturedBody.systemInstruction.parts[0].text, "You are a coding agent.");
    assert.equal(response.candidates[0].content.parts[0].functionCall.name, "read_file");
  } finally {
    global.fetch = originalFetch;
  }
});
