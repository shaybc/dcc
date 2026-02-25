function mapRunStatus(run) {
  const status = String(run?.status || "").toLowerCase();
  if (status === "running" || status === "stuck") return "running";
  if (status === "launched" || status === "preparing_to_launch") return "launched";
  if (status === "terminated") return "finished";
  if (status === "killed" || status === "failed") return "cancelled";
  return "finished";
}

function getFullRunPath(pathValue, fallback = "—") {
  const normalized = String(pathValue || "").trim();
  return normalized || fallback;
}

function isRunCancelable(run) {
  const status = mapRunStatus(run);
  return status === "running" || status === "launched";
}

function isRunLive(run) {
  const status = mapRunStatus(run);
  return status === "running" || status === "launched";
}

function getRunElapsedSeconds(run) {
  const startedAtMs = Date.parse(run?.startedAt || run?.createdAt || "");
  if (!Number.isFinite(startedAtMs)) return 0;
  const endedAtMs = Date.parse(run?.endedAt || "");
  const endMs = Number.isFinite(endedAtMs) ? endedAtMs : Date.now();
  return Math.max(0, Math.floor((endMs - startedAtMs) / 1000));
}

function formatDurationSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  return `${String(secs).padStart(2, "0")}s`;
}

function formatDuration(startedAt, endedAt) {
  const run = { startedAt, endedAt };
  return formatDurationSeconds(getRunElapsedSeconds(run));
}

function formatLogLevel(entry = {}) {
  const text = String(entry?.text || "").toLowerCase();
  if (entry?.stream === "stderr") {
    if (text.includes("warn")) return "warn";
    return "error";
  }
  if (text.includes("warn")) return "warn";
  if (text.includes("error") || text.includes("failed")) return "error";
  if (text.includes("success") || text.includes("completed") || text.includes("✓")) return "success";
  if (text.includes("init") || text.includes("launch") || text.includes("loading")) return "info";
  return "default";
}

function getLogTimestamp(entry) {
  if (!entry?.timestamp) return "--:--:--";
  return new Date(entry.timestamp).toLocaleTimeString();
}

function getStatusIcon(status) {
  return { running: "▶", launched: "◎", finished: "✓", cancelled: "✕" }[status] || "•";
}

function getStatusGroupLabel(status) {
  return {
    running: "Active",
    launched: "Launching",
    finished: "Finished",
    cancelled: "Stopped",
  }[status] || "Other";
}

export {
  mapRunStatus,
  getFullRunPath,
  isRunCancelable,
  isRunLive,
  getRunElapsedSeconds,
  formatDurationSeconds,
  formatDuration,
  formatLogLevel,
  getLogTimestamp,
  getStatusIcon,
  getStatusGroupLabel,
};
