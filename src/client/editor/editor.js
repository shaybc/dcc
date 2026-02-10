import YAML from "https://esm.sh/yaml@2.8.2";
import matter from "https://esm.sh/gray-matter@4.0.3";
import { createTextFormSync } from "./components/yamlEditorSync.js";
import { createPromptForm } from "./forms/promptForm.js";
import { createMcpServerForm } from "./forms/mcpServerForm.js";
import { createAgentForm } from "./forms/agentForm.js";
import { createRuleForm } from "./forms/ruleForm.js";
import { createModelForm } from "./forms/modelForm.js";
import { createWorkflowForm } from "./forms/workflowForm.js";
import { createContextForm } from "./forms/contextForm.js";
import { createDocForm } from "./forms/docForm.js";
import { createConfigForm } from "./forms/configForm.js";
import { initLoadingService, runWithLoading } from "../services/loadingService.js";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "create";
const typeParam = params.get("type") || "prompt";
const pathParam = params.get("path") || "";

const formMount = document.getElementById("formMount");
const rawText = document.getElementById("rawText");
const parseError = document.getElementById("parseError");
const rawLabel = document.getElementById("rawLabel");
const editorTitle = document.getElementById("editorTitle");

let formController;
let sync;
let definitionType = typeParam;
let format = "yaml";
let unknown = {};
let availableTags = [];
let definitionReferences = [];
const TAG_DEBUG_PREFIX = "[tag-autocomplete]";
const YAML_HEADER_KEYS = ["name", "dcc_uri", "version", "schema", "description", "dcc_tags"];

initLoadingService();

function typeDisplayLabel(type) {
  if (type === "mcpServer") return "MCP Server";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function typeIconSvg(type) {
  if (type === "prompt") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H7l-4 3 1.2-4.6A6 6 0 0 1 3 15a6 6 0 0 1 6-6h8a4 4 0 0 1 4 4z"></path></svg>';
  }
  if (type === "model") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.1.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
  }
  if (type === "mcpServer") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="6" rx="2"></rect><rect x="3" y="9" width="18" height="6" rx="2"></rect><rect x="3" y="15" width="18" height="6" rx="2"></rect></svg>';
  }
  if (type === "rule") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8"></path><path d="M6 7h12"></path><path d="M8 11h8"></path><path d="M10 15h4"></path><path d="M12 19h0"></path></svg>';
  }
  if (type === "agent") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M6 20a6 6 0 0 1 12 0"></path></svg>';
  }
  if (type === "workflow") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h8"></path><path d="M4 12h12"></path><path d="M4 18h16"></path><circle cx="15" cy="6" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="21" cy="18" r="1.5"></circle></svg>';
  }
  if (type === "context") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.35-7-10a7 7 0 1 1 14 0c0 5.65-7 10-7 10z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>';
  }
  if (type === "doc") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><path d="M15 4v4h4"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>';
  }
  if (type === "config") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5z"></path><path d="M15 3.5v4h4"></path><path d="M9 11h6"></path><path d="M9 15h6"></path><path d="M9 19h4"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"></circle></svg>';
}

function renderEditorTitle(type) {
  const label = typeDisplayLabel(type);
  if (mode === "create") {
    editorTitle.innerHTML = `<span class="editor-title-icon">${typeIconSvg(type)}</span><span>Create new ${label} Definition</span>`;
    return;
  }
  editorTitle.innerHTML = `<span class="editor-title-icon">${typeIconSvg(type)}</span><span>Edit ${label}</span>`;
}


function normalizeStringArray(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeModelEntries(models) {
  return (Array.isArray(models) ? models : []).map((entry) => ({
    ...entry,
    roles: Array.isArray(entry?.roles) ? entry.roles : [],
    contextLength: entry?.defaultCompletionOptions?.contextLength ?? ""
  }));
}

function normalizeMcpServers(servers) {
  return (Array.isArray(servers) ? servers : []).map((entry) => ({
    ...entry,
    args: Array.isArray(entry?.args) ? entry.args : []
  }));
}


function normalizeWorkflowModels(models) {
  return (Array.isArray(models) ? models : []).map((entry) => ({
    ...entry,
    with: entry?.with && typeof entry.with === "object"
      ? Object.entries(entry.with).map(([key, value]) => ({ key, value: String(value ?? "") }))
      : [],
    roles: Array.isArray(entry?.override?.roles) ? entry.override.roles : []
  }));
}

function normalizeUsesArray(items) {
  return (Array.isArray(items) ? items : []).map((entry) => {
    if (typeof entry === "string") {
      return { uses: entry };
    }
    return { ...entry, uses: entry?.uses || "" };
  });
}

function serializeWorkflowModels(models) {
  return (Array.isArray(models) ? models : []).map((entry) => {
    const out = { ...entry };
    const withList = Array.isArray(out.with) ? out.with : [];
    const withObject = {};
    withList.forEach((item) => {
      const key = String(item?.key || "").trim();
      if (!key) return;
      withObject[key] = String(item?.value ?? "");
    });
    if (Object.keys(withObject).length > 0) {
      out.with = withObject;
    } else {
      delete out.with;
    }

    if (Array.isArray(out.roles) && out.roles.length > 0) {
      out.override = { ...(out.override || {}), roles: out.roles };
    }

    delete out.roles;
    if (out.override && Object.keys(out.override).length === 0) delete out.override;
    return out;
  });
}

function normalizeContextEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const paramsArray = Array.isArray(entry?.params)
      ? entry.params
      : entry?.params && typeof entry.params === "object"
        ? Object.entries(entry.params).map(([key, value]) => ({ key, value: value == null ? "" : String(value) }))
        : [];

    return {
      provider: entry?.provider || "",
      params: paramsArray
        .map((item) => ({
          key: item?.key == null ? "" : String(item.key),
          value: item?.value == null ? "" : String(item.value)
        }))
        .filter((item) => item.key || item.value)
    };
  });
}

function serializeContextEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const out = { provider: entry?.provider || "" };

    if (Array.isArray(entry?.params)) {
      const params = entry.params
        .map((item) => ({
          key: item?.key == null ? "" : String(item.key).trim(),
          value: item?.value == null ? "" : String(item.value)
        }))
        .filter((item) => item.key);

      if (params.length > 0) {
        out.params = params;
      }
    }

    return out;
  });
}

function orderYamlDefinitionFields(data) {
  const source = data && typeof data === "object" ? data : {};
  const header = {};

  for (const key of YAML_HEADER_KEYS) {
    header[key] = source[key] == null ? "" : source[key];
  }

  const body = {};
  for (const [key, value] of Object.entries(source)) {
    if (YAML_HEADER_KEYS.includes(key)) continue;
    body[key] = value;
  }

  return { ...header, ...body };
}

function injectBlankLineAfterHeader(yamlText) {
  const lines = String(yamlText || "").split("\n");
  let bodyStartIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([A-Za-z0-9_]+):(?:\s|$)/.exec(lines[index]);
    if (!match) continue;
    const key = match[1];
    if (YAML_HEADER_KEYS.includes(key)) continue;
    bodyStartIndex = index;
    break;
  }

  if (bodyStartIndex <= 0) return yamlText;
  if (lines[bodyStartIndex - 1].trim() === "") return yamlText;

  lines.splice(bodyStartIndex, 0, "");
  return lines.join("\n");
}

function stringifyYamlDefinition(data) {
  const document = new YAML.Document(orderYamlDefinitionFields(data));
  return injectBlankLineAfterHeader(document.toString());
}


const handlers = {
  prompt: {
    createForm: createPromptForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => {
      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_tags: normalizeStringArray(tags),
        prompts: Array.isArray(state.prompts) ? state.prompts : []
      });
    }
  },
  mcpServer: {
    createForm: createMcpServerForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => {
      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_tags: normalizeStringArray(tags),
        mcpServers: normalizeMcpServers(state.mcpServers)
      });
    }
  },
  model: {
    createForm: createModelForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => {
      const normalizedModels = (state.models || []).map((entry) => ({
        ...entry,
        roles: Array.isArray(entry.roles) ? entry.roles : [],
        defaultCompletionOptions: {
          ...(entry.defaultCompletionOptions || {}),
          ...(entry.contextLength ? { contextLength: Number(entry.contextLength) || entry.contextLength } : {})
        }
      })).map((entry) => {
        const { contextLength, ...rest } = entry;
        if (!rest.defaultCompletionOptions || Object.keys(rest.defaultCompletionOptions).length === 0) {
          delete rest.defaultCompletionOptions;
        }
        return rest;
      });

      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_tags: normalizeStringArray(tags),
        models: normalizedModels
      });
    }
  },
  workflow: {
    createForm: createWorkflowForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => {
      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_tags: normalizeStringArray(tags),
        models: serializeWorkflowModels(state.models),
        context: normalizeUsesArray(state.context),
        mcpServers: normalizeUsesArray(state.mcpServers),
        rules: normalizeUsesArray(state.rules)
      });
    }
  },
  context: {
    createForm: createContextForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => {
      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_tags: normalizeStringArray(tags),
        context: serializeContextEntries(state.context)
      });
    }
  },
  doc: {
    createForm: createDocForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => {
      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_tags: normalizeStringArray(tags),
        docs: Array.isArray(state.docs) ? state.docs : []
      });
    }
  },
  config: {
    createForm: createConfigForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => {
      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_tags: normalizeStringArray(tags),
        models: normalizeUsesArray(state.models).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })),
        context: normalizeUsesArray(state.context).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })),
        rules: normalizeUsesArray(state.rules).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })),
        prompts: normalizeUsesArray(state.prompts).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })),
        docs: normalizeUsesArray(state.docs).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })),
        mcpServers: normalizeUsesArray(state.mcpServers).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })),
        dcc_config_type: state.dcc_config_type || "agents"
      });
    }
  },
  agent: {
    createForm: createAgentForm,
    parse: (txt) => { const m = matter(txt || ""); return { ...m.data, body: m.content.trimStart() }; },
    serialize: (state) => {
      const { body = "", tags, ...frontmatter } = { ...unknown, ...state };
      return matter.stringify(body, { ...frontmatter, dcc_tags: normalizeStringArray(tags) });
    }
  },
  rule: {
    createForm: createRuleForm,
    parse: (txt) => { const m = matter(txt || ""); return { ...m.data, body: m.content.trimStart() }; },
    serialize: (state) => {
      const { body = "", tags, ...frontmatter } = { ...unknown, ...state };
      return matter.stringify(body, { ...frontmatter, dcc_tags: normalizeStringArray(tags) });
    }
  }
};

function normalizeState(type, parsed) {
  const data = parsed || {};
  if (type === "prompt") return {
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags || data.tags),
    prompts: Array.isArray(data.prompts) ? data.prompts : []
  };
  if (type === "mcpServer") return {
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags || data.tags),
    mcpServers: normalizeMcpServers(data.mcpServers)
  };
  if (type === "agent") return { name: data.name || "", dcc_uri: data.dcc_uri || "", description: data.description || "", version: data.version || "", tags: data.dcc_tags || data.tags || [], body: data.body || "" };
  if (type === "rule") return { name: data.name || "", dcc_uri: data.dcc_uri || "", description: data.description || "", version: data.version || "", tags: data.dcc_tags || data.tags || [], body: data.body || "" };
  if (type === "model") return {
    name: data.name || "",
    description: data.description || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    tags: normalizeStringArray(data.dcc_tags || data.tags),
    models: normalizeModelEntries(data.models)
  };
  if (type === "workflow") return {
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags || data.tags),
    models: normalizeWorkflowModels(data.models),
    context: normalizeUsesArray(data.context),
    mcpServers: normalizeUsesArray(data.mcpServers),
      rules: normalizeUsesArray(data.rules)
  };
  if (type === "doc") return {
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags || data.tags),
    docs: Array.isArray(data.docs) ? data.docs : []
  };
  if (type === "config") return {
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags || data.tags),
    dcc_config_type: data.dcc_config_type || data?.dcc?.config_type || "agents",
    models: normalizeUsesArray(data.models).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    context: normalizeUsesArray(data.context).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    rules: normalizeUsesArray(data.rules).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    prompts: normalizeUsesArray(data.prompts).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    docs: normalizeUsesArray(data.docs).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    mcpServers: normalizeUsesArray(data.mcpServers).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" }))
  };
  return {
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags || data.tags),
    context: normalizeContextEntries(data.context)
  };
}

function captureUnknownFields(type, parsed) {
  const knownByType = {
    prompt: ["name", "dcc_uri", "description", "version", "schema", "dcc_tags", "prompts"],
    mcpServer: ["name", "dcc_uri", "description", "version", "schema", "dcc_tags", "mcpServers"],
    agent: ["name", "dcc_uri", "description", "version", "dcc_tags", "body"],
    rule: ["name", "dcc_uri", "description", "version", "dcc_tags", "body"],
    model: ["name", "dcc_uri", "description", "version", "schema", "dcc_tags", "models"],
    workflow: ["name", "dcc_uri", "description", "version", "schema", "dcc_tags", "models", "context", "mcpServers", "rules"],
    context: ["name", "dcc_uri", "description", "version", "schema", "dcc_tags", "context"],
    doc: ["name", "dcc_uri", "description", "version", "schema", "dcc_tags", "docs"],
    config: ["name", "dcc_uri", "description", "version", "schema", "dcc_tags", "dcc_config_type", "dcc", "models", "context", "rules", "prompts", "docs", "mcpServers"]
  };
  const known = new Set(knownByType[type] || []);
  unknown = Object.fromEntries(Object.entries(parsed || {}).filter(([key]) => !known.has(key)));
}

function setupForType(type, initialRaw) {
  formMount.innerHTML = "";
  const handler = handlers[type];
  formController = handler.createForm({ mount: formMount, onChange: () => sync.updateTextFromForm(), availableTags, definitionReferences });
  sync = createTextFormSync({
    textArea: rawText,
    errorNode: parseError,
    parseText: (text) => {
      const parsed = handler.parse(text);
      captureUnknownFields(type, parsed);
      return normalizeState(type, parsed);
    },
    serializeState: (state) => handler.serialize(state),
    readState: () => formController.getState(),
    writeState: (state) => formController.setState(state)
  });
  rawText.value = initialRaw || "";
  sync.updateFormFromText();
  sync.updateTextFromForm();
  rawLabel.textContent = type === "agent" || type === "rule" ? "Raw Markdown" : "Raw YAML";
  renderEditorTitle(type);
  format = type === "agent" || type === "rule" ? "markdown" : "yaml";
}

async function boot() {
  let raw = "";
  try {
    console.debug(`${TAG_DEBUG_PREFIX} boot: requesting /api/definition-tags`);
    const tagsResponse = await fetch("/api/definition-tags");
    console.debug(`${TAG_DEBUG_PREFIX} boot: response status`, tagsResponse.status);
    if (tagsResponse.ok) {
      const tagsPayload = await tagsResponse.json();
      availableTags = Array.isArray(tagsPayload) ? tagsPayload : [];
      console.debug(`${TAG_DEBUG_PREFIX} boot: loaded tags`, availableTags);
    }
  } catch (error) {
    availableTags = [];
    console.debug(`${TAG_DEBUG_PREFIX} boot: failed loading tags`, error);
  }

  try {
    const refsResponse = await fetch("/api/definitions/references");
    if (refsResponse.ok) {
      const refsPayload = await refsResponse.json();
      definitionReferences = Array.isArray(refsPayload) ? refsPayload : [];
    }
  } catch (_error) {
    definitionReferences = [];
  }

  console.debug(`${TAG_DEBUG_PREFIX} boot: initializing form type`, definitionType, "with tags count", availableTags.length);

  if (mode === "edit") {
    const response = await runWithLoading(
      async () => fetch(`/api/editor/definition?path=${encodeURIComponent(pathParam)}`),
      {
        title: "Loading definition...",
        description: "Fetching definition content.",
      }
    );
    if (!response) {
      return;
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load definition.");
    definitionType = payload.type;
    raw = payload.content || "";
  }
  setupForType(definitionType, raw);
}

document.getElementById("cancelButton").addEventListener("click", () => window.location.assign("/"));
document.getElementById("saveButton").addEventListener("click", async () => {
  let filename;
  let targetPath;
  if (mode === "create") {
    filename = window.prompt("Filename (with extension)");
    if (!filename) return;
    targetPath = window.prompt("Folder path relative to repo", "") || "";
  }

  const currentState = formController?.getState?.() || {};
  if (!String(currentState.dcc_uri || "").trim()) {
    parseError.hidden = false;
    parseError.textContent = "DCC URI is required.";
    return;
  }

  const response = await runWithLoading(
    async () => fetch("/api/editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, path: pathParam, content: rawText.value, format, filename, targetPath })
    }),
    {
      title: mode === "create" ? "Creating definition..." : "Saving definition...",
      description: "Writing definition changes to repository.",
      timeout: 120000,
    }
  );
  if (!response) {
    return;
  }
  const payload = await response.json();
  if (!response.ok) {
    parseError.hidden = false;
    parseError.textContent = payload.error || "Save failed.";
    return;
  }

  window.alert(payload.message || "Saved.");
  window.location.assign("/");
});

boot().catch((error) => {
  parseError.hidden = false;
  parseError.textContent = error.message;
});
