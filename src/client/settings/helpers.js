export function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeLocalPath(localPath = "") {
  return String(localPath || "").trim();
}

export function inferRepoName(remoteUrl = "", localPath = "") {
  const fromPath = String(localPath || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
  if (fromPath) return fromPath;

  const fromRemote = String(remoteUrl || "")
    .replace(/\.git$/i, "")
    .split("/")
    .filter(Boolean)
    .pop();
  return fromRemote || "repo";
}

export function setTextNotice(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#dc2626" : "#6b7280";
}
