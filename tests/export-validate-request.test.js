import test from "node:test";
import assert from "node:assert/strict";

import {
  DESTINATIONS,
  EXPORT_COMPATIBILITY,
  getExportability
} from "../src/server/definitions/export/compatibility.js";
import { validateExportRequest } from "../src/server/definitions/export/validateExportRequest.js";

test("getExportability normalizes type before compatibility lookup", () => {
  const result = getExportability("Prompt", DESTINATIONS.COPILOT);
  assert.deepEqual(result, { supported: true });
});

test("getExportability returns a machine-readable reason for unsupported types", () => {
  const result = getExportability("workflows", DESTINATIONS.GEMINI);
  assert.deepEqual(result, { supported: false, reason: "unsupported_type_for_destination" });
});

test("EXPORT_COMPATIBILITY includes all configured destinations", () => {
  assert.deepEqual(Object.keys(EXPORT_COMPATIBILITY).sort(), Object.values(DESTINATIONS).sort());
});

test("validateExportRequest splits selected definitions into exportable and skipped buckets", () => {
  const result = validateExportRequest(
    [
      { id: 1, key: "prompts::a", type: "prompt", name: "A" },
      { id: 2, key: "rules::b", type: "rules", name: "B" },
      null
    ],
    DESTINATIONS.COPILOT
  );

  assert.equal(result.destinationSupported, true);
  assert.equal(result.totals.selected, 3);
  assert.equal(result.totals.exportable, 2);
  assert.equal(result.totals.skipped, 1);
  assert.equal(result.exportable[0].normalizedType, "prompts");
  assert.deepEqual(result.reasonCounts, {
    invalid_definition_row: 1
  });
});

test("validateExportRequest reports unsupported destinations for all selected definitions", () => {
  const result = validateExportRequest([{ id: 1, type: "prompt", key: "prompts::a" }], "unknown");

  assert.equal(result.destinationSupported, false);
  assert.equal(result.totals.exportable, 0);
  assert.equal(result.totals.skipped, 1);
  assert.equal(result.skipped[0].reason, "unknown_destination");
});


test("validateExportRequest allows agents for copilot", () => {
  const result = validateExportRequest([{ id: 1, key: "agents::agents/large-file-reviewer", type: "agent" }], DESTINATIONS.COPILOT);
  assert.equal(result.destinationSupported, true);
  assert.equal(result.totals.exportable, 1);
  assert.equal(result.exportable[0].normalizedType, "agents");
});
