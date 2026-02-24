import { STUCK_TIMEOUT_MS } from "./constants.js";

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeStatus(run) {
  if (!run) return "unknown";
  if (run.status === "running") {
    const lastActivityAt = run.lastActivityAt ? Date.parse(run.lastActivityAt) : NaN;
    if (Number.isFinite(lastActivityAt) && Date.now() - lastActivityAt > STUCK_TIMEOUT_MS) {
      return "stuck";
    }
  }
  return run.status;
}

export function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function parseJsonArray(raw) {
  const value = parseJson(raw || "[]", []);
  return Array.isArray(value) ? value : [];
}
