import YAML from "https://esm.sh/yaml@2.8.2";
import matter from "https://esm.sh/gray-matter@4.0.3";
import { createPromptForm } from "./forms/promptForm.js";
import { createMcpServerForm } from "./forms/mcpServerForm.js";
import { createAgentForm } from "./forms/agentForm.js";
import { createRuleForm } from "./forms/ruleForm.js";
import { createModelForm } from "./forms/modelForm.js";
import { createWorkflowForm } from "./forms/workflowForm.js";
import { createContextForm } from "./forms/contextForm.js";
import { createDocForm } from "./forms/docForm.js";
import { createConfigForm } from "./forms/configForm.js";

export const YAML_HEADER_KEYS = ["name", "dcc_uri", "dcc_definition_type", "version", "schema", "description", "dcc_tags"];
const MODEL_CAPABILITY_OPTIONS = ["tool_use", "image_input"];

export function normalizeStringArray(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeModelCapabilities(capabilities) {
  return (Array.isArray(capabilities) ? capabilities : [])
    .map((capability) => String(capability || "").trim())
    .filter((capability) => MODEL_CAPABILITY_OPTIONS.includes(capability));
}
function normalizeModelEntries(models) {
  return (Array.isArray(models) ? models : []).map((entry) => ({
    ...entry,
    roles: Array.isArray(entry?.roles) ? entry.roles : [],
    capabilities: normalizeModelCapabilities(entry?.capabilities),
    contextLength: entry?.defaultCompletionOptions?.contextLength ?? ""
  }));
}
function normalizeMcpServers(servers) { return (Array.isArray(servers) ? servers : []).map((entry) => ({ ...entry, args: Array.isArray(entry?.args) ? entry.args : [] })); }
function normalizeWorkflowModels(models) { return (Array.isArray(models) ? models : []).map((entry) => ({ ...entry, with: entry?.with && typeof entry.with === "object" ? Object.entries(entry.with).map(([key, value]) => ({ key, value: String(value ?? "") })) : [], roles: Array.isArray(entry?.override?.roles) ? entry.override.roles : [] })); }
function normalizeUsesArray(items) { return (Array.isArray(items) ? items : []).map((entry) => (typeof entry === "string" ? { uses: entry } : { ...entry, uses: entry?.uses || "" })); }
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
    if (Object.keys(withObject).length > 0) out.with = withObject;
    else delete out.with;
    if (Array.isArray(out.roles) && out.roles.length > 0) out.override = { ...(out.override || {}), roles: out.roles };
    delete out.roles;
    if (out.override && Object.keys(out.override).length === 0) delete out.override;
    return out;
  });
}
function normalizeContextEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const paramsArray = Array.isArray(entry?.params) ? entry.params : entry?.params && typeof entry.params === "object" ? Object.entries(entry.params).map(([key, value]) => ({ key, value: value == null ? "" : String(value) })) : [];
    return { provider: entry?.provider || "", params: paramsArray.map((item) => ({ key: item?.key == null ? "" : String(item.key), value: item?.value == null ? "" : String(item.value) })).filter((item) => item.key || item.value) };
  });
}
function serializeContextEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const out = { provider: entry?.provider || "" };
    if (Array.isArray(entry?.params)) {
      const params = entry.params.map((item) => ({ key: item?.key == null ? "" : String(item.key).trim(), value: item?.value == null ? "" : String(item.value) })).filter((item) => item.key);
      if (params.length > 0) out.params = params;
    }
    return out;
  });
}
function orderYamlDefinitionFields(data) {
  const source = data && typeof data === "object" ? data : {};
  const header = {};
  for (const key of YAML_HEADER_KEYS) header[key] = source[key] == null ? "" : source[key];
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
  if (bodyStartIndex <= 0 || lines[bodyStartIndex - 1].trim() === "") return yamlText;
  lines.splice(bodyStartIndex, 0, "");
  return lines.join("\n");
}
function enforceDescriptionMultilineStyle(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node?.items) && node.constructor?.name === "YAMLMap") {
    node.items.forEach((item) => {
      const key = String(item?.key?.value ?? "");
      if (key === "description" && typeof item?.value?.value === "string") item.value.type = "BLOCK_LITERAL";
      enforceDescriptionMultilineStyle(item?.value);
    });
    return;
  }
  if (Array.isArray(node?.items) && node.constructor?.name === "YAMLSeq") node.items.forEach((item) => enforceDescriptionMultilineStyle(item));
}
function stringifyYamlDefinition(data) {
  const document = new YAML.Document(orderYamlDefinitionFields(data));
  enforceDescriptionMultilineStyle(document.contents);
  return injectBlankLineAfterHeader(document.toString());
}
function isMarkdownPath(filePath = "") { const normalized = String(filePath || "").toLowerCase(); return normalized.endsWith(".md") || normalized.endsWith(".markdown") || normalized.endsWith(".mdx"); }
export function detectPromptFormatFromRawInput(text = "") { return String(text || "").trimStart().startsWith("---") ? "markdown" : "yaml"; }
export function detectRuleFormatFromRawInput(text = "") { return String(text || "").trimStart().startsWith("---") ? "markdown" : "yaml"; }
export function isCertainYamlPaste(text = "") {
  const source = String(text || "").trim();
  if (!source || source.startsWith("---") || !/(^|\n)\s*[A-Za-z0-9_][\w-]*\s*:\s*/.test(source)) return false;
  try {
    const parsed = YAML.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const keys = Object.keys(parsed);
    const knownPromptKeys = ["name", "dcc_uri", "dcc_definition_type", "version", "schema", "description", "dcc_tags", "prompts", "prompt"];
    return keys.length > 0 && keys.some((key) => knownPromptKeys.includes(key));
  } catch (_error) { return false; }
}
export function isCertainMarkdownPaste(text = "") {
  const source = String(text || "").trim();
  if (!source.startsWith("---")) return false;
  try {
    const frontmatter = matter(source)?.data;
    if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) return false;
    const keys = Object.keys(frontmatter);
    const knownPromptKeys = ["name", "dcc_uri", "dcc_definition_type", "version", "schema", "description", "dcc_tags", "prompts", "prompt", "invokable"];
    return keys.length > 0 && keys.some((key) => knownPromptKeys.includes(key));
  } catch (_error) { return false; }
}
export function isCertainRuleYamlPaste(text = "") {
  const source = String(text || "").trim();
  if (!source || source.startsWith("---") || !/(^|\n)\s*[A-Za-z0-9_][\w-]*\s*:\s*/.test(source)) return false;
  try {
    const parsed = YAML.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const keys = Object.keys(parsed);
    const knownRuleKeys = ["name", "dcc_uri", "dcc_definition_type", "description", "version", "globs", "regex", "alwaysApply", "dcc_tags", "rules", "rule", "body"];
    return keys.length > 0 && keys.some((key) => knownRuleKeys.includes(key));
  } catch (_error) { return false; }
}
export function isCertainRuleMarkdownPaste(text = "") {
  const source = String(text || "").trim();
  if (!source.startsWith("---")) return false;
  try {
    const frontmatter = matter(source)?.data;
    if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) return false;
    const keys = Object.keys(frontmatter);
    const knownRuleKeys = ["name", "dcc_uri", "dcc_definition_type", "description", "version", "globs", "regex", "alwaysApply", "dcc_tags"];
    return keys.length > 0 && keys.some((key) => knownRuleKeys.includes(key));
  } catch (_error) { return false; }
}
export function detectPromptFormat(text = "", filePath = "") { return isMarkdownPath(filePath) ? "markdown" : detectPromptFormatFromRawInput(text); }
export function detectRuleFormat(text = "", filePath = "") { return isMarkdownPath(filePath) ? "markdown" : detectRuleFormatFromRawInput(text); }
function addMissingOpeningFrontmatterFence(rawTextValue) {
  const source = String(rawTextValue || "");
  if (!source.trim() || source.trimStart().startsWith("---")) return source;
  const match = /^---\s*$/m.exec(source);
  if (!match || match.index <= 0) return source;
  const headerCandidate = source.slice(0, match.index).trim();
  if (!headerCandidate) return source;
  try {
    const parsedHeader = YAML.parse(headerCandidate);
    if (!parsedHeader || typeof parsedHeader !== "object" || Array.isArray(parsedHeader)) return source;
    return YAML_HEADER_KEYS.some((key) => Object.prototype.hasOwnProperty.call(parsedHeader, key)) ? `---\n${source}` : source;
  } catch (_error) { return source; }
}
export function dccDefinitionTypeForEditorType(type) {
  return ({ prompt: "prompt", agent: "agent", config: "config", model: "model", mcpServer: "mcp_server", rule: "rule", doc: "doc", context: "context", workflow: "workflow" })[String(type || "").trim()] || "";
}
function omitUndefinedValues(value) { return Object.fromEntries(Object.entries(value || {}).filter(([, entryValue]) => entryValue !== undefined)); }

export function createHandlers({ getUnknown, getPromptContentFormat, getRuleContentFormat }) {
  return {
    prompt: { createForm: createPromptForm, parse: (txt) => getPromptContentFormat() === "markdown" ? { ...matter(txt || "").data, prompt: matter(txt || "").data?.prompt || matter(txt || "").content.trim(), __contentFormat: "markdown" } : { ...(YAML.parse(txt || "") || {}), __contentFormat: "yaml" },
      serialize: (state) => {
        const { tags, ...rest } = state;
        const invokable = typeof rest.invokable === "boolean" ? rest.invokable : true;
        if (getPromptContentFormat() === "markdown") {
          const prompts = Array.isArray(state.prompts) ? state.prompts : [];
          const primaryPrompt = prompts[0] || {};
          const { prompts: _unusedPrompts, ...frontmatterFields } = rest;
          return matter.stringify("", { ...getUnknown(), ...frontmatterFields, dcc_definition_type: dccDefinitionTypeForEditorType("prompt"), dcc_tags: normalizeStringArray(tags), invokable, prompt: primaryPrompt.prompt || "" });
        }
        return stringifyYamlDefinition({ ...getUnknown(), ...rest, dcc_definition_type: dccDefinitionTypeForEditorType("prompt"), invokable, dcc_tags: normalizeStringArray(tags), prompts: Array.isArray(state.prompts) ? state.prompts : [] });
      } },
    mcpServer: { createForm: createMcpServerForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => { const { tags, ...rest } = state; return stringifyYamlDefinition({ ...getUnknown(), ...rest, dcc_definition_type: dccDefinitionTypeForEditorType("mcpServer"), dcc_tags: normalizeStringArray(tags), mcpServers: normalizeMcpServers(state.mcpServers) }); } },
    model: { createForm: createModelForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => { const normalizedModels = (state.models || []).map((entry) => ({ ...entry, ...(entry.apiKey == null || String(entry.apiKey).trim() === "" ? {} : { apiKey: String(entry.apiKey) }), roles: Array.isArray(entry.roles) ? entry.roles : [], capabilities: normalizeModelCapabilities(entry.capabilities), defaultCompletionOptions: { ...(entry.defaultCompletionOptions || {}), ...(entry.contextLength ? { contextLength: Number(entry.contextLength) || entry.contextLength } : {}) } })).map((entry) => { const { contextLength, ...rest } = entry; if (rest.apiKey == null || String(rest.apiKey).trim() === "") delete rest.apiKey; if (!Array.isArray(rest.capabilities) || rest.capabilities.length === 0) delete rest.capabilities; if (!rest.defaultCompletionOptions || Object.keys(rest.defaultCompletionOptions).length === 0) delete rest.defaultCompletionOptions; return rest; }); const { tags, ...rest } = state; return stringifyYamlDefinition({ ...getUnknown(), ...rest, dcc_definition_type: dccDefinitionTypeForEditorType("model"), dcc_tags: normalizeStringArray(tags), models: normalizedModels }); } },
    workflow: { createForm: createWorkflowForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => { const { tags, ...rest } = state; return stringifyYamlDefinition({ ...getUnknown(), ...rest, dcc_definition_type: dccDefinitionTypeForEditorType("workflow"), dcc_tags: normalizeStringArray(tags), models: serializeWorkflowModels(state.models), context: normalizeUsesArray(state.context), mcpServers: normalizeUsesArray(state.mcpServers), rules: normalizeUsesArray(state.rules) }); } },
    context: { createForm: createContextForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => { const { tags, ...rest } = state; return stringifyYamlDefinition({ ...getUnknown(), ...rest, dcc_definition_type: dccDefinitionTypeForEditorType("context"), dcc_tags: normalizeStringArray(tags), context: serializeContextEntries(state.context) }); } },
    doc: { createForm: createDocForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => { const { tags, ...rest } = state; return stringifyYamlDefinition({ ...getUnknown(), ...rest, dcc_definition_type: dccDefinitionTypeForEditorType("doc"), dcc_tags: normalizeStringArray(tags), docs: Array.isArray(state.docs) ? state.docs : [] }); } },
    config: { createForm: createConfigForm, parse: (txt) => YAML.parse(txt || "") || {}, serialize: (state) => { const { tags, ...rest } = state; return stringifyYamlDefinition({ ...getUnknown(), ...rest, dcc_definition_type: dccDefinitionTypeForEditorType("config"), dcc_tags: normalizeStringArray(tags), models: normalizeUsesArray(state.models).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })), context: normalizeUsesArray(state.context).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })), rules: normalizeUsesArray(state.rules).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })), prompts: normalizeUsesArray(state.prompts).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })), docs: normalizeUsesArray(state.docs).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })), mcpServers: normalizeUsesArray(state.mcpServers).map((entry) => ({ dcc_use: entry.uses || entry.dcc_use || "" })), dcc_config_type: state.dcc_config_type || "agents" }); } },
    agent: { createForm: createAgentForm, parse: (txt) => { const m = matter(addMissingOpeningFrontmatterFence(txt || "")); return { ...m.data, body: m.content.trimStart() }; }, serialize: (state) => { const { body = "", tags, ...frontmatter } = { ...getUnknown(), ...state }; return matter.stringify(body, omitUndefinedValues({ ...frontmatter, dcc_definition_type: dccDefinitionTypeForEditorType("agent"), dcc_tags: normalizeStringArray(tags) })); } },
    rule: { createForm: createRuleForm, parse: (txt) => { if (getRuleContentFormat() === "markdown") { const m = matter(addMissingOpeningFrontmatterFence(txt || "")); return { ...m.data, body: m.content.trimStart() }; } const parsed = YAML.parse(txt || "") || {}; const firstRule = Array.isArray(parsed.rules) && parsed.rules[0] && typeof parsed.rules[0] === "object" ? parsed.rules[0] : {}; return { ...parsed, globs: parsed.globs ?? firstRule.globs, regex: parsed.regex ?? firstRule.regex, alwaysApply: parsed.alwaysApply ?? firstRule.alwaysApply, rule: parsed.rule ?? firstRule.rule, body: parsed.body ?? firstRule.body }; }, serialize: (state) => { const { body = "", tags, ...frontmatter } = { ...getUnknown(), ...state }; if (getRuleContentFormat() === "markdown") return matter.stringify(body, omitUndefinedValues({ ...frontmatter, dcc_definition_type: dccDefinitionTypeForEditorType("rule"), dcc_tags: normalizeStringArray(tags) })); const normalizedGlobs = Array.isArray(frontmatter.globs) ? frontmatter.globs.map((entry) => String(entry || "").trim()).filter(Boolean) : (typeof frontmatter.globs === "string" && frontmatter.globs.trim() ? frontmatter.globs.trim() : undefined); const normalizedRegex = Array.isArray(frontmatter.regex) ? frontmatter.regex.map((entry) => String(entry || "").trim()).filter(Boolean) : (typeof frontmatter.regex === "string" && frontmatter.regex.trim() ? frontmatter.regex.trim() : undefined); const ruleEntry = omitUndefinedValues({ name: String(frontmatter.name || "").trim() || undefined, globs: normalizedGlobs, regex: normalizedRegex, alwaysApply: typeof frontmatter.alwaysApply === "boolean" ? frontmatter.alwaysApply : undefined, rule: String(body || "") }); const { globs, regex, alwaysApply, rule, ...topLevel } = frontmatter; return stringifyYamlDefinition(omitUndefinedValues({ ...topLevel, dcc_definition_type: dccDefinitionTypeForEditorType("rule"), dcc_tags: normalizeStringArray(tags), rules: [ruleEntry] })); } }
  };
}

export function normalizeState(type, parsed) {
  const data = parsed || {};
  if (type === "prompt") return { name: data.name || "", dcc_uri: data.dcc_uri || "", version: data.version || "", schema: data.schema || "", description: data.description || "", tags: normalizeStringArray(data.dcc_tags), dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("prompt"), prompts: Array.isArray(data.prompts) ? data.prompts : (data.prompt ? [{ name: data.name || "", description: data.description || "", prompt: data.prompt }] : []) };
  if (type === "mcpServer") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("mcpServer"), name: data.name || "", dcc_uri: data.dcc_uri || "", version: data.version || "", schema: data.schema || "", description: data.description || "", tags: normalizeStringArray(data.dcc_tags), mcpServers: normalizeMcpServers(data.mcpServers) };
  if (type === "agent") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("agent"), name: data.name || "", dcc_uri: data.dcc_uri || "", description: data.description || "", version: data.version || "", schema: data.schema || "", tags: data.dcc_tags || [], body: data.body || "" };
  if (type === "rule") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("rule"), name: data.name || "", dcc_uri: data.dcc_uri || "", description: data.description || "", version: data.version || "", schema: data.schema || "", globs: data.globs || "", regex: data.regex || "", alwaysApply: typeof data.alwaysApply === "boolean" ? data.alwaysApply : undefined, tags: data.dcc_tags || [], body: data.rule || data.body || "" };
  if (type === "model") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("model"), name: data.name || "", description: data.description || "", dcc_uri: data.dcc_uri || "", version: data.version || "", schema: data.schema || "", tags: normalizeStringArray(data.dcc_tags), models: normalizeModelEntries(data.models) };
  if (type === "workflow") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("workflow"), name: data.name || "", dcc_uri: data.dcc_uri || "", version: data.version || "", schema: data.schema || "", description: data.description || "", tags: normalizeStringArray(data.dcc_tags), models: normalizeWorkflowModels(data.models), context: normalizeUsesArray(data.context), mcpServers: normalizeUsesArray(data.mcpServers), rules: normalizeUsesArray(data.rules) };
  if (type === "doc") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("doc"), name: data.name || "", dcc_uri: data.dcc_uri || "", version: data.version || "", schema: data.schema || "", description: data.description || "", tags: normalizeStringArray(data.dcc_tags), docs: Array.isArray(data.docs) ? data.docs : [] };
  if (type === "config") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("config"), name: data.name || "", dcc_uri: data.dcc_uri || "", version: data.version || "", schema: data.schema || "", description: data.description || "", tags: normalizeStringArray(data.dcc_tags), dcc_config_type: data.dcc_config_type || "agents", models: normalizeUsesArray(data.models).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })), context: normalizeUsesArray(data.context).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })), rules: normalizeUsesArray(data.rules).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })), prompts: normalizeUsesArray(data.prompts).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })), docs: normalizeUsesArray(data.docs).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })), mcpServers: normalizeUsesArray(data.mcpServers).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })) };
  return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType(type), name: data.name || "", dcc_uri: data.dcc_uri || "", version: data.version || "", schema: data.schema || "", description: data.description || "", tags: normalizeStringArray(data.dcc_tags), context: normalizeContextEntries(data.context) };
}

export function shouldShowPromptFormatControl(type, mode) { return (type === "prompt" || type === "rule") && (mode === "create" || mode === "edit"); }
export function captureUnknownFields(type, parsed, setUnknown) {
  const known = new Set({ prompt: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "prompts", "prompt", "invokable", "__contentFormat"], mcpServer: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "mcpServers"], agent: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "body"], rule: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "globs", "regex", "alwaysApply", "dcc_tags", "rules", "rule", "body"], model: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "models"], workflow: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "models", "context", "mcpServers", "rules"], context: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "context"], doc: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "docs"], config: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "dcc_config_type", "models", "context", "rules", "prompts", "docs", "mcpServers"] }[type] || []);
  setUnknown(Object.fromEntries(Object.entries(parsed || {}).filter(([key]) => !known.has(key))));
}
