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
    withAnthropicApiKey: entry?.with?.ANTHROPIC_API_KEY || "",
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
    if (out.withAnthropicApiKey) {
      out.with = { ...(out.with || {}), ANTHROPIC_API_KEY: out.withAnthropicApiKey };
    }
    if (Array.isArray(out.roles) && out.roles.length > 0) {
      out.override = { ...(out.override || {}), roles: out.roles };
    }
    delete out.withAnthropicApiKey;
    delete out.roles;
    if (out.with && Object.keys(out.with).length === 0) delete out.with;
    if (out.override && Object.keys(out.override).length === 0) delete out.override;
    return out;
  });
}

function normalizeContextEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const paramsObject = entry?.params && typeof entry.params === "object" && !Array.isArray(entry.params)
      ? entry.params
      : {};
    const params = Object.entries(paramsObject).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : JSON.stringify(value)
    }));

    return {
      ...entry,
      provider: entry?.provider || "",
      params
    };
  });
}

function parseParamValue(value) {
  const text = String(value ?? "").trim();
  if (text === "") return "";
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

function serializeContextEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const out = { ...entry, provider: entry?.provider || "" };
    const paramsList = Array.isArray(out.params) ? out.params : [];
    const params = {};
    paramsList.forEach((item) => {
      const key = String(item?.key || "").trim();
      if (!key) return;
      params[key] = parseParamValue(item?.value ?? "");
    });
    if (Object.keys(params).length > 0) out.params = params;
    else delete out.params;
    return out;
  });
}


const handlers = {
  prompt: {
    createForm: createPromptForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => YAML.stringify({
      ...unknown,
      ...state,
      tags: normalizeStringArray(state.tags),
      prompts: Array.isArray(state.prompts) ? state.prompts : []
    })
  },
  mcpServer: {
    createForm: createMcpServerForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => YAML.stringify({
      ...unknown,
      ...state,
      tags: normalizeStringArray(state.tags),
      mcpServers: normalizeMcpServers(state.mcpServers)
    })
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

      return YAML.stringify({
        ...unknown,
        ...state,
        tags: normalizeStringArray(state.tags),
        models: normalizedModels
      });
    }
  },
  workflow: {
    createForm: createWorkflowForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => YAML.stringify({
      ...unknown,
      ...state,
      tags: normalizeStringArray(state.tags),
      models: serializeWorkflowModels(state.models),
      context: normalizeUsesArray(state.context),
      mcpServers: normalizeUsesArray(state.mcpServers),
      rules: normalizeUsesArray(state.rules)
    })
  },
  context: {
    createForm: createContextForm,
    parse: (txt) => YAML.parse(txt || "") || {},
    serialize: (state) => YAML.stringify({
      ...unknown,
      ...state,
      tags: normalizeStringArray(state.tags),
      context: serializeContextEntries(state.context)
    })
  },
  agent: {
    createForm: createAgentForm,
    parse: (txt) => { const m = matter(txt || ""); return { ...m.data, body: m.content.trimStart() }; },
    serialize: (state) => { const { body = "", ...frontmatter } = { ...unknown, ...state }; return matter.stringify(body, frontmatter); }
  },
  rule: {
    createForm: createRuleForm,
    parse: (txt) => { const m = matter(txt || ""); return { ...m.data, body: m.content.trimStart() }; },
    serialize: (state) => { const { body = "", ...frontmatter } = { ...unknown, ...state }; return matter.stringify(body, frontmatter); }
  }
};

function normalizeState(type, parsed) {
  const data = parsed || {};
  if (type === "prompt") return {
    name: data.name || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.tags),
    prompts: Array.isArray(data.prompts) ? data.prompts : []
  };
  if (type === "mcpServer") return {
    name: data.name || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.tags),
    mcpServers: normalizeMcpServers(data.mcpServers)
  };
  if (type === "agent") return { name: data.name || "", description: data.description || "", version: data.version || "", tags: data.tags || [], tools: data.tools || [], rules: data.rules || [], body: data.body || "" };
  if (type === "rule") return { name: data.name || "", description: data.description || "", version: data.version || "", tags: data.tags || [], body: data.body || "" };
  if (type === "model") return {
    name: data.name || "",
    description: data.description || "",
    version: data.version || "",
    schema: data.schema || "",
    tags: normalizeStringArray(data.tags),
    models: normalizeModelEntries(data.models)
  };
  if (type === "workflow") return {
    name: data.name || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.tags),
    models: normalizeWorkflowModels(data.models),
    context: normalizeUsesArray(data.context),
    mcpServers: normalizeUsesArray(data.mcpServers),
    rules: normalizeUsesArray(data.rules)
  };
  return {
    name: data.name || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.tags),
    context: normalizeContextEntries(data.context)
  };
}

function captureUnknownFields(type, parsed) {
  const knownByType = {
    prompt: ["name", "description", "version", "schema", "tags", "prompts"],
    mcpServer: ["name", "description", "version", "schema", "tags", "mcpServers"],
    agent: ["name", "description", "version", "tags", "tools", "rules", "body"],
    rule: ["name", "description", "version", "tags", "body"],
    model: ["name", "description", "version", "schema", "tags", "models"],
    workflow: ["name", "description", "version", "schema", "tags", "models", "context", "mcpServers", "rules"],
    context: ["name", "description", "version", "schema", "tags", "context"]
  };
  const known = new Set(knownByType[type] || []);
  unknown = Object.fromEntries(Object.entries(parsed || {}).filter(([key]) => !known.has(key)));
}

function setupForType(type, initialRaw) {
  formMount.innerHTML = "";
  const handler = handlers[type];
  formController = handler.createForm({ mount: formMount, onChange: () => sync.updateTextFromForm() });
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
  if (mode === "edit") {
    const response = await fetch(`/api/editor/definition?path=${encodeURIComponent(pathParam)}`);
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

  const response = await fetch("/api/editor/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, path: pathParam, content: rawText.value, format, filename, targetPath })
  });
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
