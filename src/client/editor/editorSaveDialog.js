export function getDefaultExtensionForFormat(selectedFormat) {
  return selectedFormat === "markdown" ? "md" : "yaml";
}

export function getAllowedExtensionsForFormat(selectedFormat) {
  if (selectedFormat === "markdown") {
    return ["md", "markdown", "mdx"];
  }
  return ["yaml", "yml"];
}

export function readFilenameExtension(filename) {
  const trimmed = String(filename || "").trim();
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === trimmed.length - 1) return "";
  return trimmed.slice(dotIndex + 1).toLowerCase();
}

export function replaceFilenameExtension(filename, nextExtension) {
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

export function buildDefaultFilenameFromDccUri(dccUri, selectedFormat = "yaml") {
  const cleaned = String(dccUri || "").trim().replace(/\/+$/, "");
  const segments = cleaned.split("/").map((segment) => segment.trim()).filter(Boolean);
  const baseName = segments.length > 0 ? segments.at(-1) : "definition";
  return `${baseName}.${getDefaultExtensionForFormat(selectedFormat)}`;
}

export function buildRepoFolderPaths(definitions) {
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

export function openCreateSaveDialog({
  defaults = {},
  repos = [],
  folderPathsByRepoId = new Map(),
  formats = ["yaml", "markdown"],
  formatDisplayName = (value) => value
} = {}) {
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
