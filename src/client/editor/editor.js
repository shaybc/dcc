import { createTextFormSync } from "./components/yamlEditorSync.js";
import { initLoadingService, runWithLoading } from "../services/loadingService.js";
import { initNotificationService, queueNotification } from "../services/notificationService.js";
import { definitionIconSvg } from "../utils/definitionIcons.js";
import { enhanceDescriptionField } from "./editorDescriptionHelp.js";
import {
  buildDefaultFilenameFromDccUri,
  buildRepoFolderPaths,
  openCreateSaveDialog
} from "./editorSaveDialog.js";
import {
  captureUnknownFields,
  createHandlers,
  detectPromptFormat,
  detectPromptFormatFromRawInput,
  detectRuleFormat,
  detectRuleFormatFromRawInput,
  isCertainMarkdownPaste,
  isCertainRuleMarkdownPaste,
  isCertainRuleYamlPaste,
  isCertainYamlPaste,
  normalizeState,
  shouldShowPromptFormatControl
} from "./editorDefinitionLogic.js";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "create";
const typeParam = params.get("type") || "prompt";
const pathParam = params.get("path") || "";
const definitionIdParam = params.get("id") || "";
const destinationRepoIdParam = params.get("repoId") || "";
const returnFromGuideParam = params.get("returnFromGuide") || "";

const GENERATED_DEFINITION_STORAGE_KEY = "dcc.generated.definition";
const EDITOR_HELP_STATE_STORAGE_KEY = "dcc.editor.helpState";
const TYPE_HELP_PAGE_ID = {
  prompt: "definition-details-actions-test-schema-prompt",
  mcpServer: "definition-details-actions-test-schema-mcpserver",
  agent: "definition-details-actions-test-schema-agent",
  rule: "definition-details-actions-test-schema-rule",
  model: "definition-details-actions-test-schema-model",
  workflow: "definition-details-actions-test-schema-workflow",
  context: "definition-details-actions-test-schema-context",
  doc: "definition-details-actions-test-schema-docs",
  config: "definition-details-actions-test-schema-config"
};

const formMount = document.getElementById("formMount");
const rawText = document.getElementById("rawText");
const parseError = document.getElementById("parseError");
const rawLabel = document.getElementById("rawLabel");
const promptFormatControl = document.getElementById("promptFormatControl");
const promptFormatSelect = document.getElementById("promptFormatSelect");
const editorTitle = document.getElementById("editorTitle");

let formController;
let sync;
let definitionType = typeParam;
let format = "yaml";
let unknown = {};
let availableTags = [];
let definitionReferences = [];
let assetRepos = [];
let repoFolderPathsById = new Map();
let promptFormatSuggestionNode;
let promptFormatSuggestionTextNode;
let promptFormatSwitchButton;
let promptFormatKeepButton;
let dismissedPromptFormatConflict = "";
let promptContentFormat = "yaml";
let ruleContentFormat = "markdown";

const TAG_DEBUG_PREFIX = "[tag-autocomplete]";

initLoadingService();
initNotificationService();

const handlers = createHandlers({
  getUnknown: () => unknown,
  getPromptContentFormat: () => promptContentFormat,
  getRuleContentFormat: () => ruleContentFormat
});

const typeDisplayLabel = (type) => (type === "mcpServer" ? "MCP Server" : type.charAt(0).toUpperCase() + type.slice(1));
const formatDisplayName = (contentFormat) => (contentFormat === "markdown" ? "Markdown" : "YAML");
const promptParseGuidance = (activeFormat, detectedFormat) => activeFormat === detectedFormat ? "" : ` This content looks like ${formatDisplayName(detectedFormat)}. Use the format selector to switch.`;

function renderEditorTitle(type) {
  const titleText = mode === "create" ? `Create new ${typeDisplayLabel(type)} Definition` : `Edit ${typeDisplayLabel(type)}`;
  editorTitle.innerHTML = "";
  const icon = document.createElement("span");
  icon.className = "editor-title-icon";
  icon.innerHTML = definitionIconSvg(type);
  const text = document.createElement("span");
  text.textContent = titleText;
  const helpButton = document.createElement("button");
  helpButton.type = "button";
  helpButton.className = "editor-help-icon-button editor-title-help-icon";
  helpButton.setAttribute("aria-label", "Open guide for this definition type");
  helpButton.title = "Open guide for this definition type";
  helpButton.textContent = "?";
  helpButton.addEventListener("click", openDefinitionGuide);
  editorTitle.append(icon, text, helpButton);
}

function saveEditorStateForGuide() {
  sync?.updateTextFromForm?.();
  const formState = formController?.getState?.();
  const snapshot = { mode, type: definitionType, path: pathParam, id: definitionIdParam, raw: rawText.value, formState: formState && typeof formState === "object" ? formState : null, savedAt: Date.now() };
  window.sessionStorage.setItem(EDITOR_HELP_STATE_STORAGE_KEY, JSON.stringify(snapshot));
}

function consumeEditorStateFromGuide() {
  try {
    const rawSnapshot = window.sessionStorage.getItem(EDITOR_HELP_STATE_STORAGE_KEY);
    if (!rawSnapshot) return null;
    const snapshot = JSON.parse(rawSnapshot);
    const sameEditor = snapshot && snapshot.mode === mode && snapshot.type === definitionType && String(snapshot.path || "") === String(pathParam || "") && String(snapshot.id || "") === String(definitionIdParam || "");
    if (!sameEditor) return null;
    return { raw: String(snapshot.raw || ""), formState: snapshot.formState && typeof snapshot.formState === "object" ? snapshot.formState : null };
  } catch (_error) {
    return null;
  } finally {
    window.sessionStorage.removeItem(EDITOR_HELP_STATE_STORAGE_KEY);
  }
}

function openDefinitionGuide() {
  saveEditorStateForGuide();
  const page = TYPE_HELP_PAGE_ID[definitionType] || "definitions-schema";
  const returnUrl = new URL(`${window.location.pathname}${window.location.search}`, window.location.origin);
  returnUrl.searchParams.set("returnFromGuide", "1");
  const url = new URL("/user-guide.html", window.location.origin);
  url.searchParams.set("page", page);
  url.searchParams.set("returnTo", `${returnUrl.pathname}${returnUrl.search}`);
  window.location.assign(url.toString());
}

function ensurePromptFormatSuggestionBanner() {
  if (promptFormatSuggestionNode) return;
  promptFormatSuggestionNode = document.createElement("div");
  promptFormatSuggestionNode.className = "prompt-format-suggestion";
  promptFormatSuggestionNode.hidden = true;
  promptFormatSuggestionTextNode = document.createElement("span");
  const actionsNode = document.createElement("div");
  actionsNode.className = "prompt-format-suggestion-actions";
  promptFormatSwitchButton = document.createElement("button");
  promptFormatSwitchButton.type = "button";
  promptFormatSwitchButton.className = "btn btn-primary small";
  promptFormatKeepButton = document.createElement("button");
  promptFormatKeepButton.type = "button";
  promptFormatKeepButton.className = "btn small";
  actionsNode.append(promptFormatKeepButton, promptFormatSwitchButton);
  promptFormatSuggestionNode.append(promptFormatSuggestionTextNode, actionsNode);
  parseError.parentNode?.insertBefore(promptFormatSuggestionNode, parseError);
}

function hidePromptFormatSuggestion() { if (promptFormatSuggestionNode) promptFormatSuggestionNode.hidden = true; }

function setPromptFormat(nextFormat) {
  promptContentFormat = nextFormat === "markdown" ? "markdown" : "yaml";
  format = promptContentFormat;
  dismissedPromptFormatConflict = "";
  hidePromptFormatSuggestion();
  rawLabel.textContent = promptContentFormat === "markdown" ? "Raw Markdown" : "Raw YAML";
  if (promptFormatSelect) promptFormatSelect.value = promptContentFormat;
}

function showPromptFormatSuggestion(detectedFormat) {
  if (definitionType !== "prompt") return;
  ensurePromptFormatSuggestionBanner();
  const activeFormat = promptContentFormat;
  const conflictKey = `${activeFormat}->${detectedFormat}`;
  if (dismissedPromptFormatConflict === conflictKey) return;
  promptFormatSuggestionTextNode.textContent = `Pasted content looks like ${formatDisplayName(detectedFormat)}. Switch format?`;
  promptFormatSwitchButton.textContent = `Switch to ${formatDisplayName(detectedFormat)}`;
  promptFormatKeepButton.textContent = `Keep ${formatDisplayName(activeFormat)}`;
  promptFormatSwitchButton.onclick = () => {
    dismissedPromptFormatConflict = "";
    hidePromptFormatSuggestion();
    setPromptFormat(detectedFormat);
    sync?.updateFormFromText({ reason: "switch-format" });
  };
  promptFormatKeepButton.onclick = () => {
    dismissedPromptFormatConflict = conflictKey;
    hidePromptFormatSuggestion();
    sync?.setError(`Keeping ${formatDisplayName(activeFormat)} format.${promptParseGuidance(activeFormat, detectedFormat)}`);
    sync?.updateFormFromText({ reason: "keep-format" });
  };
  promptFormatSuggestionNode.hidden = false;
}

function setPromptFormatControlVisibility(visible) {
  if (promptFormatControl) promptFormatControl.hidden = !visible;
}

function convertPromptContentFormat(nextFormat) {
  if (definitionType !== "prompt") return false;
  const normalizedFormat = nextFormat === "markdown" ? "markdown" : "yaml";
  const previousFormat = promptContentFormat;
  if (normalizedFormat === previousFormat) return true;
  const previousRawText = rawText.value;
  const previousUnknown = { ...unknown };
  let nextState = formController?.getState?.() || {};
  try {
    const parsed = handlers.prompt.parse(previousRawText);
    captureUnknownFields("prompt", parsed, (value) => { unknown = value; });
    nextState = normalizeState("prompt", parsed);
  } catch (_error) {
    unknown = previousUnknown;
  }
  try {
    setPromptFormat(normalizedFormat);
    formController?.setState(nextState);
    rawText.value = handlers.prompt.serialize(nextState);
    sync?.updateFormFromText({ reason: "switch-format" });
    sync?.setError("");
    return true;
  } catch (error) {
    setPromptFormat(previousFormat);
    unknown = previousUnknown;
    rawText.value = previousRawText;
    sync?.setError(error?.message || "Failed to convert prompt format.");
    return false;
  }
}

function setupForType(type, initialRaw) {
  formMount.innerHTML = "";
  const handler = handlers[type];
  formController = handler.createForm({ mount: formMount, onChange: () => sync.updateTextFromForm(), availableTags, definitionReferences });
  const syncDescriptionField = enhanceDescriptionField(formMount);
  if (syncDescriptionField) {
    const previousSetState = formController.setState.bind(formController);
    formController.setState = (nextState) => { previousSetState(nextState); syncDescriptionField(); };
  }

  sync = createTextFormSync({
    textArea: rawText,
    errorNode: parseError,
    parseText: (text) => {
      try {
        const parsed = handler.parse(text);
        captureUnknownFields(type, parsed, (value) => { unknown = value; });
        return normalizeState(type, parsed);
      } catch (error) {
        if (type === "prompt") error.message = `${error.message || "Failed to parse text."}${promptParseGuidance(promptContentFormat, detectPromptFormatFromRawInput(text))}`;
        if (type === "rule") error.message = `${error.message || "Failed to parse text."}${promptParseGuidance(ruleContentFormat, detectRuleFormatFromRawInput(text))}`;
        throw error;
      }
    },
    serializeState: (state) => handler.serialize(state),
    readState: () => formController.getState(),
    writeState: (state) => formController.setState(state),
    onTextInput: ({ text, reason, event }) => {
      if (reason !== "input") return;
      const inputType = event?.inputType || "";
      if (!inputType.startsWith("insert")) return;
      if (type === "prompt") {
        const detectedFormat = detectPromptFormatFromRawInput(text);
        if (detectedFormat === promptContentFormat) { dismissedPromptFormatConflict = ""; hidePromptFormatSuggestion(); return; }
        if (inputType === "insertFromPaste" && detectedFormat === "yaml" && promptContentFormat === "markdown" && isCertainYamlPaste(text)) { dismissedPromptFormatConflict = ""; setPromptFormat("yaml"); sync?.updateFormFromText({ reason: "auto-switch-format" }); return; }
        if (inputType === "insertFromPaste" && detectedFormat === "markdown" && promptContentFormat === "yaml" && isCertainMarkdownPaste(text)) { dismissedPromptFormatConflict = ""; setPromptFormat("markdown"); sync?.updateFormFromText({ reason: "auto-switch-format" }); return; }
        showPromptFormatSuggestion(detectedFormat);
        return;
      }
      if (type !== "rule") return;
      const detectedFormat = detectRuleFormatFromRawInput(text);
      if (detectedFormat === ruleContentFormat) return;
      if (inputType === "insertFromPaste" && detectedFormat === "yaml" && ruleContentFormat === "markdown" && isCertainRuleYamlPaste(text)) {
        ruleContentFormat = "yaml"; format = "yaml"; rawLabel.textContent = "Raw YAML"; if (promptFormatSelect) promptFormatSelect.value = "yaml"; sync?.updateFormFromText({ reason: "auto-switch-format" }); return;
      }
      if (inputType === "insertFromPaste" && detectedFormat === "markdown" && ruleContentFormat === "yaml" && isCertainRuleMarkdownPaste(text)) {
        ruleContentFormat = "markdown"; format = "markdown"; rawLabel.textContent = "Raw Markdown"; if (promptFormatSelect) promptFormatSelect.value = "markdown"; sync?.updateFormFromText({ reason: "auto-switch-format" });
      }
    }
  });

  if (shouldShowPromptFormatControl(type, mode)) {
    setPromptFormatControlVisibility(true);
    if (type === "prompt") setPromptFormat(mode === "edit" ? detectPromptFormat(initialRaw, pathParam) : (promptFormatSelect?.value || "yaml"));
    else {
      ruleContentFormat = mode === "edit" ? detectRuleFormat(initialRaw, pathParam) : (promptFormatSelect?.value === "yaml" ? "yaml" : "markdown");
      format = ruleContentFormat;
      rawLabel.textContent = format === "markdown" ? "Raw Markdown" : "Raw YAML";
      if (promptFormatSelect) promptFormatSelect.value = format;
    }
  } else {
    setPromptFormatControlVisibility(false);
    hidePromptFormatSuggestion();
    format = type === "agent" || type === "rule" ? "markdown" : "yaml";
    rawLabel.textContent = format === "markdown" ? "Raw Markdown" : "Raw YAML";
  }

  rawText.value = initialRaw || "";
  sync.updateFormFromText();
  sync.updateTextFromForm();
  renderEditorTitle(type);
}

async function boot() {
  let raw = "";
  let generatedRaw = "";
  try {
    console.debug(`${TAG_DEBUG_PREFIX} boot: requesting /api/definition-tags`);
    const tagsResponse = await fetch("/api/definition-tags");
    if (tagsResponse.ok) {
      const tagsPayload = await tagsResponse.json();
      availableTags = Array.isArray(tagsPayload) ? tagsPayload : [];
    }
  } catch (_error) { availableTags = []; }
  try {
    const refsResponse = await fetch("/api/definitions/references");
    if (refsResponse.ok) {
      const refsPayload = await refsResponse.json();
      definitionReferences = Array.isArray(refsPayload) ? refsPayload : [];
    }
  } catch (_error) { definitionReferences = []; }
  try { const reposResponse = await fetch("/api/asset-repos"); if (reposResponse.ok) { const reposPayload = await reposResponse.json(); assetRepos = (Array.isArray(reposPayload) ? reposPayload : []).filter((repo) => Boolean(repo?.enabled)).sort((a, b) => Number(a.id || 0) - Number(b.id || 0)); } } catch (_error) { assetRepos = []; }
  try { const definitionsResponse = await fetch("/api/definitions"); if (definitionsResponse.ok) repoFolderPathsById = buildRepoFolderPaths(await definitionsResponse.json()); } catch (_error) { repoFolderPathsById = new Map(); }

  if (mode === "create" && params.get("generated") === "1") {
    try { const parsedStored = JSON.parse(window.sessionStorage.getItem(GENERATED_DEFINITION_STORAGE_KEY) || "null"); if (parsedStored && parsedStored.type === definitionType && parsedStored.content) generatedRaw = String(parsedStored.content); } catch (_error) { generatedRaw = ""; } finally { window.sessionStorage.removeItem(GENERATED_DEFINITION_STORAGE_KEY); }
  }

  if (mode === "edit") {
    const query = new URLSearchParams();
    if (pathParam) query.set("path", pathParam);
    if (definitionIdParam) query.set("id", definitionIdParam);
    const response = await runWithLoading(async () => fetch(`/api/editor/definition?${query.toString()}`), { title: "Loading definition...", description: "Fetching definition content." });
    if (!response) return;
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load definition.");
    definitionType = payload.type;
    raw = payload.content || "";
  }

  let restoredSnapshot = null;
  if (returnFromGuideParam === "1") {
    restoredSnapshot = consumeEditorStateFromGuide();
    raw = restoredSnapshot?.raw || raw;
    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.searchParams.delete("returnFromGuide");
    window.history.replaceState({}, "", `${cleanedUrl.pathname}${cleanedUrl.search}`);
  } else window.sessionStorage.removeItem(EDITOR_HELP_STATE_STORAGE_KEY);

  setupForType(definitionType, raw);

  if (generatedRaw && mode === "create") {
    rawText.value = "";
    sync.updateFormFromText({ reason: "generated-clear" });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    rawText.value = generatedRaw;
    sync.updateFormFromText({ reason: "generated-apply" });
    sync.updateTextFromForm();
  }

  if (restoredSnapshot?.formState) {
    formController.setState(restoredSnapshot.formState);
    sync.updateTextFromForm();
  }
}

document.getElementById("cancelButton").addEventListener("click", () => window.location.assign("/"));
document.getElementById("saveButton").addEventListener("click", async () => {
  const currentState = formController?.getState?.() || {};
  const dccUri = String(currentState.dcc_uri || "").trim();
  if (!dccUri) { parseError.hidden = false; parseError.textContent = "DCC URI is required."; return; }

  let filename;
  let targetPath = "";
  let destinationRepoId;

  if (mode === "create") {
    const dialogResult = await openCreateSaveDialog({
      defaults: { filename: buildDefaultFilenameFromDccUri(dccUri, format), targetPath: "", destinationRepoId: destinationRepoIdParam, format },
      repos: assetRepos,
      folderPathsByRepoId: repoFolderPathsById,
      formats: definitionType === "prompt" || definitionType === "rule" ? ["yaml", "markdown"] : [format],
      formatDisplayName
    });
    if (!dialogResult) return;
    filename = dialogResult.filename;
    targetPath = dialogResult.targetPath;
    destinationRepoId = dialogResult.destinationRepoId ? Number(dialogResult.destinationRepoId) : null;
    format = dialogResult.format === "markdown" ? "markdown" : "yaml";
    if (!Number.isInteger(destinationRepoId) || destinationRepoId <= 0) { parseError.hidden = false; parseError.textContent = "Destination repository id is required."; return; }
  }

  const response = await runWithLoading(
    async () => fetch("/api/editor/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, path: pathParam, definitionId: definitionIdParam ? Number(definitionIdParam) : null, content: rawText.value, format, filename, targetPath, destinationRepoId, definitionType }) }),
    { title: mode === "create" ? "Creating definition..." : "Saving definition...", description: "Writing definition changes to repository.", timeout: 120000 }
  );
  if (!response) return;
  const payload = await response.json();
  if (!response.ok) { parseError.hidden = false; parseError.textContent = payload.error || "Save failed."; return; }
  queueNotification(payload.message || "Saved.");
  window.location.assign("/");
});

if (promptFormatSelect) {
  promptFormatSelect.addEventListener("change", () => {
    if (definitionType === "prompt") return void convertPromptContentFormat(promptFormatSelect.value);
    if (definitionType !== "rule") return;
    const nextFormat = promptFormatSelect.value === "yaml" ? "yaml" : "markdown";
    if (nextFormat === ruleContentFormat) return;
    const previousFormat = ruleContentFormat;
    const previousRawText = rawText.value;
    const previousUnknown = { ...unknown };
    let nextState = formController?.getState?.() || {};
    try { const parsed = handlers.rule.parse(previousRawText); captureUnknownFields("rule", parsed, (value) => { unknown = value; }); nextState = normalizeState("rule", parsed); } catch (_error) { unknown = previousUnknown; }
    try {
      ruleContentFormat = nextFormat;
      format = nextFormat;
      rawLabel.textContent = nextFormat === "markdown" ? "Raw Markdown" : "Raw YAML";
      formController?.setState(nextState);
      rawText.value = handlers.rule.serialize(nextState);
      sync?.updateFormFromText({ reason: "switch-format" });
      sync?.setError("");
    } catch (error) {
      ruleContentFormat = previousFormat;
      format = previousFormat;
      rawLabel.textContent = previousFormat === "markdown" ? "Raw Markdown" : "Raw YAML";
      unknown = previousUnknown;
      rawText.value = previousRawText;
      promptFormatSelect.value = previousFormat;
      sync?.setError(error?.message || "Failed to convert rule format.");
    }
  });
}

boot().catch((error) => {
  parseError.hidden = false;
  parseError.textContent = error.message;
});
