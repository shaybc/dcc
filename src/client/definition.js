const detailTitle = document.getElementById("detailTitle");
const detailDescription = document.getElementById("detailDescription");
const detailContent = document.getElementById("detailContent");
const detailStatus = document.getElementById("detailStatus");
const detailTypeIcon = document.getElementById("detailTypeIcon");
const detailTypeMetaIcon = document.getElementById("detailTypeMetaIcon");
const detailTypeText = document.getElementById("detailTypeText");
const detailCreatedDate = document.getElementById("detailCreatedDate");
const copyDefinitionButton = document.getElementById("copyDefinition");
const definitionTabPreview = document.getElementById("definitionTabPreview");
const definitionTabSource = document.getElementById("definitionTabSource");
const definitionPreviewPanel = document.getElementById("definitionPreviewPanel");
const definitionSourcePanel = document.getElementById("definitionSourcePanel");
const definitionPreviewContent = document.getElementById("definitionPreviewContent");

function normalizeFilterType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["model", "models"].includes(normalized)) return "models";
  if (["mcp server", "mcp servers", "mcpserver", "mcpservers"].includes(normalized)) return "mcp servers";
  if (["rule", "rules"].includes(normalized)) return "rules";
  if (["prompt", "prompts"].includes(normalized)) return "prompts";
  if (["agent", "agents"].includes(normalized)) return "agents";
  if (["context", "contexts"].includes(normalized)) return "context";
  if (["workflow", "workflows"].includes(normalized)) return "workflows";
  return "unknown";
}

function statusLabel(status) {
  if (status === "saved") return "Saved to team";
  if (status === "local-only") return "Local only";
  return "Available";
}

function formatTypePillLabel(type) {
  const normalizedType = normalizeFilterType(type);
  if (normalizedType === "models") return "Model";
  if (normalizedType === "mcp servers") return "MCP Server";
  if (normalizedType === "rules") return "Rule";
  if (normalizedType === "prompts") return "Prompt";
  if (normalizedType === "agents") return "Agent";
  if (normalizedType === "context") return "Context";
  if (normalizedType === "workflows") return "Workflow";
  return "Unknown";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDescriptionMarkdown(description) {
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

function filterIconSvg(type) {
  if (type === "prompt" || type === "prompts") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H7l-4 3 1.2-4.6A6 6 0 0 1 3 15a6 6 0 0 1 6-6h8a4 4 0 0 1 4 4z"></path></svg>';
  if (type === "model" || type === "models") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.1.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
  if (type === "mcp servers" || type === "mcp server") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="6" rx="2"></rect><rect x="3" y="9" width="18" height="6" rx="2"></rect><rect x="3" y="15" width="18" height="6" rx="2"></rect></svg>';
  if (type === "rules" || type === "rule") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8"></path><path d="M6 7h12"></path><path d="M8 11h8"></path><path d="M10 15h4"></path><path d="M12 19h0"></path></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><path d="M8 12h8"></path><path d="M12 8v8"></path></svg>';
}

function formatCreatedDate(value) {
  if (!value) return "Created date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Created date unavailable";
  return `Created on ${date.toLocaleDateString()}`;
}

function inferDefinitionFormat(definition) {
  const filePath = String(definition?.filePath || "").toLowerCase();
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) return "yaml";
  if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) return "md";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".txt")) return "txt";
  const content = String(definition?.content || "").trim();
  if (content.startsWith("#") || content.includes("\n#")) return "md";
  if (content.includes(":") && content.includes("\n")) return "yaml";
  return "txt";
}

function formatTabLabel(format) {
  if (format === "yaml") return "YAML";
  if (format === "md") return "MD";
  if (format === "json") return "JSON";
  if (format === "txt") return "TXT";
  return "SOURCE";
}

function renderDefinitionPreview(definitionContent) {
  return `<p>Preview enabled for this definition.</p><pre>${escapeHtml(definitionContent || "")}</pre>`;
}

function setDefinitionTab(activeTab) {
  const isPreview = activeTab === "preview";
  definitionTabPreview.classList.toggle("active", isPreview);
  definitionTabSource.classList.toggle("active", !isPreview);
  definitionTabPreview.setAttribute("aria-selected", String(isPreview));
  definitionTabSource.setAttribute("aria-selected", String(!isPreview));
  definitionPreviewPanel.hidden = !isPreview;
  definitionSourcePanel.hidden = isPreview;
}

async function copyDefinitionToClipboard() {
  const definitionText = detailContent.textContent || "";
  if (!definitionText.trim()) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(definitionText);
    return;
  }
  const fallbackTextArea = document.createElement("textarea");
  fallbackTextArea.value = definitionText;
  fallbackTextArea.style.position = "fixed";
  fallbackTextArea.style.opacity = "0";
  document.body.appendChild(fallbackTextArea);
  fallbackTextArea.select();
  document.execCommand("copy");
  fallbackTextArea.remove();
}

async function loadDefinition() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    detailTitle.textContent = "Definition not found";
    return;
  }

  const response = await fetch(`/api/definitions/${encodeURIComponent(id)}`);
  if (!response.ok) {
    detailTitle.textContent = "Unable to load definition";
    return;
  }

  const def = await response.json();
  detailTitle.textContent = def.name;
  detailDescription.innerHTML = renderDescriptionMarkdown(def.description);
  const definitionContent = def.content || "";
  detailContent.textContent = definitionContent;
  detailStatus.textContent = statusLabel(def.status);
  detailStatus.className = `status-pill ${def.status}`;

  const normalizedType = normalizeFilterType(def.type);
  const typeLabel = formatTypePillLabel(normalizedType);
  const typeIcon = filterIconSvg(normalizedType);
  detailTypeIcon.innerHTML = typeIcon;
  detailTypeMetaIcon.innerHTML = typeIcon;
  detailTypeText.textContent = typeLabel;
  detailCreatedDate.textContent = formatCreatedDate(def.createdAt);

  const format = inferDefinitionFormat(def);
  definitionTabSource.textContent = formatTabLabel(format);
  definitionPreviewContent.innerHTML = renderDefinitionPreview(definitionContent);
  definitionTabPreview.disabled = false;
  setDefinitionTab("preview");
}

copyDefinitionButton.addEventListener("click", async () => {
  try {
    await copyDefinitionToClipboard();
    copyDefinitionButton.classList.add("copied");
    copyDefinitionButton.setAttribute("title", "Copied");
    copyDefinitionButton.setAttribute("aria-label", "Definition copied");
    window.setTimeout(() => {
      copyDefinitionButton.classList.remove("copied");
      copyDefinitionButton.setAttribute("title", "Copy definition");
      copyDefinitionButton.setAttribute("aria-label", "Copy definition");
    }, 1200);
  } catch (_error) {
    copyDefinitionButton.setAttribute("title", "Unable to copy");
  }
});

definitionTabPreview.addEventListener("click", () => setDefinitionTab("preview"));
definitionTabSource.addEventListener("click", () => setDefinitionTab("source"));

loadDefinition();
