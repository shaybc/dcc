const cardsContainer = document.getElementById("cards");
const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("search");
const clearSearchButton = document.getElementById("clearSearch");
const searchField = document.querySelector(".search-field");
const filterButton = document.getElementById("filterButton");
const filterMenu = document.getElementById("filterMenu");
const modal = document.getElementById("detailModal");
const closeModal = document.getElementById("closeModal");
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
const devProjectInput = document.getElementById("devProjectSelect");
const devProjectOptions = document.getElementById("devProjectOptions");

let definitions = [];
let activeFilter = "all";
let searchTerm = "";
let devProjects = [];

const FILTER_TYPES = ["models", "mcp servers", "rules", "prompts", "agents", "context", "workflows", "unknown"];
const FILTER_TYPE_SET = new Set(FILTER_TYPES);

function normalizeFilterType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["model", "models"].includes(normalized)) return "models";
  if (["mcp server", "mcp servers", "mcpserver", "mcpservers"].includes(normalized)) return "mcp servers";
  if (["rule", "rules"].includes(normalized)) return "rules";
  if (["prompt", "prompts"].includes(normalized)) return "prompts";
  if (["agent", "agents"].includes(normalized)) return "agents";
  if (["context", "contexts"].includes(normalized)) return "context";
  if (["workflow", "workflows"].includes(normalized)) return "workflows";
  if (["user", "users", "org", "orgs", "ai_assets", "ai assets"].includes(normalized)) return "unknown";
  return FILTER_TYPE_SET.has(normalized) ? normalized : "unknown";
}

function iconSvg(status) {
  if (status === "saved") {
    return `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 10.5l3 3 7-7" />
      </svg>
    `;
  }
  if (status === "local-only") {
    return `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 4v12" />
        <path d="M6 8l4-4 4 4" />
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  `;
}

function statusLabel(status) {
  if (status === "saved") {
    return "Saved to team";
  }
  if (status === "local-only") {
    return "Local only";
  }
  return "Available";
}

function formatFilterLabel(type) {
  if (type === "all") {
    return "All";
  }
  return type
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function typeClassName(type) {
  return `type-${normalizeFilterType(type).replace(/\s+/g, "-")}`;
}


function getCardDescription(description) {
  const fallback = "No description provided.";
  if (!description) {
    return fallback;
  }

  const normalized = String(description).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  const maxLength = 170;
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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
  if (!raw.trim()) {
    return "<p>No description provided.</p>";
  }

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
    .map((block) => {
      if (/^@@CODE_BLOCK_\d+@@$/.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    });

  const withParagraphs = blocks.join("");
  return withParagraphs.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || "");
}

function filterIconSvg(type) {
  if (type === "prompt" || type === "prompts") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 3 1.2-4.6A6 6 0 0 1 3 15a6 6 0 0 1 6-6h8a4 4 0 0 1 4 4z"></path>
      </svg>
    `;
  }
  if (type === "model" || type === "models") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.1.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `;
  }
  if (type === "mcp servers" || type === "mcp server") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="6" rx="2"></rect>
        <rect x="3" y="9" width="18" height="6" rx="2"></rect>
        <rect x="3" y="15" width="18" height="6" rx="2"></rect>
      </svg>
    `;
  }
  if (type === "rules" || type === "rule") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3h8"></path>
        <path d="M6 7h12"></path>
        <path d="M8 11h8"></path>
        <path d="M10 15h4"></path>
        <path d="M12 19h0"></path>
      </svg>
    `;
  }
  if (type === "agents" || type === "agent") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M6 20a6 6 0 0 1 12 0"></path>
      </svg>
    `;
  }
  if (type === "users" || type === "user") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="4"></circle>
        <path d="M4 21a8 8 0 0 1 16 0"></path>
      </svg>
    `;
  }
  if (type === "orgs" || type === "org") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21h18"></path>
        <path d="M5 21V7l7-4 7 4v14"></path>
        <path d="M9 21v-6h6v6"></path>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8"></circle>
      <path d="M8 12h8"></path>
      <path d="M12 8v8"></path>
    </svg>
  `;
}

function renderFilters() {
  const definitionTypes = definitions.map((def) => normalizeFilterType(def.type));
  const uniqueTypes = new Set(
    [...FILTER_TYPES, ...definitionTypes]
      .filter(Boolean)
      .map((type) => String(type).toLowerCase())
  );
  const types = ["all", ...uniqueTypes];
  filtersContainer.innerHTML = "";
  filterMenu.innerHTML = "";
  types.forEach((type) => {
    const label = formatFilterLabel(type);
    if (type === activeFilter && type !== "all") {
      const chip = document.createElement("button");
      chip.className = "chip active";
      chip.innerHTML = `
        <span class="chip-icon">${filterIconSvg(type)}</span>
        <span class="chip-label">${label}</span>
        <span class="chip-clear" role="button" aria-label="Clear filter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </span>
      `;
      chip.addEventListener("click", (event) => {
        if (event.target.closest(".chip-clear")) {
          activeFilter = "all";
        } else {
          activeFilter = type;
        }
        renderFilters();
        renderCards();
      });
      filtersContainer.appendChild(chip);
    }

    const menuItem = document.createElement("button");
    menuItem.className = "filter-menu-item";
    menuItem.type = "button";
    menuItem.innerHTML = `
      <span class="chip-icon">${filterIconSvg(type)}</span>
      <span class="chip-label">${label}</span>
      ${type === activeFilter ? `<span class="active-indicator"></span>` : ""}
    `;
    menuItem.addEventListener("click", () => {
      activeFilter = type;
      renderFilters();
      renderCards();
      closeFilterMenu();
    });
    filterMenu.appendChild(menuItem);
  });
}

function renderCards() {
  const filtered = definitions.filter((def) => {
    const matchesFilter = activeFilter === "all" || def.type === activeFilter;
    const text = `${def.name} ${def.description}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  cardsContainer.innerHTML = "";

  filtered.forEach((def) => {
    const card = document.createElement("div");
    card.className = "card";
    if (def.status === "saved" && devProjectInput.value.trim()) {
      card.classList.add("card-in-project");
    }
    card.innerHTML = `
      <div class="icon-btn" data-action>
        ${iconSvg(def.status)}
      </div>
      <h3>${def.name}</h3>
      <p>${getCardDescription(def.description)}</p>
      <div class="meta-row">
        <div class="meta-status">${statusLabel(def.status)}</div>
        <div class="type-pill ${typeClassName(def.type)}">
          <span class="type-pill-icon">${filterIconSvg(def.type)}</span>
          <span>${formatTypePillLabel(def.type)}</span>
        </div>
      </div>
    `;

    card.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-action]");
      if (action) {
        event.stopPropagation();
        if (def.status === "saved") {
          await removeDefinition(def.id);
        } else if (def.status === "local-only") {
          await publishDefinition(def.id);
        } else if (def.status !== "saved") {
          await saveDefinition(def.id);
        }
        await fetchDefinitions();
        return;
      }
      await showDetails(def.id);
    });
    cardsContainer.appendChild(card);
  });
}

function renderDevProjectsOptions(projects) {
  devProjectOptions.innerHTML = "";
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project;
    devProjectOptions.appendChild(option);
  });
}

async function loadDevProjects() {
  const response = await fetch("/api/dev-projects");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  devProjects = data.map((project) => project.path || project).filter(Boolean);
  renderDevProjectsOptions(devProjects);
}

async function loadCurrentDevProject() {
  const response = await fetch("/api/current-dev-project");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  devProjectInput.value = data.path || "";
}

async function setCurrentDevProject(path) {
  await fetch("/api/current-dev-project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });
}

async function fetchDefinitions() {
  const response = await fetch("/api/definitions");
  const rawDefinitions = await response.json();
  definitions = rawDefinitions.map((definition) => ({
    ...definition,
    type: normalizeFilterType(definition.type)
  }));
  renderFilters();
  renderCards();
}


function formatCreatedDate(value) {
  if (!value) {
    return "Created date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Created date unavailable";
  }

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

function setDefinitionTab(activeTab) {
  const isPreview = activeTab === "preview";
  definitionTabPreview.classList.toggle("active", isPreview);
  definitionTabSource.classList.toggle("active", !isPreview);
  definitionTabPreview.setAttribute("aria-selected", String(isPreview));
  definitionTabSource.setAttribute("aria-selected", String(!isPreview));
  definitionPreviewPanel.hidden = !isPreview;
  definitionSourcePanel.hidden = isPreview;
}

async function showDetails(id) {
  const response = await fetch(`/api/definitions/${id}`);
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
  const tabLabel = formatTabLabel(format);
  definitionTabSource.textContent = tabLabel;

  if (format === "md") {
    definitionPreviewContent.innerHTML = renderDescriptionMarkdown(definitionContent);
    definitionTabPreview.disabled = false;
    setDefinitionTab("preview");
  } else {
    definitionPreviewContent.innerHTML = "<p>Preview is available for Markdown definitions only.</p>";
    definitionTabPreview.disabled = true;
    setDefinitionTab("source");
  }

  modal.classList.add("open");
}


async function copyDefinitionToClipboard() {
  const definitionText = detailContent.textContent || "";
  if (!definitionText.trim()) {
    return;
  }

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

async function saveDefinition(id) {
  if (!devProjectInput.value.trim()) {
    window.alert("Please select a project first.");
    return;
  }
  await fetch(`/api/definitions/${id}/save`, { method: "POST" });
}

async function publishDefinition(id) {
  await fetch(`/api/definitions/${id}/publish`, { method: "POST" });
}

async function removeDefinition(id) {
  await fetch(`/api/definitions/${id}/remove`, { method: "POST" });
}

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.toLowerCase();
  searchField.classList.toggle("has-value", searchTerm.length > 0);
  renderCards();
});

devProjectInput.addEventListener("change", async (event) => {
  const selected = event.target.value.trim();
  if (!selected) {
    await setCurrentDevProject("");
    await fetchDefinitions();
    return;
  }
  if (devProjects.length > 0 && !devProjects.includes(selected)) {
    return;
  }
  await setCurrentDevProject(selected);
  await fetchDefinitions();
});

function closeFilterMenu() {
  filterMenu.classList.remove("open");
  filterButton.setAttribute("aria-expanded", "false");
}

filterButton.addEventListener("click", () => {
  const isOpen = filterMenu.classList.toggle("open");
  filterButton.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".filter-dropdown")) {
    closeFilterMenu();
  }
});

clearSearchButton.addEventListener("click", () => {
  searchTerm = "";
  searchInput.value = "";
  searchField.classList.remove("has-value");
  renderCards();
});


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


definitionTabPreview.addEventListener("click", () => {
  if (definitionTabPreview.disabled) {
    return;
  }
  setDefinitionTab("preview");
});

definitionTabSource.addEventListener("click", () => {
  setDefinitionTab("source");
});

closeModal.addEventListener("click", () => {
  modal.classList.remove("open");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("open");
  }
});

loadDevProjects();
loadCurrentDevProject().then(fetchDefinitions);
