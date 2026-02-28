import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

const { default: agentRunsRouter } = await import("../src/server/routes/agentRuns.js");

async function withServer(handler) {
  const app = express();
  app.use(express.json());
  app.use(agentRunsRouter);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await handler(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("POST /api/agent-runs rejects when selected project is missing or invalid", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agent-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: 1,
        configId: 1,
        projectPath: "/path/that/does/not/exist"
      })
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.error, /Selected project is invalid or not accessible/);
  });
});
