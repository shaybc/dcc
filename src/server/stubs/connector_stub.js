// Connector REST API — minimal stub server
// No dependencies — pure Node.js http module
// Run: node server.js

import http from "http";
import util from "util";

const PORT = 3999;

// ---------------------------------------------------------------------------
// Config — edit these to match your test setup
// ---------------------------------------------------------------------------

const VALID_KEYS = ["mykey", "test-api-key-123"];

const CONNECTORS = {
  "abc123": {
    name:           "My Connector",
    responseFormat: "text-only",   // "text-only" | "gemini-full"
    llmOverride:    false,
  },
  "full-01": {
    name:           "Full Response Connector",
    responseFormat: "gemini-full",
    llmOverride:    false,
  },
  "override-01": {
    name:           "Override Connector",
    responseFormat: "text-only",
    llmOverride:    true,
  },
};

// ---------------------------------------------------------------------------
// Stub answer
// ---------------------------------------------------------------------------

function stubAnswer(prompt = "", files = []) {
  if (files.length > 0) {
    return `Stub: received ${files.length} file(s) (${files.map(f => f.mimeType).join(", ")}). In production the model would analyse them.`;
  }
  return `Stub response to: "${prompt.slice(0, 80)}". The connector is working correctly.`;
}

// ---------------------------------------------------------------------------
// Response builders — mirrors the two formats from the spec
// ---------------------------------------------------------------------------

function textOnlyResponse(connectorId, connector, answer) {
  return {
    success:  true,
    message:  "OK Success",
    request:  { connectorId, connectorName: connector.name },
    response: answer,
  };
}

function geminiFullResponse(connectorId, connector, answer) {
  return {
    success:  true,
    message:  "OK Success",
    request:  { connectorId, connectorName: connector.name },
    response: {
      candidates: [{
        content:      { role: "model", parts: [{ text: answer }] },
        finishReason: "STOP",
        safetyRatings: [],
      }],
      usageMetadata: {
        promptTokenCount:     42,
        candidatesTokenCount: 18,
        totalTokenCount:      60,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", c => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString();

    let body = {};
    if (raw) {
      try { body = JSON.parse(raw); }
      catch { return send(res, 400, { error: "Invalid request body" }); }
    }

    handle(req, res, body);
  });
});

function handle(req, res, body) {
  const { method, url } = req;

  console.log(`\n--- Incoming Request ---`);
  console.log(`${method} ${url}`);
  console.log(`Headers:\n`, req.headers);
  console.log(`Body:\n`, util.inspect(body, { depth: null, colors: true, maxStringLength: Infinity }));

  // POST /api/connectors/:id
  const match = url.match(/^\/api\/connectors\/([^/?]+)/);
  if (match && method === "POST") {
    const connectorId = decodeURIComponent(match[1]);

    // Auth
    const authHeader = req.headers["authorization"] || "";
    const key = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
    if (!key)                    return send(res, 401, { error: "API key is required" });
    if (!VALID_KEYS.includes(key)) return send(res, 401, { error: "Invalid API key" });

    // Connector lookup
    const connector = CONNECTORS[connectorId];
    if (!connector)              return send(res, 404, { error: "Connector not found or disabled" });

    // Body validation
    if (!body.text)              return send(res, 400, { error: "Invalid request body — 'text' is required" });

    // LLM override params (strip silently if not enabled)
    const overrideKeys = ["temperature", "topP", "topK", "maxOutputTokens"];
    if (connector.llmOverride) {
      const applied = Object.fromEntries(overrideKeys.filter(k => body[k] !== undefined).map(k => [k, body[k]]));
      console.log(`[connector:${connectorId}] LLM overrides applied:`, applied);
    }

    const files  = Array.isArray(body.files) ? body.files : [];
    const answer = stubAnswer(body.text, files);

//    console.log(`[connector:${connectorId}] prompt:\n"${body.text}"\n\nfiles:\n${files.length}\n\nformat:\n${connector.responseFormat}`);

    const payload = connector.responseFormat === "gemini-full"
      ? geminiFullResponse(connectorId, connector, answer)
      : textOnlyResponse(connectorId, connector, answer);

    return send(res, 200, payload);
  }

  send(res, 404, { error: `Not found: ${method} ${url}` });
}

function send(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type":                "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

server.listen(PORT, () => {
  console.log(`Connector stub server running on http://localhost:${PORT}`);
  console.log(`Connectors: ${Object.keys(CONNECTORS).join(", ")}`);
  console.log(`API keys:   ${VALID_KEYS.join(", ")}`);
});
