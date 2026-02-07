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
  workflow: { createForm: createWorkflowForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => YAML.stringify({ ...unknown, ...state }) },
  context: { createForm: createContextForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => YAML.stringify({ ...unknown, ...state }) },
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
  if (type === "workflow") return { name: data.name || "", description: data.description || "", version: data.version || "", models: data.models || [], context: data.context || [], mcpServers: data.mcpServers || [], rules: data.rules || [], override: data.override || { roles: [] } };
  return { name: data.name || "", description: data.description || "", version: data.version || "", context: data.context || [], headers: data.headers || [] };
}

function captureUnknownFields(type, parsed) {
  const knownByType = {
    prompt: ["name", "description", "version", "schema", "tags", "prompts"],
    mcpServer: ["name", "description", "version", "schema", "tags", "mcpServers"],
    agent: ["name", "description", "version", "tags", "tools", "rules", "body"],
    rule: ["name", "description", "version", "tags", "body"],
    model: ["name", "description", "version", "schema", "tags", "models"],
    workflow: ["name", "description", "version", "models", "override", "context", "mcpServers", "rules"],
    context: ["name", "description", "version", "context", "headers"]
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
  editorTitle.textContent = `${mode === "edit" ? "Edit" : "Create"} ${type}`;
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
