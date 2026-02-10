export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getCardDescription(description) {
  const fallback = "No description provided.";
  if (!description) return fallback;

  const normalized = String(description).replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  const maxLength = 170;
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function renderDescriptionMarkdown(description) {
  const raw = String(description || "").replace(/\r\n/g, "\n");
  if (!raw.trim()) return "<p>No description provided.</p>";

  const codeBlocks = [];
  let html = escapeHtml(raw).replace(/```([\s\S]*?)```/g, (_, code) => {
    const trimmed = code.replace(/^\n+|\n+$/g, "");
    const index = codeBlocks.push(`<pre><code>${trimmed}</code></pre>`) - 1;
    return `@@CODE_BLOCK_${index}@@`;
  });

  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  const blocks = html
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => (/^@@CODE_BLOCK_\d+@@$/.test(block) ? block : `<p>${block.replace(/\n/g, "<br>")}</p>`));

  return blocks.join("").replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || "");
}
