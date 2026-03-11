import test from "node:test";
import assert from "node:assert/strict";

import { DESTINATIONS, getExportability } from "../src/server/definitions/export/compatibility.js";

test("copilot and gemini explicitly skip context and mcpservers", () => {
  const unsupportedTypes = ["context", "mcpservers"];

  for (const destination of [DESTINATIONS.COPILOT, DESTINATIONS.GEMINI]) {
    for (const type of unsupportedTypes) {
      assert.deepEqual(getExportability(type, destination), {
        supported: false,
        reason: "unsupported_type_for_destination"
      });
    }
  }
});

test("continue compatibility remains unchanged", () => {
  assert.deepEqual(getExportability("rules", DESTINATIONS.CONTINUE), { supported: true });
  assert.deepEqual(getExportability("prompts", DESTINATIONS.CONTINUE), { supported: true });
  assert.deepEqual(getExportability("context", DESTINATIONS.CONTINUE), { supported: true });
  assert.deepEqual(getExportability("mcpservers", DESTINATIONS.CONTINUE), { supported: true });
});


test("copilot supports agent export while gemini still skips it", () => {
  assert.deepEqual(getExportability("agents", DESTINATIONS.COPILOT), { supported: true });
  assert.deepEqual(getExportability("agents", DESTINATIONS.GEMINI), {
    supported: false,
    reason: "unsupported_type_for_destination"
  });
});
