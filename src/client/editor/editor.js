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
import { initNotificationService, queueNotification } from "../services/notificationService.js";
import { renderDescriptionMarkdown } from "../utils/stringUtils.js";

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

const DESCRIPTION_HELP_PAGE_PATH = "/help/user-guide/pages/usage/description-field-markdown-help.md";
let descriptionHelpContentPromise;

async function loadDescriptionHelpContent() {
  if (!descriptionHelpContentPromise) {
    descriptionHelpContentPromise = fetch(DESCRIPTION_HELP_PAGE_PATH)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load help content (${response.status}).`);
        return response.text();
      })
      .then((markdown) => renderDescriptionMarkdown(markdown))
      .catch((error) => `<p>Unable to load help content right now.</p><p><code>${error.message}</code></p>`);
  }
  return descriptionHelpContentPromise;
}

async function openDescriptionHelpModal() {
  const overlay = document.createElement("div");
  overlay.className = "editor-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "editor-modal editor-description-help-modal";

  const title = document.createElement("h3");
  title.textContent = "Description field help";

  const content = document.createElement("div");
  content.className = "editor-description-help-content";
  content.innerHTML = "<p>Loading help content…</p>";

  const actions = document.createElement("div");
  actions.className = "editor-modal-actions";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn-primary";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => overlay.remove());

  actions.append(closeButton);
  modal.append(title, content, actions);
  overlay.append(modal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.remove();
  });
  document.body.append(overlay);

  const html = await loadDescriptionHelpContent();
  content.innerHTML = html;
}

function enhanceDescriptionField(formContainer) {
  const rows = Array.from(formContainer.querySelectorAll("label.editor-field"));
  const descriptionRow = rows.find((row) => {
    const labelText = row.querySelector("span")?.textContent?.trim()?.toLowerCase();
    return labelText === "description";
  });

  if (!descriptionRow || descriptionRow.dataset.descriptionEnhanced === "true") return null;

  const input = descriptionRow.querySelector('input[type="text"], textarea');
  if (!input) return null;

  const labelSpan = descriptionRow.querySelector("span");
  if (labelSpan) {
    const helpButton = document.createElement("button");
    helpButton.type = "button";
    helpButton.className = "editor-help-icon-button";
    helpButton.setAttribute("aria-label", "Description help");
    helpButton.title = "Description help";
    helpButton.textContent = "?";
    helpButton.addEventListener("click", () => {
      openDescriptionHelpModal();
    });
    labelSpan.append(" ", helpButton);
  }

  if (input.tagName.toLowerCase() === "textarea") {
    input.classList.add("editor-description-textarea");
    descriptionRow.dataset.descriptionEnhanced = "true";
    return null;
  }

  const textarea = document.createElement("textarea");
  textarea.className = "editor-description-textarea";
  textarea.rows = 5;
  textarea.placeholder = input.placeholder || "Add a detailed description";

  const syncTextareaFromInput = () => {
    textarea.value = input.value || "";
  };

  textarea.addEventListener("input", () => {
    input.value = textarea.value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  descriptionRow.append(textarea);
  input.classList.add("editor-description-hidden-input");
  descriptionRow.dataset.descriptionEnhanced = "true";
  syncTextareaFromInput();
  return syncTextareaFromInput;
}
const YAML_HEADER_KEYS = ["name", "dcc_uri", "dcc_definition_type", "version", "schema", "description", "dcc_tags"];

initLoadingService();
initNotificationService();

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
  const titleText = mode === "create" ? `Create new ${label} Definition` : `Edit ${label}`;
  editorTitle.innerHTML = "";

  const icon = document.createElement("span");
  icon.className = "editor-title-icon";
  icon.innerHTML = typeIconSvg(type);

  const text = document.createElement("span");
  text.textContent = titleText;

  const helpButton = document.createElement("button");
  helpButton.type = "button";
  helpButton.className = "editor-help-icon-button editor-title-help-icon";
  helpButton.setAttribute("aria-label", "Open guide for this definition type");
  helpButton.title = "Open guide for this definition type";
  helpButton.textContent = "?";
  helpButton.addEventListener("click", () => {
    openDefinitionGuide();
  });

  editorTitle.append(icon, text, helpButton);
}

function saveEditorStateForGuide() {
  sync?.updateTextFromForm?.();
  const formState = formController?.getState?.();
  const snapshot = {
    mode,
    type: definitionType,
    path: pathParam,
    id: definitionIdParam,
    raw: rawText.value,
    formState: formState && typeof formState === "object" ? formState : null,
    savedAt: Date.now()
  };
  window.sessionStorage.setItem(EDITOR_HELP_STATE_STORAGE_KEY, JSON.stringify(snapshot));
}

function consumeEditorStateFromGuide() {
  try {
    const rawSnapshot = window.sessionStorage.getItem(EDITOR_HELP_STATE_STORAGE_KEY);
    if (!rawSnapshot) return null;
    const snapshot = JSON.parse(rawSnapshot);
    const sameEditor = snapshot
      && snapshot.mode === mode
      && snapshot.type === definitionType
      && String(snapshot.path || "") === String(pathParam || "")
      && String(snapshot.id || "") === String(definitionIdParam || "");
    if (!sameEditor) return null;
    return {
      raw: String(snapshot.raw || ""),
      formState: snapshot.formState && typeof snapshot.formState === "object" ? snapshot.formState : null
    };
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
  const returnTo = `${returnUrl.pathname}${returnUrl.search}`;
  const url = new URL("/user-guide.html", window.location.origin);
  url.searchParams.set("page", page);
  url.searchParams.set("returnTo", returnTo);
  window.location.assign(url.toString());
}

function getDefaultExtensionForFormat(selectedFormat) {
  return selectedFormat === "markdown" ? "md" : "yaml";
}

function getAllowedExtensionsForFormat(selectedFormat) {
  if (selectedFormat === "markdown") {
    return ["md", "markdown", "mdx"];
  }
  return ["yaml", "yml"];
}

function readFilenameExtension(filename) {
  const trimmed = String(filename || "").trim();
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === trimmed.length - 1) return "";
  return trimmed.slice(dotIndex + 1).toLowerCase();
}

function replaceFilenameExtension(filename, nextExtension) {
  const trimmed = String(filename || "").trim();
  const ext = String(nextExtension || "").replace(/^\.+/, "");
  if (!trimmed) return `definition.${ext}`;
  const slashIndex = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex <= slashIndex || dotIndex < 0) {
    return `${trimmed}.${ext}`;
  }
  return `${trimmed.slice(0, dotIndex)}.${ext}`;
}

function buildDefaultFilenameFromDccUri(dccUri, selectedFormat = format) {
  const cleaned = String(dccUri || "").trim().replace(/\/+$/, "");
  const segments = cleaned.split("/").map((segment) => segment.trim()).filter(Boolean);
  const baseName = segments.length > 0 ? segments.at(-1) : "definition";
  return `${baseName}.${getDefaultExtensionForFormat(selectedFormat)}`;
}

function buildRepoFolderPaths(definitions) {
  const pathsByRepo = new Map();
  (Array.isArray(definitions) ? definitions : []).forEach((definition) => {
    const repoId = Number(definition?.repoId || 0);
    if (!Number.isInteger(repoId) || repoId <= 0) return;

    const normalizedRelativePath = String(definition?.repoRelativePath || "")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .trim();
    const slashIndex = normalizedRelativePath.lastIndexOf("/");
    const folderPath = slashIndex <= 0 ? "" : normalizedRelativePath.slice(0, slashIndex);

    if (!pathsByRepo.has(repoId)) {
      pathsByRepo.set(repoId, new Set());
    }
    if (folderPath) {
      pathsByRepo.get(repoId).add(folderPath);
    }
  });

  return new Map(
    [...pathsByRepo.entries()].map(([repoId, paths]) => [repoId, [...paths].sort((a, b) => a.localeCompare(b))])
  );
}

function openCreateSaveDialog({ defaults = {}, repos = [], folderPathsByRepoId = new Map(), formats = ["yaml", "markdown"] } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "editor-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "editor-modal editor-save-dialog";

    const title = document.createElement("h3");
    title.textContent = "Save definition";

    const subtitle = document.createElement("p");
    subtitle.className = "editor-save-dialog-subtitle";
    subtitle.textContent = "Choose where to save this definition.";

    const form = document.createElement("div");
    form.className = "editor-modal-form";

    const error = document.createElement("div");
    error.className = "error";
    error.hidden = true;

    const repoRow = document.createElement("label");
    repoRow.className = "editor-field";
    const repoLabel = document.createElement("span");
    repoLabel.textContent = "Destination repository";
    const repoSelect = document.createElement("select");
    repoSelect.className = "editor-save-dialog-select";

    repos.forEach((repo) => {
      const option = document.createElement("option");
      option.value = String(repo.id);
      option.textContent = repo.name || repo.key || repo.localPath || String(repo.id);
      repoSelect.append(option);
    });

    if (repos.length === 0) {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "No repositories found";
      emptyOption.disabled = true;
      emptyOption.selected = true;
      repoSelect.append(emptyOption);
      repoSelect.disabled = true;
    } else {
      const defaultRepoId = String(defaults.destinationRepoId || "");
      const hasDefault = repos.some((repo) => String(repo.id) === defaultRepoId);
      repoSelect.value = hasDefault ? defaultRepoId : String(repos[0].id);
    }

    repoRow.append(repoLabel, repoSelect);

    const filenameRow = document.createElement("label");
    filenameRow.className = "editor-field";
    const filenameLabel = document.createElement("span");
    filenameLabel.textContent = "Filename (with extension)";
    const filenameInput = document.createElement("input");
    filenameInput.type = "text";
    filenameInput.value = defaults.filename || "";
    filenameInput.placeholder = "example.yaml";
    filenameRow.append(filenameLabel, filenameInput);

    const formatRow = document.createElement("label");
    formatRow.className = "editor-field";
    const formatLabel = document.createElement("span");
    formatLabel.textContent = "Format";
    const formatSelect = document.createElement("select");
    formatSelect.className = "editor-save-dialog-select";
    const selectableFormats = (Array.isArray(formats) ? formats : ["yaml"])
      .map((entry) => entry === "markdown" ? "markdown" : "yaml")
      .filter((entry, index, array) => array.indexOf(entry) === index);

    selectableFormats.forEach((formatValue) => {
      const option = document.createElement("option");
      option.value = formatValue;
      option.textContent = formatDisplayName(formatValue);
      formatSelect.append(option);
    });
    const defaultDialogFormat = defaults.format === "markdown" ? "markdown" : "yaml";
    formatSelect.value = selectableFormats.includes(defaultDialogFormat)
      ? defaultDialogFormat
      : selectableFormats[0] || "yaml";
    formatSelect.disabled = selectableFormats.length <= 1;
    formatRow.append(formatLabel, formatSelect);

    let lastSuggestedFilename = String(filenameInput.value || "").trim();
    let filenameManuallyOverridden = false;

    filenameInput.addEventListener("input", () => {
      const current = String(filenameInput.value || "").trim();
      filenameManuallyOverridden = current !== lastSuggestedFilename;
    });

    formatSelect.addEventListener("change", () => {
      if (filenameManuallyOverridden) return;
      const nextFilename = replaceFilenameExtension(
        filenameInput.value,
        getDefaultExtensionForFormat(formatSelect.value)
      );
      filenameInput.value = nextFilename;
      lastSuggestedFilename = String(nextFilename || "").trim();
    });

    const targetPathRow = document.createElement("label");
    targetPathRow.className = "editor-field";
    const targetPathLabel = document.createElement("span");
    targetPathLabel.textContent = "Folder path relative to repo";
    const targetPathInput = document.createElement("input");
    targetPathInput.type = "text";
    targetPathInput.value = defaults.targetPath || "";
    targetPathInput.placeholder = "optional/subfolder";
    const folderPathListId = `folder-path-options-${Date.now()}`;
    targetPathInput.setAttribute("list", folderPathListId);
    const folderPathList = document.createElement("datalist");
    folderPathList.id = folderPathListId;
    targetPathRow.append(targetPathLabel, targetPathInput, folderPathList);

    const refreshFolderPathOptions = () => {
      folderPathList.innerHTML = "";
      const selectedRepoId = Number(repoSelect.value || 0);
      const options = folderPathsByRepoId.get(selectedRepoId) || [];
      options.forEach((folderPath) => {
        const option = document.createElement("option");
        option.value = folderPath;
        folderPathList.append(option);
      });
    };
    repoSelect.addEventListener("change", refreshFolderPathOptions);
    refreshFolderPathOptions();

    const actions = document.createElement("div");
    actions.className = "editor-modal-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = "Cancel";

    const save = document.createElement("button");
    save.type = "button";
    save.className = "btn btn-primary";
    save.textContent = "Save";

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancel.addEventListener("click", () => close(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(null);
    });

    save.addEventListener("click", () => {
      const selectedFormat = formatSelect.value === "markdown" ? "markdown" : "yaml";
      const value = {
        filename: String(filenameInput.value || "").trim(),
        targetPath: String(targetPathInput.value || "").trim(),
        destinationRepoId: String(repoSelect.value || "").trim(),
        format: selectedFormat
      };

      if (!value.destinationRepoId) {
        error.hidden = false;
        error.textContent = "Destination repository is required.";
        return;
      }
      if (!value.filename) {
        error.hidden = false;
        error.textContent = "Filename is required.";
        return;
      }

      const ext = readFilenameExtension(value.filename);
      const allowed = getAllowedExtensionsForFormat(selectedFormat);
      if (!allowed.includes(ext)) {
        const correctedFilename = replaceFilenameExtension(
          value.filename,
          getDefaultExtensionForFormat(selectedFormat)
        );
        const shouldAutoCorrect = window.confirm(
          `Filename extension does not match ${formatDisplayName(selectedFormat)} format.\n\n` +
          `Press OK to use \"${correctedFilename}\" or Cancel to keep \"${value.filename}\".`
        );

        if (shouldAutoCorrect) {
          value.filename = correctedFilename;
          filenameInput.value = correctedFilename;
          lastSuggestedFilename = correctedFilename;
          filenameManuallyOverridden = false;
        }
      }

      error.hidden = true;
      close(value);
    });

    actions.append(cancel, save);
    form.append(repoRow, filenameRow, formatRow, targetPathRow);
    modal.append(title, subtitle, form, error, actions);
    overlay.append(modal);
    document.body.append(overlay);
    if (repoSelect.value) {
      filenameInput.focus();
      filenameInput.select();
    } else {
      repoSelect.focus();
    }
  });
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

function isMarkdownPath(filePath = "") {
  const normalized = String(filePath || "").toLowerCase();
  return normalized.endsWith(".md") || normalized.endsWith(".markdown") || normalized.endsWith(".mdx");
}

function detectPromptFormatFromRawInput(text = "") {
  const source = String(text || "").trimStart();
  return source.startsWith("---") ? "markdown" : "yaml";
}

function detectRuleFormatFromRawInput(text = "") {
  const source = String(text || "").trimStart();
  return source.startsWith("---") ? "markdown" : "yaml";
}

function isCertainYamlPaste(text = "") {
  const source = String(text || "").trim();
  if (!source || source.startsWith("---")) return false;

  const hasYamlKeyPattern = /(^|\n)\s*[A-Za-z0-9_][\w-]*\s*:\s*/.test(source);
  if (!hasYamlKeyPattern) return false;

  try {
    const parsed = YAML.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;

    const keys = Object.keys(parsed);
    if (keys.length === 0) return false;

    const knownPromptKeys = ["name", "dcc_uri", "dcc_definition_type", "version", "schema", "description", "dcc_tags", "prompts", "prompt"];
    return keys.some((key) => knownPromptKeys.includes(key));
  } catch (_error) {
    return false;
  }
}

function isCertainMarkdownPaste(text = "") {
  const source = String(text || "").trim();
  if (!source.startsWith("---")) return false;

  try {
    const parsed = matter(source);
    const frontmatter = parsed?.data;
    if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) return false;

    const keys = Object.keys(frontmatter);
    if (keys.length === 0) return false;

    const knownPromptKeys = ["name", "dcc_uri", "dcc_definition_type", "version", "schema", "description", "dcc_tags", "prompts", "prompt", "invokable"];
    return keys.some((key) => knownPromptKeys.includes(key));
  } catch (_error) {
    return false;
  }
}

function isCertainRuleYamlPaste(text = "") {
  const source = String(text || "").trim();
  if (!source || source.startsWith("---")) return false;

  const hasYamlKeyPattern = /(^|\n)\s*[A-Za-z0-9_][\w-]*\s*:\s*/.test(source);
  if (!hasYamlKeyPattern) return false;

  try {
    const parsed = YAML.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;

    const keys = Object.keys(parsed);
    if (keys.length === 0) return false;

    const knownRuleKeys = ["name", "dcc_uri", "dcc_definition_type", "description", "version", "globs", "regex", "alwaysApply", "dcc_tags", "rules", "rule", "body"];
    return keys.some((key) => knownRuleKeys.includes(key));
  } catch (_error) {
    return false;
  }
}

function isCertainRuleMarkdownPaste(text = "") {
  const source = String(text || "").trim();
  if (!source.startsWith("---")) return false;

  try {
    const parsed = matter(source);
    const frontmatter = parsed?.data;
    if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) return false;

    const keys = Object.keys(frontmatter);
    if (keys.length === 0) return false;

    const knownRuleKeys = ["name", "dcc_uri", "dcc_definition_type", "description", "version", "globs", "regex", "alwaysApply", "dcc_tags"];
    return keys.some((key) => knownRuleKeys.includes(key));
  } catch (_error) {
    return false;
  }
}

function detectPromptFormat(text = "") {
  if (isMarkdownPath(pathParam)) {
    return "markdown";
  }

  return detectPromptFormatFromRawInput(text);
}

function detectRuleFormat(text = "") {
  if (isMarkdownPath(pathParam)) {
    return "markdown";
  }

  return detectRuleFormatFromRawInput(text);
}



function dccDefinitionTypeForEditorType(type) {
  const normalized = String(type || "").trim();
  const mapping = {
    prompt: "prompt",
    agent: "agent",
    config: "config",
    model: "model",
    mcpServer: "mcp_server",
    rule: "rule",
    doc: "doc",
    context: "context",
    workflow: "workflow"
  };
  return mapping[normalized] || "";
}
function formatDisplayName(contentFormat) {
  return contentFormat === "markdown" ? "Markdown" : "YAML";
}

function promptParseGuidance(activeFormat, detectedFormat) {
  if (activeFormat === detectedFormat) return "";
  return ` This content looks like ${formatDisplayName(detectedFormat)}. Use the format selector to switch.`;
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

function hidePromptFormatSuggestion() {
  if (!promptFormatSuggestionNode) return;
  promptFormatSuggestionNode.hidden = true;
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

function setPromptFormat(nextFormat) {
  const normalizedFormat = nextFormat === "markdown" ? "markdown" : "yaml";
  promptContentFormat = normalizedFormat;
  format = normalizedFormat;
  dismissedPromptFormatConflict = "";
  hidePromptFormatSuggestion();
  rawLabel.textContent = normalizedFormat === "markdown" ? "Raw Markdown" : "Raw YAML";
  if (promptFormatSelect) {
    promptFormatSelect.value = normalizedFormat;
  }
}

function convertPromptContentFormat(nextFormat) {
  if (definitionType !== "prompt") return false;

  const normalizedFormat = nextFormat === "markdown" ? "markdown" : "yaml";
  const previousFormat = promptContentFormat;
  if (normalizedFormat === previousFormat) {
    setPromptFormat(normalizedFormat);
    return true;
  }

  const previousRawText = rawText.value;
  const previousUnknown = { ...unknown };
  const promptHandler = handlers.prompt;
  let nextState = formController?.getState?.() || {};

  try {
    const parsed = promptHandler.parse(previousRawText);
    captureUnknownFields("prompt", parsed);
    nextState = normalizeState("prompt", parsed);
  } catch (_error) {
    unknown = previousUnknown;
  }

  try {
    setPromptFormat(normalizedFormat);
    formController?.setState(nextState);
    rawText.value = promptHandler.serialize(nextState);
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

function setPromptFormatControlVisibility(visible) {
  if (!promptFormatControl) return;
  promptFormatControl.hidden = !visible;
}

function parseAgentMarkdownContent(text) {
  const source = String(text || "");
  const parsed = matter(source);
  const hasFrontmatter = parsed && parsed.data && Object.keys(parsed.data).length > 0;

  if (hasFrontmatter) {
    return { ...parsed.data, body: parsed.content.trimStart() };
  }

  const nestedSource = String(parsed?.content || "").trimStart();
  if (nestedSource.startsWith("---")) {
    const nestedParsed = matter(nestedSource);
    if (nestedParsed?.data && Object.keys(nestedParsed.data).length > 0) {
      return { ...nestedParsed.data, body: nestedParsed.content.trimStart() };
    }
  }

  try {
    const yamlParsed = YAML.parse(source);
    if (yamlParsed && typeof yamlParsed === "object" && !Array.isArray(yamlParsed)) {
      return {
        ...yamlParsed,
        body: String(yamlParsed.body || yamlParsed.prompt || "").trimStart()
      };
    }
  } catch (_error) {
    // fall through to plain markdown parsing
  }

  return { ...parsed.data, body: parsed.content.trimStart() };
}

const handlers = {
  prompt: {
    createForm: createPromptForm,
    parse: (txt) => {
      if (promptContentFormat === "markdown") {
        const parsed = matter(txt || "");
        return {
          ...parsed.data,
          prompt: parsed.data?.prompt || parsed.content.trim(),
          __contentFormat: "markdown"
        };
      }

      return {
        ...(YAML.parse(txt || "") || {}),
        __contentFormat: "yaml"
      };
    },
    serialize: (state) => {
      const { tags, ...rest } = state;
      const invokable = typeof rest.invokable === "boolean" ? rest.invokable : true;
      if (promptContentFormat === "markdown") {
        const prompts = Array.isArray(state.prompts) ? state.prompts : [];
        const primaryPrompt = prompts[0] || {};
        const { prompts: _unusedPrompts, ...frontmatterFields } = rest;

        return matter.stringify("", {
          ...unknown,
          ...frontmatterFields,
          dcc_definition_type: dccDefinitionTypeForEditorType("prompt"),
          dcc_tags: normalizeStringArray(tags),
          invokable,
          prompt: primaryPrompt.prompt || ""
        });
      }

      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_definition_type: dccDefinitionTypeForEditorType("prompt"),
        invokable,
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
        dcc_definition_type: dccDefinitionTypeForEditorType("mcpServer"),
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
        ...(entry.apiKey == null || String(entry.apiKey).trim() === "" ? {} : { apiKey: String(entry.apiKey) }),
        roles: Array.isArray(entry.roles) ? entry.roles : [],
        defaultCompletionOptions: {
          ...(entry.defaultCompletionOptions || {}),
          ...(entry.contextLength ? { contextLength: Number(entry.contextLength) || entry.contextLength } : {})
        }
      })).map((entry) => {
        const { contextLength, ...rest } = entry;
        if (rest.apiKey == null || String(rest.apiKey).trim() === "") {
          delete rest.apiKey;
        }
        if (!rest.defaultCompletionOptions || Object.keys(rest.defaultCompletionOptions).length === 0) {
          delete rest.defaultCompletionOptions;
        }
        return rest;
      });

      const { tags, ...rest } = state;
      return stringifyYamlDefinition({
        ...unknown,
        ...rest,
        dcc_definition_type: dccDefinitionTypeForEditorType("model"),
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
        dcc_definition_type: dccDefinitionTypeForEditorType("workflow"),
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
        dcc_definition_type: dccDefinitionTypeForEditorType("context"),
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
        dcc_definition_type: dccDefinitionTypeForEditorType("doc"),
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
        dcc_definition_type: dccDefinitionTypeForEditorType("config"),
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
    parse: (txt) => parseAgentMarkdownContent(txt),
    serialize: (state) => {
      const { body = "", tags, ...frontmatter } = { ...unknown, ...state };
      return matter.stringify(body, omitUndefinedValues({ ...frontmatter, dcc_definition_type: dccDefinitionTypeForEditorType("agent"), dcc_tags: normalizeStringArray(tags) }));
    }
  },
  rule: {
    createForm: createRuleForm,
    parse: (txt) => {
      if (ruleContentFormat === "markdown") {
        const m = matter(txt || "");
        return { ...m.data, body: m.content.trimStart() };
      }

      const parsed = YAML.parse(txt || "") || {};
      const firstRule = Array.isArray(parsed.rules) && parsed.rules[0] && typeof parsed.rules[0] === "object"
        ? parsed.rules[0]
        : {};

      return {
        ...parsed,
        globs: parsed.globs ?? firstRule.globs,
        regex: parsed.regex ?? firstRule.regex,
        alwaysApply: parsed.alwaysApply ?? firstRule.alwaysApply,
        rule: parsed.rule ?? firstRule.rule,
        body: parsed.body ?? firstRule.body,
      };
    },
    serialize: (state) => {
      const { body = "", tags, ...frontmatter } = { ...unknown, ...state };
      if (ruleContentFormat === "markdown") {
        return matter.stringify(body, omitUndefinedValues({ ...frontmatter, dcc_definition_type: dccDefinitionTypeForEditorType("rule"), dcc_tags: normalizeStringArray(tags) }));
      }

      const normalizedGlobs = Array.isArray(frontmatter.globs)
        ? frontmatter.globs.map((entry) => String(entry || "").trim()).filter(Boolean)
        : (typeof frontmatter.globs === "string" && frontmatter.globs.trim() ? frontmatter.globs.trim() : undefined);
      const normalizedRegex = Array.isArray(frontmatter.regex)
        ? frontmatter.regex.map((entry) => String(entry || "").trim()).filter(Boolean)
        : (typeof frontmatter.regex === "string" && frontmatter.regex.trim() ? frontmatter.regex.trim() : undefined);

      const ruleEntry = omitUndefinedValues({
        name: String(frontmatter.name || "").trim() || undefined,
        globs: normalizedGlobs,
        regex: normalizedRegex,
        alwaysApply: typeof frontmatter.alwaysApply === "boolean" ? frontmatter.alwaysApply : undefined,
        rule: String(body || "")
      });

      const { globs, regex, alwaysApply, rule, ...topLevel } = frontmatter;
      return stringifyYamlDefinition(omitUndefinedValues({
        ...topLevel,
        dcc_definition_type: dccDefinitionTypeForEditorType("rule"),
        dcc_tags: normalizeStringArray(tags),
        rules: [ruleEntry]
      }));
    }
  }
};

function omitUndefinedValues(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, entryValue]) => entryValue !== undefined));
}

function normalizeState(type, parsed) {
  const data = parsed || {};
  if (type === "prompt") return {
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags),
    dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("prompt"),
    prompts: Array.isArray(data.prompts) ? data.prompts : (data.prompt ? [{ name: data.name || "", description: data.description || "", prompt: data.prompt }] : [])
  };
  if (type === "mcpServer") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("mcpServer"),
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags),
    mcpServers: normalizeMcpServers(data.mcpServers)
  };
  if (type === "agent") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("agent"), name: data.name || "", dcc_uri: data.dcc_uri || "", description: data.description || "", version: data.version || "", schema: data.schema || "", tags: data.dcc_tags || [], body: data.body || "" };
  if (type === "rule") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("rule"),
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    description: data.description || "",
    version: data.version || "",
    schema: data.schema || "",
    globs: data.globs || "",
    regex: data.regex || "",
    alwaysApply: typeof data.alwaysApply === "boolean" ? data.alwaysApply : undefined,
    tags: data.dcc_tags || [],
    body: data.rule || data.body || ""
  };
  if (type === "model") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("model"),
    name: data.name || "",
    description: data.description || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    tags: normalizeStringArray(data.dcc_tags),
    models: normalizeModelEntries(data.models)
  };
  if (type === "workflow") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("workflow"),
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags),
    models: normalizeWorkflowModels(data.models),
    context: normalizeUsesArray(data.context),
    mcpServers: normalizeUsesArray(data.mcpServers),
      rules: normalizeUsesArray(data.rules)
  };
  if (type === "doc") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("doc"),
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags),
    docs: Array.isArray(data.docs) ? data.docs : []
  };
  if (type === "config") return { dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType("config"),
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags),
    dcc_config_type: data.dcc_config_type || "agents",
    models: normalizeUsesArray(data.models).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    context: normalizeUsesArray(data.context).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    rules: normalizeUsesArray(data.rules).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    prompts: normalizeUsesArray(data.prompts).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    docs: normalizeUsesArray(data.docs).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" })),
    mcpServers: normalizeUsesArray(data.mcpServers).map((entry) => ({ dcc_use: entry?.dcc_use || entry?.uses || "" }))
  };
  return {
    dcc_definition_type: data.dcc_definition_type || dccDefinitionTypeForEditorType(type),
    name: data.name || "",
    dcc_uri: data.dcc_uri || "",
    version: data.version || "",
    schema: data.schema || "",
    description: data.description || "",
    tags: normalizeStringArray(data.dcc_tags),
    context: normalizeContextEntries(data.context)
  };
}

function shouldShowPromptFormatControl(type) {
  return (type === "prompt" || type === "rule") && (mode === "create" || mode === "edit");
}

function captureUnknownFields(type, parsed) {
  const knownByType = {
    prompt: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "prompts", "prompt", "invokable", "__contentFormat"],
    mcpServer: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "mcpServers"],
    agent: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "body"],
    rule: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "globs", "regex", "alwaysApply", "dcc_tags", "rules", "rule", "body"],
    model: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "models"],
    workflow: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "models", "context", "mcpServers", "rules"],
    context: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "context"],
    doc: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "docs"],
    config: ["name", "dcc_uri", "dcc_definition_type", "description", "version", "schema", "dcc_tags", "dcc_config_type", "models", "context", "rules", "prompts", "docs", "mcpServers"]
  };
  const known = new Set(knownByType[type] || []);
  unknown = Object.fromEntries(Object.entries(parsed || {}).filter(([key]) => !known.has(key)));
}

function setupForType(type, initialRaw) {
  formMount.innerHTML = "";
  const handler = handlers[type];
  formController = handler.createForm({ mount: formMount, onChange: () => sync.updateTextFromForm(), availableTags, definitionReferences });
  const syncDescriptionField = enhanceDescriptionField(formMount);
  if (syncDescriptionField) {
    const previousSetState = formController.setState.bind(formController);
    formController.setState = (nextState) => {
      previousSetState(nextState);
      syncDescriptionField();
    };
  }
  sync = createTextFormSync({
    textArea: rawText,
    errorNode: parseError,
    parseText: (text) => {
      try {
        const parsed = handler.parse(text);
        captureUnknownFields(type, parsed);
        return normalizeState(type, parsed);
      } catch (error) {
        if (type === "prompt") {
          const detectedFormat = detectPromptFormatFromRawInput(text);
          const guidance = promptParseGuidance(promptContentFormat, detectedFormat);
          if (guidance) {
            error.message = `${error.message || "Failed to parse text."}${guidance}`;
          }
        }
        if (type === "rule") {
          const detectedFormat = detectRuleFormatFromRawInput(text);
          const guidance = promptParseGuidance(ruleContentFormat, detectedFormat);
          if (guidance) {
            error.message = `${error.message || "Failed to parse text."}${guidance}`;
          }
        }
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
        if (detectedFormat === promptContentFormat) {
          dismissedPromptFormatConflict = "";
          hidePromptFormatSuggestion();
          return;
        }

        if (
          inputType === "insertFromPaste" &&
          detectedFormat === "yaml" &&
          promptContentFormat === "markdown" &&
          isCertainYamlPaste(text)
        ) {
          dismissedPromptFormatConflict = "";
          setPromptFormat("yaml");
          sync?.updateFormFromText({ reason: "auto-switch-format" });
          return;
        }

        if (
          inputType === "insertFromPaste" &&
          detectedFormat === "markdown" &&
          promptContentFormat === "yaml" &&
          isCertainMarkdownPaste(text)
        ) {
          dismissedPromptFormatConflict = "";
          setPromptFormat("markdown");
          sync?.updateFormFromText({ reason: "auto-switch-format" });
          return;
        }

        showPromptFormatSuggestion(detectedFormat);
        return;
      }

      if (type !== "rule") return;

      const detectedFormat = detectRuleFormatFromRawInput(text);
      if (detectedFormat === ruleContentFormat) {
        return;
      }

      if (
        inputType === "insertFromPaste" &&
        detectedFormat === "yaml" &&
        ruleContentFormat === "markdown" &&
        isCertainRuleYamlPaste(text)
      ) {
        ruleContentFormat = "yaml";
        format = "yaml";
        rawLabel.textContent = "Raw YAML";
        if (promptFormatSelect) {
          promptFormatSelect.value = "yaml";
        }
        sync?.updateFormFromText({ reason: "auto-switch-format" });
        return;
      }

      if (
        inputType === "insertFromPaste" &&
        detectedFormat === "markdown" &&
        ruleContentFormat === "yaml" &&
        isCertainRuleMarkdownPaste(text)
      ) {
        ruleContentFormat = "markdown";
        format = "markdown";
        rawLabel.textContent = "Raw Markdown";
        if (promptFormatSelect) {
          promptFormatSelect.value = "markdown";
        }
        sync?.updateFormFromText({ reason: "auto-switch-format" });
      }
    }
  });

  if (shouldShowPromptFormatControl(type)) {
    setPromptFormatControlVisibility(true);
    if (type === "prompt" && mode === "edit") {
      setPromptFormat(detectPromptFormat(initialRaw));
    } else if (type === "prompt") {
      setPromptFormat(promptFormatSelect?.value || "yaml");
    } else if (mode === "edit") {
      ruleContentFormat = detectRuleFormat(initialRaw);
      format = ruleContentFormat;
      rawLabel.textContent = format === "markdown" ? "Raw Markdown" : "Raw YAML";
      if (promptFormatSelect) {
        promptFormatSelect.value = format;
      }
    } else {
      ruleContentFormat = promptFormatSelect?.value === "yaml" ? "yaml" : "markdown";
      format = ruleContentFormat;
      rawLabel.textContent = format === "markdown" ? "Raw Markdown" : "Raw YAML";
      if (promptFormatSelect) {
        promptFormatSelect.value = format;
      }
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
  try {
    const reposResponse = await fetch("/api/asset-repos");
    if (reposResponse.ok) {
      const reposPayload = await reposResponse.json();
      assetRepos = (Array.isArray(reposPayload) ? reposPayload : [])
        .filter((repo) => Boolean(repo?.enabled))
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    }
  } catch (_error) {
    assetRepos = [];
  }

  try {
    const definitionsResponse = await fetch("/api/definitions");
    if (definitionsResponse.ok) {
      const definitionsPayload = await definitionsResponse.json();
      repoFolderPathsById = buildRepoFolderPaths(definitionsPayload);
    }
  } catch (_error) {
    repoFolderPathsById = new Map();
  }

  console.debug(`${TAG_DEBUG_PREFIX} boot: initializing form type`, definitionType, "with tags count", availableTags.length);

  if (mode === "create" && params.get("generated") === "1") {
    try {
      const rawStored = window.sessionStorage.getItem(GENERATED_DEFINITION_STORAGE_KEY);
      if (rawStored) {
        const parsedStored = JSON.parse(rawStored);
        if (parsedStored && parsedStored.type === definitionType && parsedStored.content) {
          raw = String(parsedStored.content);
        }
      }
    } catch (_error) {
      raw = "";
    } finally {
      window.sessionStorage.removeItem(GENERATED_DEFINITION_STORAGE_KEY);
    }
  }

  if (mode === "edit") {
    const query = new URLSearchParams();
    if (pathParam) query.set("path", pathParam);
    if (definitionIdParam) query.set("id", definitionIdParam);
    const response = await runWithLoading(
      async () => fetch(`/api/editor/definition?${query.toString()}`),
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
  let restoredSnapshot = null;
  if (returnFromGuideParam === "1") {
    restoredSnapshot = consumeEditorStateFromGuide();
    raw = restoredSnapshot?.raw || raw;
    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.searchParams.delete("returnFromGuide");
    window.history.replaceState({}, "", `${cleanedUrl.pathname}${cleanedUrl.search}`);
  } else {
    window.sessionStorage.removeItem(EDITOR_HELP_STATE_STORAGE_KEY);
  }
  setupForType(definitionType, raw);
  if (restoredSnapshot?.formState) {
    formController.setState(restoredSnapshot.formState);
    sync.updateTextFromForm();
  }
}

document.getElementById("cancelButton").addEventListener("click", () => window.location.assign("/"));
document.getElementById("saveButton").addEventListener("click", async () => {
  let filename;
  let targetPath = "";
  let destinationRepoId;

  const currentState = formController?.getState?.() || {};
  const dccUri = String(currentState.dcc_uri || "").trim();
  if (!dccUri) {
    parseError.hidden = false;
    parseError.textContent = "DCC URI is required.";
    return;
  }

  if (mode === "create") {
    const dialogResult = await openCreateSaveDialog({
      defaults: {
        filename: buildDefaultFilenameFromDccUri(dccUri, format),
        targetPath: "",
        destinationRepoId: destinationRepoIdParam,
        format
      },
      repos: assetRepos,
      folderPathsByRepoId: repoFolderPathsById,
      formats: definitionType === "prompt" || definitionType === "rule" ? ["yaml", "markdown"] : [format]
    });
    if (!dialogResult) return;

    filename = dialogResult.filename;
    targetPath = dialogResult.targetPath;

    const repoIdInput = dialogResult.destinationRepoId;
    destinationRepoId = repoIdInput ? Number(repoIdInput) : null;
    format = dialogResult.format === "markdown" ? "markdown" : "yaml";

    if (!Number.isInteger(destinationRepoId) || destinationRepoId <= 0) {
      parseError.hidden = false;
      parseError.textContent = "Destination repository id is required.";
      return;
    }
  }

  const response = await runWithLoading(
    async () => fetch("/api/editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        path: pathParam,
        definitionId: definitionIdParam ? Number(definitionIdParam) : null,
        content: rawText.value,
        format,
        filename,
        targetPath,
        destinationRepoId,
        definitionType,
      })
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

  queueNotification(payload.message || "Saved.");
  window.location.assign("/");
});


if (promptFormatSelect) {
  promptFormatSelect.addEventListener("change", () => {
    if (definitionType === "prompt") {
      convertPromptContentFormat(promptFormatSelect.value);
      return;
    }

    if (definitionType !== "rule") return;

    const nextFormat = promptFormatSelect.value === "yaml" ? "yaml" : "markdown";
    if (nextFormat === ruleContentFormat) return;

    const previousFormat = ruleContentFormat;
    const previousRawText = rawText.value;
    const previousUnknown = { ...unknown };
    const ruleHandler = handlers.rule;
    let nextState = formController?.getState?.() || {};

    try {
      const parsed = ruleHandler.parse(previousRawText);
      captureUnknownFields("rule", parsed);
      nextState = normalizeState("rule", parsed);
    } catch (_error) {
      unknown = previousUnknown;
    }

    try {
      ruleContentFormat = nextFormat;
      format = nextFormat;
      rawLabel.textContent = nextFormat === "markdown" ? "Raw Markdown" : "Raw YAML";
      formController?.setState(nextState);
      rawText.value = ruleHandler.serialize(nextState);
      sync?.updateFormFromText({ reason: "switch-format" });
      sync?.setError("");
    } catch (error) {
      ruleContentFormat = previousFormat;
      format = previousFormat;
      rawLabel.textContent = previousFormat === "markdown" ? "Raw Markdown" : "Raw YAML";
      unknown = previousUnknown;
      rawText.value = previousRawText;
      if (promptFormatSelect) {
        promptFormatSelect.value = previousFormat;
      }
      sync?.setError(error?.message || "Failed to convert rule format.");
    }
  });
}

boot().catch((error) => {
  parseError.hidden = false;
  parseError.textContent = error.message;
});
