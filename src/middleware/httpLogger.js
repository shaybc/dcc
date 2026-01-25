// src/middleware/httpLogger.js
import { randomUUID } from "crypto";

/**
 * Logs inbound HTTP requests and the final response status code.
 * Also logs a short preview of JSON responses (configurable).
 *
 * Important for debugging VSCode/Continue cases where server returns 200
 * but the UI shows nothing (often due to unexpected response schema).
 */
export function httpLogger(options = {}) {
  const {
    includeHeaders = false,
    includeBody = false,
    maxBodyChars = 5000,

    // NEW: response preview logging
    includeResponsePreview = true,
    maxResponsePreviewChars = 800
  } = options;

  return function httpLoggerMiddleware(req, res, next) {
    const id = randomUUID();
    const start = Date.now();

    req._reqId = id;
    res.setHeader("x-dcc-request-id", id);

    const url = req.originalUrl || req.url;
    console.log(`[HTTP] id=${id} -> ${req.method} ${url}`);

    if (includeHeaders) {
      const safeHeaders = { ...req.headers };
      if (safeHeaders.authorization) safeHeaders.authorization = "***redacted***";
      console.log(`[HTTP] id=${id} headers=${JSON.stringify(safeHeaders)}`);
    }

    if (includeBody) {
      try {
        const bodyStr = JSON.stringify(req.body ?? {});
        const trimmed =
          bodyStr.length > maxBodyChars
            ? bodyStr.slice(0, maxBodyChars) + "…(truncated)"
            : bodyStr;
        console.log(`[HTTP] id=${id} body=${trimmed}`);
      } catch {
        console.log(`[HTTP] id=${id} body=<unserializable>`);
      }
    }

    // --- Capture JSON response previews (for res.json / res.send) ---
    let responsePreview = null;

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      if (includeResponsePreview) {
        responsePreview = safePreview(payload, maxResponsePreviewChars);
      }
      return originalJson(payload);
    };

    const originalSend = res.send.bind(res);
    res.send = (payload) => {
      if (includeResponsePreview) {
        // Only preview if it's likely JSON/text and small
        responsePreview = safePreview(payload, maxResponsePreviewChars);
      }
      return originalSend(payload);
    };

    let finished = false;

    res.on("finish", () => {
      finished = true;
      const ms = Date.now() - start;
      const len = res.getHeader("content-length") ?? "-";
      console.log(
        `[HTTP] id=${id} <- ${res.statusCode} (${ms}ms) ${req.method} ${url} len=${len}`
      );
      if (includeResponsePreview && responsePreview != null) {
        console.log(`[HTTP] id=${id} resp=${responsePreview}`);
      }
    });

    res.on("close", () => {
      if (finished) return;
      const ms = Date.now() - start;
      console.log(`[HTTP] id=${id} !! closed early (${ms}ms) ${req.method} ${url}`);
    });

    next();
  };
}

function safePreview(payload, maxChars) {
  try {
    if (payload == null) return "<null>";

    // Buffers
    if (Buffer.isBuffer(payload)) {
      const s = payload.toString("utf8");
      return truncate(s, maxChars);
    }

    // Strings
    if (typeof payload === "string") {
      return truncate(payload, maxChars);
    }

    // Objects (JSON)
    const s = JSON.stringify(payload);
    return truncate(s, maxChars);
  } catch {
    return "<unpreviewable>";
  }
}

function truncate(s, maxChars) {
  const text = String(s);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…(truncated)";
}
