(function initDefinitionForm() {
  const page = document.getElementById("definitionFormPage");
  if (!page) return;

  const titleEl = document.getElementById("definitionFormTitle");
  const kickerEl = document.getElementById("definitionFormKicker");
  const msgEl = document.getElementById("definitionFormMessage");
  const fieldsEl = document.getElementById("definitionFormFields");
  const sourceEl = document.getElementById("definitionFormSource");
  const saveButton = document.getElementById("definitionFormSave");
  const cancelButton = document.getElementById("definitionFormCancel");

  let mode = "create";
  let definitionId = null;
  let currentType = "prompts";
  let isSyncing = false;

  const COMMON_FIELDS = ["name", "version", "schema", "description", "tags"];

  function normalizeType(type) {
    const value = String(type || "").toLowerCase().trim();
    if (value === "prompt") return "prompts";
    if (value === "mcp server") return "mcp servers";
    if (value === "rule") return "rules";
    if (value === "agent") return "agents";
    if (value === "model") return "models";
    if (value === "workflow") return "workflows";
    return value || "prompts";
  }

  function titleCase(type) {
    return normalizeType(type)
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getInitialData(type) {
    const normalized = normalizeType(type);
    const base = { name: "", version: "", schema: "v1", description: "", tags: "" };
    if (normalized === "prompts") return { ...base, promptsYaml: "- name: \n  description: \n  prompt: |\n    " };
    if (normalized === "mcp servers") return { ...base, mcpServersYaml: "- name: \n  command: \n  args:\n    - " };
    if (normalized === "models") return { ...base, modelsYaml: "- name: \n  provider: \n  model: \n  apiKey: \n  roles:\n    - chat\n  defaultCompletionOptions:\n    contextLength: 0" };
    if (normalized === "workflows") return { ...base, modelsYaml: "[]", contextYaml: "[]", mcpServersYaml: "[]", rulesYaml: "[]" };
    if (normalized === "context") return { ...base, contextYaml: "- provider: \n  params: {}" };
    if (normalized === "agents") return { name: "", description: "", tags: "", tools: "", rules: "", body: "" };
    if (normalized === "rules") return { name: "", description: "", tags: "", body: "" };
    return base;
  }

  function buildFields(type, values) {
    const normalized = normalizeType(type);
    const fields = [];
    if (["agents", "rules"].includes(normalized)) {
      fields.push(["name", "Name"], ["description", "Description"], ["tags", "Tags (comma separated)"]);
      if (normalized === "agents") fields.push(["tools", "Tools (comma separated)"], ["rules", "Rules (comma separated)"]);
      fields.push(["body", "Body"]);
    } else {
      fields.push(...COMMON_FIELDS.map((key) => [key, key === "tags" ? "Tags (comma separated)" : key.charAt(0).toUpperCase() + key.slice(1)]));
      if (normalized === "prompts") fields.push(["promptsYaml", "prompts (YAML list)"]);
      if (normalized === "mcp servers") fields.push(["mcpServersYaml", "mcpServers (YAML list)"]);
      if (normalized === "models") fields.push(["modelsYaml", "models (YAML list)"]);
      if (normalized === "context") fields.push(["contextYaml", "context (YAML list)"]);
      if (normalized === "workflows") {
        fields.push(["modelsYaml", "models (YAML list)"], ["contextYaml", "context (YAML list)"], ["mcpServersYaml", "mcpServers (YAML list)"], ["rulesYaml", "rules (YAML list)"]);
      }
    }

    if (mode === "create") {
      fields.push(["saveDir", "Path to save"], ["fileName", "File name"]);
    }

    fieldsEl.innerHTML = fields
      .map(([name, label]) => {
        const isLong = ["description", "body", "promptsYaml", "mcpServersYaml", "modelsYaml", "contextYaml", "rulesYaml"].includes(name);
        const value = values[name] || "";
        return `
          <label class="definition-form-label" for="field-${name}">${label}</label>
          ${isLong ? `<textarea id="field-${name}" data-field="${name}" class="definition-form-input definition-form-textarea">${escapeHtml(value)}</textarea>` : `<input id="field-${name}" data-field="${name}" class="definition-form-input" value="${escapeHtml(value)}" />`}
        `;
      })
      .join("");

    fieldsEl.querySelectorAll("[data-field]").forEach((el) => {
      el.addEventListener("input", () => {
        syncSourceFromFields();
      });
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  function collectValues() {
    const data = {};
    fieldsEl.querySelectorAll("[data-field]").forEach((el) => {
      data[el.getAttribute("data-field")] = el.value;
    });
    return data;
  }

  function renderMarkdown(values) {
    const keys = ["name", "description", "tags"];
    if (currentType === "agents") keys.push("tools", "rules");
    const frontmatter = keys.map((key) => `${key}: ${values[key] || ""}`).join("\n");
    return `---\n${frontmatter}\n---\n\n${values.body || ""}`;
  }

  function renderYaml(values) {
    const lines = [
      `name: ${values.name || ""}`,
      `version: ${values.version || ""}`,
      `schema: ${values.schema || "v1"}`,
      `description: ${values.description || ""}`,
      `tags: ${values.tags || ""}`,
      ""
    ];
    if (currentType === "prompts") lines.push(`prompts:\n${indentYaml(values.promptsYaml)}`);
    if (currentType === "mcp servers") lines.push(`mcpServers:\n${indentYaml(values.mcpServersYaml)}`);
    if (currentType === "models") lines.push(`models:\n${indentYaml(values.modelsYaml)}`);
    if (currentType === "context") lines.push(`context:\n${indentYaml(values.contextYaml)}`);
    if (currentType === "workflows") {
      lines.push(`models:\n${indentYaml(values.modelsYaml)}`);
      lines.push(`context:\n${indentYaml(values.contextYaml)}`);
      lines.push(`mcpServers:\n${indentYaml(values.mcpServersYaml)}`);
      lines.push(`rules:\n${indentYaml(values.rulesYaml)}`);
    }
    return lines.join("\n");
  }

  function indentYaml(raw) {
    const content = String(raw || "").trim();
    if (!content) return "  []";
    return content
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
  }

  function syncSourceFromFields() {
    if (isSyncing) return;
    const values = collectValues();
    isSyncing = true;
    sourceEl.value = ["agents", "rules"].includes(currentType) ? renderMarkdown(values) : renderYaml(values);
    isSyncing = false;
  }

  async function parseSourceIntoFields() {
    if (isSyncing) return;
    try {
      const response = await fetch("/api/definitions/parse-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: currentType, content: sourceEl.value })
      });
      if (!response.ok) return;
      const payload = await response.json();
      const existing = collectValues();
      const next = { ...existing, ...payload.data };
      isSyncing = true;
      buildFields(currentType, next);
      isSyncing = false;
      msgEl.textContent = "Parsed source and synchronized fields.";
    } catch (_error) {
      msgEl.textContent = "Unable to parse source.";
    }
  }

  async function save() {
    const values = collectValues();
    const content = sourceEl.value;
    try {
      if (mode === "edit") {
        const response = await fetch(`/api/definitions/${definitionId}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to save definition.");
        msgEl.textContent = payload.message || "Saved.";
        if (window.__dccDefinitionFormHooks?.onSaved) window.__dccDefinitionFormHooks.onSaved();
        return;
      }

      const response = await fetch("/api/definitions/create-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: currentType,
          content,
          saveDir: values.saveDir,
          fileName: values.fileName
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create definition.");
      msgEl.textContent = payload.message || "Created.";
      if (window.__dccDefinitionFormHooks?.onSaved) window.__dccDefinitionFormHooks.onSaved();
    } catch (error) {
      msgEl.textContent = error.message;
    }
  }

  function openCreate(type) {
    mode = "create";
    definitionId = null;
    currentType = normalizeType(type);
    titleEl.textContent = `Create ${titleCase(currentType)}`;
    kickerEl.textContent = "New definition";
    msgEl.textContent = "";
    const initial = getInitialData(currentType);
    buildFields(currentType, initial);
    sourceEl.value = ["agents", "rules"].includes(currentType) ? renderMarkdown(initial) : renderYaml(initial);
    page.hidden = false;
  }

  function openEdit(definition) {
    mode = "edit";
    definitionId = definition.id;
    currentType = normalizeType(definition.type);
    titleEl.textContent = `Edit ${definition.name || titleCase(currentType)}`;
    kickerEl.textContent = "Edit definition";
    msgEl.textContent = "";
    const initial = getInitialData(currentType);
    buildFields(currentType, initial);
    sourceEl.value = definition.content || "";
    parseSourceIntoFields();
    page.hidden = false;
  }

  function close() {
    page.hidden = true;
  }

  sourceEl.addEventListener("input", parseSourceIntoFields);
  saveButton.addEventListener("click", save);
  cancelButton.addEventListener("click", () => {
    close();
    if (window.__dccDefinitionFormHooks?.onCancel) window.__dccDefinitionFormHooks.onCancel();
  });

  window.definitionFormManager = { openCreate, openEdit, close };
})();
